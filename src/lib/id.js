/**
 * Generador de IDs con prefijo de dominio.
 *
 * NO usar `crypto.randomUUID()`: solo existe en secure context (https o localhost).
 * Al demostrar la app en un celular por `http://192.168.x.x:5173` sería `undefined`
 * y la primera reserva creada desde el teléfono rompería la app.
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
const LENGTH = 10;

function randomBytes(n) {
  const buf = new Uint8Array(n);
  const c = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(buf);
    return buf;
  }
  for (let i = 0; i < n; i++) buf[i] = Math.floor(Math.random() * 256);
  return buf;
}

/**
 * @param {string} [prefix] prefijo de dominio: bkg, cli, prd, tf, sale, can, pay
 * @returns {string} p.ej. `bkg_k3f9a2xq7m`
 */
export function id(prefix) {
  const bytes = randomBytes(LENGTH);
  let out = '';
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return prefix ? `${prefix}_${out}` : out;
}

export const ID_PREFIX = {
  booking: 'bkg',
  client: 'cli',
  product: 'prd',
  turnoFijo: 'tf',
  sale: 'sale',
  cancha: 'can',
  pago: 'pay',
  toast: 'tst',
};
