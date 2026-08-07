/**
 * Disponibilidad horaria configurable — qué horas están habilitadas para
 * reservar, día de semana por día de semana.
 *
 * Antes (y todavía, para un tenant que no editó nada) el único horario era
 * `config.operacion.slots`: un array plano, igual los 7 días. Ahora se puede
 * editar por día desde Configuración (`config.operacion.disponibilidad`).
 *
 * Compatibilidad: `config.operacion` llega de Supabase tal cual está en la
 * fila (`src/store/repository/mappers.js`, sin rellenar defaults). Un tenant
 * que nunca tocó la grilla nueva no tiene `disponibilidad` — todo pasa por
 * `horasHabilitadasPorDia()` para que, sin ella, el resultado sea EXACTAMENTE
 * el de siempre (mismos `slots`, los 7 días), y nadie pierda horario el día
 * del deploy.
 *
 * Gemela en TypeScript para las Edge Functions: supabase/functions/_shared/
 * disponibilidad.ts. Se duplica a propósito (mismo criterio que claveTelefono
 * entre _shared/http.ts y el frontend) — son dos runtimes que no comparten
 * build, y es una función chica.
 */
import { dayOfWeek } from './date.js';

/** Claves del mapa `disponibilidad`, en orden: '1' Lunes … '7' Domingo. */
export const DIAS_SEMANA_KEYS = ['1', '2', '3', '4', '5', '6', '7'];

/**
 * Mapa día→horas habilitadas. Con `disponibilidad` configurada, se usa tal
 * cual; si no, fallback a `slots` replicado los 7 días (comportamiento de
 * antes de que existiera este campo).
 */
export function horasHabilitadasPorDia(operacion) {
  const disp = operacion?.disponibilidad;
  if (disp && Object.keys(disp).length > 0) return disp;
  const slots = operacion?.slots ?? [];
  return Object.fromEntries(DIAS_SEMANA_KEYS.map((k) => [k, slots]));
}

/** Horas habilitadas para una fecha puntual (`'2026-08-10'` → array de `'HH:MM'`). */
export function horasHabilitadasEnFecha(operacion, fechaISO) {
  const dia = String(dayOfWeek(fechaISO));
  return horasHabilitadasPorDia(operacion)[dia] ?? [];
}

/** Unión ordenada de horas habilitadas en cualquier día — filas de la vista semanal. */
export function horasUnion(operacion) {
  const porDia = horasHabilitadasPorDia(operacion);
  const set = new Set();
  for (const horas of Object.values(porDia)) for (const h of horas) set.add(h);
  return [...set].sort();
}
