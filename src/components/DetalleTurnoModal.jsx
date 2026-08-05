/**
 * DetalleTurnoModal.jsx — Fase 4
 *
 * Cambios respecto a la versión anterior:
 *  - Reemplaza window.confirm() por useConfirm() (ConfirmDialog del sistema)
 *  - Lee canchas del store (useCanchasActivas) en vez de COMPLEX_INFO
 *  - Lee productos del store (useProducts) en vez de CANTINA_PRODUCTS de mockData
 *  - Usa formatARS de lib/format en vez de toLocaleString inline
 *  - Usa useConfig para el nombre del complejo en el mensaje de WhatsApp
 */
import React, { useState } from 'react';
import {
  X, Calendar, ShoppingBag, CheckCircle2,
  MessageSquare, Trash2, Plus,
} from 'lucide-react';
import {
  useCanchasActivas,
  useProducts,
  useConfig,
} from '../store';
import { formatARS } from '../lib/format';
import { useConfirm } from './ConfirmDialog';
import { iconForProduct } from '../lib/catalog';

export default function DetalleTurnoModal({
  booking,
  isOpen,
  onClose,
  onSettleBooking,
  onCancelBooking,
  onAddCantinaToBooking,
}) {
  const [showAddCantina, setShowAddCantina] = useState(false);
  const { confirm, ConfirmDialogMount } = useConfirm();

  const canchas  = useCanchasActivas();
  const products = useProducts();
  const config   = useConfig();

  if (!isOpen || !booking) return null;

  const cancha      = canchas.find((c) => c.id === booking.canchaId) ?? canchas[0];
  const balance     = (booking.totalPrice || 0) - (booking.depositPaid || 0);
  const isFullyPaid = balance <= 0;

  const nombreComplejo = config?.complejo?.nombre ?? 'el complejo';
  const canchaNombre   = cancha?.nombre ?? booking.canchaId;

  const handleWhatsApp = () => {
    if (!booking.clientPhone) return;
    const cleanPhone = booking.clientPhone.replace(/[^0-9]/g, '');
    const msg = encodeURIComponent(
      `¡Hola ${booking.clientName}! 👋 Te recordamos tu reserva en ${nombreComplejo}:\n\n` +
      `📅 ${booking.time} hs - ${canchaNombre}\n` +
      `💰 Estado: ${isFullyPaid
        ? 'Pagado 100% ✅'
        : `Señado (${formatARS(booking.depositPaid)}) - Resta ${formatARS(balance)}`
      }\n\n` +
      `¡Nos vemos en la cancha! ⚽`
    );
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleCancelClick = async () => {
    const ok = await confirm({
      title:        '¿Cancelar este turno?',
      message:      `Se liberará el horario de ${booking.clientName} (${booking.time} hs · ${canchaNombre}). Esta acción no se puede deshacer.`,
      confirmLabel: 'Sí, cancelar',
      cancelLabel:  'Mantener turno',
      danger:       true,
    });
    if (ok) {
      onCancelBooking(booking.id);
      onClose();
    }
  };

  // Productos activos del store, máx 6 en el picker rápido
  const quickProducts = products.filter((p) => p.activo !== false).slice(0, 8);

  return (
    <>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-content" style={{ maxWidth: 480 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18, paddingBottom: 14, borderBottom: '1px solid var(--border-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12,
                background: isFullyPaid ? 'rgba(0,176,255,0.15)' : 'rgba(255,179,0,0.15)',
                border: `1px solid ${isFullyPaid ? 'rgba(0,176,255,0.35)' : 'rgba(255,179,0,0.35)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isFullyPaid ? 'var(--blue)' : 'var(--amber)',
              }}>
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="font-heading" style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                  {booking.clientName}
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                  {canchaNombre} · {booking.time} hs
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
                border: `1px solid ${isFullyPaid ? 'rgba(0,176,255,0.3)' : 'rgba(255,179,0,0.3)'}`,
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
            marginBottom: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Cancha ({booking.time} hs):</span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{formatARS(booking.totalPrice)}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: '0.82rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Abonado / Seña:</span>
              <span className="num" style={{ fontWeight: 700, color: 'var(--green)' }}>{formatARS(booking.depositPaid)}</span>
            </div>

            {booking.cantinaExtras?.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border-dim)', paddingTop: 6, marginTop: 6 }}>
                <p style={{ fontSize: '0.72rem', color: 'var(--volt)', fontWeight: 800, marginBottom: 4 }}>
                  Consumos de Cantina:
                </p>
                {booking.cantinaExtras.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    <span>{item.qty}× {item.name}</span>
                    <span className="num" style={{ color: 'var(--text-primary)' }}>{formatARS(item.price * item.qty)}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, marginTop: 8, borderTop: '1px solid var(--border-dim)', fontSize: '0.95rem' }}>
              <span style={{ fontWeight: 800, color: 'var(--text-primary)' }}>Resta Cobrar en Puerta:</span>
              <span
                className="font-heading num"
                style={{ fontWeight: 900, color: balance > 0 ? 'var(--amber)' : 'var(--green)', fontSize: '1.2rem' }}
              >
                {formatARS(balance)}
              </span>
            </div>
          </div>

          {/* Quick Cantina Picker */}
          {showAddCantina && (
            <div style={{
              padding: 12, borderRadius: 12, background: 'var(--bg-surface)',
              border: '1px solid var(--border-dim)', marginBottom: 16,
            }}>
              <p style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--volt)', marginBottom: 10 }}>
                Agregar consumo a la cuenta del turno:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {quickProducts.map((prod) => {
                  const ProdIcon = iconForProduct(prod);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => {
                        onAddCantinaToBooking(booking.id, {
                          id: prod.id, name: prod.nombre, price: prod.precio,
                        });
                        setShowAddCantina(false);
                      }}
                      style={{
                        padding: '5px 9px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 700,
                        background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                        color: 'var(--text-primary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      <ProdIcon size={12} color="var(--green)" />
                      {prod.nombre} ({formatARS(prod.precio)})
                      <span style={{ color: 'var(--green)', fontWeight: 900 }}>+</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {!isFullyPaid && (
              <button
                onClick={() => { onSettleBooking(booking.id); onClose(); }}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.85rem' }}
              >
                <CheckCircle2 size={16} style={{ color: 'var(--on-accent)' }} />
                Saldar Restante ({formatARS(balance)})
              </button>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={() => setShowAddCantina(!showAddCantina)}
                className="btn-secondary"
                style={{ justifyContent: 'center', padding: '9px', fontSize: '0.78rem', gap: 5 }}
              >
                <ShoppingBag size={14} color="var(--volt)" />
                {showAddCantina ? 'Cerrar Cantina' : '+ Cantina'}
              </button>

              <button
                onClick={handleWhatsApp}
                className="btn-secondary"
                style={{ justifyContent: 'center', padding: '9px', fontSize: '0.78rem', gap: 5, color: 'var(--green)', borderColor: 'rgba(0,230,118,0.3)' }}
                disabled={!booking.clientPhone}
              >
                <MessageSquare size={14} />
                Recordatorio WA
              </button>
            </div>

            <button
              onClick={handleCancelClick}
              style={{
                background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.25)',
                color: 'var(--red)', padding: '9px', borderRadius: 10, fontSize: '0.78rem', fontWeight: 800,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                marginTop: 4,
              }}
            >
              <Trash2 size={14} /> Cancelar / Liberar Turno
            </button>
          </div>

        </div>
      </div>

      {/* ConfirmDialog se monta sobre el modal actual */}
      {ConfirmDialogMount}
    </>
  );
}
