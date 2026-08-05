/**
 * Validación de formularios.
 *
 * Reemplaza los `if (!x.trim()) return;` silenciosos: antes, dejar un campo
 * vacío hacía que el botón Guardar simplemente no hiciera nada, sin explicar
 * por qué. Cada validador devuelve un mensaje en español o `null`.
 */

import { toNumber } from './format.js';
import { isValidPhone } from './phone.js';

export const required =
  (label = 'Este campo') =>
  (v) =>
    v === null || v === undefined || String(v).trim() === '' ? `${label} es obligatorio` : null;

export const minLen = (n, label = 'Este campo') => (v) =>
  String(v ?? '').trim().length < n ? `${label} necesita al menos ${n} caracteres` : null;

export const maxLen = (n, label = 'Este campo') => (v) =>
  String(v ?? '').length > n ? `${label} no puede superar ${n} caracteres` : null;

export const isMoney =
  ({ min = 0, max = Number.MAX_SAFE_INTEGER, label = 'El importe' } = {}) =>
  (v) => {
    if (v === null || v === undefined || v === '') return null; // vacío lo maneja `required`
    const n = toNumber(v);
    if (!Number.isFinite(n)) return `${label} tiene que ser un número`;
    if (n < min) return `${label} no puede ser menor a ${min}`;
    if (n > max) return `${label} no puede superar ${max}`;
    return null;
  };

export const inRange =
  (min, max, label = 'El valor') =>
  (v) => {
    if (v === null || v === undefined || v === '') return null;
    const n = toNumber(v);
    if (n < min || n > max) return `${label} tiene que estar entre ${min} y ${max}`;
    return null;
  };

export const isInteger =
  (label = 'El valor') =>
  (v) => {
    if (v === null || v === undefined || v === '') return null;
    return Number.isInteger(toNumber(v)) ? null : `${label} tiene que ser un número entero`;
  };

export const phone =
  ({ optional = true, label = 'El teléfono' } = {}) =>
  (v) => {
    if (!v || String(v).trim() === '') return optional ? null : `${label} es obligatorio`;
    return isValidPhone(v) ? null : `${label} no parece válido (ej: 351 612-3456)`;
  };

export const email =
  ({ optional = true } = {}) =>
  (v) => {
    if (!v || String(v).trim() === '') return optional ? null : 'El email es obligatorio';
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim())
      ? null
      : 'El email no parece válido';
  };

/** Corre validadores en orden y devuelve el primer error. */
export const composeValidators =
  (...validators) =>
  (v, allValues) => {
    for (const fn of validators) {
      const err = fn(v, allValues);
      if (err) return err;
    }
    return null;
  };

/**
 * Valida un objeto completo contra un esquema `{ campo: validador }`.
 * @returns {{ valid: boolean, errors: Record<string,string> }}
 */
export function validateForm(values, schema) {
  const errors = {};
  for (const [field, validator] of Object.entries(schema)) {
    const err = validator(values[field], values);
    if (err) errors[field] = err;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
