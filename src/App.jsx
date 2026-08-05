import React, { useMemo, useState } from 'react';
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
import ToastViewport from './components/ToastViewport';

import {
  useAppState,
  useBookingActions,
  useBookingsForDate,
  useClientActions,
  useClients,
  useProductActions,
  useProducts,
  useSaleActions,
  useSelectedDate,
  useToast,
  useTurnoFijoActions,
  useUIActions,
  selectors,
} from './store';
import { toLegacyBookings, toLegacyClient, toLegacyProduct } from './store/legacyAdapter';
import { normalizePhone } from './lib/phone';
import { CATEGORIAS, guessIconKey } from './lib/catalog';
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

const categoriaKeyFromLegacyLabel = (label) =>
  Object.keys(CATEGORIAS).find((k) => CATEGORIAS[k] === label) ?? 'bebidas';

export default function App() {
  const state = useAppState();
  const { activeTab } = state.ui;
  const { setActiveTab } = useUIActions();
  const selectedDate = useSelectedDate();
  const toast = useToast();

  const bookingActions = useBookingActions();
  const clientActions = useClientActions();
  const productActions = useProductActions();
  const saleActions = useSaleActions();
  const turnoFijoActions = useTurnoFijoActions();

  const rawBookingsToday = useBookingsForDate(selectedDate);
  const rawClients = useClients();
  const rawProducts = useProducts();

  // ─── Capa de compatibilidad: estos 3 componentes todavía esperan la forma
  // de datos vieja. Se elimina en la Fase 5 cuando se reescriben. Ver
  // src/store/legacyAdapter.js.
  const bookings = useMemo(() => toLegacyBookings(state, rawBookingsToday), [state, rawBookingsToday]);
  const clients = useMemo(
    () =>
      rawClients.map((c) =>
        toLegacyClient(
          state,
          c,
          selectors.selectClientStats(state, c.id),
          selectors.selectClientBadge(state, c.id)
        )
      ),
    [state, rawClients]
  );
  const products = useMemo(() => rawProducts.map(toLegacyProduct), [rawProducts]);

  const [isNuevoTurnoOpen, setIsNuevoTurnoOpen] = useState(false);
  const [modalSlot, setModalSlot] = useState({ canchaId: 'c1', time: '20:00' });
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);

  const handleOpenNuevoTurnoWithSlot = (canchaId, time) => {
    setModalSlot({ canchaId, time });
    setIsNuevoTurnoOpen(true);
  };

  // Convierte el objeto viejo que arma NuevoTurnoModal en acciones reales del
  // store: crea el turno con su primer pago (si hay seña) y, si cargaron
  // consumos de cantina, los registra como una venta asociada al turno.
  const handleSaveBooking = (legacyBooking) => {
    const cantinaTotal = (legacyBooking.cantinaExtras ?? []).reduce(
      (acc, i) => acc + i.price * i.qty,
      0
    );

    const result = bookingActions.crear({
      fecha: selectedDate,
      hora: legacyBooking.time,
      canchaId: legacyBooking.canchaId,
      clienteId: null,
      clienteNombre: legacyBooking.clientName,
      clienteTelefono: normalizePhone(legacyBooking.clientPhone),
      estado: legacyBooking.status === 'blocked' ? 'bloqueado' : 'reservado',
      precioCancha: legacyBooking.totalPrice - cantinaTotal,
      pagos:
        legacyBooking.depositPaid > 0
          ? [{ monto: legacyBooking.depositPaid, metodo: 'mercadopago', nota: legacyBooking.paymentMethod }]
          : [],
      notas: legacyBooking.notes ?? '',
      canal: legacyBooking.channel === 'bot_ai' ? 'bot_wa' : 'mostrador',
    });

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    if (cantinaTotal > 0) {
      saleActions.registrar({
        items: legacyBooking.cantinaExtras.map((i) => ({
          productoId: i.id,
          nombre: i.name,
          precioUnit: i.price,
          cantidad: i.qty,
        })),
        total: cantinaTotal,
        metodoPago: 'a_cuenta_turno',
        bookingId: result.data.id,
      });
    }

    toast.success(`¡Turno reservado para ${legacyBooking.clientName}!`);
  };

  /** Turnos fijos proyectados (id `virt_...`) se materializan antes de tocarlos. */
  const ensureRealBookingId = (legacyDetail) => {
    if (!legacyDetail._source.esVirtual) return legacyDetail._source.id;
    const res = bookingActions.materializarFijo(legacyDetail._source);
    return res.ok ? res.data.id : legacyDetail._source.id;
  };

  const handleSettleBooking = () => {
    const legacy = selectedBookingDetail;
    if (!legacy) return;
    const realId = ensureRealBookingId(legacy);
    const totals = selectors.selectBookingTotals(state, legacy._source);
    if (totals.saldo > 0) {
      bookingActions.registrarPago(realId, { monto: totals.saldo, metodo: 'efectivo' });
    }
    toast.success('¡Turno saldado correctamente! (100% Pagado)');
  };

  const handleCancelBooking = () => {
    const legacy = selectedBookingDetail;
    if (!legacy) return;
    if (legacy._source.esVirtual) {
      // Es una proyección de turno fijo: "cancelar" es saltear solo esta fecha.
      turnoFijoActions.cancelarOcurrencia(legacy._source.origenFijoId, legacy._source.fecha);
    } else {
      bookingActions.cancelar(legacy._source.id);
    }
    toast.info('Turno cancelado y liberado.');
  };

  const handleAddCantinaToBooking = (_bookingId, legacyProduct) => {
    const legacy = selectedBookingDetail;
    if (!legacy) return;
    const realId = ensureRealBookingId(legacy);
    saleActions.registrar({
      items: [
        {
          productoId: legacyProduct.id,
          nombre: legacyProduct.name,
          precioUnit: legacyProduct.price,
          cantidad: 1,
        },
      ],
      total: legacyProduct.price,
      metodoPago: 'a_cuenta_turno',
      bookingId: realId,
      clienteId: legacy._source.clienteId ?? null,
      canchaId: legacy._source.canchaId,
    });
    toast.success(`+ ${legacyProduct.name} agregado al turno`);
  };

  const handleAddProduct = (legacyProduct) => {
    const categoria = categoriaKeyFromLegacyLabel(legacyProduct.category);
    const result = productActions.crear({
      nombre: legacyProduct.name,
      categoria,
      precio: legacyProduct.price,
      stock: legacyProduct.stock,
      stockMinimo: 6,
      controlaStock: categoria !== 'servicios',
      iconKey: guessIconKey(legacyProduct.name, categoria),
      activo: true,
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Producto "${legacyProduct.name}" agregado a la cantina`);
  };

  const handleAddClient = (legacyClient) => {
    const result = clientActions.crear({
      nombre: legacyClient.name,
      telefono: normalizePhone(legacyClient.phone),
      historicoPrevio: { partidos: 0, cancelaciones: 0, gastado: 0 },
    });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(`Cliente "${legacyClient.name}" registrado en el CRM`);
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

      {/* ─── New Booking Modal ───
          Se monta SOLO cuando está abierto (antes quedaba montado siempre con
          el early-return después de los useState, así que initialCanchaId/
          initialTime solo se aplicaban la primera vez: clickear un slot
          libre abría el modal mostrando la cancha/hora anterior). El `key`
          fuerza un remount limpio en cada apertura. */}
      {isNuevoTurnoOpen && (
        <NuevoTurnoModal
          key={`${modalSlot.canchaId}-${modalSlot.time}`}
          isOpen={isNuevoTurnoOpen}
          onClose={() => setIsNuevoTurnoOpen(false)}
          onSaveBooking={handleSaveBooking}
          initialCanchaId={modalSlot.canchaId}
          initialTime={modalSlot.time}
        />
      )}

      {/* ─── Detailed Booking Modal (Interactive Settle, Cantina, WA, Cancel) ─── */}
      <DetalleTurnoModal
        booking={selectedBookingDetail}
        isOpen={!!selectedBookingDetail}
        onClose={() => setSelectedBookingDetail(null)}
        onSettleBooking={handleSettleBooking}
        onCancelBooking={handleCancelBooking}
        onAddCantinaToBooking={handleAddCantinaToBooking}
      />

      <ToastViewport />

    </div>
  );
}
