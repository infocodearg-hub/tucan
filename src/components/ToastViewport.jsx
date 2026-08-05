import React from 'react';
import Toast from './Toast.jsx';
import { useToast, useToasts } from '../store';

/**
 * Contenedor fijo del stack de toasts (máx. 3, lo limita el reducer).
 * Bottom-right en desktop; bottom-center por encima de la bottom-nav en mobile.
 */
export default function ToastViewport() {
  const toasts = useToasts();
  const { dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom) + 12px)',
        zIndex: 'var(--z-toast)',
        display: 'flex',
        flexDirection: 'column-reverse',
        alignItems: 'center',
        gap: 8,
        padding: '0 12px',
        pointerEvents: 'none',
      }}
      className="md:items-end md:pr-5 md:pb-0"
    >
      <div style={{ display: 'flex', flexDirection: 'column-reverse', gap: 8, width: '100%', maxWidth: 380, pointerEvents: 'auto' }}>
        {toasts.map((t) => (
          <Toast key={t.id} {...t} onDismiss={dismiss} />
        ))}
      </div>
    </div>
  );
}
