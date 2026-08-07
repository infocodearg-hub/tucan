/**
 * DerivacionesBot.jsx — la bandeja de "esto lo tiene que ver una persona".
 *
 * Cuando el bot deriva, hace dos cosas: se pausa 24 horas para ese número (así
 * no le sigue contestando por arriba a quien esté atendiendo) y deja una fila
 * acá. "Atender y reactivar" lo despierta y además incrementa el
 * `session_suffix`, con lo cual la memoria de la conversación arranca limpia:
 * si no, el bot retoma la charla donde la dejó y repite lo que ya resolvió una
 * persona.
 *
 * No usa el store: `bot_derivaciones` es estado del canal de WhatsApp, no del
 * negocio. Meterlo en el estado global lo haría viajar en cada diff y en cada
 * hidratación para algo que se mira una vez por día.
 */
import React, { useCallback, useEffect, useId, useState } from 'react';
import { Check, MessageSquare, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../store';
import { formatMediumDate } from '../lib/date';

/** Últimos 10 dígitos: la misma clave que usan la base y la Edge Function. */
const claveTelefono = (raw) => {
  const digitos = String(raw ?? '').replace(/\D/g, '');
  return digitos.length >= 8 ? digitos.slice(-10) : null;
};

/**
 * Fuente de verdad única para "cuántas conversaciones están esperando".
 *
 * La usa `DerivacionesBot` (la lista completa) y `Sidebar` (solo el número,
 * para el badge del menú) — antes solo el primero existía; el Realtime es
 * infraestructura que ya estaba prevista (`bot_derivaciones` está agregada a
 * `supabase_realtime` desde la migración que la creó, con un comentario que
 * dice literalmente "el badge tiene que aparecer sin recargar") y nunca se
 * había conectado del lado del cliente.
 *
 * `enabled: false` no dispara query ni suscripción — para no gastar una
 * consulta en un usuario que ni va a ver el tab.
 */
export function useDerivacionesAbiertas({ enabled = true } = {}) {
  const { tenantId } = useAuth();
  const toast = useToast();
  const [derivaciones, setDerivaciones] = useState([]);
  const [cargando, setCargando] = useState(true);
  // Sidebar (el badge) y Derivaciones (la lista) pueden tener el hook
  // montado a la vez — cada instancia necesita su PROPIO canal. El cliente
  // de Realtime dedupe por nombre de tópico; dos `.subscribe()` sobre el
  // mismo nombre tiran "cannot add postgres_changes callbacks... after
  // subscribe()" en vez de avisar de una forma entendible.
  const instanceId = useId();

  const cargar = useCallback(async () => {
    if (!tenantId) return;
    setCargando(true);
    const { data, error } = await supabase
      .from('bot_derivaciones')
      .select('id, telefono, nombre, motivo, booking_id, estado, created_at')
      .eq('estado', 'abierta')
      .order('created_at', { ascending: false })
      .limit(30);
    if (error) toast.error('No pudimos cargar las conversaciones derivadas.');
    setDerivaciones(data ?? []);
    setCargando(false);
  }, [tenantId, toast]);

  useEffect(() => {
    if (!enabled || !tenantId) return;
    cargar();

    // El bot crea una fila nueva (INSERT) cuando deriva, y el panel la marca
    // "atendida" (UPDATE) — cualquiera de las dos cambia el contador.
    const canal = supabase
      .channel(`bot_derivaciones:${tenantId}:${instanceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bot_derivaciones', filter: `tenant_id=eq.${tenantId}` },
        () => cargar()
      )
      .subscribe();

    return () => { supabase.removeChannel(canal); };
  }, [enabled, tenantId, instanceId, cargar]);

  return { derivaciones, cargando, recargar: cargar };
}

export default function DerivacionesBot() {
  const { session, tenantId } = useAuth();
  const toast = useToast();
  const { derivaciones: derivacionesRemoto, cargando, recargar: cargar } = useDerivacionesAbiertas();
  const [derivaciones, setDerivaciones] = useState([]);
  const [atendiendo, setAtendiendo] = useState(null);

  // Espejo local: permite sacar la fila apenas se marca atendida sin esperar
  // el viaje de ida y vuelta del Realtime, y se resincroniza solo cuando el
  // hook trae datos nuevos (otro empleado atendiendo, el bot derivando).
  useEffect(() => { setDerivaciones(derivacionesRemoto); }, [derivacionesRemoto]);

  const atender = async (d) => {
    setAtendiendo(d.id);
    const { error: errMarcar } = await supabase
      .from('bot_derivaciones')
      .update({
        estado: 'atendida',
        atendida_at: new Date().toISOString(),
        atendida_por: session?.user?.id ?? null,
      })
      .eq('id', d.id);

    if (errMarcar) {
      toast.error('No se pudo marcar como atendida.');
      setAtendiendo(null);
      return;
    }

    // El bot vuelve a contestarle a ese número, con la conversación en blanco.
    const clave = claveTelefono(d.telefono);
    if (clave) {
      await supabase.rpc('reactivar_bot', { p_tenant: tenantId, p_telefono_clave: clave });
    }

    setDerivaciones((prev) => prev.filter((x) => x.id !== d.id));
    setAtendiendo(null);
    toast.success('Listo. El bot vuelve a atender a ese número.');
  };

  if (cargando) {
    return <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando…</p>;
  }

  if (!derivaciones.length) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px' }}>
        <MessageSquare size={16} color="var(--text-faint)" style={{ flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            No hay nada esperando
          </p>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Cuando el bot no pueda resolver algo —un reclamo, un precio raro, una devolución—
            te lo deja acá y deja de contestarle a esa persona.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          {derivaciones.length} {derivaciones.length === 1 ? 'conversación' : 'conversaciones'} esperando.
          El bot está en pausa con esos números.
        </p>
        <button type="button" onClick={cargar} className="btn-secondary" style={{ padding: '5px 10px', fontSize: '0.72rem', flexShrink: 0 }}>
          <RefreshCw size={12} /> Actualizar
        </button>
      </div>

      {derivaciones.map((d) => (
        <div
          key={d.id}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: 12, flexWrap: 'wrap',
            padding: '11px 13px', borderRadius: 11,
            background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)' }} className="truncate-1">
              {d.nombre || 'Sin nombre'} · <span className="num">{d.telefono}</span>
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }} className="truncate-2">
              {d.motivo}
            </p>
            <p style={{ fontSize: '0.68rem', color: 'var(--text-faint)', marginTop: 3 }}>
              {formatMediumDate(String(d.created_at).slice(0, 10))}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <a
              href={`https://wa.me/${String(d.telefono).replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
              style={{ padding: '6px 11px', fontSize: '0.74rem', color: 'var(--celeste)', borderColor: 'rgb(from var(--celeste) r g b / 0.3)' }}
            >
              <MessageSquare size={13} /> Abrir chat
            </a>
            <button
              type="button"
              onClick={() => atender(d)}
              disabled={atendiendo === d.id}
              className="btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.74rem', opacity: atendiendo === d.id ? 0.6 : 1 }}
            >
              <Check size={13} style={{ color: 'var(--on-accent)' }} />
              {atendiendo === d.id ? 'Reactivando…' : 'Atendido, reactivar bot'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
