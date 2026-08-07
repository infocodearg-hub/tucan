/**
 * Selectores puros: (state, args) => data. Nada de acá muta el store.
 *
 * La pieza central es `selectBookingsForDate`: junta turnos reales con
 * turnos fijos PROYECTADOS (nunca generados como filas) para ese día.
 * Ver la nota larga en turnosFijos más abajo.
 */

import { bookingTotals, precioSlot } from '../lib/pricing.js';
import { addDays, DIAS_SEMANA, dayOfWeek, isWithin, rangeDays, startOfWeek } from '../lib/date.js';
import { badgeForClient } from '../lib/status.js';
import { toNumber } from '../lib/format.js';
import { horasHabilitadasEnFecha } from '../lib/disponibilidad.js';

// ─────────────────────────────────────────────── básicos

export const selectConfig = (state) => state.config;
export const selectCanchas = (state) => state.canchas;
export const selectCanchasActivas = (state) => state.canchas.filter((c) => c.activa);
export const selectCancha = (state, id) => state.canchas.find((c) => c.id === id) ?? null;

export const selectClients = (state) => state.clients;
export const selectClient = (state, id) => state.clients.find((c) => c.id === id) ?? null;

export const selectProducts = (state) => state.products;
export const selectProduct = (state, id) => state.products.find((p) => p.id === id) ?? null;

export const selectSales = (state) => state.sales;
export const selectSalesForBooking = (state, bookingId) =>
  state.sales.filter((s) => s.bookingId === bookingId && !s.anulada);

export const selectTurnosFijos = (state) => state.turnosFijos;
export const selectTurnoFijo = (state, id) => state.turnosFijos.find((tf) => tf.id === id) ?? null;

export const selectExpenses = (state) => state.expenses;
export const selectExpense = (state, id) => state.expenses.find((g) => g.id === id) ?? null;
export const selectExpensesForDate = (state, fecha) => state.expenses.filter((g) => g.fecha === fecha);
export const selectExpensesSum = (state, fecha) =>
  selectExpensesForDate(state, fecha).reduce((acc, g) => acc + toNumber(g.monto), 0);

export const selectBookings = (state) => state.bookings;
export const selectBooking = (state, id) => state.bookings.find((b) => b.id === id) ?? null;

export const selectUI = (state) => state.ui;
export const selectToasts = (state) => state.ui.toasts;
export const selectSelectedDate = (state) => state.ui.selectedDate;
export const selectSession = (state) => state.ui.session;

// ─────────────────────────────────────────────── turnos por fecha (con proyección)

/**
 * Turnos reales de una fecha, más los turnos fijos que caen ese día de semana
 * y todavía no tienen un booking materializado. Los proyectados llevan
 * `esVirtual: true` y un id `virt_<tfId>_<fecha>` — no existen en el store
 * hasta que alguien actúa sobre ellos (ver `bookings/materializeFijo`).
 */
export function selectBookingsForDate(state, fecha) {
  const reales = state.bookings.filter((b) => b.fecha === fecha && b.estado !== 'cancelado');

  const dow = dayOfWeek(fecha);
  const cubiertos = new Set(reales.filter((b) => b.origenFijoId).map((b) => b.origenFijoId));

  const proyectados = state.turnosFijos
    .filter(
      (tf) =>
        tf.activo &&
        tf.diaSemana === dow &&
        isWithin(fecha, tf.vigenteDesde, tf.vigenteHasta) &&
        !tf.excepciones.includes(fecha) &&
        !cubiertos.has(tf.id)
    )
    .map((tf) => {
      const cancha = selectCancha(state, tf.canchaId);
      const cliente = tf.clienteId ? selectClient(state, tf.clienteId) : null;
      return {
        id: `virt_${tf.id}_${fecha}`,
        esVirtual: true,
        fecha,
        hora: tf.hora,
        canchaId: tf.canchaId,
        clienteId: tf.clienteId,
        clienteNombre: cliente?.nombre ?? tf.equipoNombre,
        clienteTelefono: tf.telefono,
        estado: 'reservado',
        origenFijoId: tf.id,
        precioCancha: precioSlot(cancha, tf.hora, state.config?.operacion?.horaNocturnaDesde),
        pagos: [],
        notas: `Turno fijo · ${tf.equipoNombre}`,
        canal: 'mostrador',
      };
    });

  return [...reales, ...proyectados];
}

/** ¿Hay algo (real o proyectado) ocupando ese slot? Usado antes de crear/mover un turno. */
export function selectIsSlotFree(state, { fecha, canchaId, hora, ignoreBookingId }) {
  const del_dia = selectBookingsForDate(state, fecha);
  return !del_dia.some(
    (b) => b.canchaId === canchaId && b.hora === hora && b.id !== ignoreBookingId
  );
}

// ─────────────────────────────────────────────── totales derivados

/** Totales de un turno (real o proyectado) con su cantina asociada. */
export function selectBookingTotals(state, booking) {
  if (!booking) return bookingTotals(null, []);
  const ventas = booking.esVirtual ? [] : selectSalesForBooking(state, booking.id);
  return bookingTotals(booking, ventas);
}

// ─────────────────────────────────────────────── clientes derivados

/** Estadísticas reales del cliente: baseline histórico + actividad viva en el store. */
export function selectClientStats(state, clienteId) {
  const cliente = selectClient(state, clienteId);
  if (!cliente) return { partidos: 0, cancelaciones: 0, gastado: 0 };

  // `historicoPrevio` nunca es `null` acá: el mapper de Supabase lo normaliza
  // a `{}` (ver `obj()` en repository/mappers.js), así que un `?? {...}` sobre
  // el objeto entero nunca entra. Un cliente nuevo (alta del bot o del panel)
  // llega con `{}` y cada campo individual tiene que tener su propio default,
  // si no `undefined + número` da NaN y contagia cualquier suma que lo use
  // (el "Total Recaudado" de ClientesCRM, por ejemplo).
  const base = cliente.historicoPrevio ?? {};
  const propios = state.bookings.filter((b) => b.clienteId === clienteId);

  const partidosVivos = propios.filter((b) => b.estado === 'reservado').length;
  const cancelacionesVivas = propios.filter((b) => b.estado === 'cancelado').length;
  const gastadoVivo = propios.reduce((acc, b) => {
    const t = selectBookingTotals(state, b);
    return acc + t.pagado;
  }, 0);

  return {
    partidos: (base.partidos ?? 0) + partidosVivos,
    cancelaciones: (base.cancelaciones ?? 0) + cancelacionesVivas,
    gastado: (base.gastado ?? 0) + gastadoVivo,
  };
}

export function selectClientBadge(state, clienteId) {
  return badgeForClient(selectClientStats(state, clienteId));
}

// ─────────────────────────────────────────────── agregados de app

/** KPIs de la grilla para una fecha dada. */
export function selectDayKpis(state, fecha) {
  const dia = selectBookingsForDate(state, fecha);
  const activos = dia.filter((b) => b.estado !== 'bloqueado');
  const totalSlots =
    horasHabilitadasEnFecha(state.config?.operacion, fecha).length * selectCanchasActivas(state).length;

  let recaudado = 0;
  let pendienteDeCobro = 0;
  let sinConfirmar = 0;
  for (const b of activos) {
    // Un turno sin confirmar ocupa el slot, pero su precio NO es plata a
    // cobrar: en una hora puede no existir. Sumarlo infla el "pendiente" con
    // guita que nadie prometió y hace que el número deje de servir para
    // decidir a quién llamar.
    if (b.estado === 'pendiente') {
      sinConfirmar += 1;
      continue;
    }
    const t = selectBookingTotals(state, b);
    recaudado += t.pagado;
    pendienteDeCobro += t.saldo;
  }

  const bot = activos.filter((b) => b.canal === 'bot_wa').length;
  const fijos = dia.filter((b) => b.origenFijoId).length;

  return {
    ocupados: activos.length,
    totalSlots,
    ocupacionPct: totalSlots > 0 ? Math.round((activos.length / totalSlots) * 100) : 0,
    recaudado,
    pendiente: pendienteDeCobro,
    sinConfirmar,
    reservasBot: bot,
    turnosFijosHoy: fijos,
  };
}

/** Caja del día: ventas de mostrador + señas/pagos cobrados en turnos. */
export function selectCajaDelDia(state, fecha) {
  const ventasHoy = state.sales.filter(
    (s) => !s.anulada && s.fechaHora.slice(0, 10) === fecha
  );
  const totalVentas = ventasHoy.reduce((acc, s) => acc + toNumber(s.total), 0);
  return { ventas: ventasHoy, totalVentas };
}

/**
 * Cierre de caja diario: plata que efectivamente entró/salió ese día civil.
 * Distinto de `selectDayKpis`/`selectCajaDelDia` (que agrupan por la fecha del
 * TURNO jugado, no por cuándo se cobró) — una seña cobrada hoy puede ser de un
 * turno que se juega la semana que viene, y viceversa.
 */
export function selectCierreCajaDelDia(state, fecha) {
  const ingresosTurnos = state.bookings.reduce((acc, b) => {
    const pagosHoy = (b.pagos ?? []).filter((p) => p.fecha?.slice(0, 10) === fecha);
    return acc + pagosHoy.reduce((a, p) => a + toNumber(p.monto), 0);
  }, 0);

  // Solo ventas de mostrador SIN turno asociado: las que tienen bookingId ya
  // están adentro de `ingresosTurnos` cuando el cliente paga el turno — sumarlas
  // acá también contaría la misma plata dos veces.
  const ingresosCantina = state.sales
    .filter((s) => !s.anulada && !s.bookingId && s.fechaHora.slice(0, 10) === fecha)
    .reduce((acc, s) => acc + toNumber(s.total), 0);

  const egresos = selectExpensesSum(state, fecha);

  return {
    ingresosTurnos,
    ingresosCantina,
    egresos,
    neto: ingresosTurnos + ingresosCantina - egresos,
  };
}

/**
 * Filas individuales de pagos de turnos cobrados ese día (mismo criterio de
 * `pago.fecha` que usa `selectCierreCajaDelDia` para `ingresosTurnos` — no
 * duplicar el criterio, solo exponer el detalle que ese selector descarta).
 */
export function selectPagosDelDia(state, fecha) {
  const filas = [];
  for (const b of state.bookings) {
    for (const p of b.pagos ?? []) {
      if (p.fecha?.slice(0, 10) !== fecha) continue;
      const cancha = selectCancha(state, b.canchaId);
      filas.push({
        pagoId: p.id,
        bookingId: b.id,
        clienteNombre: b.clienteNombre,
        canchaNombre: cancha?.nombre ?? b.canchaId,
        hora: b.hora,
        monto: toNumber(p.monto),
        metodo: p.metodo,
      });
    }
  }
  return filas;
}

// ─────────────────────────────────────────────── reportes: agregados por rango

function fechasEntre(desde, hasta) {
  const out = [];
  for (let f = desde; f <= hasta; f = addDays(f, 1)) out.push(f);
  return out;
}

/** Turnos (reales + fijos proyectados) de TODAS las fechas del rango, cada uno con su `fecha`. */
export function selectBookingsForRange(state, desde, hasta) {
  const out = [];
  for (const f of fechasEntre(desde, hasta)) out.push(...selectBookingsForDate(state, f));
  return out;
}

/**
 * Ocupación por día de semana, agregada sobre el rango: turnos activos sobre
 * la capacidad de ESE día (horas habilitadas × canchas activas — ver
 * horasHabilitadasEnFecha en lib/disponibilidad.js). `canchaId` opcional
 * acota todo (ocupados Y capacidad) a una sola cancha.
 */
export function selectOcupacionPorDiaSemana(state, desde, hasta, canchaId = null) {
  const canchasActivas = canchaId ? 1 : selectCanchasActivas(state).length;
  const acc = Object.fromEntries(DIAS_SEMANA.slice(1).map((d) => [d.n, { ocupados: 0, capacidad: 0 }]));

  for (const f of fechasEntre(desde, hasta)) {
    const activos = selectBookingsForDate(state, f).filter(
      (b) => b.estado !== 'bloqueado' && (!canchaId || b.canchaId === canchaId)
    );
    const bucket = acc[dayOfWeek(f)];
    bucket.ocupados += activos.length;
    bucket.capacidad += horasHabilitadasEnFecha(state.config?.operacion, f).length * canchasActivas;
  }

  return DIAS_SEMANA.slice(1).map((d) => {
    const { ocupados, capacidad } = acc[d.n];
    return {
      dia: d.n,
      label: d.corto,
      ocupados,
      capacidad,
      pct: capacidad > 0 ? Math.round((ocupados / capacidad) * 100) : 0,
    };
  });
}

/** Distribución (%) de la cantidad de turnos entre los 7 días de semana. */
export function selectDistribucionTurnosPorDia(state, desde, hasta, canchaId = null) {
  const porDia = selectOcupacionPorDiaSemana(state, desde, hasta, canchaId);
  const total = porDia.reduce((acc, d) => acc + d.ocupados, 0);
  return porDia.map((d) => ({
    dia: d.dia,
    label: d.label,
    cantidad: d.ocupados,
    pct: total > 0 ? Math.round((d.ocupados / total) * 100) : 0,
  }));
}

/** Fijos vs ocasionales — serie semanal dentro del rango. `canchaId` opcional acota a una cancha. */
export function selectFijosVsOcasionalesPorSemana(state, desde, hasta, canchaId = null) {
  const semanas = [];
  for (let inicio = startOfWeek(desde); inicio <= hasta; inicio = addDays(inicio, 7)) {
    let fijos = 0;
    let ocasionales = 0;
    for (const f of rangeDays(inicio, 7)) {
      if (f < desde || f > hasta) continue;
      for (const b of selectBookingsForDate(state, f)) {
        if (b.estado === 'bloqueado') continue;
        if (canchaId && b.canchaId !== canchaId) continue;
        if (b.origenFijoId) fijos += 1;
        else ocasionales += 1;
      }
    }
    semanas.push({ semanaInicio: inicio, fijos, ocasionales });
  }
  return semanas;
}

/**
 * Nuevos vs recurrentes — serie semanal. "Nuevo" = el primer turno de SIEMPRE
 * de ese cliente (no solo dentro del rango elegido, y sin importar la cancha
 * — es sobre el complejo entero) cae en esa semana. `canchaId` opcional
 * acota qué actividad se cuenta cada semana, no la definición de "nuevo".
 * Solo cuenta turnos con `clienteId` enlazado — un turno cargado a mano sin
 * cliente del CRM no tiene con qué distinguir nuevo de recurrente.
 */
export function selectNuevosVsRecurrentesPorSemana(state, desde, hasta, canchaId = null) {
  const primerTurno = new Map();
  for (const b of state.bookings) {
    if (!b.clienteId) continue;
    const actual = primerTurno.get(b.clienteId);
    if (!actual || b.fecha < actual) primerTurno.set(b.clienteId, b.fecha);
  }

  const semanas = [];
  for (let inicio = startOfWeek(desde); inicio <= hasta; inicio = addDays(inicio, 7)) {
    const finSemana = addDays(inicio, 6);
    const clientesDeLaSemana = new Set();
    const nuevos = new Set();
    for (const f of rangeDays(inicio, 7)) {
      if (f < desde || f > hasta) continue;
      for (const b of selectBookingsForDate(state, f)) {
        if (!b.clienteId || b.estado === 'bloqueado') continue;
        if (canchaId && b.canchaId !== canchaId) continue;
        clientesDeLaSemana.add(b.clienteId);
        const primera = primerTurno.get(b.clienteId);
        if (primera >= inicio && primera <= finSemana) nuevos.add(b.clienteId);
      }
    }
    semanas.push({ semanaInicio: inicio, nuevos: nuevos.size, recurrentes: clientesDeLaSemana.size - nuevos.size });
  }
  return semanas;
}
