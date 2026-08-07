/**
 * UsuariosYPermisos.jsx — Configuración → Equipo.
 *
 * El dueño decide, empleado por empleado, qué puede hacer cada uno. Solo él ve
 * esta pantalla, y el rol de dueño no es configurable desde acá: si un empleado
 * pudiera editar permisos, tener roles no significaría nada.
 *
 * Los interruptores son la cara visible de `memberships.permisos`. La base los
 * hace cumplir de verdad en gastos, configuración y borrados; en el resto son
 * gating de interfaz (ver `src/auth/permisos.js`, que lo documenta en detalle).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Check, Crown, Loader2, Trash2, UserPlus, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { PERMISOS } from '../auth/permisos';
import { useToast } from '../store';
import { useConfirm } from './ConfirmDialog';

const MIN_PASSWORD = 10;

export default function UsuariosYPermisos() {
  const { tenantId, user } = useAuth();
  const toast = useToast();
  const { confirm, ConfirmDialogMount } = useConfirm();

  const [miembros, setMiembros] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(null); // user_id en curso
  const [alta, setAlta] = useState(null); // null | { email, password, nombre }
  const [errorAlta, setErrorAlta] = useState('');
  const [creando, setCreando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data, error } = await supabase
      .from('memberships')
      .select('user_id, rol, permisos, nombre_mostrado, created_at')
      .order('created_at');
    if (error) toast.error('No se pudo cargar el equipo.');
    setMiembros(data ?? []);
    setCargando(false);
  }, [toast]);

  useEffect(() => { cargar(); }, [cargar]);

  const togglePermiso = async (miembro, key, valor) => {
    const permisos = { ...(miembro.permisos ?? {}), [key]: valor };
    // Se pinta el cambio antes de que vuelva el servidor; si falla, se recarga
    // del servidor en vez de dejar el interruptor mintiendo.
    setMiembros((prev) =>
      prev.map((m) => (m.user_id === miembro.user_id ? { ...m, permisos } : m))
    );
    setGuardando(miembro.user_id);

    const { error } = await supabase
      .from('memberships')
      .update({ permisos })
      .eq('user_id', miembro.user_id)
      .eq('tenant_id', tenantId);

    setGuardando(null);
    if (error) {
      toast.error('No se pudo guardar el permiso.');
      cargar();
    }
  };

  const crearEmpleado = async (e) => {
    e?.preventDefault?.();
    setErrorAlta('');

    if (!alta.email.trim()) return setErrorAlta('Poné el email del empleado.');
    if (alta.password.length < MIN_PASSWORD) {
      return setErrorAlta(`La contraseña tiene que tener al menos ${MIN_PASSWORD} caracteres.`);
    }

    setCreando(true);
    try {
      const { data: sesion } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invitar-miembro`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // El servidor saca el complejo de este token, no de lo que mandemos.
            Authorization: `Bearer ${sesion.session?.access_token ?? ''}`,
          },
          body: JSON.stringify({
            email: alta.email.trim().toLowerCase(),
            password: alta.password,
            nombre: alta.nombre.trim(),
          }),
        }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? 'No se pudo crear el usuario.');

      toast.success('Empleado agregado. Pasale el email y la contraseña que elegiste.');
      setAlta(null);
      cargar();
    } catch (err) {
      setErrorAlta(err.message);
    } finally {
      setCreando(false);
    }
  };

  const quitar = async (miembro) => {
    const ok = await confirm({
      title: 'Quitar del equipo',
      message: `${miembro.nombre_mostrado ?? 'Este usuario'} va a perder el acceso al panel. La cuenta no se borra: se le puede volver a dar acceso más adelante.`,
      confirmLabel: 'Quitar acceso',
      danger: true,
    });
    if (!ok) return;

    const { error } = await supabase
      .from('memberships')
      .delete()
      .eq('user_id', miembro.user_id)
      .eq('tenant_id', tenantId);

    if (error) return toast.error('No se pudo quitar el acceso.');
    toast.info('Acceso quitado.');
    cargar();
  };

  if (cargando) {
    return <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Cargando equipo…</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {miembros.map((m) => {
        const esDueno = m.rol === 'dueno';
        const soyYo = m.user_id === user?.id;

        return (
          <div key={m.user_id} style={{
            padding: 16, borderRadius: 12, background: 'var(--bg-surface)',
            border: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{
                  fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {m.nombre_mostrado ?? 'Sin nombre'} {soyYo && <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>(vos)</span>}
                </p>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  {esDueno ? 'Dueño · acceso total' : 'Empleado'}
                </p>
              </div>

              {esDueno ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5, flexShrink: 0,
                  padding: '4px 10px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 800,
                  background: 'rgba(255,193,7,0.12)', border: '1px solid rgba(255,193,7,0.3)',
                  color: 'var(--amber)',
                }}>
                  <Crown size={12} /> Dueño
                </span>
              ) : (
                <button
                  type="button" className="row-icon-btn" onClick={() => quitar(m)}
                  aria-label={`Quitar acceso a ${m.nombre_mostrado ?? 'este usuario'}`}
                  style={{ flexShrink: 0 }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {!esDueno && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {PERMISOS.map((p) => (
                  <FilaPermiso
                    key={p.key}
                    permiso={p}
                    valor={m.permisos?.[p.key] === true}
                    ocupado={guardando === m.user_id}
                    onChange={(v) => togglePermiso(m, p.key, v)}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {/* ─── Alta de empleado ─── */}
      {alta ? (
        // `<div>`, no `<form>`: esta tarjeta vive adentro del `<form>` grande
        // de ConfiguracionComplejo.jsx (tab "equipo"). Un `<form>` anidado es
        // HTML inválido y el `submit` del interno burbujea hasta el externo,
        // disparando TAMBIÉN el "Guardar Cambios" del complejo — el dueño
        // veía ese toast cruzado con el alta y el empleado no quedaba creado.
        <div
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !creando) crearEmpleado(e);
          }}
          style={{
            padding: 16, borderRadius: 12, background: 'var(--bg-surface)',
            border: '1px solid var(--celeste)', display: 'flex', flexDirection: 'column', gap: 12,
          }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              Nuevo empleado
            </p>
            <button
              type="button" className="row-icon-btn" onClick={() => { setAlta(null); setErrorAlta(''); }}
              aria-label="Cancelar"
            >
              <X size={14} />
            </button>
          </div>

          {errorAlta && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10,
              background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)',
              color: 'var(--red)', fontSize: '0.78rem', fontWeight: 600,
            }}>
              <AlertCircle size={13} style={{ flexShrink: 0 }} /> {errorAlta}
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Nombre</label>
            <input
              className="form-input" value={alta.nombre} placeholder="Juan"
              onChange={(e) => setAlta({ ...alta, nombre: e.target.value })}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email</label>
            <input
              className="form-input" type="email" value={alta.email} placeholder="juan@gmail.com"
              onChange={(e) => setAlta({ ...alta, email: e.target.value })} required
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Contraseña inicial</label>
            <input
              className="form-input" type="text" value={alta.password}
              autoComplete="new-password"
              onChange={(e) => setAlta({ ...alta, password: e.target.value })} required
            />
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6 }}>
              Mínimo {MIN_PASSWORD} caracteres. Se la pasás vos; después la puede cambiar
              desde “Olvidé mi contraseña”.
            </p>
          </div>

          <button
            type="button" onClick={crearEmpleado} className="btn-primary" disabled={creando}
            style={{ justifyContent: 'center', padding: '11px' }}
          >
            {creando ? <Loader2 size={15} /> : <Check size={15} style={{ color: 'var(--on-accent)' }} />}
            {creando ? 'Creando…' : 'Crear empleado'}
          </button>
        </div>
      ) : (
        <button
          type="button" className="btn-secondary"
          style={{ justifyContent: 'center', padding: '11px' }}
          onClick={() => setAlta({ email: '', password: '', nombre: '' })}
        >
          <UserPlus size={15} /> Agregar empleado
        </button>
      )}

      {ConfirmDialogMount}
    </div>
  );
}

function FilaPermiso({ permiso, valor, ocupado, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, padding: '9px 0', borderTop: '1px solid var(--border-dim)',
    }}>
      <div style={{ minWidth: 0 }}>
        <p style={{
          fontSize: '0.82rem', fontWeight: 600,
          color: permiso.nivel === 'sensible' ? 'var(--amber)' : 'var(--text-primary)',
        }}>
          {permiso.label}
        </p>
        <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 2, lineHeight: 1.45 }}>
          {permiso.detalle}
        </p>
      </div>
      <label className="toggle-switch" style={{ cursor: ocupado ? 'wait' : 'pointer', flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={valor}
          disabled={ocupado}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
