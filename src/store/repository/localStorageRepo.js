/**
 * Persistencia en localStorage.
 *
 * Este es el ÚNICO archivo que sabe que el almacenamiento es localStorage.
 * El día que exista backend, `supabaseRepo.js` implementa el mismo contrato
 * (ver README.md de esta carpeta) y `index.js` cambia una línea.
 */

import { PERSIST_WHITELIST, SCHEMA_VERSION } from '../schema.js';
import { migrate } from '../migrations.js';

const KEY = 'tucan:state:v1';
const DEBOUNCE_MS = 300;

function pick(obj, keys) {
  const out = {};
  for (const k of keys) out[k] = obj[k];
  return out;
}

function safeParse(raw) {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

export const localStorageRepo = {
  /**
   * Carga sincrónica: localStorage lo es, así que no hay flash de hidratación
   * ni necesidad de una acción HYDRATE async en este backend.
   * Devuelve `null` si no hay nada guardado o si estaba corrupto.
   */
  loadSync() {
    if (typeof window === 'undefined' || !window.localStorage) return null;

    let raw;
    try {
      raw = window.localStorage.getItem(KEY);
    } catch {
      return null; // localStorage bloqueado (modo privado agresivo, etc.)
    }
    if (!raw) return null;

    const parsed = safeParse(raw);
    if (!parsed || typeof parsed !== 'object') {
      this._quarantine(raw);
      return null;
    }

    try {
      return migrate(parsed);
    } catch (err) {
      console.error('[tucan:store] migración falló, se resiembra', err);
      this._quarantine(raw);
      return null;
    }
  },

  /** Guarda solo lo que hay que persistir. `ui` queda afuera a propósito. */
  saveSnapshot(state) {
    if (typeof window === 'undefined' || !window.localStorage) return;
    try {
      const slice = pick(state, PERSIST_WHITELIST);
      slice.meta = { ...slice.meta, schemaVersion: SCHEMA_VERSION };
      window.localStorage.setItem(KEY, JSON.stringify(slice));
    } catch (err) {
      // Cuota llena u otro error de escritura: no debe tirar la app abajo.
      console.error('[tucan:store] no se pudo guardar', err);
    }
  },

  /** Guardado con debounce — evita escribir en cada tecla. */
  _timer: null,
  save(state) {
    if (this._timer) clearTimeout(this._timer);
    this._timer = setTimeout(() => this.saveSnapshot(state), DEBOUNCE_MS);
  },

  /** Fuerza el flush pendiente. Se llama en pagehide/visibilitychange. */
  flush(state) {
    if (this._timer) {
      clearTimeout(this._timer);
      this._timer = null;
    }
    this.saveSnapshot(state);
  },

  clear() {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.removeItem(KEY);
  },

  /** Un blob que no se pudo leer no se descarta: queda para poder inspeccionarlo. */
  _quarantine(raw) {
    try {
      window.localStorage.setItem(`tucan:state:corrupt:${Date.now()}`, raw);
      window.localStorage.removeItem(KEY);
    } catch {
      /* si ni esto anda, seguimos con estado nuevo igual */
    }
  },
};
