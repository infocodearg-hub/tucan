/**
 * ConfirmDialog.jsx — Fase 4
 *
 * Reemplaza window.confirm() con un modal nativo del sistema de diseño.
 * Uso:
 *   const { confirm, ConfirmDialogMount } = useConfirm();
 *   ...
 *   const ok = await confirm({ title: '...', message: '...', danger: true });
 *   if (ok) doSomething();
 *   ...
 *   return <>{ConfirmDialogMount}</>
 */
import React, { useCallback, useRef, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useConfirm() {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback(({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', danger = false }) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ title, message, confirmLabel, cancelLabel, danger });
    });
  }, []);

  const handleConfirm = () => {
    setDialog(null);
    resolveRef.current?.(true);
  };

  const handleCancel = () => {
    setDialog(null);
    resolveRef.current?.(false);
  };

  const ConfirmDialogMount = dialog ? (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && handleCancel()}
      style={{ zIndex: 9999 }}
    >
      <div
        className="modal-content"
        style={{ maxWidth: 380, padding: '24px' }}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
      >
        {/* Icon + Close */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: dialog.danger ? 'rgba(255,79,79,0.12)' : 'rgba(255,179,0,0.12)',
            border: `1px solid ${dialog.danger ? 'rgba(255,79,79,0.35)' : 'rgba(255,179,0,0.35)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: dialog.danger ? 'var(--red)' : 'var(--amber)',
          }}>
            <AlertTriangle size={18} />
          </div>
          <button className="btn-icon" onClick={handleCancel} aria-label="Cancelar">
            <X size={14} />
          </button>
        </div>

        {/* Text */}
        <h3
          id="confirm-title"
          className="font-heading"
          style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1.05rem', marginBottom: 8 }}
        >
          {dialog.title}
        </h3>
        <p
          id="confirm-desc"
          style={{ fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 20 }}
        >
          {dialog.message}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleCancel} className="btn-secondary">
            {dialog.cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '9px 18px', borderRadius: 10, fontWeight: 800, fontSize: '0.84rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.18s ease',
              background: dialog.danger ? 'rgba(255,79,79,0.15)' : 'rgba(0,230,118,0.15)',
              border: `1px solid ${dialog.danger ? 'rgba(255,79,79,0.4)' : 'rgba(0,230,118,0.4)'}`,
              color: dialog.danger ? 'var(--red)' : 'var(--green)',
            }}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmDialogMount };
}
