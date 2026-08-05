/**
 * Esqueleto del backend Supabase — mismo contrato que `localStorageRepo.js`
 * (ver README.md de esta carpeta). NO se usa todavía: no está importado desde
 * `store/index.js` ni desde ningún otro lado. Nada de esto se ejecuta hasta
 * que se decida migrar de verdad.
 *
 * Para activarlo el día que se conecte Supabase:
 *   1. `npm install @supabase/supabase-js`
 *   2. Completar cada TODO de acá abajo.
 *   3. En `store/index.js`, exportar este repo como `repo` en vez de
 *      `localStorageRepo`.
 *   4. `StoreProvider` ya sabe usar `load()` async (ver README) — falta
 *      agregarle el splash/loading state mientras resuelve.
 *
 * Mapeo de slices (`PERSIST_WHITELIST` en schema.js) a tablas:
 *   canchas, bookings, clients, products, turnosFijos, sales, expenses
 *     → una tabla por slice, mismo shape que el array actual.
 *   config → tabla de una sola fila (o key/value), no es un array.
 *   meta → no se migra tal cual, `schemaVersion` deja de tener sentido con
 *     un backend real (las migraciones pasan a ser de la base, no del blob).
 */

export const supabaseRepo = {
  loadSync() {
    // Un backend async siempre devuelve null acá — la carga real pasa por load().
    return null;
  },

  async load() {
    // TODO: implementar cuando se conecte Supabase.
    // const { data, error } = await supabase.from(...).select(...);
    // armar el State completo (mismo shape que createInitialState()) a partir
    // de las filas de cada tabla.
    throw new Error('supabaseRepo.load() no implementado todavía');
  },

  save(_nextState, _prevState) {
    // TODO: implementar cuando se conecte Supabase.
    // Diff entre nextState/prevState por slice, upsert de lo que cambió.
  },

  flush(_nextState) {
    // TODO: implementar cuando se conecte Supabase (idem save, sin debounce).
  },

  clear() {
    // TODO: implementar cuando se conecte Supabase (sign out / borrar sesión local).
  },
};
