/**
 * CajaCantina.jsx — Fase 2
 *
 * Lee del store directo. Sin imports de mockData.js.
 *
 * Cambios clave vs. versión anterior:
 *   - useProducts() en vez de prop `products`
 *   - useSales() + useCajaDelDia() para el historial y la recaudación
 *   - useSaleActions().registrar() descuenta stock automáticamente (crossSlice)
 *   - useProductActions().crear() para nuevo producto
 *   - useBookingsForDate(selectedDate) para el selector "Asignar a turno"
 *   - iconForProduct(product) de lib/catalog.js — fin del PRODUCT_ICONS roto
 *   - nombres del store: product.nombre (no .name), product.precio (no .price)
 */
import React, { useState } from 'react';
import {
  ShoppingBag, Plus, Minus, Trash2, CheckCircle2,
  Search, PlusCircle, Pencil,
} from 'lucide-react';
import {
  useProducts,
  useCajaDelDia,
  useBookingsForDate,
  useSelectedDate,
  useSaleActions,
  useProductActions,
  useToast,
  useConfig,
} from '../store';
import { iconForProduct, CATEGORIAS } from '../lib/catalog';
import { formatARS, formatARSCompact } from '../lib/format';
import { timestampToTime } from '../lib/date';
import VentaExitosaModal from './VentaExitosaModal';
import NuevoProductoModal from './NuevoProductoModal';
import CustomSelect from './CustomSelect';
import { useConfirm } from './ConfirmDialog';

const CATEGORY_LABELS = {
  todas: 'Todas',
  ...Object.fromEntries(Object.entries(CATEGORIAS).map(([k, v]) => [k, v])),
};

// ─── Métodos de pago ──────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { key: 'efectivo',     label: 'Efectivo' },
  { key: 'mercadopago',  label: 'MP' },
  { key: 'transferencia',label: 'Transfer.' },
];

// ─── Componente principal ─────────────────────────────────────────────────────

export default function CajaCantina() {
  const products        = useProducts();
  const config          = useConfig();
  const selectedDate    = useSelectedDate();
  const cajaHoy         = useCajaDelDia(selectedDate);
  const bookingsHoy     = useBookingsForDate(selectedDate);
  const saleActions     = useSaleActions();
  const productActions  = useProductActions();
  const toast           = useToast();
  const { confirm, ConfirmDialogMount } = useConfirm();

  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [search,           setSearch]           = useState('');
  const [cart,             setCart]             = useState([]);
  const [paymentMethod,    setPaymentMethod]    = useState('efectivo');
  const [assignedBookingId,setAssignedBookingId]= useState('');

  const [completedSale,    setCompletedSale]    = useState(null);
  const [productModal,     setProductModal]     = useState(null); // null cerrado | 'new' | Product a editar

  // ─── Filtrado de productos ───────────────────────────────────────────────
  const activeProducts = products.filter((p) => p.activo !== false);

  const filteredProducts = activeProducts.filter((p) => {
    if (selectedCategory !== 'todas' && p.categoria !== selectedCategory) return false;
    if (search && !p.nombre.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ─── Carrito ─────────────────────────────────────────────────────────────
  const addToCart = (product) => {
    if (product.controlaStock && product.stock <= 0) {
      toast.error(`${product.nombre}: sin stock`);
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== productId) return item;
          const newQty = item.qty + delta;
          return newQty > 0 ? { ...item, qty: newQty } : null;
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.precio * item.qty, 0);

  // ─── Checkout ────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (cart.length === 0) return;

    const assignedBooking = bookingsHoy.find((b) => b.id === assignedBookingId) ?? null;

    const saleData = {
      items: cart.map((i) => ({
        productoId: i.id,
        nombre:     i.nombre,
        precioUnit: i.precio,
        cantidad:   i.qty,
      })),
      total:       cartTotal,
      metodoPago:  paymentMethod,
      bookingId:   assignedBooking?.id ?? null,
      clienteId:   assignedBooking?.clienteId ?? null,
      canchaId:    assignedBooking?.canchaId ?? null,
      anulada:     false,
    };

    const result = saleActions.registrar(saleData);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    // Objeto para VentaExitosaModal — items itemizados de verdad (nombre,
    // cantidad, precio unitario), no un string aplanado, para armar un
    // ticket imprimible real.
    const completedSaleObj = {
      id:             result.data.id,
      time:           timestampToTime(result.data.fechaHora) + ' hs',
      fecha:          selectedDate,
      items:          saleData.items,
      total:          cartTotal,
      method:         PAYMENT_METHODS.find((m) => m.key === paymentMethod)?.label ?? paymentMethod,
      target: assignedBooking
        ? `${assignedBooking.clienteNombre ?? 'Cancha'} (${assignedBooking.hora} hs)`
        : 'Mostrador',
      complejoNombre: config?.complejo?.nombre,
    };

    setCompletedSale(completedSaleObj);
    setCart([]);
    setAssignedBookingId('');
  };

  // ─── Alta / edición de producto ──────────────────────────────────────────
  // productModal: 'new' (alta) o el Product completo (edición) — decide acá
  // si el modal crea o actualiza para que el formulario no tenga que saberlo.
  const handleSaveProduct = (data) => {
    const isEdit = productModal && productModal !== 'new';
    const result = isEdit
      ? productActions.actualizar(productModal.id, data)
      : productActions.crear(data);

    if (!result.ok) return result;
    toast.success(isEdit ? `"${data.nombre}" actualizado` : `Producto "${data.nombre}" agregado`);
    setProductModal(null);
    return result;
  };

  const handleDeleteProduct = async (product) => {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: `"${product.nombre}" se saca del catálogo. Podés deshacerlo desde el aviso.`,
      confirmLabel: 'Eliminar',
      danger: true,
    });
    if (!ok) return;

    productActions.eliminar(product.id);
    setProductModal(null);
    toast.info(`"${product.nombre}" eliminado`, {
      action: { label: 'Deshacer', onClick: () => productActions.restaurar(product) },
    });
  };

  // ─── Historial de ventas del día ─────────────────────────────────────────
  // Usar cajaHoy.ventas (del store, no un array local hardcodeado)
  const salesHistory = (cajaHoy?.ventas ?? []).slice().reverse().slice(0, 8);

  // ─── Selector de bookings para asignar ───────────────────────────────────
  const bookingOptions = [
    { value: '', label: 'Cliente de Mostrador (Directo)' },
    ...bookingsHoy
      .filter((b) => b.estado === 'reservado')
      .map((b) => ({
        value: b.id,
        label: `${b.clienteNombre ?? 'Sin nombre'} · ${b.hora} hs`,
      })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* ─── Header ─── */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Caja &amp; Cantina POS</h1>
          <p className="section-subtitle">Venta rápida de mostrador y facturación asignable a turnos</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => setProductModal('new')}
            className="btn-secondary"
            style={{ padding: '8px 14px', fontSize: '0.82rem', gap: 6 }}
          >
            <PlusCircle size={15} color="var(--green)" />  Nuevo Producto
          </button>

          <div style={{
            padding: '8px 16px', borderRadius: 12,
            background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div>
              <p style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Recaudación Hoy
              </p>
              <p className="font-heading num" style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--green)', lineHeight: 1, marginTop: 2 }}>
                {formatARSCompact(cajaHoy?.totalVentas ?? 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── POS Grid ─── */}
      <div className="pos-grid">

        {/* Left: Catálogo — minWidth:0 es obligatorio: los ítems de grid no se
            achican por debajo de su contenido mínimo por default, y acá adentro
            hay una fila de tabs sin wrap que si no se "revienta" el track */}
        <div className="pos-grid-catalog" style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Category Tabs + Search */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', alignItems: 'center',
            justifyContent: 'space-between', gap: 10, minWidth: 0,
            padding: '12px 14px', borderRadius: 14,
            background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          }}>
            <div className="tab-switcher" style={{ overflowX: 'auto', maxWidth: '100%', minWidth: 0 }}>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <button
                  key={key}
                  className={`tab-btn ${selectedCategory === key ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(key)}
                >
                  {label}
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

          {/* Product Cards — minmax bajo a propósito: en mobile entran 3 por fila
              en vez de 2 gigantes, mismo criterio de densidad que el resto de la app */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 }}>
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1/-1', padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                No hay productos en esta categoría.
              </div>
            )}
            {filteredProducts.map((prod) => {
              const ProdIcon = iconForProduct(prod);
              const sinStock = prod.controlaStock && prod.stock <= 0;
              return (
                <div
                  key={prod.id}
                  onClick={() => !sinStock && addToCart(prod)}
                  className={sinStock ? '' : 'product-card-hoverable'}
                  style={{
                    padding: '10px', borderRadius: 12,
                    background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
                    cursor: sinStock ? 'not-allowed' : 'pointer',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                    gap: 8, opacity: sinStock ? 0.5 : 1,
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.25)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <ProdIcon size={14} color="var(--green)" />
                      </div>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setProductModal(prod); }}
                        aria-label={`Editar ${prod.nombre}`}
                        style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'transparent', border: '1px solid var(--border-dim)',
                          color: 'var(--text-muted)', cursor: 'pointer',
                        }}
                      >
                        <Pencil size={10} />
                      </button>
                    </div>
                    <h4 className="font-heading" style={{ fontWeight: 800, fontSize: '0.76rem', color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.25 }}>
                      {prod.nombre}
                    </h4>
                    <p style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                      {CATEGORIAS[prod.categoria] ?? prod.categoria}
                      {prod.controlaStock ? ` · ${prod.stock}u` : ''}
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, borderTop: '1px solid var(--border-dim)' }}>
                    <span className="font-heading num" style={{ fontWeight: 900, color: 'var(--green)', fontSize: '0.8rem' }}>
                      {formatARS(prod.precio)}
                    </span>
                    <div style={{
                      width: 22, height: 22, borderRadius: 7,
                      background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'var(--green)', fontWeight: 900, fontSize: '0.78rem',
                    }}>
                      +
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sales History — 3er hijo directo de .pos-grid, area propia (ver
            grid-template-areas): en mobile va después del ticket, no antes */}
        <div className="pos-grid-historial" style={{
          padding: '16px 18px', borderRadius: 14,
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
        }}>
          <h3 className="font-heading" style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12 }}>
            Últimas Ventas del Día
          </h3>
          {salesHistory.length === 0 ? (
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '16px 0' }}>
              Sin ventas registradas hoy.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {salesHistory.map((sale) => {
                const hora = timestampToTime(sale.fechaHora);
                const itemsLabel = sale.items
                  .map((i) => `${i.cantidad}x ${i.nombre}`)
                  .join(', ');
                return (
                  <div key={sale.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 12px', borderRadius: 10,
                    background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                    fontSize: '0.78rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, flexShrink: 0 }}>
                        {hora} hs
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {itemsLabel}
                      </span>
                    </div>
                    <span className="num" style={{ fontWeight: 800, color: 'var(--green)', flexShrink: 0 }}>
                      {formatARS(sale.total)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Ticket / Cart */}
        <div className="pos-grid-ticket" style={{
          padding: '18px', borderRadius: 16,
          background: 'var(--bg-card)', border: '1px solid var(--border-dim)',
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          gap: 16, minWidth: 0,
        }}>
          <div>
            {/* Cart header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, borderBottom: '1px solid var(--border-dim)', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingBag size={16} color="var(--green)" />
                <h3 className="font-heading" style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>Ticket de Venta</h3>
              </div>
              <span style={{
                fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: 99,
                background: 'rgba(0,230,118,0.12)', border: '1px solid rgba(0,230,118,0.3)', color: 'var(--green)',
              }}>
                {cart.length} ítems
              </span>
            </div>

            {/* Asignar a turno */}
            <div className="form-group" style={{ marginBottom: 14 }}>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Asignar Venta A:</label>
              <CustomSelect
                options={bookingOptions}
                value={assignedBookingId}
                onChange={setAssignedBookingId}
              />
            </div>

            {/* Cart items */}
            {cart.length === 0 ? (
              <div style={{ padding: '24px 10px', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Hacé clic en los productos del catálogo para agregarlos al ticket.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 2 }}>
                {cart.map((item) => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '9px 10px', borderRadius: 10,
                    background: 'var(--bg-surface)', border: '1px solid var(--border-dim)',
                  }}>
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <p style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.8rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.nombre}
                      </p>
                      <p className="num" style={{ fontSize: '0.7rem', color: 'var(--green)', fontWeight: 700, marginTop: 1 }}>
                        {formatARS(item.precio)} c/u
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                      <button
                        onClick={() => updateCartQty(item.id, -1)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, background: 'var(--bg-card-hover)',
                          border: '1px solid var(--border-dim)', color: 'var(--text-primary)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                        }}
                      >
                        <Minus size={10} />
                      </button>
                      <span className="num" style={{ fontSize: '0.8rem', fontWeight: 900, color: 'var(--text-primary)', width: 14, textAlign: 'center' }}>
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateCartQty(item.id, 1)}
                        style={{
                          width: 24, height: 24, borderRadius: 6, background: 'rgba(0,230,118,0.15)',
                          border: '1px solid rgba(0,230,118,0.3)', color: 'var(--green)', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800,
                        }}
                      >
                        <Plus size={10} />
                      </button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--red)', cursor: 'pointer',
                          padding: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', marginLeft: 2,
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Payment method + Total + Checkout */}
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border-dim)', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.7rem' }}>Medio de Cobro</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPaymentMethod(m.key)}
                    style={{
                      padding: '7px 4px', borderRadius: 8, fontSize: '0.72rem', fontWeight: 800,
                      cursor: 'pointer', transition: 'all 0.15s ease',
                      textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap',
                      background: paymentMethod === m.key ? 'rgba(0,230,118,0.15)' : 'var(--bg-input)',
                      border: `1px solid ${paymentMethod === m.key ? 'rgba(0,230,118,0.4)' : 'var(--border-dim)'}`,
                      color: paymentMethod === m.key ? 'var(--green)' : 'var(--text-muted)',
                      boxShadow: paymentMethod === m.key ? '0 0 10px rgba(0,230,118,0.15)' : 'none',
                    }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Ticket:</span>
              <span className="font-heading num" style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--green)' }}>
                {formatARS(cartTotal)}
              </span>
            </div>

            <button
              disabled={cart.length === 0}
              onClick={handleCheckout}
              className="btn-primary"
              style={{ padding: '11px', justifyContent: 'center', fontSize: '0.85rem', width: '100%', opacity: cart.length === 0 ? 0.4 : 1, cursor: cart.length === 0 ? 'not-allowed' : 'pointer' }}
            >
              <CheckCircle2 size={16} style={{ color: 'var(--on-accent)' }} /> Procesar Cobro
            </button>
          </div>
        </div>
      </div>

      {/* ─── Modales ─── */}
      <VentaExitosaModal
        sale={completedSale}
        onClose={() => setCompletedSale(null)}
      />

      {productModal && (
        <NuevoProductoModal
          key={productModal === 'new' ? 'new' : productModal.id}
          isOpen
          onClose={() => setProductModal(null)}
          producto={productModal === 'new' ? null : productModal}
          onSave={handleSaveProduct}
          onDelete={handleDeleteProduct}
        />
      )}
      {ConfirmDialogMount}
    </div>
  );
}
