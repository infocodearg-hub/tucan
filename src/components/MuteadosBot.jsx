/**
 * MuteadosBot.jsx — clientes a los que el bot no le tiene que contestar.
 *
 * Distinto de una derivación: acá es el dueño quien corta a mano, sin
 * vencimiento (`bot_sesiones.muteado`, sin fecha), no el bot solo por 24
 * horas al derivar (`pausado_hasta`). Sirve para el número que insiste con
 * lo mismo o para precargar un contacto que no debería recibir mensajes
 * automáticos, incluso si nunca le escribió al bot.
 *
 * `mutear_bot`/`desmutear_bot` son RPC `security definer` (migración
 * `20260807000200_muteados_bot.sql`) porque `bot_sesiones` no tiene
 * políticas RLS — mismo criterio que `reactivar_bot` en DerivacionesBot.jsx.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Search, VolumeX, Volume2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useToast, useClients } from '../store';
import { formatMediumDate } from '../lib/date';

/** Últimos 10 dígitos: la misma clave que usan la base y la Edge Function. */
const claveTelefono = (raw) => {
  const digitos = String(raw ?? '').replace(/\D/g, '');
  return digitos.length >= 8 ? digitos.slice(-10) : null;
};

export default function MuteadosBot() {
  const { tenantId } = useAuth();
  const toast = useToast();
  const clients = useClients();

  const [muteados, setMuteados] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [search, setSearch] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nombre, setNombre] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [quitando, setQuitando] = useState(null);

  const cargar = useCallback(async () => {
    if (!tenantId) return;
    setCargando(true);
    const { data, error } = await supabase
      .from('bot_sesiones')
      .select('telefono_clave, telefono, muteado_en, muteado_nombre')
      .eq('tenant_id', tenantId)
      .eq('muteado', true)
      .order('muteado_en', { ascending: false });
    if (error) toast.error('No pudimos cargar los clientes muteados.');
    setMuteados(data ?? []);
    setCargando(false);
  }, [tenantId, toast]);

  useEffect(() => { cargar(); }, [cargar]);

  // Cruce local con el CRM: si el número ya tiene ficha de cliente, se
  // muestra su nombre real en vez del que se haya tipeado a mano al mutear
  // (que puede no existir, si se muteó preventivamente a alguien nuevo).
  const nombrePorClave = new Map(
    clients.map((c) => [claveTelefono(c.telefono), c.nombre]).filter(([clave]) => clave)
  );

  const agregar = async () => {
    const clave = claveTelefono(telefono);
    if (!clave) {
      toast.error('Ingresá un teléfono válido.');
      return;
    }
    setGuardando(true);
    const { error } = await supabase.rpc('mutear_bot', {
      p_tenant: tenantId,
      p_telefono: telefono,
      p_nombre: nombre.trim() || null,
    });
    setGuardando(false);
    if (error) {
      toast.error('No se pudo mutear ese teléfono.');
      return;
    }
    setTelefono('');
    setNombre('');
    toast.success('Cliente muteado. El bot no le va a contestar.');
    cargar();
  };

  const quitar = async (fila) => {
    setQuitando(fila.telefono_clave);
    const { error } = await supabase.rpc('desmutear_bot', {
      p_tenant: tenantId,
      p_telefono_clave: fila.telefono_clave,
    });
    setQuitando(null);
    if (error) {
      toast.error('No se pudo desmutear.');
      return;
    }
    setMuteados((prev) => prev.filter((m) => m.telefono_clave !== fila.telefono_clave));
    toast.success('Desmuteado. El bot vuelve a contestarle.');
  };

  const filtrados = muteados.filter((m) => {
    const nombreVisible = nombrePorClave.get(m.telefono_clave) ?? m.muteado_nombre ?? '';
    const q = search.toLowerCase();
    return !q || nombreVisible.toLowerCase().includes(q) || String(m.telefono ?? '').includes(q);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {/* ─── Agregar ─── */}
      <div>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Agregar cliente muteado
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160, flex: 1 }}>
            <label className="form-label">Teléfono</label>
            <input
              type="text"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
              placeholder="Ej: 1122334455"
              className="form-input"
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0, minWidth: 160, flex: 1 }}>
            <label className="form-label">Nombre (opcional)</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del cliente"
              className="form-input"
            />
          </div>
          <button
            type="button"
            onClick={agregar}
            disabled={guardando || !telefono.trim()}
            className="btn-primary"
            style={{ padding: '9px 16px', opacity: guardando || !telefono.trim() ? 0.6 : 1 }}
          >
            <VolumeX size={14} style={{ color: 'var(--on-accent)' }} />
            {guardando ? 'Agregando…' : 'Agregar muteado'}
          </button>
        </div>
        <p className="form-hint">
          Ingresá un teléfono para evitar que ese cliente reciba mensajes del bot. Funciona aunque
          todavía no le haya escrito nunca — queda cortado desde ya.
        </p>
      </div>

      <div style={{ height: 1, background: 'var(--border-dim)' }} />

      {/* ─── Lista ─── */}
      <div>
        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
          Clientes muteados
        </p>
        <div style={{ position: 'relative', maxWidth: 320, marginBottom: 12 }}>
          <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            className="form-input"
            style={{ width: '100%', padding: '8px 12px 8px 36px' }}
          />
        </div>

        {cargando ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando…</p>
        ) : filtrados.length === 0 ? (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {muteados.length === 0 ? 'No hay ningún cliente muteado.' : 'Nada coincide con la búsqueda.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtrados.map((m) => (
              <div
                key={m.telefono_clave}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 12, flexWrap: 'wrap',
                  padding: '11px 13px', borderRadius: 11,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }} className="truncate-1">
                    {nombrePorClave.get(m.telefono_clave) ?? m.muteado_nombre ?? 'Sin nombre'}
                    {' · '}
                    <span className="num">{m.telefono}</span>
                  </p>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 2 }}>
                    Muteado el {m.muteado_en ? formatMediumDate(String(m.muteado_en).slice(0, 10)) : '—'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => quitar(m)}
                  disabled={quitando === m.telefono_clave}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.74rem', flexShrink: 0, opacity: quitando === m.telefono_clave ? 0.6 : 1 }}
                >
                  <Volume2 size={13} />
                  {quitando === m.telefono_clave ? 'Quitando…' : 'Desmutear'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
