/**
 * WhatsApp — links y plantillas de mensaje.
 *
 * Todo el texto que el complejo le manda a un jugador nace acá.
 * Centralizarlo es lo que después permite (a) que el dueño edite las plantillas
 * desde Configuración y (b) que el bot use exactamente los mismos textos.
 */

import { phoneDigits } from './phone.js';
import { formatARS } from './format.js';
import { formatMediumDate, formatMonth } from './date.js';

/**
 * @returns {string|null} `https://wa.me/549...?text=...` o null si el teléfono no sirve
 */
export function waLink(phone, text) {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return text ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : `https://wa.me/${digits}`;
}

/** Abre WhatsApp en una pestaña nueva. Devuelve false si el teléfono no era válido. */
export function openWhatsApp(phone, text) {
  const url = waLink(phone, text);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

const nl = (lines) => lines.filter((l) => l !== null && l !== undefined).join('\n');

const datosDePago = (config) => {
  const alias = config?.pagos?.alias;
  const cbu = config?.pagos?.cbu;
  if (!alias && !cbu) return null;
  return nl(['', '💳 *Para señar:*', alias ? `Alias: ${alias}` : null, cbu ? `CBU: ${cbu}` : null]);
};

/** Confirmación de reserva recién tomada. */
export function msgConfirmacionReserva({ booking, cancha, config, totales }) {
  const complejo = config?.complejo?.nombre ?? 'el complejo';
  return nl([
    `¡Hola ${booking.clienteNombre?.split(' ')[0] ?? ''}! 👋`,
    '',
    `Te confirmamos tu turno en *${complejo}*:`,
    '',
    `🗓️ ${formatMediumDate(booking.fecha)}`,
    `🕒 ${booking.hora} hs`,
    `⚽ ${cancha?.nombre ?? 'Cancha'}${cancha?.subtitulo ? ` · ${cancha.subtitulo}` : ''}`,
    `💰 Total: ${formatARS(totales.total)}`,
    totales.saldo > 0 ? `⏳ Saldo pendiente: ${formatARS(totales.saldo)}` : '✅ Turno pago',
    totales.saldo > 0 ? datosDePago(config) : null,
    '',
    '¡Nos vemos en la cancha! 🥅',
  ]);
}

/** Cobro del saldo pendiente. */
export function msgCobroSaldo({ booking, cancha, config, totales }) {
  return nl([
    `¡Hola ${booking.clienteNombre?.split(' ')[0] ?? ''}! 👋`,
    '',
    `Te recordamos que queda un saldo pendiente de tu turno:`,
    '',
    `🗓️ ${formatMediumDate(booking.fecha)} · ${booking.hora} hs`,
    `⚽ ${cancha?.nombre ?? 'Cancha'}`,
    `💰 Total: ${formatARS(totales.total)}`,
    `✅ Pagado: ${formatARS(totales.pagado)}`,
    `⏳ *Saldo: ${formatARS(totales.saldo)}*`,
    datosDePago(config),
    '',
    'Cualquier cosa avisanos. ¡Gracias! 🙌',
  ]);
}

/** Recordatorio 24 h antes. */
export function msgRecordatorio({ booking, cancha, config, totales }) {
  const complejo = config?.complejo?.nombre ?? 'el complejo';
  return nl([
    `¡Hola ${booking.clienteNombre?.split(' ')[0] ?? ''}! ⚽`,
    '',
    `Te recordamos tu turno de mañana en *${complejo}*:`,
    '',
    `🕒 ${booking.hora} hs · ${cancha?.nombre ?? 'Cancha'}`,
    totales?.saldo > 0 ? `⏳ Saldo a abonar: ${formatARS(totales.saldo)}` : null,
    config?.complejo?.direccion ? `📍 ${config.complejo.direccion}` : null,
    '',
    'Si no podés venir, avisanos así liberamos la cancha 🙏',
  ]);
}

/** Cobro mensual de un turno fijo. */
export function msgTurnoFijoMes({ turnoFijo, cancha, config, mesKey, monto, diaLabel }) {
  return nl([
    `¡Hola ${turnoFijo.capitanNombre?.split(' ')[0] ?? ''}! 👋`,
    '',
    `Pasamos el detalle del turno fijo de *${turnoFijo.equipoNombre}*:`,
    '',
    `📅 ${formatMonth(mesKey)}`,
    `🕒 ${diaLabel} ${turnoFijo.hora} hs · ${cancha?.nombre ?? 'Cancha'}`,
    `💰 Total del mes: ${formatARS(monto)}`,
    datosDePago(config),
    '',
    '¡Gracias por elegirnos! 🥅',
  ]);
}

/** Aviso de cancelación. */
export function msgCancelacion({ booking, cancha, config }) {
  const complejo = config?.complejo?.nombre ?? 'el complejo';
  return nl([
    `¡Hola ${booking.clienteNombre?.split(' ')[0] ?? ''}!`,
    '',
    `Te confirmamos que se canceló tu turno en *${complejo}*:`,
    '',
    `🗓️ ${formatMediumDate(booking.fecha)} · ${booking.hora} hs`,
    `⚽ ${cancha?.nombre ?? 'Cancha'}`,
    '',
    'Cuando quieras reservar de nuevo, escribinos. 🙌',
  ]);
}

/** Consulta desde la vista pública del jugador. */
export function msgConsultaPublica({ cancha, fecha, hora, precio, sena, complejo }) {
  return nl([
    '¡Hola! 👋 Quiero reservar un turno:',
    '',
    `🗓️ ${formatMediumDate(fecha)}`,
    `🕒 ${hora} hs`,
    `⚽ ${cancha?.nombre ?? 'Cancha'}`,
    `💰 ${formatARS(precio)}${sena ? ` (seña ${formatARS(sena)})` : ''}`,
    complejo ? '' : null,
    complejo ? `Complejo: ${complejo}` : null,
  ]);
}
