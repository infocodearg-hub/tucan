import React, { useState } from 'react';
import { X, Check, ShoppingBag, GlassWater, Beer, Wine, Droplets, Package, Shirt, Sparkles, Trophy } from 'lucide-react';
import CustomSelect from './CustomSelect';

const CATEGORY_OPTIONS = [
  { value: 'Bebidas',   label: 'Bebidas' },
  { value: 'Tragos',    label: 'Tragos' },
  { value: 'Snacks',    label: 'Snacks' },
  { value: 'Servicios', label: 'Servicios' },
];

export default function NuevoProductoModal({ isOpen, onClose, onAddProduct }) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bebidas');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !price) return;

    onAddProduct({
      id: 'prod_' + Date.now(),
      name,
      category,
      price: Number(price),
      stock: Number(stock) || 30,
      icon: 'prod_gatorade'
    });

    setName('');
    setPrice('');
    setStock('');
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
              background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <ShoppingBag size={18} color="var(--green)" />
            </div>
            <div>
              <h3 className="font-heading" style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                Nuevo Producto de Cantina
              </h3>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Agregá bebidas, snacks o servicios al catálogo</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Nombre del Producto *</label>
              <input
                type="text"
                placeholder="Ej: Quilmes 1L, Red Bull, etc."
                value={name}
                onChange={e => setName(e.target.value)}
                className="form-input"
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Categoría</label>
                <CustomSelect
                  options={CATEGORY_OPTIONS}
                  value={category}
                  onChange={setCategory}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Precio ($) *</label>
                <input
                  type="number"
                  placeholder="Ej: 3500"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="form-input"
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Stock Inicial (unidades)</label>
              <input
                type="number"
                placeholder="Ej: 24"
                value={stock}
                onChange={e => setStock(e.target.value)}
                className="form-input"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, paddingTop: 14, borderTop: '1px solid var(--border-dim)' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '9px 16px' }}>
                Cancelar
              </button>
              <button type="submit" className="btn-primary" style={{ padding: '9px 20px' }}>
                <Check size={15} style={{ color: 'var(--on-accent)' }} /> Agregar Producto
              </button>
            </div>

          </div>
        </form>

      </div>
    </div>
  );
}
