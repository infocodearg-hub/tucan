import React, { useState } from 'react';
import { 
  Repeat, CheckCircle2, AlertTriangle, Plus, Phone, User, DollarSign, X, Calendar
} from 'lucide-react';
import { TURNOS_FIJOS_RECURRENTES, COMPLEX_INFO, TIME_SLOTS } from '../data/mockData';
import CustomSelect from './CustomSelect';

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function TurnosFijos() {
  const [turnos, setTurnos] = useState(TURNOS_FIJOS_RECURRENTES);
  const [showModal, setShowModal] = useState(false);

  const [teamName, setTeamName] = useState('');
  const [captain, setCaptain] = useState('');
  const [phone, setPhone] = useState('');
  const [day, setDay] = useState('Viernes');
  const [time, setTime] = useState('21:00');
  const [canchaName, setCanchaName] = useState('Cancha 1 - Fútbol 5');

  const handleCollect = (id) => {
    setTurnos(prev => prev.map(t => t.id === id ? { ...t, monthlyStatus: 'Al día' } : t));
  };

  const handleCreateTurnoFijo = (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;

    const newFijo = {
      id: 'tf_' + Date.now(),
      teamName,
      captain: captain || 'Capitán Equipo',
      phone: phone || '+54 9 351 000-0000',
      day,
      time,
      cancha: canchaName,
      monthlyPrice: 110000,
      monthlyStatus: 'Pendiente',
      lastPaymentDate: 'Pendiente'
    };

    setTurnos([newFijo, ...turnos]);
    setTeamName('');
    setCaptain('');
    setPhone('');
    setShowModal(false);
  };

  const monthlyTotal = turnos.reduce((s, t) => s + t.monthlyPrice, 0);
  const upToDate     = turnos.filter(t => t.monthlyStatus === 'Al día').length;
  const pending      = turnos.length - upToDate;

  // Options for CustomSelect
  const dayOptions = DAYS.map(d => ({ value: d, label: d }));
  const timeOptions = TIME_SLOTS.map(t => ({ value: t, label: `${t} hs` }));
  const canchaOptions = COMPLEX_INFO.canchas.map(c => ({ value: c.name, label: c.name }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Turnos Fijos</h1>
          <p className="section-subtitle">Equipos abonados con reserva automática semanal</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)} style={{ padding: '9px 18px' }}>
          <Plus size={15} style={{ color: '#040A06' }} />
          Nuevo Turno Fijo
        </button>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        {[
          { label: 'Total Equipos', value: turnos.length,   color: '#B988FC', sub: 'activos esta semana' },
          { label: 'Al Día',        value: upToDate,        color: '#00E676', sub: 'abono mensual cobrado' },
          { label: 'Pendientes',    value: pending,         color: pending > 0 ? '#FFB300' : '#00E676', sub: 'por cobrar este mes' },
          { label: 'Ingresos Mes',  value: `$${(monthlyTotal/1000).toFixed(0)}k`, color: '#00B0FF', sub: 'ingresos recurrentes' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--border-dim)' }}>
            <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</p>
            <p className="font-heading" style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</p>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {turnos.map(tf => {
          const ok = tf.monthlyStatus === 'Al día';
          return (
            <div key={tf.id} style={{
              padding: '18px', borderRadius: 14, background: 'var(--bg-card)',
              border: `1px solid ${ok ? 'var(--border-dim)' : 'rgba(255,179,0,0.3)'}`,
              transition: 'all 0.2s ease',
              boxShadow: ok ? 'none' : '0 0 18px rgba(255,179,0,0.07)'
            }}>
              
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: 99,
                      background: 'rgba(185,136,252,0.12)', border: '1px solid rgba(185,136,252,0.3)',
                      color: '#B988FC', fontSize: '0.78rem', fontWeight: 800
                    }}>
                      {tf.day}s · {tf.time}
                    </span>
                  </div>
                  <h3 className="font-heading" style={{ fontWeight: 800, color: '#fff', fontSize: '1rem' }}>{tf.teamName}</h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: 3 }}>{tf.cancha}</p>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 99, flexShrink: 0,
                  background: ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,179,0,0.1)',
                  border: `1px solid ${ok ? 'rgba(0,230,118,0.3)' : 'rgba(255,179,0,0.3)'}`,
                  color: ok ? '#00E676' : '#FFB300',
                  fontSize: '0.72rem', fontWeight: 800
                }}>
                  {ok ? '✓ Al día' : '⚠ Pendiente'}
                </span>
              </div>

              {/* Captain */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <User size={13} color="#00E676" /> {tf.captain}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Phone size={13} color="#00B0FF" /> {tf.phone}
                </span>
              </div>

              {/* Monthly price & action */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 10,
                background: 'var(--bg-surface)', border: '1px solid var(--border-dim)'
              }}>
                <div>
                  <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Abono Mensual
                  </p>
                  <p className="font-heading" style={{ fontWeight: 900, color: '#00E676', fontSize: '1.05rem' }}>
                    ${tf.monthlyPrice.toLocaleString('es-AR')}/mes
                  </p>
                </div>
                {ok ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', fontWeight: 800, color: '#00E676' }}>
                    <CheckCircle2 size={15} /> Cobrado
                  </span>
                ) : (
                  <button
                    onClick={() => handleCollect(tf.id)}
                    className="btn-primary"
                    style={{ padding: '7px 14px', fontSize: '0.78rem' }}
                  >
                    <DollarSign size={13} style={{ color: '#040A06' }} /> Cobrar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-content" style={{ maxWidth: 500 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border-dim)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(185,136,252,0.12)', border: '1px solid rgba(185,136,252,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Repeat size={17} color="#B988FC" />
                </div>
                <div>
                  <h3 className="font-heading" style={{ fontWeight: 800, color: '#fff' }}>Nuevo Turno Fijo</h3>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Reserva automática semanal</p>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>

            <form onSubmit={handleCreateTurnoFijo}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Nombre del Equipo / Grupo *</label>
                  <div className="input-icon-wrap">
                    <User size={14} className="input-icon" />
                    <input
                      type="text"
                      placeholder="Ej: Los Pibes del Viernes"
                      value={teamName}
                      onChange={e => setTeamName(e.target.value)}
                      className="form-input"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Nombre del Capitán</label>
                    <input
                      type="text"
                      placeholder="Ej: Juan Pérez"
                      value={captain}
                      onChange={e => setCaptain(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Teléfono WhatsApp</label>
                    <input
                      type="text"
                      placeholder="+54 9 351..."
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Día de la Semana</label>
                    <CustomSelect
                      options={dayOptions}
                      value={day}
                      onChange={setDay}
                    />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Horario</label>
                    <CustomSelect
                      options={timeOptions}
                      value={time}
                      onChange={setTime}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Cancha</label>
                  <CustomSelect
                    options={canchaOptions}
                    value={canchaName}
                    onChange={setCanchaName}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
                  <button type="submit" className="btn-primary">
                    <CheckCircle2 size={15} style={{ color: '#040A06' }} /> Guardar Turno Fijo
                  </button>
                </div>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
