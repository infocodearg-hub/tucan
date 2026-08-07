/**
 * ⚠️ CAPA TRANSITORIA — se borra en la Fase 5.
 *
 * GrillaTurnos, NuevoTurnoModal, DetalleTurnoModal y ClientesCRM todavía
 * esperan la forma de datos vieja (mockData.js): `canchaId/time/clientName/
 * status/totalPrice/depositPaid/cantinaExtras[]`. El store ya vive en el
 * modelo normalizado (`fecha/hora/clienteNombre/estado/pagos[]/precioCancha`).
 *
 * En vez de reescribir esos 4 componentes a la vez que se cablea la
 * persistencia — dos cambios grandes en simultáneo, difícil de revisar —
 * esta capa traduce en un solo lugar. Cuando esos componentes se reescriban
 * (Fase 5), este archivo se elimina entero y ellos consumen el store directo.
 */

import { selectBookingTotals, selectSalesForBooking } from './selectors.js';
import { METODO_PAGO_LABEL } from '../lib/status.js';

const CATEGORIA_A_LABEL = {
  bebidas: 'Bebidas',
  tragos: 'Tragos',
  snacks: 'Snacks',
  servicios: 'Servicios',
};

/** booking del store → shape vieja que leen los componentes no migrados. */
export function toLegacyBooking(state, booking) {
  const totals = selectBookingTotals(state, booking);
  const ventas = booking.esVirtual ? [] : selectSalesForBooking(state, booking.id);

  // El orden importa y `pending` va segundo a propósito. Sin esa rama, un turno
  // sin confirmar y sin un peso pagado caía por descarte en `partial`, o sea
  // que la grilla lo mostraba como "Señado": justo lo contrario de lo que es.
  let status = 'partial';
  if (booking.estado === 'bloqueado') status = 'blocked';
  else if (booking.estado === 'pendiente') status = 'pending';
  else if (booking.origenFijoId) status = 'fixed';
  else if (totals.estadoPago === 'pagado') status = 'paid';

  const ultimoPago = booking.pagos?.[booking.pagos.length - 1];

  return {
    id: booking.id,
    canchaId: booking.canchaId,
    time: booking.hora,
    date: booking.fecha,
    clientName: booking.clienteNombre,
    clientPhone: booking.clienteTelefono,
    status,
    totalPrice: totals.total,
    depositPaid: totals.pagado,
    paymentMethod: ultimoPago ? (METODO_PAGO_LABEL[ultimoPago.metodo] ?? ultimoPago.metodo) : '-',
    cantinaExtras: Object.values(ventas.flatMap((v) => v.items).reduce((acc, it) => {
      if (!acc[it.productoId]) acc[it.productoId] = { id: it.productoId, name: it.nombre, qty: 0, price: it.precioUnit };
      acc[it.productoId].qty += it.cantidad;
      return acc;
    }, {})),
    notes: booking.notas ?? '',
    isFixed: !!booking.origenFijoId,
    channel: booking.canal === 'bot_wa' ? 'bot_ai' : 'manual',
    // Lo del turno sin confirmar viaja con nombres nuevos y no con los de la
    // forma vieja: mockData nunca tuvo nada parecido, así que no hay a qué
    // traducirlo.
    estado: booking.estado,
    codigo: booking.codigo ?? null,
    expiraAt: booking.expiraAt ?? null,
    // Plata que alguien dijo que mandó y que todavía nadie miró.
    senaSinValidar: (booking.pagos ?? []).some((p) => p.validado === false),
    // Referencia al original — la usan los handlers para saber a qué
    // entidad del store aplicar la acción real.
    _source: booking,
  };
}

export const toLegacyBookings = (state, bookings) => bookings.map((b) => toLegacyBooking(state, b));

/**
 * cliente del store → shape vieja del CRM.
 *
 * `badge` viaja como el objeto {key,label,variant} completo, no como texto:
 * el componente viejo adivinaba el ícono/color por substring en el texto
 * ("incluye 'Capitán'" → escudo azul), y el vocabulario de las etiquetas
 * DERIVADAS ('Habitual', 'Ocasional', 'Nuevo') no coincide con ninguno de
 * esos substrings — todo lo que no fuera VIP caía, por descarte, en el
 * badge de "⚠️ Cancela tarde". Un cliente nuevo se veía como un moroso.
 */
export function toLegacyClient(state, client, stats, badge) {
  return {
    id: client.id,
    name: client.nombre,
    phone: client.telefono ?? '-',
    matchesPlayed: stats.partidos,
    cancellations: stats.cancelaciones,
    badge,
    score: client.score != null ? `${client.score}/10` : '—',
    lastMatch: '—',
    totalSpent: stats.gastado,
    _source: client,
  };
}

/** producto del store → shape vieja del POS (categoría como label en español). */
export function toLegacyProduct(product) {
  return {
    id: product.id,
    name: product.nombre,
    category: CATEGORIA_A_LABEL[product.categoria] ?? product.categoria,
    price: product.precio,
    stock: product.stock,
    icon: null,
    _source: product,
  };
}
