/**
 * turnosFijos.ts — compartido por `bot` y `public-reserva`.
 *
 * Un turno fijo (`turnos_fijos`) NUNCA vive en `bookings`. En el panel se
 * proyecta en memoria para la fecha que se está mirando
 * (`selectBookingsForDate`, `src/store/selectors.js`) y recién se convierte
 * en una fila real cuando alguien actúa sobre él (`materializeFijo`). El
 * dueño nunca lo choca porque el panel arma esa proyección; el bot y la web
 * pública consultaban `bookings` a secas y ofrecían libre un horario que la
 * grilla ya mostraba tomado — pasó de verdad el 2026-08-06 con un turno fijo
 * de las 21:00 que terminó reservado y hubo que cancelar a mano.
 *
 * Este módulo espeja el criterio de `selectBookingsForDate` del lado del
 * servidor: activo, vigente ese día de semana, dentro de
 * [vigente_desde, vigente_hasta], sin excepción cargada para esa fecha.
 */

/** Mismo cálculo que dayOfWeek() en src/lib/date.js: 1=lunes … 7=domingo. */
function diaSemanaDe(fechaISO: string): number {
  const dow = new Date(`${fechaISO}T00:00:00Z`).getUTCDay(); // 0=domingo … 6=sábado
  return ((dow + 6) % 7) + 1;
}

/** Límites nulos son abiertos. Espejo de isWithin() en src/lib/date.js. */
const dentroDeVigencia = (fecha: string, desde: string | null, hasta: string | null) =>
  (!desde || fecha >= desde) && (!hasta || fecha <= hasta);

/**
 * Slots que un turno fijo ACTIVO ocupa en esas fechas, como claves
 * `fecha|canchaId|hora`.
 *
 * No filtra por cancha: la tabla de turnos fijos es chica (equipos con
 * horario fijo, no la agenda entera), así que una sola query sin filtrar
 * alcanza y el llamador no necesita saber a qué cancha está preguntando.
 *
 * Si el turno ya se materializó como fila de `bookings` para esa fecha, esa
 * combinación fecha/cancha/hora YA está en el Set que arma el llamador a
 * partir de `bookings` — agregarla de nuevo acá es inofensivo, es un Set.
 */
export async function turnosFijosOcupados(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  tenantId: string,
  fechas: string[]
): Promise<Set<string>> {
  const ocupados = new Set<string>();
  if (!fechas.length) return ocupados;

  const { data } = await admin
    .from('turnos_fijos')
    .select('cancha_id, hora, dia_semana, vigente_desde, vigente_hasta, excepciones')
    .eq('tenant_id', tenantId)
    .eq('activo', true);

  for (const tf of data ?? []) {
    for (const fecha of fechas) {
      if (tf.dia_semana !== diaSemanaDe(fecha)) continue;
      if (!dentroDeVigencia(fecha, tf.vigente_desde, tf.vigente_hasta)) continue;
      if ((tf.excepciones ?? []).includes(fecha)) continue;
      ocupados.add(`${fecha}|${tf.cancha_id}|${tf.hora}`);
    }
  }
  return ocupados;
}
