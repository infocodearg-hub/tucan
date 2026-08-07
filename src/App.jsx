import React, { useMemo, useState } from 'react';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import GrillaTurnos from './components/GrillaTurnos';
import TurnosFijos from './components/TurnosFijos';
import CajaCantina from './components/CajaCantina';
import ClientesCRM from './components/ClientesCRM';
import ReportesAnalytics from './components/ReportesAnalytics';
import ConfiguracionComplejo from './components/ConfiguracionComplejo';
import Derivaciones from './components/Derivaciones';
import NuevoTurnoModal from './components/NuevoTurnoModal';
import DetalleTurnoModal from './components/DetalleTurnoModal';
import ToastViewport from './components/ToastViewport';
import LoginScreen from './components/LoginScreen';
import OnboardingWizard from './components/OnboardingWizard';
import { useAuth } from './auth/AuthProvider';
import { puedeVerTab } from './auth/permisos';
import { StoreProvider } from './store';

import {
  useAppState,
  useBookingActions,
  useBookingsForDate,
  useCanchas,
  useClients,
  useSaleActions,
  useSelectedDate,
  useToast,
  useTurnoFijoActions,
  useUIActions,
  selectors,
} from './store';
import { toLegacyBookings, toLegacyClient } from './store/legacyAdapter';
import { normalizePhone } from './lib/phone';
import { addDays, startOfWeek } from './lib/date';
import {
  CalendarDays, ShoppingBag, BarChart3, Users, Repeat
} from 'lucide-react';

// ─── Bottom nav items (mobile) ───
const BOTTOM_NAV = [
  { id: 'grilla',       label: 'Grilla',      icon: CalendarDays },
  { id: 'turnos_fijos', label: 'Fijos',       icon: Repeat },
  { id: 'cantina',      label: 'Cantina',     icon: ShoppingBag },
  { id: 'clientes',     label: 'Clientes',    icon: Users },
  { id: 'reportes',     label: 'Reportes',    icon: BarChart3 },
];

/**
 * Puerta de entrada al panel: identidad primero, datos después.
 *
 * El orden importa. `StoreProvider` necesita saber de qué complejo son los datos
 * antes de pedir nada, así que no se monta hasta que la membresía está resuelta.
 */
export default function App() {
  const { cargando, session, tenantId, errorMembership, signOut } = useAuth();

  if (cargando) return <PantallaSimple texto="Entrando…" />;

  // Sin `<ToastViewport />` acá, y no es un olvido: los toasts leen del store,
  // y el store todavía no existe (se monta recién cuando hay complejo resuelto,
  // más abajo). Ponerlo rompe la pantalla entera con "useAppState debe usarse
  // dentro de <StoreProvider>" — pantalla en blanco en el login, que es la
  // primera que ve cualquiera. `LoginScreen` muestra sus propios errores en el
  // formulario, así que no necesita toasts.
  if (!session) return <LoginScreen />;

  // Usuario válido pero sin complejo asignado (o suspendido). No es un error de
  // la app: hay que decir qué pasa y ofrecer salir, no dejarlo en una pantalla
  // vacía sin explicación.
  if (errorMembership || !tenantId) {
    return (
      <PantallaSimple texto={errorMembership ?? 'Tu usuario no tiene un complejo asignado.'}>
        <button type="button" className="btn-secondary" onClick={signOut} style={{ padding: '12px 20px' }}>
          Cerrar sesión
        </button>
      </PantallaSimple>
    );
  }

  return (
    <StoreProvider tenantId={tenantId}>
      <AppInner onLogout={signOut} />
    </StoreProvider>
  );
}

function PantallaSimple({ texto, children }) {
  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column', gap: 16,
      alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center',
      background: 'var(--bg-pitch)',
    }}>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: 340, lineHeight: 1.6 }}>
        {texto}
      </p>
      {children}
    </div>
  );
}

function AppInner({ onLogout }) {
  const state = useAppState();
  const auth = useAuth();
  const { activeTab } = state.ui;
  const { setActiveTab, setSelectedDate } = useUIActions();
  const canchas = useCanchas();
  const selectedDate = useSelectedDate();
  const toast = useToast();

  const bookingActions = useBookingActions();
  const saleActions = useSaleActions();
  const turnoFijoActions = useTurnoFijoActions();

  const rawBookingsToday = useBookingsForDate(selectedDate);
  // Toda la semana de `selectedDate` — la usa la vista Semana de la Grilla.
  // Como la semana SIEMPRE contiene a `selectedDate`, también sirve como
  // fuente única para relocalizar en vivo el turno abierto en el modal de
  // detalle (ver `liveBookingDetail` más abajo): antes buscaba solo en
  // `bookings` (el día), así que un turno de otro día de la semana perdía la
  // actualización en vivo al editarlo desde ahí.
  const weekStart = startOfWeek(selectedDate);
  const weekEnd = addDays(weekStart, 6);
  const rawBookingsWeek = useMemo(
    () => selectors.selectBookingsForRange(state, weekStart, weekEnd),
    [state, weekStart, weekEnd]
  );
  const rawClients = useClients();

  // ─── Capa de compatibilidad: GrillaTurnos/NuevoTurnoModal/DetalleTurnoModal
  // (bookings) y ClientesCRM (solo lectura — crear/editar/borrar ya va directo
  // al store) todavía esperan la forma vieja. Se elimina en la Fase 5. Ver
  // src/store/legacyAdapter.js.
  const bookings = useMemo(() => toLegacyBookings(state, rawBookingsToday), [state, rawBookingsToday]);
  const bookingsWeek = useMemo(() => toLegacyBookings(state, rawBookingsWeek), [state, rawBookingsWeek]);
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

  const [isNuevoTurnoOpen, setIsNuevoTurnoOpen] = useState(false);
  // Sin valores por defecto: el modal elige la primera cancha y el primer
  // horario reales del complejo. Acá había un `'c1'` heredado de los datos de
  // demostración — un id que en una cuenta real no existe, así que todo turno
  // creado desde el botón "+ Turno" (en vez de desde un slot de la grilla)
  // moría con un error de clave foránea.
  const [modalSlot, setModalSlot] = useState({ canchaId: null, time: null });
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);

  // `selectedBookingDetail` guarda solo la identidad (id) del turno abierto.
  // El objeto que efectivamente se muestra se relee de `bookingsWeek` (que ya
  // se recalcula en cada render con el estado actual) — así que saldar,
  // cargar cantina o editar se ven reflejados en el modal sin tener que
  // cerrarlo. Se busca en la semana entera (no solo `bookings`, el día) para
  // que un turno abierto desde la vista Semana de la Grilla también se
  // relea en vivo — la semana siempre contiene al día seleccionado.
  const liveBookingDetail = selectedBookingDetail
    ? (bookingsWeek.find((b) => b.id === selectedBookingDetail.id) ?? selectedBookingDetail)
    : null;

  // `fecha` llega SIEMPRE explícita desde GrillaTurnos (día o semana). En la
  // vista Semana puede no ser `selectedDate`: cambiar el día activo hace que
  // `handleSaveBooking` (que arma el turno con `fecha: selectedDate`) guarde
  // en el día correcto sin tocar esa función.
  const handleOpenNuevoTurnoWithSlot = (canchaId, time, fecha = selectedDate) => {
    if (fecha !== selectedDate) setSelectedDate(fecha);
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

  /**
   * Turnos fijos proyectados (id `virt_...`) se materializan antes de
   * tocarlos. Si materializa, el id cambia (virt_xxx -> bkg_yyy) — se
   * empuja ese id nuevo al snapshot para que `liveBookingDetail` (abajo)
   * lo vuelva a encontrar en el próximo render.
   */
  const ensureRealBookingId = (legacyDetail) => {
    if (!legacyDetail._source.esVirtual) return legacyDetail._source.id;
    const res = bookingActions.materializarFijo(legacyDetail._source);
    if (!res.ok) return legacyDetail._source.id;
    setSelectedBookingDetail((prev) => (prev ? { ...prev, id: res.data.id } : prev));
    return res.data.id;
  };

  const handleSettleBooking = () => {
    const legacy = liveBookingDetail;
    if (!legacy) return;
    const realId = ensureRealBookingId(legacy);
    const totals = selectors.selectBookingTotals(state, legacy._source);
    if (totals.saldo > 0) {
      bookingActions.registrarPago(realId, { monto: totals.saldo, metodo: 'efectivo' });
    }
    toast.success('¡Turno saldado correctamente! (100% Pagado)');
  };

  const handleCancelBooking = () => {
    const legacy = liveBookingDetail;
    if (!legacy) return;
    if (legacy._source.esVirtual) {
      // Es una proyección de turno fijo: "cancelar" es saltear solo esta fecha.
      turnoFijoActions.cancelarOcurrencia(legacy._source.origenFijoId, legacy._source.fecha);
    } else {
      bookingActions.cancelar(legacy._source.id);
    }
    toast.info('Turno cancelado y liberado.');
  };

  const handleConfirmBooking = () => {
    const legacy = liveBookingDetail;
    if (!legacy) return;
    const res = bookingActions.confirmar(legacy._source.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success('Turno confirmado. Ya no vence.');
  };

  const handleValidatePayment = (_bookingId, pagoId) => {
    const legacy = liveBookingDetail;
    if (!legacy) return;
    bookingActions.validarPago(legacy._source.id, pagoId, auth.session?.user?.id ?? null);
    toast.success('Seña validada.');
  };

  const handleAddCantinaToBooking = (_bookingId, legacyProduct) => {
    const legacy = liveBookingDetail;
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

  const handleEditBooking = (patch) => {
    const legacy = liveBookingDetail;
    if (!legacy) return;
    const realId = ensureRealBookingId(legacy);
    const result = bookingActions.actualizar(realId, patch);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success('Turno actualizado');
  };

  // Un complejo sin canchas no tiene grilla que mostrar: lo primero es el alta.
  if (canchas.length === 0) {
    return auth.esDueno ? (
      <>
        <OnboardingWizard />
        <ToastViewport />
      </>
    ) : (
      <PantallaSimple texto="El complejo todavía no tiene canchas cargadas. Pedile al dueño que complete el alta.">
        <button type="button" className="btn-secondary" onClick={onLogout} style={{ padding: '12px 20px' }}>
          Cerrar sesión
        </button>
      </PantallaSimple>
    );
  }

  // Si el dueño le saca un permiso a un empleado que justo estaba en esa
  // sección, cae a la grilla en vez de quedarse mirando algo que ya no le
  // corresponde. El gating real igual está en la base: esconder el tab es
  // comodidad, no seguridad.
  const tabActual = puedeVerTab(activeTab, auth) ? activeTab : 'grilla';
  const navVisible = BOTTOM_NAV.filter((item) => puedeVerTab(item.id, auth));

  return (
    <div style={{ minHeight: '100dvh' }}>

      {/* ─── Top Navbar ─── */}
      <Navbar
        onOpenNuevoTurno={() => setIsNuevoTurnoOpen(true)}
        onOpenCantina={() => setActiveTab('cantina')}
        activeTab={tabActual}
        setActiveTab={setActiveTab}
        onLogout={onLogout}
      />

      {/* ─── Layout ─── */}
      <div className="app-container">

        {/* Left Sidebar */}
        <Sidebar activeTab={tabActual} setActiveTab={setActiveTab} />

        {/* Main Content */}
        <main className="app-main-content animate-enter" key={tabActual}>
          {tabActual === 'grilla' && (
            <GrillaTurnos
              bookings={bookings}
              weekBookings={bookingsWeek}
              onOpenNuevoTurnoWithSlot={handleOpenNuevoTurnoWithSlot}
              onOpenBookingDetails={(b) => setSelectedBookingDetail(b)}
            />
          )}
          {tabActual === 'turnos_fijos' && <TurnosFijos />}
          {tabActual === 'cantina' && <CajaCantina />}
          {tabActual === 'clientes' && (
            <ClientesCRM clients={clients} />
          )}
          {tabActual === 'reportes' && <ReportesAnalytics />}
          {tabActual === 'configuracion' && <ConfiguracionComplejo />}
          {tabActual === 'derivaciones' && <Derivaciones />}
          {/* Vista Pública / QR: movida a /reserva como página aparte (ver src/main.jsx) */}
          {/* {activeTab === 'vista_publica' && <VistaPublicaJugador />} */}
        </main>
      </div>

      {/* ─── Bottom Nav (Mobile only) ─── */}
      <nav className="bottom-nav">
        {navVisible.map(item => {
          const Icon = item.icon;
          const isActive = tabActual === item.id;
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

      {/* ─── Detailed Booking Modal (Interactive Settle, Cantina, WA, Cancel, Edit) ─── */}
      <DetalleTurnoModal
        booking={liveBookingDetail}
        isOpen={!!selectedBookingDetail}
        onClose={() => setSelectedBookingDetail(null)}
        onSettleBooking={handleSettleBooking}
        onCancelBooking={handleCancelBooking}
        onAddCantinaToBooking={handleAddCantinaToBooking}
        onEditBooking={handleEditBooking}
        onConfirmBooking={handleConfirmBooking}
        onValidatePayment={handleValidatePayment}
      />

      <ToastViewport />

    </div>
  );
}
