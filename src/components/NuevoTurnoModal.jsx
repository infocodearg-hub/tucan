import React, { useState } from 'react';
import {
  X, Check, Calendar, Clock, User, Phone, Plus, ShoppingBag,
  Minus, Zap, CreditCard, Building, Wallet, Sun, Moon,
} from 'lucide-react';
import { useCanchasActivas, useConfig, useProducts } from '../store';
import { precioSlot, isNightSlot } from '../lib/pricing';
import { formatARS } from '../lib/format';
import { iconForProduct } from '../lib/catalog';
import CustomSelect from './CustomSelect';

const PAYMENT_METHODS = [
  { value: 'Mercado Pago (Link QR Bot)', label: 'Mercado Pago (QR Bot)', icon: CreditCard },
  { value: 'Transferencia Bancaria',     label: 'Transferencia CBU',      icon: Building },
  { value: 'Efectivo Mostrador',         label: 'Efectivo Mostrador',      icon: Wallet },
];

export default function NuevoTurnoModal({ isOpen, onClose, onSaveBooking, initialCanchaId, initialTime }) {
  const canchas   = useCanchasActivas();
  const config    = useConfig();
  const products  = useProducts();
  const nightFrom = config?.operacion?.horaNocturnaDesde ?? '19:00';
  const slots     = config?.operacion?.slots ?? [];

  const [canchaId,       setCanchaId]       = useState(initialCanchaId || canchas[0]?.id || '');
  const [time,           setTime]           = useState(initialTime || slots[0] || '20:00');
  const [clientName,     setClientName]     = useState('');
  const [clientPhone,    setClientPhone]    = useState('');
  const [paymentStatus,  setPaymentStatus]  = useState('partial');
  const [depositPaid,    setDepositPaid]    = useState(0);
  const [paymentMethod,  setPaymentMethod]  = useState('Mercado Pago (Link QR Bot)');
  const [notes,          setNotes]          = useState('');
  const [cantinaItems,   setCantinaItems]   = useState([]);

  if (!isOpen) return null;

  const selectedCancha = canchas.find(c => c.id === canchaId) || canchas[0] || null;
  const isNight         = isNightSlot(time, nightFrom);
  const basePrice        = precioSlot(selectedCancha, time, nightFrom);
  const cantinaTotal     = cantinaItems.reduce((acc, i) => acc + i.precio * i.qty, 0);
  const grandTotal       = basePrice + cantinaTotal;
  const actualDeposit    = paymentStatus === 'paid' ? grandTotal : Number(depositPaid);
  const balanceDue       = grandTotal - actualDeposit;

  const activeProducts = products.filter(p => p.activo).slice(0, 5);

  const addCantina = (prod) => setCantinaItems(prev => {
    const ex = prev.find(i => i.id === prod.id);
    return ex ? prev.map(i => i.id === prod.id ? { ...i, qty: i.qty + 1 } : i)
              : [...prev, { ...prod, qty: 1 }];
  });

  const removeCantina = (id) => setCantinaItems(prev =>
    prev.map(i => i.id === id ? { ...i, qty: i.qty - 1 } : i).filter(i => i.qty > 0)
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientName.trim()) return;
    onSaveBooking({
      canchaId, time,
      clientName, clientPhone,
      status: paymentStatus,
      totalPrice: grandTotal, depositPaid: actualDeposit,
      paymentMethod,
      cantinaExtras: cantinaItems.map(i => ({ id: i.id, name: i.nombre, price: i.precio, qty: i.qty })),
      notes, channel: 'manual',
    });
    onClose();
  };

  // Options for custom select
  const canchaOptions = canchas.map(c => ({
    value: c.id,
    label: `${c.nombre} · ${formatARS(precioSlot(c, time, nightFrom))}`
  }));

  const timeOptions = slots.map(t => ({
    value: t,
    label: `${t} hs ${isNightSlot(t, nightFrom) ? 'Nocturno' : 'Diurno'}`,
    icon: isNightSlot(t, nightFrom) ? Moon : Sun,
  }));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content">

        {/* ─── Modal Header ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: 'linear-gradient(140deg, rgba(0,230,118,0.2), rgba(0,230,118,0.08))',
              border: '1px solid rgba(0,230,118,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Calendar size={18} color="var(--green)" />
            </div>
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                Agendar Nuevo Turno
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 1 }}>
                Carga manual · mostrador o teléfono
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ─── Court & Time (CustomSelect) ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cancha</label>
                <CustomSelect
                  options={canchaOptions}
                  value={canchaId}
                  onChange={setCanchaId}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Horario</label>
                <CustomSelect
                  options={timeOptions}
                  value={time}
                  onChange={setTime}
                  icon={Clock}
                />
              </div>
            </div>

            {/* ─── Price Banner ─── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(0,230,118,0.06)', border: '1px solid rgba(0,230,118,0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                <Zap size={14} color="var(--green)" />
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                  {selectedCancha?.nombre ?? 'Sin canchas activas'} ·
                  {isNight ? <Moon size={12} /> : <Sun size={12} />}
                  {isNight ? 'Nocturno' : 'Diurno'}
                </span>
              </div>
              <span className="font-heading num" style={{ fontWeight: 900, color: 'var(--green)', fontSize: '1rem' }}>
                {formatARS(basePrice)}
              </span>
            </div>

            {/* ─── Client Details ─── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Cliente / Equipo *</label>
                <div className="input-icon-wrap">
                  <User size={15} className="input-icon" />
                  <input
                    type="text"
                    placeholder="Ej: Los Pibes FC"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono WhatsApp</label>
                <div className="input-icon-wrap">
                  <Phone size={15} className="input-icon" />
                  <input
                    type="text"
                    placeholder="+54 9 351..."
                    value={clientPhone}
                    onChange={e => setClientPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            {/* ─── Payment Status ─── */}
            <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
              <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 10 }}>
                Estado Financiero del Turno
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: paymentStatus === 'partial' ? 14 : 0 }}>
                {[
                  { id: 'partial', label: 'Con Seña',    color: 'var(--amber)' },
                  { id: 'paid',    label: 'Pagado 100%', color: 'var(--blue)' },
                  { id: 'blocked', label: 'Bloquear',    color: 'var(--red)' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setPaymentStatus(opt.id);
                      if (opt.id === 'paid') setDepositPaid(basePrice);
                      if (opt.id === 'partial') setDepositPaid(Math.round(basePrice / 2));
                      if (opt.id === 'blocked') setDepositPaid(0);
                    }}
                    style={{
                      padding: '9px 10px', borderRadius: 10, fontSize: '0.76rem', fontWeight: 800,
                      cursor: 'pointer', transition: 'all 0.18s ease',
                      border: `1px solid ${paymentStatus === opt.id ? opt.color : 'var(--border-dim)'}`,
                      background: paymentStatus === opt.id ? `${opt.color}18` : 'var(--bg-input)',
                      color: paymentStatus === opt.id ? opt.color : 'var(--text-muted)',
                      boxShadow: paymentStatus === opt.id ? `0 0 12px ${opt.color}22` : 'none'
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {paymentStatus === 'partial' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingTop: 4 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.68rem' }}>Monto Seña ($)</label>
                    <input
                      type="number"
                      value={depositPaid}
                      onChange={e => setDepositPaid(e.target.value)}
                      className="form-input"
                      style={{ padding: '9px 12px', fontSize: '0.9rem' }}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.68rem' }}>Medio de Cobro</label>
                    <CustomSelect
                      options={PAYMENT_METHODS}
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ─── Cantina Add-ons ─── */}
            <div style={{ padding: 14, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                  <ShoppingBag size={13} color="var(--text-secondary)" /> Adicionales de Cantina
                </span>
                {cantinaTotal > 0 && (
                  <span className="font-heading num" style={{ fontWeight: 800, color: 'var(--green)', fontSize: '0.85rem' }}>
                    +{formatARS(cantinaTotal)}
                  </span>
                )}
              </div>
              {activeProducts.length === 0 ? (
                <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>No hay productos activos en el catálogo.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: cantinaItems.length > 0 ? 10 : 0 }}>
                  {activeProducts.map(prod => {
                    const ProdIcon = iconForProduct(prod);
                    return (
                      <button
                        key={prod.id}
                        type="button"
                        onClick={() => addCantina(prod)}
                        className="chip-hoverable"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '6px 10px', borderRadius: 8, fontSize: '0.76rem', fontWeight: 600,
                          background: 'var(--bg-input)', border: '1px solid var(--border-dim)',
                          color: 'var(--text-primary)', cursor: 'pointer',
                        }}
                      >
                        <ProdIcon size={13} color="var(--text-secondary)" />
                        <span>{prod.nombre.split(' ')[0]}</span>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>{formatARS(prod.precio)}</span>
                        <Plus size={11} color="var(--green)" />
                      </button>
                    );
                  })}
                </div>
              )}

              {cantinaItems.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {cantinaItems.map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)' }}>
                        {item.qty}× {item.nombre}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="font-heading num" style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.82rem' }}>
                          {formatARS(item.precio * item.qty)}
                        </span>
                        <button type="button" onClick={() => removeCantina(item.id)} style={{
                          width: 22, height: 22, borderRadius: 6, background: 'rgba(255,79,79,0.1)',
                          border: '1px solid rgba(255,79,79,0.25)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--red)'
                        }}>
                          <Minus size={11} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Notes ─── */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Observaciones</label>
              <input
                type="text"
                placeholder="Ej: Necesitan pecheras, avisan si llueve..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="form-input"
              />
            </div>

            {/* ─── Summary & Submit ─── */}
            <div style={{ borderTop: '1px solid var(--border-dim)', paddingTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 2 }}>Total Turno + Extras</p>
                <p className="font-heading num" style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {formatARS(grandTotal)}
                  {balanceDue > 0 && (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--amber)', marginLeft: 8 }}>
                      ({formatARS(balanceDue)} en puerta)
                    </span>
                  )}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '10px 18px' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '10px 22px' }} disabled={!selectedCancha}>
                  <Check size={15} style={{ color: 'var(--on-accent)' }} />
                  Confirmar Turno
                </button>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
