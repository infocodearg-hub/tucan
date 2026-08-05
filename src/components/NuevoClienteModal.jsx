import React, { useState } from 'react';
import { X, Check, UserPlus, Phone, User, Award, ShieldCheck, Crown } from 'lucide-react';

export default function NuevoClienteModal({ isOpen, onClose, onAddClient }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [badge, setBadge] = useState('Cliente Fiel 🌟');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    onAddClient({
      id: 'cli_' + Date.now(),
      name,
      phone: phone || '+54 9 351 000-0000',
      matchesPlayed: 1,
      cancellations: 0,
      badge: badge || 'Cliente Fiel',
      score: '10/10',
      lastMatch: 'Hoy',
      totalSpent: 0
    });

    setName('');
    setPhone('');
    setNotes('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 460 }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid var(--border-dim)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: 'rgba(0,176,255,0.12)', border: '1px solid rgba(0,176,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <UserPlus size={18} color="var(--blue)" />
            </div>
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                Registrar Nuevo Cliente / Jugador
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Agregá un jugador a la base de datos CRM</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre y Apellido / Equipo *</label>
              <div className="input-icon-wrap">
                <User size={15} className="input-icon" />
                <input
                  type="text"
                  placeholder="Ej: Facundo Gómez"
                  value={name}
                  onChange={e => setName(e.target.value)}
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
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoría / Badge Inicial</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {[
                  { id: 'Jugador VIP ⭐️', label: 'VIP', icon: Crown, color: 'var(--amber)' },
                  { id: 'Capitán Fijo 🛡️', label: 'Capitán', icon: ShieldCheck, color: 'var(--blue)' },
                  { id: 'Cliente Fiel 🌟', label: 'Regular', icon: Award, color: 'var(--green)' },
                ].map(b => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBadge(b.id)}
                    style={{
                      padding: '8px 6px', borderRadius: 10, fontSize: '0.76rem', fontWeight: 800,
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                      background: badge === b.id ? `${b.color}18` : 'var(--bg-input)',
                      border: `1px solid ${badge === b.id ? b.color : 'var(--border-dim)'}`,
                      color: badge === b.id ? b.color : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <b.icon size={13} /> {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px' }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '9px 20px' }}>
                <Check size={15} style={{ color: 'var(--on-accent)' }} /> Guardar Cliente
              </button>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
