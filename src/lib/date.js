/**
 * Fechas — zona horaria Argentina.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * REGLA DURA DEL PROYECTO: `new Date(...)` solo puede aparecer en ESTE archivo.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * Motivo: `new Date('2026-08-04')` se parsea como UTC medianoche. En Argentina
 * (UTC−3) eso se muestra como 3 de agosto. Y `new Date().toISOString()` devuelve
 * la fecha de MAÑANA para cualquier turno cargado después de las 21:00 hora local.
 * Ese bug ya existía en el modal de nuevo turno.
 *
 * Todas las fechas de negocio son strings ISO `YYYY-MM-DD` (fecha civil, sin hora).
 * Toda la aritmética se hace sobre `Date.UTC` para que no exista corrimiento.
 */

export const TZ = 'America/Argentina/Cordoba';

// 'en-CA' emite YYYY-MM-DD nativamente. Es el truco más corto y confiable.
const isoFmt = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const timeSecFmt = new Intl.DateTimeFormat('es-AR', {
  timeZone: TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Días ISO-8601: 1 = Lunes … 7 = Domingo. */
export const DIAS_SEMANA = [
  null,
  { n: 1, corto: 'Lun', largo: 'Lunes', plural: 'Lunes' },
  { n: 2, corto: 'Mar', largo: 'Martes', plural: 'Martes' },
  { n: 3, corto: 'Mié', largo: 'Miércoles', plural: 'Miércoles' },
  { n: 4, corto: 'Jue', largo: 'Jueves', plural: 'Jueves' },
  { n: 5, corto: 'Vie', largo: 'Viernes', plural: 'Viernes' },
  { n: 6, corto: 'Sáb', largo: 'Sábado', plural: 'Sábados' },
  { n: 7, corto: 'Dom', largo: 'Domingo', plural: 'Domingos' },
];

export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

// ─────────────────────────────────────────────────────────── núcleo

/** Descompone `'2026-08-04'` en `{ y, m, d }`. Lanza si el formato es inválido. */
function parseISO(iso) {
  if (!ISO_RE.test(iso)) throw new TypeError(`Fecha ISO inválida: ${JSON.stringify(iso)}`);
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

/** `'2026-08-04'` → objeto Date en UTC medianoche. Uso interno y de formateo. */
function isoToUTC(iso) {
  const { y, m, d } = parseISO(iso);
  return new Date(Date.UTC(y, m - 1, d));
}

const pad = (n) => String(n).padStart(2, '0');

/** Fecha civil de HOY en Argentina, sin importar la zona del dispositivo. */
export const todayISO = () => isoFmt.format(new Date());

/** Timestamp completo para auditoría (`createdAt`, `fechaHora` de ventas). */
export const nowISO = () => new Date().toISOString();

/**
 * Normaliza cualquier timestamp a la forma canónica `2026-08-05T12:00:00.000Z`.
 *
 * Postgres devuelve los `timestamptz` como `2026-08-05T12:00:00+00:00`. Es la
 * misma instancia de tiempo, pero con otro texto — y varios selectores comparan
 * o cortan estos valores como strings (`pago.fecha.slice(0, 10)`). Sin pasar
 * todo por acá al leer de la base, el mismo pago se vería distinto según si
 * vino del servidor o lo acaba de crear el reducer.
 */
export const toTimestampISO = (value) => (value ? new Date(value).toISOString() : null);

/**
 * Minutos que faltan para un timestamp. Negativo si ya pasó, `null` si no hay
 * fecha. Lo usa la cuenta regresiva de los turnos sin confirmar.
 */
export const minutosPara = (value) =>
  value ? Math.round((new Date(value).getTime() - Date.now()) / 60_000) : null;

/** Hora actual en Argentina, `'21:14'`. */
export const nowTime = () => timeFmt.format(new Date());

/** Hora actual con segundos, `'21:14:03'`. Para el reloj del navbar. */
export const nowTimeWithSeconds = () => timeSecFmt.format(new Date());

/** Convierte un timestamp ISO completo a fecha civil argentina. */
export const timestampToISODate = (ts) => isoFmt.format(new Date(ts));

/** Convierte un timestamp ISO completo a hora argentina `'21:14'`. */
export const timestampToTime = (ts) => timeFmt.format(new Date(ts));

// ─────────────────────────────────────────────────────────── aritmética

/** Suma (o resta) días. Cruza meses y años correctamente. */
export function addDays(iso, days) {
  const dt = isoToUTC(iso);
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export const addMonths = (iso, months) => {
  const { y, m, d } = parseISO(iso);
  const dt = new Date(Date.UTC(y, m - 1 + months, 1));
  // Clampea el día al último del mes destino (31 de enero + 1 mes = 28/29 de febrero).
  const lastDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  dt.setUTCDate(Math.min(d, lastDay));
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
};

/** Diferencia en días entre dos fechas civiles (b − a). */
export function diffDays(a, b) {
  return Math.round((isoToUTC(b).getTime() - isoToUTC(a).getTime()) / 86_400_000);
}

/** Día de semana ISO: 1 = Lunes … 7 = Domingo. */
export function dayOfWeek(iso) {
  return ((isoToUTC(iso).getUTCDay() + 6) % 7) + 1;
}

/** `'2026-08'` — clave de mes para estados mensuales de turnos fijos. */
export const monthKey = (iso) => iso.slice(0, 7);

/** Lunes de la semana que contiene `iso`. */
export const startOfWeek = (iso) => addDays(iso, -(dayOfWeek(iso) - 1));

/** Rango `[iso, iso+n)` — usado por la tira de 7 días y los reportes. */
export function rangeDays(startISO, count) {
  const out = [];
  for (let i = 0; i < count; i++) out.push(addDays(startISO, i));
  return out;
}

/** Cantidad de días de un mes (`'2026-08'` → 31). */
export function daysInMonth(mKey) {
  const [y, m] = mKey.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Todas las fechas de un mes que caen en un día de semana dado. */
export function occurrencesInMonth(mKey, diaSemana) {
  const [y, m] = mKey.split('-').map(Number);
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const out = [];
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${pad(m)}-${pad(d)}`;
    if (dayOfWeek(iso) === diaSemana) out.push(iso);
  }
  return out;
}

// ─────────────────────────────────────────────────────────── comparación

export const isToday = (iso) => iso === todayISO();
export const isPast = (iso) => iso < todayISO();
export const isFuture = (iso) => iso > todayISO();
export const isWeekend = (iso) => dayOfWeek(iso) >= 6;

/** ¿`iso` está dentro de `[desde, hasta]`? Los límites nulos son abiertos. */
export const isWithin = (iso, desde, hasta) =>
  (!desde || iso >= desde) && (!hasta || iso <= hasta);

// ─────────────────────────────────────────────────────────── presentación

/** `'2026-08-04'` → `'Martes 4 de agosto de 2026'` */
export function formatLongDate(iso) {
  const { y, m, d } = parseISO(iso);
  return `${DIAS_SEMANA[dayOfWeek(iso)].largo} ${d} de ${MESES[m - 1]} de ${y}`;
}

/** `'2026-08-04'` → `'Mar 4 de agosto'` */
export function formatMediumDate(iso) {
  const { m, d } = parseISO(iso);
  return `${DIAS_SEMANA[dayOfWeek(iso)].corto} ${d} de ${MESES[m - 1]}`;
}

/** `'2026-08-04'` → `'04/08/2026'` */
export function formatShortDate(iso) {
  const { y, m, d } = parseISO(iso);
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** `'2026-08'` → `'Agosto 2026'` */
export function formatMonth(mKey) {
  const [y, m] = mKey.split('-').map(Number);
  const nombre = MESES[m - 1];
  return `${nombre[0].toUpperCase()}${nombre.slice(1)} ${y}`;
}

/** Etiqueta corta y humana para el navegador de días: `Hoy`, `Mañana`, `Ayer`, `Jue 6`. */
export function relativeDayLabel(iso) {
  const delta = diffDays(todayISO(), iso);
  if (delta === 0) return 'Hoy';
  if (delta === 1) return 'Mañana';
  if (delta === -1) return 'Ayer';
  const { d } = parseISO(iso);
  return `${DIAS_SEMANA[dayOfWeek(iso)].corto} ${d}`;
}

/** Texto relativo para "último partido": `Hoy`, `Hace 3 días`, `En 2 días`. */
export function relativeFromToday(iso) {
  if (!iso) return '—';
  const delta = diffDays(todayISO(), iso);
  if (delta === 0) return 'Hoy';
  if (delta === 1) return 'Mañana';
  if (delta === -1) return 'Ayer';
  if (delta < 0) return `Hace ${-delta} días`;
  return `En ${delta} días`;
}
