import React, { useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

const VARIANTS = {
  success: { icon: CheckCircle2, color: 'var(--paid)', bg: 'rgb(33 201 122 / 0.14)', border: 'rgb(33 201 122 / 0.35)' },
  error: { icon: AlertCircle, color: 'var(--red)', bg: 'rgb(240 82 77 / 0.14)', border: 'rgb(240 82 77 / 0.35)' },
  info: { icon: Info, color: 'var(--blue)', bg: 'rgb(34 211 238 / 0.14)', border: 'rgb(34 211 238 / 0.35)' },
};

/**
 * Un ítem del stack de toasts. Cada uno maneja su propio timer con un
 * `dismiss(id)` estable — el bug viejo era un `onClose` que cambiaba de
 * identidad en cada render del padre y reiniciaba el timer sin parar.
 */
export default function Toast({ id, message, type = 'success', duration = 3200, action, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const v = VARIANTS[type] ?? VARIANTS.success;
  const Icon = v.icon;

  return (
    <div
      role="status"
      aria-live="polite"
      className="card"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--radius-lg)',
        borderColor: v.border,
        boxShadow: 'var(--shadow-e4)',
        animation: 'toast-in 0.22s var(--ease-out-quint)',
        width: '100%',
        maxWidth: 380,
      }}
    >
      <div
        style={{
          width: 30,
          height: 30,
          borderRadius: 'var(--radius-md)',
          background: v.bg,
          border: `1px solid ${v.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: v.color,
          flexShrink: 0,
        }}
      >
        <Icon size={16} />
      </div>
      <p style={{ flex: 1, minWidth: 0, fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1.35 }}>
        {message}
      </p>
      {action && (
        <button
          onClick={() => {
            action.onClick();
            onDismiss(id);
          }}
          className="btn-ghost btn-sm"
          style={{ padding: '4px 9px', color: 'var(--color-accent-400)', flexShrink: 0 }}
        >
          {action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(id)}
        className="btn-icon"
        style={{ width: 28, height: 28, flexShrink: 0 }}
        aria-label="Cerrar notificación"
      >
        <X size={13} />
      </button>
    </div>
  );
}
