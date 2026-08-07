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
import React, { useState, useEffect } from 'react';
import {
  X, Calendar, ShoppingBag, CheckCircle2, Clock,
  MessageSquare, Trash2, Pencil, Save, User, Phone,
} from 'lucide-react';
import {
  useCanchasActivas,
  useProducts,
  useConfig,
} from '../store';
import { formatARS } from '../lib/format';
import { minutosPara } from '../lib/date';
import { useConfirm } from './ConfirmDialog';
import { usePuede } from '../auth/AuthProvider';
import { iconForProduct } from '../lib/catalog';
import { supabase } from '../lib/supabase';

export default function DetalleTurnoModal({
  booking,
  isOpen,
  onClose,
  onSettleBooking,
  onCancelBooking,
  onAddCantinaToBooking,
  onEditBooking,
  onConfirmBooking,
  onValidatePayment,
}) {
  const [showAddCantina, setShowAddCantina] = useState(false);
  const [cart, setCart] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const { confirm, ConfirmDialogMount } = useConfirm();

  useEffect(() => {
    if (!isOpen) {
      setShowAddCantina(false);
      setCart([]);
      setIsEditing(false);
    }
  }, [isOpen]);

  const canchas  = useCanchasActivas();
  const products = useProducts();
  const config   = useConfig();
  const puedeGestionarTurnos = usePuede('gestionar_turnos');

  if (!isOpen || !booking) return null;

  const startEditing = () => {
    setEditName(booking.clientName ?? '');
    setEditPhone(booking.clientPhone ?? '');
    setEditNotes(booking.notes ?? '');
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editName.trim()) return;
    onEditBooking({
      clienteNombre: editName.trim(),
      clienteTelefono: editPhone.trim() || null,
      notas: editNotes,
    });
    setIsEditing(false);
  };

  const cancha      = canchas.find((c) => c.id === booking.canchaId) ?? canchas[0];
  const balance     = (booking.totalPrice || 0) - (booking.depositPaid || 0);
  const isFullyPaid = balance <= 0;

  const sinConfirmar = booking.estado === 'pendiente';
  const minutosRestantes = minutosPara(booking.expiraAt);
  // Los pagos sin validar salen del booking real, no de la forma vieja: la
  // capa de compatibilidad aplana los pagos y perdería cuál es cuál.
  const pagosSinValidar = (booking._source?.pagos ?? []).filter((p) => p.validado === false);

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

  const handleConfirmClick = async () => {
    const ok = await confirm({
      title: '¿Confirmar este turno?',
      message:
        `El turno de ${booking.clientName} (${booking.time} hs · ${canchaNombre}) deja de estar ` +
        'sujeto a vencimiento y queda tomado. Hacelo cuando tengas la seña o el ok del cliente.',
      confirmLabel: 'Sí, confirmar',
      cancelLabel: 'Todavía no',
    });
    if (ok) onConfirmBooking?.(booking.id);
  };

  /**
   * El comprobante vive en un bucket privado. La URL firmada se pide en el
   * momento y dura 60 segundos: alcanza de sobra para abrir la pestaña y no
   * deja un link que siga sirviendo si alguien lo copia.
   */
  const verComprobante = async (path) => {
    const { data } = await supabase.storage.from('comprobantes').createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank', 'noopener');
  };

  // Productos activos del store, máx 6 en el picker rápido
  const quickProducts = products.filter((p) => p.activo !== false).slice(0, 8);

  const addToCart = (prod) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === prod.id);
      if (existing) {
        return prev.map((item) => item.id === prod.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { id: prod.id, name: prod.nombre, price: prod.precio, qty: 1 }];
    });
  };

  const removeFromCart = (prodId) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === prodId);
      if (existing.qty === 1) {
        return prev.filter((item) => item.id !== prodId);
      }
      return prev.map((item) => item.id === prodId ? { ...item, qty: item.qty - 1 } : item);
    });
  };

  const handleConfirmCantina = () => {
    if (cart.length === 0) return;
    onAddCantinaToBooking(booking.id, cart);
    setCart([]);
    setShowAddCantina(false);
  };

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
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              {onEditBooking && !isEditing && (
                <button className="btn-icon" onClick={startEditing} aria-label="Editar turno">
                  <Pencil size={14} />
                </button>
              )}
              <button className="btn-icon" onClick={onClose} aria-label="Cerrar"><X size={15} /></button>
            </div>
          </div>

          {/* Edición: nombre, teléfono, notas */}
          {isEditing && (
            <div style={{
              padding: 14, borderRadius: 14, background: 'var(--bg-surface)',
              border: '1px solid var(--border-mid)', marginBottom: 16,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cliente</label>
                <div className="input-icon-wrap">
                  <User size={14} className="input-icon" />
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="form-input"
                    autoFocus
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono WhatsApp</label>
                <div className="input-icon-wrap">
                  <Phone size={14} className="input-icon" />
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="form-input"
                    placeholder="+54 9 351..."
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Notas</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="form-input"
                  rows={2}
                  style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 2 }}>
                <button type="button" onClick={() => setIsEditing(false)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: '0.78rem' }}>
                  Cancelar
                </button>
                <button type="button" onClick={handleSaveEdit} className="btn-primary" style={{ padding: '7px 16px', fontSize: '0.78rem' }}>
                  <Save size={13} style={{ color: 'var(--on-accent)' }} /> Guardar
                </button>
              </div>
            </div>
          )}

          {/* Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Estado del Turno
              </span>
              {sinConfirmar ? (
                <span className="badge badge-pending" style={{ fontSize: '0.72rem' }}>
                  <Clock size={11} /> Sin confirmar
                </span>
              ) : (
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  fontSize: '0.78rem', fontWeight: 800, padding: '3px 8px', borderRadius: 6,
                  background: isFullyPaid ? 'rgba(0,176,255,0.15)' : 'rgba(255,179,0,0.15)',
                  color: isFullyPaid ? 'var(--blue)' : 'var(--amber)',
                  border: `1px solid ${isFullyPaid ? 'rgba(0,176,255,0.3)' : 'rgba(255,179,0,0.3)'}`,
                }}>
                  {isFullyPaid ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                  {isFullyPaid ? 'Pagado 100%' : 'Señado (Pendiente)'}
                </span>
              )}
              {sinConfirmar && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 5 }}>
                  {minutosRestantes == null
                    ? 'Esperando la seña'
                    : minutosRestantes > 0
                      ? `Se libera solo en ${minutosRestantes} min`
                      : 'Venciendo — el horario se libera enseguida'}
                  {booking.codigo ? ` · #${booking.codigo}` : ''}
                </p>
              )}
            </div>

            <div style={{ padding: '12px', borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                Medio de Cobro
              </span>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {booking.paymentMethod || 'Transferencia'}
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

          {/* Seña declarada por WhatsApp que todavía nadie miró.
              El bot confirma el turno para que el cliente tenga respuesta al
              instante, pero la plata no se da por buena hasta que alguien abre
              el comprobante. Mientras tanto queda acá, visible y con nombre. */}
          {pagosSinValidar.length > 0 && (
            <div style={{
              padding: '12px 14px', borderRadius: 12, marginBottom: 16,
              background: 'rgb(245 165 36 / 0.06)', border: '1px dashed rgb(245 165 36 / 0.4)',
            }}>
              <p style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--color-partial-500)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Clock size={13} /> Seña sin validar
              </p>
              {pagosSinValidar.map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                  <span className="num" style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: 0 }}>
                    {formatARS(p.monto)}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {p.comprobantePath && (
                      <button
                        type="button"
                        onClick={() => verComprobante(p.comprobantePath)}
                        className="btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '0.72rem' }}
                      >
                        Ver comprobante
                      </button>
                    )}
                    {puedeGestionarTurnos && (
                      <button
                        type="button"
                        onClick={() => onValidatePayment?.(booking.id, p.id)}
                        className="btn-primary"
                        style={{ padding: '5px 12px', fontSize: '0.72rem' }}
                      >
                        <CheckCircle2 size={12} style={{ color: 'var(--on-accent)' }} /> Validar
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

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
                  const cartItem = cart.find(c => c.id === prod.id);
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addToCart(prod)}
                      style={{
                        padding: '5px 9px', borderRadius: 7, fontSize: '0.74rem', fontWeight: 700,
                        background: cartItem ? 'rgba(0,176,255,0.1)' : 'var(--bg-card)', 
                        border: `1px solid ${cartItem ? 'var(--blue)' : 'var(--border-dim)'}`,
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

              {cart.length > 0 && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--border-dim)' }}>
                  {cart.map(item => (
                    <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: 6 }}>
                      <span style={{ color: 'var(--text-primary)' }}>{item.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, color: 'var(--text-muted)' }}>{formatARS(item.price * item.qty)}</span>
                        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--bg-card)', border: '1px solid var(--border-dim)', borderRadius: 6 }}>
                          <button onClick={() => removeFromCart(item.id)} style={{ padding: '2px 8px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>-</button>
                          <span style={{ fontSize: '0.74rem', fontWeight: 700, width: 20, textAlign: 'center' }}>{item.qty}</span>
                          <button onClick={() => addToCart({ id: item.id })} style={{ padding: '2px 8px', color: 'var(--text-primary)', cursor: 'pointer', background: 'none', border: 'none' }}>+</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleConfirmCantina}
                    className="btn-primary"
                    style={{ width: '100%', justifyContent: 'center', padding: '9px', fontSize: '0.82rem', marginTop: 10 }}
                  >
                    <CheckCircle2 size={14} style={{ color: 'var(--on-accent)' }} /> Confirmar Consumos ({formatARS(cart.reduce((a, b) => a + b.price * b.qty, 0))})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* El camino manual siempre tiene que existir: el bot se puede caer
                y la seña se puede cobrar en efectivo en el mostrador. */}
            {sinConfirmar && puedeGestionarTurnos && onConfirmBooking && (
              <button
                onClick={handleConfirmClick}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: '0.85rem' }}
              >
                <CheckCircle2 size={16} style={{ color: 'var(--on-accent)' }} />
                Confirmar turno
              </button>
            )}

            {!sinConfirmar && !isFullyPaid && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { onSettleBooking(booking.id, 'efectivo'); onClose(); }}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '11px', fontSize: '0.85rem', background: 'var(--green)' }}
                >
                  <CheckCircle2 size={16} style={{ color: 'var(--on-accent)' }} />
                  Efectivo ({formatARS(balance)})
                </button>
                <button
                  onClick={() => { onSettleBooking(booking.id, 'transferencia'); onClose(); }}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', padding: '11px', fontSize: '0.85rem' }}
                >
                  <CheckCircle2 size={16} style={{ color: 'var(--on-accent)' }} />
                  Transferencia
                </button>
              </div>
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
                style={{ justifyContent: 'center', padding: '9px', fontSize: '0.78rem', gap: 5, color: 'var(--green)', borderColor: 'rgb(from var(--green) r g b / 0.3)' }}
                disabled={!booking.clientPhone}
              >
                <MessageSquare size={14} />
                Recordatorio WA
              </button>
            </div>

            {/* Cancelar un turno NO es un borrado: deja el registro con
                estado 'cancelado'. Por eso el permiso que corresponde es
                `gestionar_turnos` (el mismo que exige la policy de UPDATE en
                `bookings`) y no `eliminar_registros`. */}
            {puedeGestionarTurnos && (
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
            )}
          </div>

        </div>
      </div>

      {/* ConfirmDialog se monta sobre el modal actual */}
      {ConfirmDialogMount}
    </>
  );
}
