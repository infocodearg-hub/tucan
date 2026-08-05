import React from 'react';
import { CheckCircle2, X, Printer, ShoppingBag, ArrowRight } from 'lucide-react';

export default function VentaExitosaModal({ sale, onClose }) {
  if (!sale) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420, textAlign: 'center', padding: '28px 24px' }}>
        
        {/* Animated Checkmark Badge */}
        <div style={{
          width: 64, height: 64, borderRadius: '50%',
          background: 'linear-gradient(140deg, rgba(0,230,118,0.25), rgba(0,230,118,0.08))',
          border: '1px solid rgba(0,230,118,0.4)',
          boxShadow: '0 0 30px rgba(0,230,118,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', color: 'var(--green)'
        }}>
          <CheckCircle2 size={34} />
        </div>

        <h3 className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
          ¡Venta Procesada con Éxito!
        </h3>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Comprobante registrado · {sale.time}
        </p>

        {/* Ticket Summary Box */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
          textAlign: 'left', marginBottom: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid var(--border-dim)' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
              Detalle de Venta
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--green)' }}>
              {sale.target}
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 10, lineHeight: 1.4 }}>
            {sale.items}
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-dim)' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Medio de Cobro: <strong style={{ color: 'var(--text-primary)' }}>{sale.method}</strong></span>
            <span className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--green)' }}>
              ${sale.total.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button 
            type="button"
            onClick={() => window.print()}
            className="btn-secondary"
            style={{ flex: 1, padding: '10px', fontSize: '0.82rem', justifyContent: 'center', gap: 6 }}
          >
            <Printer size={14} color="var(--green)" /> Imprimir Ticket
          </button>
          <button 
            type="button"
            onClick={onClose}
            className="btn-primary"
            style={{ flex: 1, padding: '10px', fontSize: '0.82rem', justifyContent: 'center', gap: 6 }}
          >
            Listo <ArrowRight size={14} style={{ color: 'var(--on-accent)' }} />
          </button>
        </div>

      </div>
    </div>
  );
}
