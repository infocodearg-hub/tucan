import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import GrillaTurnos from './components/GrillaTurnos';
import TurnosFijos from './components/TurnosFijos';
import CajaCantina from './components/CajaCantina';
import ClientesCRM from './components/ClientesCRM';
import ReportesAnalytics from './components/ReportesAnalytics';
import ConfiguracionComplejo from './components/ConfiguracionComplejo';
import VistaPublicaJugador from './components/VistaPublicaJugador';
import NuevoTurnoModal from './components/NuevoTurnoModal';
import DetalleTurnoModal from './components/DetalleTurnoModal';
import Toast from './components/Toast';

import { INITIAL_BOOKINGS, CANTINA_PRODUCTS, CLIENTS_DATABASE } from './data/mockData';
import { 
  CalendarDays, ShoppingBag, BarChart3, Settings, Users, Repeat
} from 'lucide-react';

// ─── Bottom nav items (mobile) ───
const BOTTOM_NAV = [
  { id: 'grilla',       label: 'Grilla',      icon: CalendarDays },
  { id: 'turnos_fijos', label: 'Fijos',       icon: Repeat },
  { id: 'cantina',      label: 'Cantina',     icon: ShoppingBag },
  { id: 'clientes',     label: 'Clientes',    icon: Users },
  { id: 'reportes',     label: 'Reportes',    icon: BarChart3 },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('grilla');
  const [bookings, setBookings] = useState(INITIAL_BOOKINGS);
  const [products, setProducts] = useState(CANTINA_PRODUCTS);
  const [clients, setClients] = useState(CLIENTS_DATABASE);
  
  const [isNuevoTurnoOpen, setIsNuevoTurnoOpen] = useState(false);
  const [modalSlot, setModalSlot] = useState({ canchaId: 'c1', time: '20:00' });
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleOpenNuevoTurnoWithSlot = (canchaId, time) => {
    setModalSlot({ canchaId, time });
    setIsNuevoTurnoOpen(true);
  };

  const handleSaveBooking = (newBooking) => {
    setBookings(prev => [
      ...prev.filter(b => !(b.canchaId === newBooking.canchaId && b.time === newBooking.time)),
      newBooking
    ]);
    showToast(`¡Turno reservado para ${newBooking.clientName}!`);
  };

  const handleSettleBooking = (bookingId) => {
    setBookings(prev => prev.map(b => 
      b.id === bookingId ? { ...b, status: 'paid', depositPaid: b.totalPrice } : b
    ));
    showToast('¡Turno saldado correctamente! (100% Pagado)');
  };

  const handleCancelBooking = (bookingId) => {
    setBookings(prev => prev.filter(b => b.id !== bookingId));
    showToast('Turno cancelado y liberado.', 'info');
  };

  const handleAddCantinaToBooking = (bookingId, product) => {
    setBookings(prev => prev.map(b => {
      if (b.id === bookingId) {
        const existingExtras = b.cantinaExtras || [];
        const ex = existingExtras.find(i => i.id === product.id);
        const updatedExtras = ex 
          ? existingExtras.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i)
          : [...existingExtras, { ...product, qty: 1 }];

        return {
          ...b,
          cantinaExtras: updatedExtras,
          totalPrice: b.totalPrice + product.price
        };
      }
      return b;
    }));
    showToast(`+ ${product.name} agregado al turno`);
  };

  const handleAddProduct = (newProduct) => {
    setProducts(prev => [newProduct, ...prev]);
    showToast(`Producto "${newProduct.name}" agregado a la cantina`);
  };

  const handleAddClient = (newClient) => {
    setClients(prev => [newClient, ...prev]);
    showToast(`Cliente "${newClient.name}" registrado en el CRM`);
  };

  return (
    <div style={{ minHeight: '100dvh' }}>

      {/* ─── Top Navbar ─── */}
      <Navbar 
        onOpenNuevoTurno={() => setIsNuevoTurnoOpen(true)}
        onOpenCantina={() => setActiveTab('cantina')}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* ─── Layout ─── */}
      <div className="app-container">
        
        {/* Left Sidebar */}
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* Main Content */}
        <main className="app-main-content animate-enter" key={activeTab}>
          {activeTab === 'grilla' && (
            <GrillaTurnos 
              bookings={bookings}
              onOpenNuevoTurnoWithSlot={handleOpenNuevoTurnoWithSlot}
              onOpenBookingDetails={(b) => setSelectedBookingDetail(b)}
            />
          )}
          {activeTab === 'turnos_fijos' && <TurnosFijos />}
          {activeTab === 'cantina' && (
            <CajaCantina 
              products={products}
              onAddProduct={handleAddProduct}
            />
          )}
          {activeTab === 'clientes' && (
            <ClientesCRM 
              clients={clients}
              onAddClient={handleAddClient}
            />
          )}
          {activeTab === 'reportes' && <ReportesAnalytics />}
          {activeTab === 'configuracion' && <ConfiguracionComplejo />}
          {activeTab === 'vista_publica' && <VistaPublicaJugador />}
        </main>
      </div>

      {/* ─── Bottom Nav (Mobile only) ─── */}
      <nav className="bottom-nav">
        {BOTTOM_NAV.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              className={`bottom-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* ─── New Booking Modal ─── */}
      <NuevoTurnoModal 
        isOpen={isNuevoTurnoOpen}
        onClose={() => setIsNuevoTurnoOpen(false)}
        onSaveBooking={handleSaveBooking}
        initialCanchaId={modalSlot.canchaId}
        initialTime={modalSlot.time}
      />

      {/* ─── Detailed Booking Modal (Interactive Settle, Cantina, WA, Cancel) ─── */}
      <DetalleTurnoModal
        booking={selectedBookingDetail}
        isOpen={!!selectedBookingDetail}
        onClose={() => setSelectedBookingDetail(null)}
        onSettleBooking={handleSettleBooking}
        onCancelBooking={handleCancelBooking}
        onAddCantinaToBooking={handleAddCantinaToBooking}
      />

      {/* ─── Toast Notifications ─── */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

    </div>
  );
}
