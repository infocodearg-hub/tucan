/**
 * Formateo de números y moneda (es-AR).
 *
 * Los `Intl.NumberFormat` se construyen UNA vez a nivel de módulo.
 * Instanciarlos dentro del render es caro: la grilla dibuja ~33 slots
 * con varios importes cada uno en cada cambio de estado.
 */

const arsFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const arsCentsFmt = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const numFmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });
const dec1Fmt = new Intl.NumberFormat('es-AR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Número seguro: cualquier basura entra, 0 sale. Evita NaN en la UI. */
export const toNumber = (v) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'number' ? v : Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

/** `26000` → `"$26.000"` */
export const formatARS = (v) => arsFmt.format(toNumber(v));

/** Con centavos, para tickets. `1234.5` → `"$1.234,50"` */
export const formatARSCents = (v) => arsCentsFmt.format(toNumber(v));

/**
 * Compacto para KPIs y ejes de gráfico.
 * `26000` → `"$26 mil"` · `1250000` → `"$1,25 M"` · `840` → `"$840"`
 */
export function formatARSCompact(v) {
  const n = toNumber(v);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}$${dec1Fmt.format(abs / 1_000_000)} M`;
  if (abs >= 10_000) return `${sign}$${numFmt.format(Math.round(abs / 1000))} mil`;
  return arsFmt.format(n);
}

/** Sin símbolo de moneda: `26000` → `"26.000"` */
export const formatNumber = (v) => numFmt.format(toNumber(v));

/** `0.942` → `"94%"` · pasar `fromRatio=false` si ya viene 0-100 */
export function formatPercent(v, { fromRatio = true, decimals = 0 } = {}) {
  const n = toNumber(v) * (fromRatio ? 100 : 1);
  const fmt = decimals === 0 ? numFmt : dec1Fmt;
  return `${fmt.format(n)}%`;
}

/** `9.8` → `"9,8"` para puntajes de CRM */
export const formatScore = (v) => dec1Fmt.format(toNumber(v));

/** `1` → `"1 unidad"` · `3` → `"3 unidades"` */
export const pluralize = (n, singular, plural) =>
  `${formatNumber(n)} ${toNumber(n) === 1 ? singular : (plural ?? `${singular}s`)}`;

/** Recorta a `max` caracteres agregando puntos suspensivos reales. */
export const truncate = (s, max) =>
  typeof s === 'string' && s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : (s ?? '');

/** Iniciales para avatares: "Marcos Benítez" → "MB" */
export function initials(name) {
  if (!name) return '?';
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
