import React, { useState } from 'react';
import { 
  ShoppingBag, Plus, Minus, Trash2, CheckCircle2, DollarSign, 
  Search, Calendar, Clock, CreditCard, ArrowUpRight, Check,
  GlassWater, Beer, Wine, Droplets, Package, Shirt, Sparkles, Trophy,
  UserCheck, Store, Wallet, Building, PlusCircle
} from 'lucide-react';
import { CANTINA_PRODUCTS, INITIAL_BOOKINGS } from '../data/mockData';
import CustomSelect from './CustomSelect';
import VentaExitosaModal from './VentaExitosaModal';
import NuevoProductoModal from './NuevoProductoModal';

const PRODUCT_ICONS = {
  prod_gatorade: GlassWater,
  prod_stella: Beer,
  prod_fernet: Wine,
  prod_agua: Droplets,
  prod_coca: GlassWater,
  prod_papas: Package,
  prod_pelota: Trophy,
  prod_pecheras: Shirt,
  prod_paleta: Sparkles
};

export default function CajaCantina({ products, onAddProduct }) {
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [assignedBookingId, setAssignedBookingId] = useState('');
  const [discountPercent, setDiscountPercent] = useState(0);

  const [completedSale, setCompletedSale] = useState(null);
  const [isAddProductOpen, setIsAddProductOpen] = useState(false);

  const [salesHistory, setSalesHistory] = useState([
    { id: 's1', time: '18:15 hs', items: '2x Gatorade 500ml', total: 5000, method: 'Efectivo', target: 'Mostrador' },
    { id: 's2', time: '19:40 hs', items: '2x Stella Artois 1L + 1x Papas', total: 10600, method: 'Mercado Pago', target: 'Cancha 1 (20:00)' },
    { id: 's3', time: '20:10 hs', items: '1x Fernet Branca + Coca', total: 9500, method: 'Transferencia', target: 'Cancha 2 (21:00)' }
  ]);

  const categories = ['Todas', 'Bebidas', 'Tragos', 'Snacks', 'Servicios'];

  const filteredProducts = products.filter(p => {
    if (selectedCategory !== 'Todas' && p.category !== selectedCategory) return false;
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === productId) {
        const newQty = item.qty + delta;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const discountAmount = Math.round((subtotal * discountPercent) / 100);
  const cartTotal = subtotal - discountAmount;

  const handleCheckout = () => {
    if (cart.length === 0) return;

    const assignedBooking = INITIAL_BOOKINGS.find(b => b.id === assignedBookingId);

    const newSale = {
      id: 's_' + Date.now(),
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) + ' hs',
      items: cart.map(i => `${i.qty}x ${i.name}`).join(', '),
      total: cartTotal,
      method: paymentMethod,
      target: assignedBooking ? `Cancha (${assignedBooking.time})` : 'Mostrador'
    };

    setSalesHistory([newSale, ...salesHistory]);
    setCart([]);
    setDiscountPercent(0);
    setAssignedBookingId('');
    
    // Open custom sale modal instead of alert()
    setCompletedSale(newSale);
  };

  const totalSalesToday = salesHistory.reduce((sum, s) => sum + s.total, 0);

  // Options for custom select "Asignar Venta A:"
  const assignedOptions = [
    { value: '', label: 'Cliente de Mostrador (Directo)', icon: Store },
    ...INITIAL_BOOKINGS.map(b => ({
      value: b.id,
      label: `${b.clientName} (${b.time} hs)`,
      icon: UserCheck
    }))
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      
      {/* ─── Header ─── */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Caja & Cantina POS</h1>
          <p className="section-subtitle">Venta rápida de mostrador y facturación asignable a turnos</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button 
            onClick={() => setIsAddProductOpen(true)}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: 6 }}
          >
            <PlusCircle size={15} color="#00E676" /> + Nuevo Producto
          </button>

          <div style={{
            padding: '8px 16px', borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
            display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div>
              <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recaudación Hoy
              </p>
              <p className="font-heading" style={{ fontSize: '1.25rem', fontWeight: 900, color: '#00E676', lineHeight: 1, marginTop: 2 }}>
                ${totalSalesToday.toLocaleString('es-AR')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Main POS Layout (Responsive POS Grid) ─── */}
      <div className="pos-grid-container" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16 }}>
        
        {/* Left: Product Catalog */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          
          {/* Category Tabs & Search */}
          <div style={{ 
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10,
            padding: '12px 14px', borderRadius: 14, background: 'var(--bg-card)', border: '1px solid var(--border-dim)'
          }}>
            <div className="tab-switcher" style={{ overflowX: 'auto', maxWidth: '100%' }}>
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`tab-btn ${selectedCategory === cat ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ position: 'relative', width: 180, flexShrink: 0 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                placeholder="Buscar producto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="form-input"
                style={{ paddingLeft: 34, padding: '7px 12px 7px 34px', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          {/* Product Cards Grid with Lucide Vector Icons */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))', gap: 10 }}>
            {filteredProducts.map(prod => {
              const ProdIcon = PRODUCT_ICONS[prod.id] || GlassWater;

              return (
                <div 
                  key={prod.id}
                  onClick={() => addToCart(prod)}
                  style={{
                    padding: '12px', borderRadius: 14,
                    background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                    cursor: 'pointer', transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    gap: 10
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,230,118,0.4)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3), 0 0 14px rgba(0,230,118,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border-dim)';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 8
                    }}>
                      <ProdIcon size={18} color="#00E676" />
                    </div>
                    <h4 className="font-heading" style={{ fontWeight: 800, fontSize: '0.84rem', color: '#fff', marginBottom: 3, lineHeight: 1.2 }}>
                      {prod.name}
                    </h4>
                    <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {prod.category} · {prod.stock}u
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-dim)' }}>
                    <span className="font-heading" style={{ fontWeight: 900, color: '#00E676', fontSize: '0.9rem' }}>
                      ${prod.price.toLocaleString('es-AR')}
                    </span>
                    <div style={{
                      width: 26, height: 26, borderRadius: 8,
                      background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#00E676', fontWeight: 900, fontSize: '0.85rem'
                    }}>
                      +
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sales History Table */}
          <div style={{
            padding: '16px 18px', borderRadius: 14,
            background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
            marginTop: 4
          }}>
            <h3 className="font-heading" style={{ fontSize: '0.9rem', fontWeight: 800, color: '#fff', marginBottom: 12 }}>
              Últimas Ventas Realizadas
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {salesHistory.slice(0, 4).map(sale => (
                <div key={sale.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '9px 12px', borderRadius: 10,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                  fontSize: '0.78rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>{sale.time}</span>
                    <span style={{ fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sale.items}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{sale.method}</span>
                    <span style={{ fontWeight: 800, color: '#00E676' }}>${sale.total.toLocaleString('es-AR')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Right: Ticket / Cart */}
        <div style={{
          padding: '18px', borderRadius: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-dim)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag size={16} color="#00E676" />
                <h3 className="font-heading" style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>Ticket de Venta</h3>
              </div>
              <span style={{
                fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', color: '#00E676'
              }}>
                {cart.length} ítems
              </span>
            </div>

            {/* Target Assignment (CustomSelect) */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Asignar Venta A:</label>
              <CustomSelect
                options={assignedOptions}
                value={assignedBookingId}
                onChange={setAssignedBookingId}
              />
            </div>

            {/* Cart Items */}
            {cart.length === 0 ? (
              <div style={{ padding: '24px 10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Hacé clic en los productos del catálogo para agregarlos al ticket.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                {cart.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 10px', borderRadius: 10,
                    background: 'var(--bg-surface)', border: '1px solid var(--border-dim)'
                  }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <p style={{ fontWeight: 700, color: '#fff', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
                      <p style={{ fontSize: '0.7rem', color: '#00E676', fontWeight: 700, marginTop: 1 }}>${item.price.toLocaleString('es-AR')} c/u</p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <button onClick={() => updateCartQty(item.id, -1)} style={{
                        width: 24, height: 24, borderRadius: 6, background: 'var(--bg-card-hover)',
                        border: '1px solid var(--border-dim)', color: 'var(--text-primary)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                      }}>-</button>
                      <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#fff', width: 14, textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateCartQty(item.id, 1)} style={{
                        width: 24, height: 24, borderRadius: 6, background: 'rgba(0,230,118,0.15)',
                        border: '1px solid rgba(0,230,118,0.3)', color: '#00E676', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
                      }}>+</button>
                      <button onClick={() => removeFromCart(item.id)} style={{
                        background: 'none', border: 'none', color: '#FF4F4F', cursor: 'pointer',
                        padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2
                      }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment Method & Total */}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Medio de Cobro</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {['Efectivo', 'Mercado Pago', 'Transferencia'].map(m => (
                  <button 
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    style={{
                      padding: '7px 4px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 800,
                      cursor: 'pointer', transition: 'all 0.15s ease', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                      background: paymentMethod === m ? 'rgba(0,230,118,0.15)' : 'var(--bg-input)',
                      border: `1px solid ${paymentMethod === m ? 'rgba(0,230,118,0.4)' : 'var(--border-dim)'}`,
                      color: paymentMethod === m ? '#00E676' : 'var(--text-muted)',
                      boxShadow: paymentMethod === m ? '0 0 10px rgba(0,230,118,0.15)' : 'none'
                    }}
                  >
                    {m === 'Mercado Pago' ? 'MP' : m}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Ticket:</span>
              <span className="font-heading" style={{ fontSize: '1.4rem', fontWeight: 900, color: '#00E676' }}>
                ${cartTotal.toLocaleString('es-AR')}
              </span>
            </div>

            <button 
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="btn-primary"
              style={{ padding: '11px', justifyContent: 'center', fontSize: '0.85rem', width: '100%', opacity: cart.length === 0 ? 0.4 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <CheckCircle2 size={16} style={{ color: '#040A06' }} /> Procesar Cobro
            </button>
          </div>

        </div>

      </div>

      {/* Sale Success Modal (Replaces native browser alert()) */}
      <VentaExitosaModal
        sale={completedSale}
        onClose={() => setCompletedSale(null)}
      />

      {/* Create Product Modal */}
      <NuevoProductoModal
        isOpen={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
        onAddProduct={onAddProduct}
      />

    </div>
  );
}
