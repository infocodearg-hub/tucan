/**
 * disponibilidad.ts — compartido por `bot` y `public-reserva`.
 *
 * Gemela en TypeScript de src/lib/disponibilidad.js — mismo criterio de
 * duplicación deliberada que claveTelefono() entre este directorio y el
 * frontend (dos runtimes que no comparten build). Ver la nota larga en el
 * archivo JS: sin `disponibilidad` configurada, el resultado es idéntico a
 * usar `slots` a secas — ningún tenant existente pierde horario al desplegar
 * esto.
 */

/** Mismo cálculo que dayOfWeek() en src/lib/date.js: 1=lunes … 7=domingo. */
function diaSemanaDe(fechaISO: string): number {
  const dow = new Date(`${fechaISO}T00:00:00Z`).getUTCDay(); // 0=domingo … 6=sábado
  return ((dow + 6) % 7) + 1;
}

export type Operacion = {
  slots?: string[];
  disponibilidad?: Record<string, string[]>;
  [k: string]: unknown;
};

/** Mapa día→horas habilitadas. Fallback a `slots` replicado los 7 días. */
export function horasHabilitadasPorDia(operacion: Operacion | null | undefined): Record<string, string[]> {
  const disp = operacion?.disponibilidad;
  if (disp && Object.keys(disp).length > 0) return disp;
  const slots = operacion?.slots ?? [];
  const dias = ['1', '2', '3', '4', '5', '6', '7'];
  return Object.fromEntries(dias.map((k) => [k, slots]));
}

/** Horas habilitadas para una fecha puntual. */
export function horasHabilitadasEnFecha(operacion: Operacion | null | undefined, fechaISO: string): string[] {
  const dia = String(diaSemanaDe(fechaISO));
  return horasHabilitadasPorDia(operacion)[dia] ?? [];
}

/** Unión ordenada de horas habilitadas en cualquier día. */
export function horasUnion(operacion: Operacion | null | undefined): string[] {
  const porDia = horasHabilitadasPorDia(operacion);
  const set = new Set<string>();
  for (const horas of Object.values(porDia)) for (const h of horas) set.add(h);
  return [...set].sort();
}
