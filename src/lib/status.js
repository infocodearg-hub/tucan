/**
 * Estados, enums y sus etiquetas.
 *
 * Un solo lugar decide de qué color se pinta un turno. Antes esa lógica estaba
 * repartida y con enums que habían derivado ('Pendiente' vs 'Pendiente Seña Mes').
 */

import { toNumber } from './format.js';

// ─────────────────────────────────────────────── turnos

/** Ciclo de vida del turno (almacenado). */
export const ESTADO = {
  reservado: 'reservado',
  bloqueado: 'bloqueado',
  cancelado: 'cancelado',
};

/** Estado de pago (derivado por `bookingTotals`). */
export const ESTADO_PAGO_LABEL = {
  sin_sena: 'Sin seña',
  senado: 'Señado',
  pagado: 'Pagado',
};

/**
 * Variante visual de un slot. El orden de evaluación importa.
 * Se mapea directo a `data-status` en el markup.
 */
export function slotVariant(booking, estadoPago) {
  if (!booking) return 'libre';
  if (booking.estado === ESTADO.bloqueado) return 'bloqueado';
  if (booking.origenFijoId) return 'fijo';
  if (estadoPago === 'pagado') return 'pagado';
  if (estadoPago === 'senado') return 'senado';
  return 'sin_sena';
}

export const VARIANT_LABEL = {
  libre: 'Libre',
  bloqueado: 'Bloqueado',
  fijo: 'Turno fijo',
  pagado: 'Pagado',
  senado: 'Señado',
  sin_sena: 'Sin seña',
};

// ─────────────────────────────────────────────── canales

export const CANAL = {
  mostrador: 'mostrador',
  telefono: 'telefono',
  bot_wa: 'bot_wa',
  web: 'web',
};

export const CANAL_LABEL = {
  mostrador: 'Mostrador',
  telefono: 'Teléfono',
  bot_wa: 'Bot WhatsApp',
  web: 'Reserva web',
};

// ─────────────────────────────────────────────── canchas

export const DEPORTE_LABEL = {
  futbol5: 'Fútbol 5',
  futbol7: 'Fútbol 7',
  futbol11: 'Fútbol 11',
  padel: 'Pádel',
  tenis: 'Tenis',
};

export const DEPORTE_OPTIONS = Object.entries(DEPORTE_LABEL).map(([value, label]) => ({
  value,
  label,
}));

// ─────────────────────────────────────────────── pagos

export const METODO_PAGO_LABEL = {
  efectivo: 'Efectivo',
  mercadopago: 'Mercado Pago',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  a_cuenta_turno: 'A cuenta del turno',
};

export const METODO_PAGO_OPTIONS = Object.entries(METODO_PAGO_LABEL)
  .filter(([value]) => value !== 'a_cuenta_turno')
  .map(([value, label]) => ({ value, label }));

// ─────────────────────────────────────────────── turnos fijos

export const ESTADO_MES = {
  al_dia: 'al_dia',
  pendiente: 'pendiente',
  deuda: 'deuda',
};

export const ESTADO_MES_LABEL = {
  al_dia: 'Al día',
  pendiente: 'Pendiente',
  deuda: 'En deuda',
};

/** Variante de color para el estado mensual, reutiliza las mismas de los turnos. */
export const ESTADO_MES_VARIANT = {
  al_dia: 'pagado',
  pendiente: 'senado',
  deuda: 'bloqueado',
};

// ─────────────────────────────────────────────── gastos

export const GASTO_CATEGORIA_LABEL = {
  sueldos: 'Sueldos',
  mantenimiento: 'Mantenimiento',
  servicios: 'Servicios',
  insumos: 'Insumos',
  otro: 'Otro',
};

export const GASTO_CATEGORIAS = Object.entries(GASTO_CATEGORIA_LABEL).map(([value, label]) => ({
  value,
  label,
}));

// ─────────────────────────────────────────────── clientes

/**
 * Etiqueta del cliente derivada de su comportamiento real.
 * Antes era un string congelado en los datos semilla que nunca cambiaba.
 */
export function badgeForClient(stats = {}) {
  const partidos = toNumber(stats.partidos);
  const cancelaciones = toNumber(stats.cancelaciones);
  const gastado = toNumber(stats.gastado);

  if (cancelaciones >= 3) return { key: 'riesgo', label: 'Riesgo', variant: 'bloqueado' };
  if (partidos >= 20 || gastado >= 300_000) return { key: 'vip', label: 'VIP', variant: 'pagado' };
  if (partidos >= 8) return { key: 'habitual', label: 'Habitual', variant: 'fijo' };
  if (partidos >= 1) return { key: 'ocasional', label: 'Ocasional', variant: 'senado' };
  return { key: 'nuevo', label: 'Nuevo', variant: 'libre' };
}

/**
 * Puntaje 0-10 derivado: parte de 10 y descuenta cancelaciones,
 * con un piso de 1. Nunca es un string (el bug de `'10/10' >= '9'`).
 */
export function scoreForClient(stats = {}) {
  const partidos = toNumber(stats.partidos);
  const cancelaciones = toNumber(stats.cancelaciones);
  if (partidos === 0 && cancelaciones === 0) return null;
  const ratio = cancelaciones / Math.max(1, partidos + cancelaciones);
  return Math.max(1, Math.round((10 - ratio * 12) * 10) / 10);
}
