import React, { useState } from 'react';
import { 
  X, Check, Calendar, Clock, User, Phone, DollarSign, 
  ShoppingBag, CheckCircle2, MessageSquare, Trash2, Plus, Zap
} from 'lucide-react';
import { COMPLEX_INFO, CANTINA_PRODUCTS } from '../data/mockData';

export default function DetalleTurnoModal({ booking, isOpen, onClose, onSettleBooking, onCancelBooking, onAddCantinaToBooking }) {
  const [showAddCantina, setShowAddCantina] = useState(false);

  if (!isOpen || !booking) return null;

  const cancha = COMPLEX_INFO.canchas.find(c => c.id === booking.canchaId) || COMPLEX_INFO.canchas[0];
  const balance = (booking.totalPrice || 0) - (booking.depositPaid || 0);
  const isFullyPaid = balance <= 0;

  const handleWhatsApp = () => {
    const cleanPhone = booking.clientPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `¡Hola ${booking.clientName}! 👋 Te recordamos tu reserva en ${COMPLEX_INFO.name}:\n\n` +
      `📅 Hoy ${booking.time} hs - ${cancha.name.split(' - ')[0]}\n` +
      `💰 Estado: ${isFullyPaid ? 'Pagado 100%' : `Señado ($${booking.depositPaid.toLocaleString('es-AR')}) - Resta $${balance.toLocaleString('es-AR')}`}\n\n` +
      `¡Nos vemos en la cancha! ⚽`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 480 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: isFullyPaid ? 'rgba(0,176,255,0.15)' : 'rgba(255,179,0,0.15)',
              border: `1px solid ${isFullyPaid ? 'rgba(0,176,255,0.35)' : 'rgba(255,179,0,0.35)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: isFullyPaid ? 'var(--blue)' : 'var(--amber)'
            }}>
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {booking.clientName}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {cancha.name.split(' - ')[0]} · {booking.time} hs
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Info Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Estado del Turno
            </span>
            <span style={{
              fontSize: '0.78rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6, display: 'inline-block',
              background: isFullyPaid ? 'rgba(0,176,255,0.15)' : 'rgba(255,179,0,0.15)',
              color: isFullyPaid ? 'var(--blue)' : 'var(--amber)',
              border: `1px solid ${isFullyPaid ? 'rgba(0,176,255,0.3)' : 'rgba(255,179,0,0.3)'}`
            }}>
              {isFullyPaid ? '🔵 Pagado 100%' : '🟡 Señado (Pendiente)'}
            </span>
          </div>

          <div style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
              Medio de Cobro
            </span>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {booking.paymentMethod || 'Mercado Pago'}
            </span>
          </div>
        </div>

        {/* Finance Breakdown */}
        <div style={{
          padding: '14px 16px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          marginBottom: 16
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Cancha ({booking.time} hs):</span>
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>${booking.totalPrice.toLocaleString('es-AR')}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Abonado / Seña:</span>
            <span style={{ fontWeight: 700, color: 'var(--green)' }}>${booking.depositPaid.toLocaleString('es-AR')}</span>
          </div>

          {booking.cantinaExtras?.length > 0 && (
            <div style={{ borderTop: '1px dashed var(--border-dim)', paddingTop: 6, marginTop: 6 }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--volt)', fontWeight: 800, marginBottom: 4 }}>
                Consumos de Cantina Asignados:
              </p>
              {booking.cantinaExtras.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <span>{item.qty}× {item.name}</span>
                  <span style={{ color: 'var(--text-primary)' }}>${(item.price * item.qty).toLocaleString('es-AR')}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--border-dim)', fontSize: '0.95rem' }}>
            <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Resta Cobrar en Puerta:</span>
            <span className="font-heading" style={{ fontWeight: 900, color: balance > 0 ? 'var(--amber)' : 'var(--green)', fontSize: '1.2rem' }}>
              ${balance.toLocaleString('es-AR')}
            </span>
          </div>
        </div>

        {/* Add Cantina items directly */}
        {showAddCantina && (
          <div style={{ padding: 12, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)', marginBottom: 16 }}>
            <p style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--volt)', marginBottom: 8 }}>
              Seleccionar producto para agregar a la cuenta del turno:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {CANTINA_PRODUCTS.slice(0, 6).map(prod => (
                <button
                  key={prod.id}
                  type="button"
                  onClick={() => {
                    onAddCantinaToBooking(booking.id, prod);
                    setShowAddCantina(false);
                  }}
                  style={{
                    padding: '5px 9px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 600,
                    background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                    color: 'var(--text-primary)', cursor: 'pointer'
                  }}
                >
                  {prod.name.split(' ')[0]} (${(prod.price/1000).toFixed(1)}k) +
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          
          {/* Saldar Restante */}
          {!isFullyPaid && (
            <button
              onClick={() => {
                onSettleBooking(booking.id);
                onClose();
              }}
              className="btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.85rem' }}
            >
              <CheckCircle2 size={16} style={{ color: 'var(--on-accent)' }} /> Saldar Restante (${balance.toLocaleString('es-AR')})
            </button>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button
              onClick={() => setShowAddCantina(!showAddCantina)}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '9px', fontSize: '0.78rem', gap: 5 }}
            >
              <ShoppingBag size={14} color="var(--volt)" /> + Cantina
            </button>

            <button
              onClick={handleWhatsApp}
              className="btn-secondary"
              style={{ justifyContent: 'center', padding: '9px', fontSize: '0.78rem', gap: 5, color: 'var(--green)', borderColor: 'rgba(0,230,118,0.3)' }}
            >
              <MessageSquare size={14} /> Recordatorio WA
            </button>
          </div>

          <button
            onClick={() => {
              if (window.confirm(`¿Seguro que deseas cancelar el turno de ${booking.clientName}?`)) {
                onCancelBooking(booking.id);
                onClose();
              }
            }}
            style={{
              background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)',
              color: 'var(--red)', padding: '9px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 800,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              marginTop: 4
            }}
          >
            <Trash2 size={14} /> Cancelar / Liberar Turno
          </button>

        </div>

      </div>
    </div>
  );
}
