/**
 * Diff entre dos versiones del estado, slice por slice.
 *
 * ── Por qué diff y no un "mapper por acción" ──────────────────────────────
 * Parece más directo mapear cada acción del store a su escritura remota
 * (`BOOKING_CREATE` → insert en bookings). No alcanza, y el motivo no es de
 * estilo:
 *
 *   - `SALE_CREATE` además baja el stock de `products` (crossSlice.js).
 *   - `CLIENT_DELETE` limpia la FK `clienteId` en `bookings` y `turnosFijos`.
 *   - El `id` de un booking lo genera el REDUCER, no el action creator: no
 *     está en el payload de la acción.
 *   - `TURNO_FIJO_DELETE` desvincula los turnos ya materializados.
 *
 * Todo eso son cambios reales que hay que persistir y que no aparecen en el
 * payload. Comparar el estado anterior contra el siguiente los captura todos
 * sin duplicar una sola regla de negocio, y deja las reglas donde ya están:
 * en el reducer.
 *
 * Funciones puras y sin red — se testean con vitest sin levantar nada.
 */

/** Comparación estructural barata. Las entidades son planas y serializables. */
function iguales(a, b) {
  if (a === b) return true;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @param {Array<{id: string}>} prev
 * @param {Array<{id: string}>} next
 * @returns {{ upsert: object[], deleteIds: string[] }}
 *
 * Insertados y modificados van juntos en `upsert`: para la base es la misma
 * operación y evita tener que adivinar si una fila existe.
 */
export function diffColeccion(prev = [], next = []) {
  const antes = new Map(prev.map((x) => [x.id, x]));
  const upsert = [];

  for (const item of next) {
    const anterior = antes.get(item.id);
    if (!anterior || !iguales(anterior, item)) upsert.push(item);
    antes.delete(item.id);
  }

  // Lo que quedó en el mapa es lo que estaba antes y ya no está.
  return { upsert, deleteIds: [...antes.keys()] };
}

/**
 * Los pagos viven anidados en `booking.pagos[]` del lado del cliente y como
 * filas propias del lado de la base. Se aplanan agregando `bookingId` para que
 * `diffColeccion` los trate como cualquier otra entidad.
 */
export function aplanarPagos(bookings = []) {
  const out = [];
  for (const b of bookings) {
    for (const p of b.pagos ?? []) out.push({ ...p, bookingId: b.id });
  }
  return out;
}

/**
 * Un pago borrado junto con su turno NO necesita un delete propio: la FK de la
 * base tiene `on delete cascade`. Mandarlo igual sería una llamada de red al
 * pedo y, peor, podría llegar después del delete del turno y fallar.
 */
export function diffPagos(prevBookings = [], nextBookings = []) {
  const bookingsBorrados = new Set(
    diffColeccion(prevBookings, nextBookings).deleteIds
  );
  const { upsert, deleteIds } = diffColeccion(
    aplanarPagos(prevBookings),
    aplanarPagos(nextBookings)
  );
  const pagosPrev = new Map(aplanarPagos(prevBookings).map((p) => [p.id, p]));
  return {
    upsert,
    deleteIds: deleteIds.filter((id) => !bookingsBorrados.has(pagosPrev.get(id)?.bookingId)),
  };
}
