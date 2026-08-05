/**
 * NuevoProductoModal.jsx — dual mode (crear / editar)
 *
 * Antes hablaba un modelo legacy (`name`, `category` como label, `icon`
 * ignorado) y solo servía para crear. Ahora habla el modelo real del store
 * (`nombre`, `categoria` como key, `iconKey`, `stockMinimo`, `controlaStock`)
 * y sirve para las dos operaciones — mismo formulario, misma validación,
 * así no vuelven a divergir como pasó con los turnos fijos.
 *
 * mode="create" (producto=null) o mode="edit" (producto=Product). Se monta
 * solo cuando está abierto, con key={producto?.id ?? 'new'} desde el padre,
 * para que los useState de acá arranquen siempre con los valores correctos.
 */
import React, { useState } from 'react';
import { X, Check, ShoppingBag, Trash2 } from 'lucide-react';
import CustomSelect from './CustomSelect';
import { CATEGORIA_OPTIONS, CATEGORIAS_SIN_STOCK, guessIconKey, ICON_OPTIONS } from '../lib/catalog';

export default function NuevoProductoModal({ isOpen, onClose, producto = null, onSave, onDelete }) {
  const isEdit = !!producto;

  const [name, setName] = useState(producto?.nombre ?? '');
  const [category, setCategory] = useState(producto?.categoria ?? 'bebidas');
  const [price, setPrice] = useState(producto?.precio != null ? String(producto.precio) : '');
  const [stock, setStock] = useState(producto?.stock != null ? String(producto.stock) : '');
  const [stockMinimo, setStockMinimo] = useState(
    producto?.stockMinimo != null ? String(producto.stockMinimo) : '6'
  );
  const [controlaStock, setControlaStock] = useState(
    producto?.controlaStock ?? !CATEGORIAS_SIN_STOCK.has(producto?.categoria ?? 'bebidas')
  );
  const [iconKey, setIconKey] = useState(producto?.iconKey ?? guessIconKey('', 'bebidas'));
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCategoryChange = (val) => {
    setCategory(val);
    if (!isEdit) {
      // En alta, la categoría re-sugiere ícono y el default de control de stock.
      setIconKey(guessIconKey(name, val));
      setControlaStock(!CATEGORIAS_SIN_STOCK.has(val));
    }
  };

  const handleNameChange = (val) => {
    setName(val);
    if (!isEdit) setIconKey(guessIconKey(val, category));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim()) return setError('El nombre es obligatorio.');
    if (price === '' || Number(price) < 0) return setError('El precio tiene que ser 0 o mayor.');

    const result = onSave({
      nombre: name.trim(),
      categoria: category,
      precio: Number(price),
      stock: stock === '' ? 0 : Number(stock),
      stockMinimo: stockMinimo === '' ? 0 : Number(stockMinimo),
      controlaStock,
      iconKey,
      activo: true,
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
                background: 'rgba(0,230,118,0.12)',
                border: '1px solid rgba(0,230,118,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShoppingBag size={18} color="var(--green)" />
            </div>
            <div>
              <h3
                className="font-heading"
                style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}
              >
                {isEdit ? 'Editar Producto' : 'Nuevo Producto de Cantina'}
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {isEdit ? producto.nombre : 'Agregá bebidas, snacks o servicios al catálogo'}
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
              <label className="form-label">Nombre del Producto *</label>
              <input
                type="text"
                placeholder="Ej: Quilmes 1L, Red Bull, etc."
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Categoría</label>
                <CustomSelect options={CATEGORIA_OPTIONS} value={category} onChange={handleCategoryChange} />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Precio ($) *</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 3500"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="form-input num"
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stock {controlaStock ? '*' : '(sin control)'}</label>
                <input
                  type="number"
                  min="0"
                  placeholder="Ej: 24"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="form-input num"
                  disabled={!controlaStock}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Stock mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  className="form-input num"
                  disabled={!controlaStock}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Ícono</label>
              <CustomSelect options={ICON_OPTIONS} value={iconKey} onChange={setIconKey} />
            </div>

            <label
              className="custom-checkbox"
              style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}
            >
              <input
                type="checkbox"
                checked={controlaStock}
                onChange={(e) => setControlaStock(e.target.checked)}
              />
              Controlar stock (desmarcar para alquileres/servicios que siempre están disponibles)
            </label>

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
                  onClick={() => onDelete(producto)}
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
                  {isEdit ? 'Guardar Cambios' : 'Agregar Producto'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
