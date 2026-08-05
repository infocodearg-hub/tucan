/**
 * Efectos que cruzan slices. Un reducer de slice no puede ver otro slice,
 * así que lo que toca a más de uno vive acá y corre después de la pasada
 * principal del reducer raíz.
 */

import { T } from './actions.js';
import { pluralize } from '../lib/format.js';

/** ¿Ya existe un booking activo en esa cancha/fecha/hora? */
function bookingOcupaSlot(b, { canchaId, fecha, hora, ignoreId }) {
  return (
    b.id !== ignoreId &&
    b.canchaId === canchaId &&
    b.fecha === fecha &&
    b.hora === hora &&
    b.estado !== 'cancelado'
  );
}

export function crossSlice(rawNext, action, prev) {
  // `lastError` es de un solo uso: se limpia en cada acción y solo los
  // casos de abajo lo vuelven a poner. Así un modal lo lee una vez y no
  // queda un error viejo pegado en pantalla.
  const next = rawNext.ui.lastError ? { ...rawNext, ui: { ...rawNext.ui, lastError: null } } : rawNext;

  switch (action.type) {
    // ── Evita el overwrite silencioso: crear sobre un slot ocupado no debe
    //    pisar el turno existente sin decir nada (era App.jsx:52 en el código viejo).
    case T.BOOKING_CREATE:
    case T.BOOKING_MATERIALIZE_FIJO: {
      const payload = action.payload;
      const choque = prev.bookings.find((b) =>
        bookingOcupaSlot(b, { canchaId: payload.canchaId, fecha: payload.fecha, hora: payload.hora })
      );
      if (choque) {
        return {
          ...next,
          bookings: prev.bookings, // descarta el alta que ya aplicó bookingsReducer
          ui: {
            ...next.ui,
            lastError: `Ese horario ya está ocupado (${payload.hora} hs).`,
          },
        };
      }
      return next;
    }

    case T.BOOKING_UPDATE: {
      const { id, patch } = action.payload;
      // Si el update mueve el turno de cancha/fecha/hora, revalidar el nuevo slot.
      if (!patch.canchaId && !patch.fecha && !patch.hora) return next;
      const actual = prev.bookings.find((b) => b.id === id);
      if (!actual) return next;
      const destino = {
        canchaId: patch.canchaId ?? actual.canchaId,
        fecha: patch.fecha ?? actual.fecha,
        hora: patch.hora ?? actual.hora,
      };
      const choque = prev.bookings.find((b) => bookingOcupaSlot(b, { ...destino, ignoreId: id }));
      if (choque) {
        return {
          ...next,
          bookings: prev.bookings,
          ui: { ...next.ui, lastError: `Ese horario ya está ocupado (${destino.hora} hs).` },
        };
      }
      return next;
    }

    // ── Vender baja stock; anular una venta lo repone. Solo para productos
    //    con controlaStock (los alquileres no se agotan).
    case T.SALE_CREATE: {
      const sale = next.sales[0]; // el reducer de sales lo insertó al frente
      const stockPorProducto = new Map(sale.items.map((i) => [i.productoId, i.cantidad]));
      return {
        ...next,
        products: next.products.map((p) => {
          const cant = stockPorProducto.get(p.id);
          if (!cant || !p.controlaStock) return p;
          return { ...p, stock: Math.max(0, p.stock - cant) };
        }),
      };
    }

    case T.SALE_VOID: {
      const sale = prev.sales.find((s) => s.id === action.payload.id);
      if (!sale || sale.anulada) return next;
      const repuesto = new Map(sale.items.map((i) => [i.productoId, i.cantidad]));
      return {
        ...next,
        products: next.products.map((p) => {
          const cant = repuesto.get(p.id);
          if (!cant || !p.controlaStock) return p;
          return { ...p, stock: p.stock + cant };
        }),
      };
    }

    // ── Borrar un cliente no debe dejar bookings con un clienteId colgado:
    //    se limpia la FK pero el nombre queda como snapshot histórico.
    case T.CLIENT_DELETE: {
      const clienteId = action.payload.id;
      return {
        ...next,
        bookings: next.bookings.map((b) =>
          b.clienteId === clienteId ? { ...b, clienteId: null } : b
        ),
        turnosFijos: next.turnosFijos.map((tf) =>
          tf.clienteId === clienteId ? { ...tf, clienteId: null } : tf
        ),
      };
    }

    // ── No se puede borrar una cancha con turnos futuros activos.
    case T.CANCHA_DELETE: {
      const canchaId = action.payload.id;
      const tieneTurnos = prev.bookings.some(
        (b) => b.canchaId === canchaId && b.estado !== 'cancelado'
      );
      if (tieneTurnos) {
        return {
          ...next,
          canchas: prev.canchas,
          ui: {
            ...next.ui,
            lastError: 'No se puede eliminar: la cancha tiene turnos cargados.',
          },
        };
      }
      return next;
    }

    // ── Borrar un turno fijo con turnos ya materializados: se desvinculan
    //    (quedan como bookings sueltos) en vez de arrastrarlos al limbo.
    case T.TURNO_FIJO_DELETE: {
      const tfId = action.payload.id;
      return {
        ...next,
        bookings: next.bookings.map((b) =>
          b.origenFijoId === tfId ? { ...b, origenFijoId: null } : b
        ),
      };
    }

    default:
      return next;
  }
}

/** Mensaje de éxito consistente para toasts que anuncian cantidades. */
export const cantidadLabel = (n, singular, plural) => pluralize(n, singular, plural);
