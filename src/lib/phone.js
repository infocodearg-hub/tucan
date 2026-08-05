/**
 * Teléfonos argentinos.
 *
 * Formatos que entran en la vida real y todos deben salir igual:
 *   '+54 9 351 612-3456' · '0351 15 612-3456' · '351 612 3456' · '3516123456'
 *   '15 612-3456' (sin característica) · '+5493516123456'
 * Salida canónica: E.164 → '+5493516123456'
 *
 * Regla: si no hay número, devuelve `null`. NUNCA inventa un teléfono
 * (el código viejo inyectaba '+54 9 351 000-0000' en silencio, lo que
 * generaba links de WhatsApp rotos que parecían válidos).
 */

const DEFAULT_AREA = '351'; // Córdoba — configurable por complejo

/**
 * @param {string} raw
 * @param {string} [areaPorDefecto] característica a asumir si el número viene sin ella
 * @returns {string|null} E.164 o null
 */
export function normalizePhone(raw, areaPorDefecto = DEFAULT_AREA) {
  if (raw == null) return null;
  let d = String(raw).replace(/\D/g, '');
  if (!d) return null;

  // Prefijo internacional
  if (d.startsWith('549')) d = d.slice(3);
  else if (d.startsWith('54')) d = d.slice(2);

  // Prefijo de larga distancia nacional
  if (d.startsWith('0')) d = d.slice(1);

  // El '15' de celular puede venir antes o después de la característica
  if (d.startsWith('15') && d.length <= 10) d = d.slice(2);
  else {
    const m = d.match(/^(\d{2,4})15(\d{6,8})$/);
    if (m) d = m[1] + m[2];
  }

  // Sin característica (solo abonado): asumir la del complejo
  if (d.length >= 6 && d.length <= 8) d = areaPorDefecto + d;

  if (d.length < 8) return null;
  return `+549${d}`;
}

/** ¿Es un teléfono que podemos usar para WhatsApp? */
export const isValidPhone = (raw) => {
  const n = normalizePhone(raw);
  return !!n && n.length >= 12 && n.length <= 15;
};

/**
 * Características de 3 dígitos más usadas del país. Las de 2 dígitos son solo AMBA (11);
 * el resto son de 4. Sin esta tabla no se puede saber dónde cortar: el número nacional
 * siempre tiene 10 dígitos y '3516123456' se podría partir como 351|6123456 o 3516|123456.
 */
const AREAS_3 = new Set([
  '220', '221', '223', '230', '236', '237', '249', '260', '261', '263', '264', '266',
  '280', '291', '297', '299', '336', '341', '342', '343', '345', '348', '351', '353',
  '358', '362', '364', '370', '376', '379', '380', '381', '383', '385', '387', '388',
]);

/** Largo de la característica dentro del número nacional de 10 dígitos. */
function areaLength(nacional) {
  if (nacional.startsWith('11')) return 2;
  if (AREAS_3.has(nacional.slice(0, 3))) return 3;
  return 4;
}

/**
 * Presentación legible: `'+5493516123456'` → `'+54 9 351 612-3456'`
 * Si no se puede normalizar, devuelve el original tal cual (no rompe la UI).
 */
export function formatPhone(raw) {
  const n = normalizePhone(raw);
  if (!n) return raw ? String(raw) : '—';
  const nacional = n.slice(4); // sin '+549'
  if (nacional.length < 8) return n;
  const area = nacional.slice(0, areaLength(nacional));
  const sub = nacional.slice(area.length);
  const corte = sub.length > 6 ? 3 : Math.ceil(sub.length / 2);
  return `+54 9 ${area} ${sub.slice(0, corte)}-${sub.slice(corte)}`;
}

/** Solo dígitos, sin `+`. Es lo que exige la API de `wa.me`. */
export function phoneDigits(raw) {
  const n = normalizePhone(raw);
  return n ? n.replace(/\D/g, '') : null;
}
