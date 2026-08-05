/**
 * NuevoGastoModal.jsx — dual mode (crear / editar)
 *
 * Mismo molde que NuevoProductoModal.jsx: gasto=null crea, gasto=objeto edita,
 * se monta solo cuando está abierto con key={gasto?.id ?? 'new'} desde el padre.
 */
import React, { useState } from 'react';
import { X, Check, Receipt, Trash2 } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { GASTO_CATEGORIAS } from '../lib/status';
import { todayISO } from '../lib/date';

export default function NuevoGastoModal({ isOpen, onClose, gasto = null, onSave, onDelete }) {
  const isEdit = !!gasto;

  const [fecha, setFecha] = useState(gasto?.fecha ?? todayISO());
  const [concepto, setConcepto] = useState(gasto?.concepto ?? '');
  const [monto, setMonto] = useState(gasto?.monto != null ? String(gasto.monto) : '');
  const [categoria, setCategoria] = useState(gasto?.categoria ?? 'otro');
  const [notas, setNotas] = useState(gasto?.notas ?? '');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!concepto.trim()) return setError('El concepto es obligatorio.');
    if (monto === '' || Number(monto) <= 0) return setError('El monto tiene que ser mayor a 0.');
    if (!fecha) return setError('Falta la fecha.');

    const result = onSave({
      fecha,
      concepto: concepto.trim(),
      monto: Number(monto),
      categoria,
      notas: notas.trim(),
    });

    if (result && result.ok === false) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-content" style={{ maxWidth: 440 }}>
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
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={18} color="var(--text-secondary)" />
            </div>
            <div>
              <h3
                className="font-heading"
                style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}
              >
                {isEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {isEdit ? gasto.concepto : 'Sueldos, mantenimiento, servicios, insumos...'}
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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Fecha *</label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Monto ($) *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 45000"
                  value={monto}
                  onChange={(e) => setMonto(e.target.value)}
                  className="form-input num"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Concepto *</label>
              <input
                type="text"
                placeholder="Ej: Sueldo cuidador, factura de luz..."
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Categoría</label>
              <CustomSelect options={GASTO_CATEGORIAS} value={categoria} onChange={setCategoria} />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Notas</label>
              <textarea
                placeholder="Opcional"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="form-input"
                rows={2}
                style={{ resize: 'vertical' }}
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
                  onClick={() => onDelete(gasto)}
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
                  {isEdit ? 'Guardar Cambios' : 'Agregar Gasto'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
