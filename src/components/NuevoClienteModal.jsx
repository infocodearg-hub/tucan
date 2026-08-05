/**
 * NuevoClienteModal.jsx — dual mode (crear / editar)
 *
 * Antes pedía elegir a mano una "categoría/badge inicial" (VIP, Capitán,
 * Regular) que además ni se usaba — App.jsx la ignoraba al crear el
 * cliente. Las etiquetas del CRM se DERIVAN del comportamiento real
 * (ver lib/status.js badgeForClient), así que no hay nada que elegir acá:
 * el formulario solo pide los datos de contacto, notas, y opcionalmente
 * un score manual (para clientes que vienen de antes del sistema).
 *
 * mode="create" (cliente=null) o mode="edit" (cliente=Client). Se monta
 * solo cuando está abierto, con key={cliente?.id ?? 'new'} desde el padre.
 */
import React, { useState } from 'react';
import { X, Check, UserPlus, Phone, User, Mail, Trash2 } from 'lucide-react';

export default function NuevoClienteModal({ isOpen, onClose, cliente = null, onSave, onDelete }) {
  const isEdit = !!cliente;

  const [name, setName] = useState(cliente?.nombre ?? '');
  const [phone, setPhone] = useState(cliente?.telefono ?? '');
  const [email, setEmail] = useState(cliente?.email ?? '');
  const [score, setScore] = useState(cliente?.score != null ? String(cliente.score) : '');
  const [notes, setNotes] = useState(cliente?.notas ?? '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio.');
    if (score !== '' && (Number(score) < 0 || Number(score) > 10)) {
      return setError('El score va de 0 a 10.');
    }

    const result = onSave({
      nombre: name.trim(),
      telefono: phone.trim() || null,
      email: email.trim() || null,
      score: score === '' ? null : Number(score),
      notas: notes,
    });

    if (result && result.ok === false) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 460 }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 20,
            paddingBottom: 14,
            borderBottom: '1px solid var(--border-dim)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(0,176,255,0.12)',
                border: '1px solid rgba(0,176,255,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserPlus size={18} color="var(--blue)" />
            </div>
            <div>
              <h3
                className="font-heading"
                style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}
              >
                {isEdit ? 'Editar Cliente' : 'Registrar Nuevo Cliente / Jugador'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {isEdit ? cliente.nombre : 'Agregá un jugador a la base de datos CRM'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {error && (
              <div
                role="alert"
                style={{
                  padding: '9px 12px',
                  borderRadius: 10,
                  background: 'rgba(255,79,79,0.1)',
                  border: '1px solid rgba(255,79,79,0.3)',
                  color: 'var(--red)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre y Apellido / Equipo *</label>
              <div className="input-icon-wrap">
                <User size={15} className="input-icon" />
                <input
                  type="text"
                  placeholder="Ej: Facundo Gómez"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Teléfono WhatsApp</label>
                <div className="input-icon-wrap">
                  <Phone size={15} className="input-icon" />
                  <input
                    type="text"
                    placeholder="+54 9 351..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Email (opcional)</label>
                <div className="input-icon-wrap">
                  <Mail size={15} className="input-icon" />
                  <input
                    type="email"
                    placeholder="cliente@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Score (0-10, opcional)</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.1"
                placeholder="Se calcula solo si lo dejás vacío"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                className="form-input num"
                style={{ maxWidth: 200 }}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notas</label>
              <textarea
                placeholder="Ej: siempre paga con MP, pide cancha techada..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="form-input"
                rows={2}
                style={{ resize: 'vertical', fontFamily: 'var(--font-sans)' }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: isEdit && onDelete ? 'space-between' : 'flex-end',
                alignItems: 'center',
                gap: 10,
                marginTop: 10,
                paddingTop: 14,
                borderTop: '1px solid var(--border-dim)',
              }}
            >
              {isEdit && onDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(cliente)}
                  className="btn-secondary"
                  style={{ padding: '9px 14px', color: 'var(--red)', borderColor: 'rgba(255,79,79,0.35)' }}
                >
                  <Trash2 size={14} /> Eliminar
                </button>
              )}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px' }}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: '9px 20px' }}>
                  <Check size={15} style={{ color: 'var(--on-accent)' }} />
                  {isEdit ? 'Guardar Cambios' : 'Guardar Cliente'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
