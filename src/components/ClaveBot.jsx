/**
 * ClaveBot.jsx — Configuración → Bot IA → clave de conexión.
 *
 * Genera la clave que va a usar el flujo de n8n para hablar con la app.
 *
 * Dos decisiones que no son negociables:
 *   1. En la base se guarda SOLO el hash SHA-256. Si alguien se lleva una copia
 *      de la tabla, no puede entrar con eso.
 *   2. La clave en claro se muestra una única vez, acá, y no se puede recuperar
 *      después. Si se pierde, se revoca y se genera otra.
 *
 * El hash se calcula en el navegador con Web Crypto. La clave viaja al servidor
 * ya hasheada: la clave completa nunca sale de esta pantalla.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Check, Copy, KeyRound, Plus, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../store';
import { useConfirm } from './ConfirmDialog';
import { formatShortDate } from '../lib/date';

/** Clave de 32 caracteres con prefijo reconocible, para que se note qué es si aparece en un log. */
function generarClave() {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  let out = '';
  for (const b of bytes) out += alfabeto[b % alfabeto.length];
  return `tucan_${out}`;
}

async function sha256(texto) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function ClaveBot() {
  const { tenantId } = useAuth();
  const toast = useToast();
  const { confirm, ConfirmDialogMount } = useConfirm();

  const [claves, setClaves] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [claveNueva, setClaveNueva] = useState('');
  const [copiado, setCopiado] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const { data } = await supabase
      .from('tenant_api_keys')
      .select('id, nombre, key_prefijo, activo, created_at, last_used_at')
      .order('created_at', { ascending: false });
    setClaves(data ?? []);
    setCargando(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const generar = async () => {
    const clave = generarClave();
    const { error } = await supabase.from('tenant_api_keys').insert({
      tenant_id: tenantId,
      nombre: 'Bot de WhatsApp',
      key_hash: await sha256(clave),
      // Los primeros caracteres alcanzan para reconocerla en la lista sin
      // guardar nada que sirva para autenticarse.
      key_prefijo: clave.slice(0, 12),
    });

    if (error) return toast.error('No se pudo generar la clave.');
    setClaveNueva(clave);
    cargar();
  };

  const revocar = async (clave) => {
    const ok = await confirm({
      title: 'Revocar clave',
      message: 'El bot va a dejar de poder anotar turnos hasta que cargues una clave nueva en n8n. ¿Seguimos?',
      confirmLabel: 'Revocar',
      danger: true,
    });
    if (!ok) return;

    const { error } = await supabase.from('tenant_api_keys').update({ activo: false }).eq('id', clave.id);
    if (error) return toast.error('No se pudo revocar la clave.');
    toast.info('Clave revocada.');
    cargar();
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(claveNueva);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Sin portapapeles (contexto no seguro): la clave igual está en pantalla.
    }
  };

  const activas = claves.filter((c) => c.activo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
        Esta clave le da permiso al bot de WhatsApp (n8n) para consultar horarios libres y
        anotar turnos en tu complejo. Solo funciona para tu cuenta y la podés revocar cuando
        quieras.
      </p>

      {claveNueva && (
        <div style={{
          padding: 16, borderRadius: 12, background: 'rgb(from var(--celeste) r g b / 0.07)',
          border: '1px solid rgb(from var(--celeste) r g b / 0.35)', display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} style={{ color: 'var(--amber)', flexShrink: 0 }} />
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Copiala ahora: no se vuelve a mostrar
            </p>
          </div>
          <code style={{
            fontSize: '0.78rem', fontFamily: 'monospace', color: 'var(--text-primary)',
            background: 'var(--bg-input)', border: '1px solid var(--border-dim)',
            borderRadius: 8, padding: '10px 12px', wordBreak: 'break-all',
          }}>
            {claveNueva}
          </code>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={copiar} className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
              {copiado ? <Check size={13} color="var(--celeste)" /> : <Copy size={13} />}
              {copiado ? 'Copiada' : 'Copiar clave'}
            </button>
            <button
              type="button" onClick={() => setClaveNueva('')} className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.78rem' }}
            >
              Ya la guardé
            </button>
          </div>
        </div>
      )}

      {cargando ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cargando…</p>
      ) : activas.length === 0 ? (
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Todavía no generaste ninguna clave.
        </p>
      ) : (
        activas.map((c) => (
          <div key={c.id} style={{
            padding: '12px 14px', borderRadius: 12, background: 'var(--bg-surface)',
            border: '1px solid var(--border-dim)', display: 'flex', alignItems: 'center',
            gap: 10, flexWrap: 'wrap',
          }}>
            <KeyRound size={15} style={{ color: 'var(--purple)', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <p className="num" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {c.key_prefijo}…
              </p>
              <p style={{ fontSize: '0.71rem', color: 'var(--text-muted)', marginTop: 2 }}>
                Creada el {formatShortDate(c.created_at.slice(0, 10))} ·{' '}
                {c.last_used_at
                  ? `último uso ${formatShortDate(c.last_used_at.slice(0, 10))}`
                  : 'todavía sin usar'}
              </p>
            </div>
            <button
              type="button" className="row-icon-btn" onClick={() => revocar(c)}
              aria-label="Revocar clave" style={{ flexShrink: 0 }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))
      )}

      <button
        type="button" className="btn-secondary"
        style={{ justifyContent: 'center', padding: '11px' }}
        onClick={generar}
      >
        <Plus size={15} /> Generar clave nueva
      </button>

      {ConfirmDialogMount}
    </div>
  );
}
