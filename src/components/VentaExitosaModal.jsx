import React from 'react';
import { Download, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatARS } from '../lib/format';
import { formatLongDate } from '../lib/date';
import { exportTicketPDF } from '../lib/pdfExport';

/** Vista en pantalla del ticket. El PDF descargable se arma aparte, con
 *  jsPDF en lib/pdfExport.js — ver el comentario de exportTicketPDF. */
function TicketBody({ sale }) {
  const ink = 'var(--text-primary)';
  const muted = 'var(--text-muted)';
  const accent = 'var(--green)';
  const border = 'var(--border-mid)';

  return (
    <div>
      <div style={{ textAlign: 'center', marginBottom: 10, paddingBottom: 8, borderBottom: `1px dashed ${border}` }}>
        <p className="font-heading" style={{ fontSize: '0.95rem', fontWeight: 900, color: ink, margin: 0 }}>
          {sale.complejoNombre || 'Comprobante de Venta'}
        </p>
        <p style={{ fontSize: '0.7rem', color: muted, margin: '3px 0 0' }}>
          {formatLongDate(sale.fecha)} · {sale.time}
        </p>
        <p style={{ fontSize: '0.7rem', color: accent, fontWeight: 700, margin: '3px 0 0' }}>
          {sale.target}
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8, paddingBottom: 8, borderBottom: `1px dashed ${border}` }}>
        {sale.items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: '0.78rem', color: ink, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {item.cantidad} × {item.nombre}
            </span>
            <span className="num" style={{ fontSize: '0.78rem', color: muted, flexShrink: 0 }}>
              {formatARS(item.precioUnit * item.cantidad)}
            </span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.76rem', color: muted }}>Medio de Cobro</span>
        <strong style={{ fontSize: '0.76rem', color: ink }}>{sale.method}</strong>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 }}>
        <span className="font-heading" style={{ fontSize: '0.88rem', fontWeight: 800, color: ink }}>Total</span>
        <span className="font-heading num" style={{ fontSize: '1.15rem', fontWeight: 900, color: accent }}>
          {formatARS(sale.total)}
        </span>
      </div>
    </div>
  );
}

export default function VentaExitosaModal({ sale, onClose }) {
  if (!sale) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center', padding: '24px 22px' }}>

          {/* Checkmark decorativo — no forma parte del ticket */}
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'linear-gradient(140deg, rgba(0,230,118,0.25), rgba(0,230,118,0.08))',
            border: '1px solid rgba(0,230,118,0.4)',
            boxShadow: '0 0 24px rgba(0,230,118,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px', color: 'var(--green)'
          }}>
            <CheckCircle2 size={30} />
          </div>

          <h3 className="font-heading" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 4 }}>
            ¡Venta Procesada con Éxito!
          </h3>

          <div style={{
            padding: '14px 16px', borderRadius: 14,
            background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
            textAlign: 'left', marginTop: 14, marginBottom: 18
          }}>
            <TicketBody sale={sale} />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => exportTicketPDF(sale)}
              className="btn-secondary"
              style={{ flex: 1, padding: '10px', fontSize: '0.82rem', justifyContent: 'center', gap: 6 }}
            >
              <Download size={14} color="var(--green)" /> Descargar Ticket
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
