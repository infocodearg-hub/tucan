import React, { useState } from 'react';
import { Globe, MapPin, CheckCircle2, QrCode, ShieldCheck, Phone, MessageSquare } from 'lucide-react';
import { COMPLEX_INFO, TIME_SLOTS } from '../data/mockData';

export default function VistaPublicaJugador() {
  const [selectedCanchaId, setSelectedCanchaId] = useState('c1');
  const [selectedTime, setSelectedTime] = useState('20:00');
  const [success, setSuccess] = useState(false);

  const cancha = COMPLEX_INFO.canchas.find(c => c.id === selectedCanchaId) || COMPLEX_INFO.canchas[0];
  const isNight = parseInt(selectedTime.split(':')[0]) >= 19 || selectedTime === '00:00';
  const price = isNight ? cancha.priceNight : cancha.priceDay;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Web Pública para Jugadores</h1>
          <p className="section-subtitle">Vista previa de la página que ven los clientes al escanear el QR del complejo</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, background: 'rgba(0,230,118,0.08)', border: '1px solid rgba(0,230,118,0.3)', fontSize: '0.8rem', fontWeight: 700, color: '#00E676' }}>
          <QrCode size={14} />
          tucan.app/maracana
        </div>
      </div>

      {/* Mobile Mockup */}
      <div style={{ maxWidth: 520, margin: '0 auto', width: '100%' }}>
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
              background: 'linear-gradient(140deg, #00E676, #00A040)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              boxShadow: '0 8px 24px rgba(0,230,118,0.4)'
            }}>⚽</div>
            <h2 className="font-heading" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', marginBottom: 6 }}>
              {COMPLEX_INFO.name}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
              <MapPin size={12} color="#00E676" /> {COMPLEX_INFO.address}, {COMPLEX_INFO.city}
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '5px 14px', borderRadius: 99, background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', fontSize: '0.76rem', fontWeight: 800, color: '#00E676' }}>
              <ShieldCheck size={13} /> Reservas verificadas 24/7
            </div>
          </div>

          {success ? (
            <div style={{ padding: '28px', borderRadius: 16, textAlign: 'center', background: 'rgba(0,230,118,0.07)', border: '1px solid rgba(0,230,118,0.35)' }}>
              <CheckCircle2 size={48} color="#00E676" style={{ margin: '0 auto 14px' }} />
              <h3 className="font-heading" style={{ fontWeight: 900, color: '#fff', fontSize: '1.1rem', marginBottom: 8 }}>
                ¡Pre-Reserva Iniciada!
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 18 }}>
                Te redirigimos a WhatsApp para confirmar tu seña con nuestro Bot IA en segundos.
              </p>
              <button onClick={() => setSuccess(false)} className="btn-secondary" style={{ margin: '0 auto' }}>
                ← Volver a la vista previa
              </button>
            </div>
          ) : (
            <form onSubmit={e => { e.preventDefault(); setSuccess(true); }} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              {/* Step 1: Select court */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  1 · Elegí la Cancha
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {COMPLEX_INFO.canchas.map(c => (
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
                      <div className="font-heading" style={{ fontWeight: 800, fontSize: '0.82rem', color: selectedCanchaId === c.id ? c.color : '#fff', marginBottom: 3 }}>
                        {c.name.split(' - ')[0]}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{c.type}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 2: Select time */}
              <div>
                <p style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 10 }}>
                  2 · Elegí el Horario
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {TIME_SLOTS.slice(4).map(t => {
                    const isSelected = selectedTime === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSelectedTime(t)}
                        style={{
                          padding: '9px 4px', borderRadius: 10, cursor: 'pointer', transition: 'all 0.18s ease',
                          fontSize: '0.8rem', fontWeight: 700,
                          background: isSelected ? '#00E676' : 'var(--bg-input)',
                          border: `1px solid ${isSelected ? '#00E676' : 'var(--border-dim)'}`,
                          color: isSelected ? '#040A06' : 'var(--text-primary)',
                          boxShadow: isSelected ? '0 3px 12px rgba(0,230,118,0.35)' : 'none'
                        }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Summary & CTA */}
              <div style={{
                padding: '16px', borderRadius: 14,
                background: 'var(--bg-card)', border: '1px solid var(--border-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
              }}>
                <div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {cancha.name.split(' - ')[0]} · {selectedTime} hs · {isNight ? '🌙 Nocturno' : '☀️ Diurno'}
                  </p>
                  <p className="font-heading" style={{ fontSize: '1.3rem', fontWeight: 900, color: '#fff', lineHeight: 1 }}>
                    ${price.toLocaleString('es-AR')}
                  </p>
                  <p style={{ fontSize: '0.72rem', color: '#00E676', fontWeight: 700, marginTop: 4 }}>
                    Seña: ${(price/2).toLocaleString('es-AR')} (50%)
                  </p>
                </div>
                <button type="submit" className="btn-primary" style={{ padding: '12px 18px', flexShrink: 0 }}>
                  <MessageSquare size={15} style={{ color: '#040A06' }} />
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
