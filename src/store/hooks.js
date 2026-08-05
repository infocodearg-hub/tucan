/**
 * Hooks de dominio. Los componentes nunca tocan `useContext` ni el
 * reducer directamente — todo pasa por acá.
 *
 * Por qué hooks por dominio y no un `useStore()` único: (a) evita que
 * cualquier cambio de datos re-renderice toda la app, (b) es la segunda
 * costura de API — el día que haya backend + React Query, se reescribe
 * el CUERPO de estos hooks y ningún componente se entera.
 *
 * Los hooks de escritura validan ANTES de despachar y devuelven
 * `{ ok, error }` de forma sincrónica — `dispatch` de useReducer no
 * expone el estado resultante en el mismo tick, así que la validación
 * de negocio (¿está libre el slot?) vive acá, no después del dispatch.
 * El reducer igual se queda con su propio guard defensivo en crossSlice.js
 * como red de seguridad, no como el camino principal.
 */

import { useCallback, useContext, useMemo } from 'react';
import { StoreDispatchContext, StoreStateContext } from './StoreProvider.jsx';
import * as actions from './actions.js';
import * as sel from './selectors.js';
import { id as genId } from '../lib/id.js';
import { nowISO, todayISO } from '../lib/date.js';

// ─────────────────────────────────────────────── primitivas

export function useAppState() {
  const state = useContext(StoreStateContext);
  if (!state) throw new Error('useAppState debe usarse dentro de <StoreProvider>');
  return state;
}

export function useAppDispatch() {
  const dispatch = useContext(StoreDispatchContext);
  if (!dispatch) throw new Error('useAppDispatch debe usarse dentro de <StoreProvider>');
  return dispatch;
}

/** `useSelector(sel.selectBookingsForDate, fecha)` — memoiza por referencia de state + args. */
export function useSelector(selectorFn, ...args) {
  const state = useAppState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => selectorFn(state, ...args), [state, ...args]);
}

// ─────────────────────────────────────────────── lectura

export const useConfig = () => useSelector(sel.selectConfig);
export const useCanchas = () => useSelector(sel.selectCanchas);
export const useCanchasActivas = () => useSelector(sel.selectCanchasActivas);
export const useCancha = (id) => useSelector(sel.selectCancha, id);

export const useClients = () => useSelector(sel.selectClients);
export const useClient = (id) => useSelector(sel.selectClient, id);
export const useClientStats = (id) => useSelector(sel.selectClientStats, id);
export const useClientBadge = (id) => useSelector(sel.selectClientBadge, id);

export const useProducts = () => useSelector(sel.selectProducts);
export const useProduct = (id) => useSelector(sel.selectProduct, id);

export const useSales = () => useSelector(sel.selectSales);
export const useSalesForBooking = (bookingId) => useSelector(sel.selectSalesForBooking, bookingId);

export const useTurnosFijos = () => useSelector(sel.selectTurnosFijos);
export const useTurnoFijo = (id) => useSelector(sel.selectTurnoFijo, id);

export const useBookings = () => useSelector(sel.selectBookings);
export const useBooking = (id) => useSelector(sel.selectBooking, id);
export const useBookingsForDate = (fecha) => useSelector(sel.selectBookingsForDate, fecha);
export const useBookingTotals = (booking) => useSelector(sel.selectBookingTotals, booking);

export const useDayKpis = (fecha) => useSelector(sel.selectDayKpis, fecha);
export const useCajaDelDia = (fecha) => useSelector(sel.selectCajaDelDia, fecha);

export const useToasts = () => useSelector(sel.selectToasts);
export const useSelectedDate = () => useSelector(sel.selectSelectedDate);
export const useActiveTab = () => useSelector((s) => s.ui.activeTab);
export const useSession = () => useSelector(sel.selectSession);

// ─────────────────────────────────────────────── escritura: UI

export function useUIActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      setActiveTab: (tab) => dispatch(actions.setActiveTab(tab)),
      setSelectedDate: (iso) => dispatch(actions.setSelectedDate(iso)),
      setSession: (session) => dispatch(actions.setSession(session)),
    }),
    [dispatch]
  );
}

export function useToast() {
  const dispatch = useAppDispatch();
  const push = useCallback(
    (message, opts = {}) => dispatch(actions.pushToast({ message, ...opts })),
    [dispatch]
  );
  return useMemo(
    () => ({
      success: (message, opts) => push(message, { type: 'success', ...opts }),
      error: (message, opts) => push(message, { type: 'error', ...opts }),
      info: (message, opts) => push(message, { type: 'info', ...opts }),
      dismiss: (id) => dispatch(actions.dismissToast(id)),
    }),
    [push, dispatch]
  );
}

// ─────────────────────────────────────────────── escritura: config

export function useConfigActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      actualizar: (patch) => {
        dispatch(actions.updateConfig(patch));
        return { ok: true };
      },
    }),
    [dispatch]
  );
}

// ─────────────────────────────────────────────── escritura: canchas

export function useCanchaActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      crear: (data) => {
        if (!data.nombre?.trim()) return { ok: false, error: 'El nombre es obligatorio.' };
        dispatch(actions.createCancha(data));
        return { ok: true };
      },
      actualizar: (id, patch) => {
        dispatch(actions.updateCancha(id, patch));
        return { ok: true };
      },
      eliminar: (id) => {
        dispatch(actions.deleteCancha(id));
        return { ok: true };
      },
    }),
    [dispatch]
  );
}

// ─────────────────────────────────────────────── escritura: turnos

export function useBookingActions() {
  const dispatch = useAppDispatch();
  const state = useAppState();

  return useMemo(
    () => ({
      /** Crea un turno. Valida el slot ANTES de despachar. */
      crear: (data) => {
        if (!data.clienteNombre?.trim()) {
          return { ok: false, error: 'El nombre del cliente es obligatorio.' };
        }
        if (!data.canchaId || !data.fecha || !data.hora) {
          return { ok: false, error: 'Falta cancha, fecha u horario.' };
        }
        if (!sel.selectIsSlotFree(state, data)) {
          return { ok: false, error: `Ese horario ya está ocupado (${data.hora} hs).` };
        }
        const booking = { id: genId('bkg'), ...data };
        dispatch(actions.createBooking(booking));
        return { ok: true, data: booking };
      },

      actualizar: (id, patch) => {
        if (patch.canchaId || patch.fecha || patch.hora) {
          const actual = sel.selectBooking(state, id);
          if (!actual) return { ok: false, error: 'El turno ya no existe.' };
          const destino = {
            canchaId: patch.canchaId ?? actual.canchaId,
            fecha: patch.fecha ?? actual.fecha,
            hora: patch.hora ?? actual.hora,
            ignoreBookingId: id,
          };
          if (!sel.selectIsSlotFree(state, destino)) {
            return { ok: false, error: `Ese horario ya está ocupado (${destino.hora} hs).` };
          }
        }
        dispatch(actions.updateBooking(id, patch));
        return { ok: true };
      },

      cancelar: (id) => {
        dispatch(actions.cancelBooking(id));
        return { ok: true };
      },

      eliminar: (id) => {
        dispatch(actions.deleteBooking(id));
        return { ok: true };
      },

      registrarPago: (bookingId, pago) => {
        if (!pago?.monto || pago.monto <= 0) {
          return { ok: false, error: 'El importe tiene que ser mayor a 0.' };
        }
        dispatch(actions.addPayment(bookingId, pago));
        return { ok: true };
      },

      quitarPago: (bookingId, pagoId) => {
        dispatch(actions.removePayment(bookingId, pagoId));
        return { ok: true };
      },

      /** Convierte un turno fijo proyectado (id `virt_...`) en un booking real. */
      materializarFijo: (turnoVirtual) => {
        if (!turnoVirtual?.esVirtual) return { ok: false, error: 'El turno ya es real.' };
        // eslint-disable-next-line no-unused-vars
        const { id: _virtId, esVirtual, ...resto } = turnoVirtual;
        const booking = { id: genId('bkg'), createdAt: nowISO(), updatedAt: nowISO(), ...resto };
        dispatch(actions.materializeFijo(booking));
        return { ok: true, data: booking };
      },
    }),
    [dispatch, state]
  );
}

// ─────────────────────────────────────────────── escritura: clientes

export function useClientActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      crear: (data) => {
        if (!data.nombre?.trim()) return { ok: false, error: 'El nombre es obligatorio.' };
        const client = { id: genId('cli'), ...data };
        dispatch(actions.createClient(client));
        return { ok: true, data: client };
      },
      actualizar: (id, patch) => {
        if (patch.nombre !== undefined && !patch.nombre.trim()) {
          return { ok: false, error: 'El nombre no puede quedar vacío.' };
        }
        dispatch(actions.updateClient(id, patch));
        return { ok: true };
      },
      eliminar: (id) => {
        dispatch(actions.deleteClient(id));
        return { ok: true };
      },
      restaurar: (client) => {
        dispatch(actions.restoreClient(client));
        return { ok: true };
      },
    }),
    [dispatch]
  );
}

// ─────────────────────────────────────────────── escritura: productos

export function useProductActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      crear: (data) => {
        if (!data.nombre?.trim()) return { ok: false, error: 'El nombre es obligatorio.' };
        if (data.precio == null || data.precio < 0) {
          return { ok: false, error: 'El precio tiene que ser 0 o mayor.' };
        }
        const product = { id: genId('prd'), ...data };
        dispatch(actions.createProduct(product));
        return { ok: true, data: product };
      },
      actualizar: (id, patch) => {
        dispatch(actions.updateProduct(id, patch));
        return { ok: true };
      },
      eliminar: (id) => {
        dispatch(actions.deleteProduct(id));
        return { ok: true };
      },
      restaurar: (product) => {
        dispatch(actions.restoreProduct(product));
        return { ok: true };
      },
    }),
    [dispatch]
  );
}

// ─────────────────────────────────────────────── escritura: ventas

export function useSaleActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      registrar: (data) => {
        if (!data.items?.length) return { ok: false, error: 'El ticket está vacío.' };
        const sale = { id: genId('sale'), fechaHora: nowISO(), ...data };
        dispatch(actions.createSale(sale));
        return { ok: true, data: sale };
      },
      anular: (id) => {
        dispatch(actions.voidSale(id));
        return { ok: true };
      },
    }),
    [dispatch]
  );
}

// ─────────────────────────────────────────────── escritura: turnos fijos

export function useTurnoFijoActions() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      crear: (data) => {
        if (!data.equipoNombre?.trim()) return { ok: false, error: 'El nombre del equipo es obligatorio.' };
        if (!data.canchaId || data.diaSemana == null || !data.hora) {
          return { ok: false, error: 'Falta cancha, día u horario.' };
        }
        const tf = { id: genId('tf'), vigenteDesde: todayISO(), ...data };
        dispatch(actions.createTurnoFijo(tf));
        return { ok: true, data: tf };
      },
      actualizar: (id, patch) => {
        dispatch(actions.updateTurnoFijo(id, patch));
        return { ok: true };
      },
      eliminar: (id) => {
        dispatch(actions.deleteTurnoFijo(id));
        return { ok: true };
      },
      restaurar: (tf) => {
        dispatch(actions.restoreTurnoFijo(tf));
        return { ok: true };
      },
      cancelarOcurrencia: (id, fecha) => {
        dispatch(actions.addFijoException(id, fecha));
        return { ok: true };
      },
      marcarMes: (id, mesKey, estado) => {
        dispatch(actions.setFijoMonthStatus(id, mesKey, estado));
        return { ok: true };
      },
    }),
    [dispatch]
  );
}

// ─────────────────────────────────────────────── mantenimiento

export function useStoreMaintenance() {
  const dispatch = useAppDispatch();
  return useMemo(
    () => ({
      reiniciarDemo: () => dispatch(actions.resetDemo()),
      importar: (state) => dispatch(actions.importData(state)),
    }),
    [dispatch]
  );
}
