import { T } from '../actions.js';
import { id as genId } from '../../lib/id.js';
import { nowISO } from '../../lib/date.js';

export function bookingsReducer(state, action) {
  switch (action.type) {
    case T.BOOKING_CREATE: {
      const booking = {
        id: genId('bkg'),
        estado: 'reservado',
        origenFijoId: null,
        pagos: [],
        notas: '',
        canal: 'mostrador',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        ...action.payload,
      };
      return [...state, booking];
    }

    // La materialización de un fijo proyectado también crea un booking real,
    // pero preservando el id "virt_..." como referencia sería confuso — usa
    // uno nuevo y guarda origenFijoId para el enlace.
    case T.BOOKING_MATERIALIZE_FIJO: {
      const booking = {
        id: genId('bkg'),
        estado: 'reservado',
        pagos: [],
        notas: '',
        canal: 'mostrador',
        createdAt: nowISO(),
        updatedAt: nowISO(),
        ...action.payload,
      };
      return [...state, booking];
    }

    case T.BOOKING_UPDATE:
      return state.map((b) =>
        b.id === action.payload.id
          ? { ...b, ...action.payload.patch, updatedAt: nowISO() }
          : b
      );

    case T.BOOKING_CANCEL:
      return state.map((b) =>
        b.id === action.payload.id
          ? { ...b, estado: 'cancelado', motivoCancelacion: 'mostrador', updatedAt: nowISO() }
          : b
      );

    // El vencimiento se limpia junto con el estado: un turno confirmado que
    // conserva su `expiraAt` lo cancela el barrido media hora más tarde.
    case T.BOOKING_CONFIRM:
      return state.map((b) =>
        b.id === action.payload.id && b.estado === 'pendiente'
          ? { ...b, estado: 'reservado', expiraAt: null, updatedAt: nowISO() }
          : b
      );

    case T.BOOKING_DELETE:
      return state.filter((b) => b.id !== action.payload.id);

    case T.BOOKING_ADD_PAYMENT:
      return state.map((b) => {
        if (b.id !== action.payload.bookingId) return b;
        // `validado: true` por defecto: este pago lo carga alguien del complejo
        // desde el panel, o sea que ya contó la plata. Los que nacen sin
        // validar son los que inserta la Edge Function con un comprobante.
        const pago = {
          id: genId('pay'),
          fecha: nowISO(),
          nota: '',
          validado: true,
          ...action.payload.pago,
        };
        return { ...b, pagos: [...(b.pagos ?? []), pago], updatedAt: nowISO() };
      });

    case T.BOOKING_VALIDATE_PAYMENT:
      return state.map((b) => {
        if (b.id !== action.payload.bookingId) return b;
        return {
          ...b,
          pagos: (b.pagos ?? []).map((p) =>
            p.id === action.payload.pagoId
              ? {
                  ...p,
                  validado: true,
                  validadoAt: nowISO(),
                  validadoPor: action.payload.userId ?? null,
                }
              : p
          ),
          updatedAt: nowISO(),
        };
      });

    case T.BOOKING_REMOVE_PAYMENT:
      return state.map((b) => {
        if (b.id !== action.payload.bookingId) return b;
        return {
          ...b,
          pagos: (b.pagos ?? []).filter((p) => p.id !== action.payload.pagoId),
          updatedAt: nowISO(),
        };
      });

    // clients/delete necesita dejar el nombre como snapshot en vez de un
    // clienteId colgado — lo resuelve crossSlice, que ve ambos slices.
    default:
      return state;
  }
}
