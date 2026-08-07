/**
 * notificaciones.js — qué merece aparecer en la campana, y por qué.
 *
 * La campana no es el toast. El toast dice "acabás de hacer algo"; la campana
 * dice "esto pasó mientras no mirabas y sigue sin resolverse". Por eso acá no
 * hay historial: se listan alertas VIGENTES, derivadas del estado actual, y
 * cuando el problema se resuelve el item desaparece solo.
 *
 * Función pura a propósito: no toca React, no lee el reloj (recibe `ahoraMs`)
 * y no toca localStorage. Todo eso vive en hooks/useNotificaciones.js.
 */

export const TIPOS = {
  SENA_SIN_VALIDAR: 'sena_sin_validar',
  TURNO_POR_EXPIRAR: 'turno_por_expirar',
  TURNO_BOT_NUEVO: 'turno_bot_nuevo',
  DERIVACION_ABIERTA: 'derivacion_abierta',
};

/** Un pendiente avisa recién cuando está por vencerse de verdad. */
export const MINUTOS_AVISO_EXPIRACION = 30;
/** Un turno del bot es "nuevo" mientras dure el turno de trabajo. */
export const HORAS_TURNO_BOT_NUEVO = 12;
/** Una seña sin validar de hace una semana ya no se resuelve desde la campana. */
export const DIAS_SENA_SIN_VALIDAR = 2;

const MS_HORA = 3600_000;
const MS_DIA = 86_400_000;

/** ISO corto (YYYY-MM-DD) de un epoch, en hora local. */
function fechaISO(ms) {
  const d = new Date(ms);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

const nombreDe = (b) => b.clienteNombre || 'Sin nombre';

/**
 * Minutos que faltan para `value`, contra el ahora que se inyecta.
 * `lib/date.minutosPara` no sirve acá: lee `Date.now()` por su cuenta y eso
 * haría intesteable a `construirNotificaciones`.
 */
function minutosHasta(value, ahoraMs) {
  if (!value) return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? Math.round((t - ahoraMs) / 60_000) : null;
}

/**
 * @param {object}   args
 * @param {Array}    args.bookings     turnos crudos del store (shape normalizada)
 * @param {Array}    args.derivaciones filas abiertas de `bot_derivaciones`; [] si no hay permiso
 * @param {object}   args.config       config del tenant (para el flag de alertas)
 * @param {number}   args.ahoraMs      Date.now() inyectado — mantiene la función pura
 * @param {number}   [args.limite]     tope de items devueltos
 * @returns {Array<{
 *   id: string, tipo: string, titulo: string, detalle: string,
 *   iconKey: 'eye'|'clock'|'wand'|'message', color: string, ts: string,
 *   target: {kind:'booking', bookingId: string, fecha: string}|{kind:'tab', tab: string},
 * }>} ordenado por ts descendente
 */
export function construirNotificaciones({
  bookings = [],
  derivaciones = [],
  config = null,
  ahoraMs = Date.now(),
  limite = 20,
} = {}) {
  const items = [];

  // El toggle "Alertas de Turnos Sin Seña" de Configuración apaga las dos
  // alertas de plata que no entró. Hasta ahora el flag se guardaba y nadie lo
  // leía; este es su primer consumidor.
  const alertasPlata = config?.integraciones?.alertasSinSena !== false;
  const corteSena = fechaISO(ahoraMs - DIAS_SENA_SIN_VALIDAR * MS_DIA);

  for (const b of bookings) {
    // Los turnos fijos proyectados no existen todavía en la base: no tienen
    // pagos ni pueden expirar, y abrirlos desde la campana no llevaría a nada.
    if (b.esVirtual) continue;

    if (alertasPlata) {
      // ─── Seña declarada por WhatsApp que nadie revisó ───
      if (b.fecha >= corteSena) {
        for (const p of b.pagos ?? []) {
          if (p.validado !== false) continue;
          items.push({
            id: `${TIPOS.SENA_SIN_VALIDAR}:${b.id}:${p.id}`,
            tipo: TIPOS.SENA_SIN_VALIDAR,
            titulo: 'Seña sin validar',
            detalle: `${nombreDe(b)} · ${b.fecha} ${b.hora} hs`,
            iconKey: 'eye',
            color: 'var(--amber)',
            ts: p.fecha ?? b.createdAt ?? `${b.fecha}T${b.hora}:00`,
            target: { kind: 'booking', bookingId: b.id, fecha: b.fecha },
          });
        }
      }

      // ─── Turno sin confirmar a punto de liberarse ───
      if (b.estado === 'pendiente' && b.expiraAt) {
        const minutos = minutosHasta(b.expiraAt, ahoraMs);
        if (minutos != null && minutos >= 0 && minutos <= MINUTOS_AVISO_EXPIRACION) {
          items.push({
            id: `${TIPOS.TURNO_POR_EXPIRAR}:${b.id}`,
            tipo: TIPOS.TURNO_POR_EXPIRAR,
            titulo: minutos === 0 ? 'Turno venciendo' : `Vence en ${minutos} min`,
            detalle: `${nombreDe(b)} · ${b.fecha} ${b.hora} hs`,
            iconKey: 'clock',
            color: 'var(--red)',
            ts: b.expiraAt,
            target: { kind: 'booking', bookingId: b.id, fecha: b.fecha },
          });
        }
      }
    }

    // ─── Turno que entró solo por el bot ───
    if (b.canal === 'bot_wa' && b.createdAt) {
      const creado = Date.parse(b.createdAt);
      if (Number.isFinite(creado) && ahoraMs - creado <= HORAS_TURNO_BOT_NUEVO * MS_HORA) {
        items.push({
          id: `${TIPOS.TURNO_BOT_NUEVO}:${b.id}`,
          tipo: TIPOS.TURNO_BOT_NUEVO,
          titulo: 'Turno nuevo del bot',
          detalle: `${nombreDe(b)} · ${b.fecha} ${b.hora} hs`,
          iconKey: 'wand',
          color: 'var(--celeste)',
          ts: b.createdAt,
          target: { kind: 'booking', bookingId: b.id, fecha: b.fecha },
        });
      }
    }
  }

  // ─── Conversaciones que el bot pasó a una persona ───
  for (const d of derivaciones) {
    items.push({
      id: `${TIPOS.DERIVACION_ABIERTA}:${d.id}`,
      tipo: TIPOS.DERIVACION_ABIERTA,
      titulo: 'Alguien espera respuesta',
      detalle: [d.nombre || d.telefono, d.motivo].filter(Boolean).join(' · '),
      iconKey: 'message',
      color: 'var(--purple)',
      ts: d.created_at,
      target: { kind: 'tab', tab: 'derivaciones' },
    });
  }

  items.sort((a, b) => String(b.ts ?? '').localeCompare(String(a.ts ?? '')));
  return items.slice(0, limite);
}
