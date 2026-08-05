/**
 * Precios, horarios y totales.
 *
 * Reemplaza las 4 implementaciones duplicadas de "¿es horario nocturno?"
 * que había repartidas por los componentes, incluida la variante rota
 * `parseInt(t) >= 19` que solo funcionaba por accidente.
 */

import { toNumber } from './format.js';

export const DEFAULT_NIGHT_FROM = '19:00';

/**
 * Minutos desde las 00:00 del día operativo.
 * `'00:00'` mapea a 1440 (medianoche de cierre, no de apertura) — eso es lo que
 * elimina el caso especial `|| t === '00:00'` de todos los llamadores.
 */
export function slotMinutes(hora) {
  const [h, m] = String(hora).split(':').map(Number);
  const hh = Number.isFinite(h) ? h : 0;
  const mm = Number.isFinite(m) ? m : 0;
  return (hh === 0 ? 24 : hh) * 60 + mm;
}

/** Ordena strings de hora respetando que 00:00 es el último slot del día. */
export const compareSlots = (a, b) => slotMinutes(a) - slotMinutes(b);

/** ¿El slot cae en tarifa nocturna? El umbral es configurable por el complejo. */
export function isNightSlot(hora, nightFrom = DEFAULT_NIGHT_FROM) {
  return slotMinutes(hora) >= slotMinutes(nightFrom);
}

/** Precio de la cancha para ese horario. */
export function precioSlot(cancha, hora, nightFrom = DEFAULT_NIGHT_FROM) {
  if (!cancha) return 0;
  return isNightSlot(hora, nightFrom)
    ? toNumber(cancha.precioNoche)
    : toNumber(cancha.precioDia);
}

/** Seña sugerida según el porcentaje configurado por el complejo. */
export function senaSugerida(precio, porcentaje = 50) {
  const pct = Math.min(100, Math.max(0, toNumber(porcentaje)));
  return Math.round((toNumber(precio) * pct) / 100);
}

/**
 * Totales de un turno. NADA de esto se almacena: siempre se deriva.
 * Es lo que hace imposible que el total y los pagos queden desincronizados.
 *
 * @param {object} booking
 * @param {Array}  ventasDelTurno ventas con `bookingId` === booking.id
 */
export function bookingTotals(booking, ventasDelTurno = []) {
  const cancha = toNumber(booking?.precioCancha);
  const cantina = ventasDelTurno
    .filter((v) => !v.anulada)
    .reduce((acc, v) => acc + toNumber(v.total), 0);
  const total = cancha + cantina;

  const pagado = (booking?.pagos ?? []).reduce((acc, p) => acc + toNumber(p.monto), 0);
  const saldo = Math.max(0, total - pagado);
  const pctPagado = total > 0 ? Math.min(1, pagado / total) : 0;

  let estadoPago = 'sin_sena';
  if (total > 0 && pagado >= total) estadoPago = 'pagado';
  else if (pagado > 0) estadoPago = 'senado';

  return { subtotalCancha: cancha, subtotalCantina: cantina, total, pagado, saldo, pctPagado, estadoPago };
}

/** Total de una venta a partir de sus items. */
export const salesTotal = (items = []) =>
  items.reduce((acc, i) => acc + toNumber(i.precioUnit) * toNumber(i.cantidad), 0);

/** Ocupación 0-1 de un conjunto de slots. */
export function ocupacion(ocupados, totales) {
  const t = toNumber(totales);
  return t > 0 ? Math.min(1, toNumber(ocupados) / t) : 0;
}

/** Precio mensual de un turno fijo: override manual o derivado de las ocurrencias del mes. */
export function precioMensualFijo(turnoFijo, cancha, ocurrencias, nightFrom = DEFAULT_NIGHT_FROM) {
  if (turnoFijo?.precioMensualOverride != null) return toNumber(turnoFijo.precioMensualOverride);
  return precioSlot(cancha, turnoFijo?.hora, nightFrom) * ocurrencias;
}
