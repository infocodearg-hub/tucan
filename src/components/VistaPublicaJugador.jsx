import React, { useState } from 'react';
import { MapPin, CheckCircle2, ShieldCheck, User, Phone, MessageSquare, AlertCircle, Sun, Moon, Volleyball } from 'lucide-react';
import { useCanchasActivas, useConfig, useBookingActions } from '../store';
import { precioSlot, isNightSlot, senaSugerida } from '../lib/pricing';
import { formatARS } from '../lib/format';
import { todayISO } from '../lib/date';
import { normalizePhone } from '../lib/phone';
import { openWhatsApp, msgConsultaPublica } from '../lib/whatsapp';

export default function VistaPublicaJugador() {
  const canchas  = useCanchasActivas();
  const config   = useConfig();
  const bookingActions = useBookingActions();
  const nightFrom = config?.operacion?.horaNocturnaDesde ?? '19:00';
  const slots      = config?.operacion?.slots ?? [];

  const [selectedCanchaId, setSelectedCanchaId] = useState(canchas[0]?.id ?? '');
  const [selectedTime, setSelectedTime] = useState(slots[0] ?? '20:00');
  const [playerName, setPlayerName] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const cancha = canchas.find(c => c.id === selectedCanchaId) || canchas[0] || null;
  const isNight = isNightSlot(selectedTime, nightFrom);
  const price = precioSlot(cancha, selectedTime, nightFrom);
  const sena = senaSugerida(price, config?.pagos?.senaMinimaPorcentaje ?? 50);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!playerName.trim()) {
      setError('Ingresá tu nombre para reservar.');
      return;
    }
    if (!cancha) {
      setError('No hay canchas disponibles en este momento.');
      return;
    }

    const result = bookingActions.crear({
      fecha: todayISO(),
      hora: selectedTime,
      canchaId: cancha.id,
      clienteId: null,
      clienteNombre: playerName.trim(),
      clienteTelefono: normalizePhone(playerPhone),
      estado: 'reservado',
      precioCancha: price,
      pagos: [],
      notas: '',
      canal: 'web',
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    openWhatsApp(
      config?.complejo?.telefono,
      msgConsultaPublica({
        cancha,
        fecha: todayISO(),
        hora: selectedTime,
        precio: price,
        sena,
        complejo: config?.complejo?.nombre,
      })
    );
    setSuccess(true);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>

      {/* Mobile Mockup */}
      <div style={{ maxWidth: 520, width: '100%' }}>
        <div style={{
          borderRadius: 24, border: '2px solid var(--border-mid)',
          background: 'var(--bg-surface)', padding: '24px',
          boxShadow: '0 30px 80px rgba(0,0,0,0.6), 0 0 40px rgba(0,230,118,0.08)',
          display: 'flex', flexDirection: 'column', gap: 20
        }}>

          {/* Cover */}
          <div style={{
            padding: '24px', borderRadius: 18, textAlign: 'center',
            background: 'linear-gradient(140deg, rgba(0,230,118,0.12) 0%, rgba(0,176,255,0.06) 100%)',
            border: '1px solid rgba(0,230,118,0.25)'
          }}>
            <div style={{
              width: 60, height: 60, borderRadius: 18, marginBottom: 12, margin: '0 auto 12px',
              background: 'linear-gradient(140deg, var(--green), var(--green-dark))',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              boxShadow: '0 8px 24px rgba(0,230,118,0.4)'
            }}>
              <Volleyball size={26} color="white" strokeWidth={2.2} />
            </div>
            <h2 className="font-heading" style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', marginBottom: 6 }}>
              {config?.complejo?.nombre ?? 'Complejo'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <MapPin size={12} color="var(--green)" /> {config?.complejo?.direccion ?? ''}{config?.complejo?.direccion && config?.complejo?.ciudad ? ', ' : ''}{config?.complejo?.ciudad ?? ''}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '5px 14px', borderRadius: 99, background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', fontSize: '0.76rem', fontWeight: 800, color: 'var(--green)' }}>
              <ShieldCheck size={13} /> Reservas verificadas 24/7
            </div>
          </div>

          {success ? (
            <div style={{ padding: '28px', borderRadius: 16, textAlign: 'center', background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.35)' }}>
              <CheckCircle2 size={48} color="var(--green)" style={{ margin: '0 auto 14px' }} />
              <h3 className="font-heading" style={{ fontWeight: 900, color: 'var(--text-primary)', fontSize: '1.1rem', marginBottom: 8 }}>
                ¡Turno Reservado!
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
                Te redirigimos a WhatsApp para confirmar tu seña con el complejo.
              </p>
              <button onClick={() => setSuccess(false)} className="btn-secondary" style={{ margin: '0 auto' }}>
                ← Volver a la vista previa
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {error && (
                <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,79,79,0.08)', border: '1px solid rgba(255,79,79,0.3)', color: 'var(--red)', fontSize: '0.8rem' }}>
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Step 1: Select court */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  1 · Elegí la Cancha
                </p>
                {canchas.length === 0 ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No hay canchas disponibles.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 100px), 1fr))', gap: 8 }}>
                    {canchas.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedCanchaId(c.id)}
                        style={{
                          padding: '12px 8px', borderRadius: 12, textAlign: 'center', cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          background: selectedCanchaId === c.id ? `${c.color}18` : 'var(--bg-input)',
                          border: `1px solid ${selectedCanchaId === c.id ? c.color : 'var(--border-dim)'}`,
                          boxShadow: selectedCanchaId === c.id ? `0 0 14px ${c.color}22` : 'none'
                        }}
                      >
                        <div className="font-heading" style={{ fontWeight: 800, fontSize: '0.82rem', color: selectedCanchaId === c.id ? c.color : 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {c.nombre}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.subtitulo || '—'}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Step 2: Select time */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  2 · Elegí el Horario
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {slots.map(t => {
                    const isSelected = selectedTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        style={{
                          padding: '9px 4px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s ease',
                          fontSize: '0.8rem', fontWeight: 700,
                          background: isSelected ? 'var(--green)' : 'var(--bg-input)',
                          border: `1px solid ${isSelected ? 'var(--green)' : 'var(--border-dim)'}`,
                          color: isSelected ? 'var(--on-accent)' : 'var(--text-primary)',
                          boxShadow: isSelected ? '0 3px 12px rgba(0,230,118,0.35)' : 'none'
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 3: Player details */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  3 · Tus Datos
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="input-icon-wrap">
                    <User size={14} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Tu nombre"
                      value={playerName}
                      onChange={e => setPlayerName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                  <div className="input-icon-wrap">
                    <Phone size={14} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Tu WhatsApp (opcional)"
                      value={playerPhone}
                      onChange={e => setPlayerPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>

              {/* Summary & CTA */}
              <div style={{
                padding: '16px', borderRadius: 14,
                background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
              }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 5, fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {cancha?.nombre ?? '—'} · {selectedTime} hs ·
                    {isNight ? <Moon size={11} /> : <Sun size={11} />}
                    {isNight ? 'Nocturno' : 'Diurno'}
                  </p>
                  <p className="font-heading num" style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                    {formatARS(price)}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--green)', fontWeight: 700, marginTop: 4 }}>
                    Seña: {formatARS(sena)} ({config?.pagos?.senaMinimaPorcentaje ?? 50}%)
                  </p>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '12px 18px', flexShrink: 0 }}>
                  <MessageSquare size={15} style={{ color: 'var(--on-accent)' }} />
                  Reservar por WhatsApp
                </button>
              </div>

            </form>
          )}
        </div>
      </div>

    </div>
  );
}
