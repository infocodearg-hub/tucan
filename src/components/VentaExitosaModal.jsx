import React from 'react';
import { CheckCircle2, Printer, ArrowRight } from 'lucide-react';
import { formatARS } from '../lib/format';
import { formatLongDate } from '../lib/date';

export default function VentaExitosaModal({ sale, onClose }) {
  if (!sale) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 420, textAlign: 'center', padding: '28px 24px' }}>

        {/* Animated Checkmark Badge — no forma parte del ticket imprimible */}
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

        {/* Ticket — esto es lo único que se imprime, ver #ticket-imprimible en index.css */}
        <div id="ticket-imprimible" style={{
          padding: '16px 18px', borderRadius: 14,
          background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
          textAlign: 'left', marginBottom: 20
        }}>
          <div style={{ textAlign: 'center', marginBottom: 12, paddingBottom: 10, borderBottom: '1px dashed var(--border-mid)' }}>
            <p className="font-heading" style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
              {sale.complejoNombre || 'Comprobante de Venta'}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
              {formatLongDate(sale.fecha)} · {sale.time}
            </p>
            <p style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700, marginTop: 2 }}>
              {sale.target}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, paddingBottom: 10, borderBottom: '1px dashed var(--border-mid)' }}>
            {sale.items.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {item.cantidad} × {item.nombre}
                </span>
                <span className="num" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                  {formatARS(item.precioUnit * item.cantidad)}
                </span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Medio de Cobro</span>
            <strong style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{sale.method}</strong>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
            <span className="font-heading" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>Total</span>
            <span className="font-heading num" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--green)' }}>
              {formatARS(sale.total)}
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
