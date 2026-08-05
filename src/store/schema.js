/**
 * Versión de esquema y forma del estado inicial.
 *
 * Subir SCHEMA_VERSION obliga a escribir una migración en migrations.js.
 * PERSIST_WHITELIST decide qué se guarda: `ui` queda afuera a propósito,
 * ver la nota en persist.js.
 */

import { createSeedData } from '../data/seed.js';
import { todayISO } from '../lib/date.js';

export const SCHEMA_VERSION = 1;

export const PERSIST_WHITELIST = [
  'meta',
  'config',
  'canchas',
  'bookings',
  'clients',
  'products',
  'turnosFijos',
  'sales',
  'expenses',
];

export function createInitialState() {
  const seed = createSeedData();
  return {
    meta: { schemaVersion: SCHEMA_VERSION, updatedAt: new Date().toISOString() },
    ...seed,
    expenses: seed.expenses ?? [],
    ui: {
      activeTab: 'grilla',
      selectedDate: todayISO(),
      modal: null,
      toasts: [],
      lastError: null,
      session: null, // { usuario, iniciadaEn } — no persistido, ver auth.js
    },
  };
}
