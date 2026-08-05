/**
 * Migraciones de esquema. Cada función recibe el estado persistido en la
 * versión N y devuelve la versión N+1. `migrate()` las encadena hasta
 * SCHEMA_VERSION.
 *
 * Hoy solo existe la v1, así que no hay nada que migrar todavía — pero el
 * mecanismo está armado para cuando haga falta, en vez de tener que
 * inventarlo bajo presión el día que cambie el modelo de datos.
 */

import { SCHEMA_VERSION } from './schema.js';

const MIGRATIONS = {
  // 1: (stateV1) => stateV2,
};

export function migrate(persisted) {
  let state = persisted;
  let version = state?.meta?.schemaVersion ?? 1;

  if (version > SCHEMA_VERSION) {
    // Estado de una versión futura (rollback de la app): no lo tocamos,
    // pero tampoco lo aceptamos ciegamente.
    throw new Error(`Esquema persistido (v${version}) es más nuevo que el soportado (v${SCHEMA_VERSION})`);
  }

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`Falta migración de v${version} a v${version + 1}`);
    state = step(state);
    version += 1;
  }

  return state;
}
