/**
 * NuevoCanchaModal.jsx — dual mode (crear / editar)
 *
 * Mismo molde que NuevoProductoModal.jsx: cancha=null crea, cancha=objeto
 * edita, se monta solo cuando está abierto con key={cancha?.id ?? 'new'}.
 */
import React, { useState } from 'react';
import { X, Check, MapPin, Sun, Moon } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { DEPORTE_OPTIONS } from '../lib/status';

const COLOR_SWATCHES = [
  'var(--green)', 'var(--blue)', 'var(--purple)', 'var(--amber)', 'var(--red)', 'var(--volt)',
];

export default function NuevoCanchaModal({ isOpen, onClose, cancha = null, onSave }) {
  const isEdit = !!cancha;

  const [nombre, setNombre] = useState(cancha?.nombre ?? '');
  const [subtitulo, setSubtitulo] = useState(cancha?.subtitulo ?? '');
  const [deporte, setDeporte] = useState(cancha?.deporte ?? 'futbol5');
  const [precioDia, setPrecioDia] = useState(cancha?.precioDia != null ? String(cancha.precioDia) : '');
  const [precioNoche, setPrecioNoche] = useState(cancha?.precioNoche != null ? String(cancha.precioNoche) : '');
  const [color, setColor] = useState(cancha?.color ?? COLOR_SWATCHES[0]);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!nombre.trim()) return setError('El nombre es obligatorio.');
    if (precioDia === '' || Number(precioDia) < 0) return setError('El precio diurno tiene que ser 0 o mayor.');
    if (precioNoche === '' || Number(precioNoche) < 0) return setError('El precio nocturno tiene que ser 0 o mayor.');

    const result = onSave({
      nombre: nombre.trim(),
      subtitulo: subtitulo.trim(),
      deporte,
      precioDia: Number(precioDia),
      precioNoche: Number(precioNoche),
      color,
      activa: cancha?.activa ?? true,
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
                background: 'rgba(0,230,118,0.12)',
                border: '1px solid rgba(0,230,118,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapPin size={18} color="var(--green)" />
            </div>
            <div>
              <h3
                className="font-heading"
                style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}
              >
                {isEdit ? 'Editar Cancha' : 'Nueva Cancha'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {isEdit ? cancha.nombre : 'Agregá una cancha al complejo'}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Nombre *</label>
                <input
                  type="text"
                  placeholder="Ej: Cancha 4"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Subtítulo</label>
                <input
                  type="text"
                  placeholder="Ej: Techada"
                  value={subtitulo}
                  onChange={(e) => setSubtitulo(e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Deporte</label>
              <CustomSelect options={DEPORTE_OPTIONS} value={deporte} onChange={setDeporte} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sun size={12} /> Precio Diurno ($) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={precioDia}
                  onChange={(e) => setPrecioDia(e.target.value)}
                  className="form-input num"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Moon size={12} /> Precio Nocturno ($) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={precioNoche}
                  onChange={(e) => setPrecioNoche(e.target.value)}
                  className="form-input num"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {COLOR_SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    aria-label={`Elegir color ${c}`}
                    style={{
                      width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer',
                      border: color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                      outline: color === c ? '2px solid var(--bg-card)' : 'none',
                      outlineOffset: -4,
                    }}
                  />
                ))}
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 10,
                marginTop: 10,
                paddingTop: 14,
                borderTop: '1px solid var(--border-dim)',
              }}
            >
              <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px' }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '9px 20px' }}>
                <Check size={15} style={{ color: 'var(--on-accent)' }} />
                {isEdit ? 'Guardar Cambios' : 'Agregar Cancha'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
