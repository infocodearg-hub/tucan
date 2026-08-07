/**
 * Utilidades comunes a las Edge Functions.
 *
 * Las funciones de esta carpeta son el ÚNICO lugar del proyecto donde vive la
 * `service_role`. Esa clave saltea RLS por completo, así que todo lo que entra
 * acá se valida a mano: nada de confiar en lo que manda el cliente.
 */

/**
 * Orígenes permitidos, separados por coma, en el secreto `APP_ORIGIN`.
 * Ejemplo: `https://tucan.app,https://tucan.vercel.app`
 *
 * Si no está configurado se cae a `*`, que es lo correcto SOLO para la página
 * pública de reservas (cualquiera puede abrirla). Para el resto conviene fijarlo.
 */
const ORIGENES = (Deno.env.get('APP_ORIGIN') ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export function corsHeaders(req: Request): Record<string, string> {
  const origen = req.headers.get('origin') ?? '';
  const permitido = ORIGENES.length === 0 ? '*' : ORIGENES.includes(origen) ? origen : ORIGENES[0];
  return {
    'Access-Control-Allow-Origin': permitido,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

/**
 * `codigo` es un identificador estable de la falla, para máquinas.
 *
 * El agente de n8n es un modelo de lenguaje: si le hacés ramificar sobre el
 * texto del error, tarde o temprano lo parafrasea, lo traduce o lo interpreta.
 * Ramifica sobre `codigo`, que no cambia aunque el mensaje se reescriba.
 */
export function error(req: Request, mensaje: string, status = 400, codigo = 'invalido'): Response {
  return json(req, { error: mensaje, codigo }, status);
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders(req) }) : null;
}

/**
 * Identificador estable del que llama, para contar peticiones.
 *
 * Se guarda el hash y no la IP: alcanza para limitar el abuso sin conservar un
 * dato personal que después haya que cuidar.
 */
export async function claveDeLimite(req: Request, prefijo: string): Promise<string> {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('cf-connecting-ip') ??
    'desconocida';
  return `${prefijo}:${await sha256(ip)}`;
}

export async function sha256(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texto));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** IDs con el mismo formato que `src/lib/id.js`, para que el modelo sea uno solo. */
export function generarId(prefijo: string): string {
  const alfabeto = '0123456789abcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let out = '';
  for (const b of bytes) out += alfabeto[b % alfabeto.length];
  return `${prefijo}_${out}`;
}

/** `'20:00'` → 1200. Devuelve `null` si el formato no es `HH:MM`. */
export function horaAMinutos(hhmm: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

/**
 * Minutos desde la apertura del día operativo. Espejo exacto de
 * `src/lib/pricing.js::slotMinutes`, y la diferencia con `horaAMinutos` no es
 * cosmética: `'00:00'` acá vale 1440, no 0.
 *
 * Una cancha cierra a la medianoche, no abre. El turno de las 00:00 es el
 * último del sábado, el más caro, y con `horaAMinutos` caía por debajo del
 * umbral nocturno y se cobraba tarifa de día. El jugador veía el precio de
 * noche en la web —que usa `pricing.js`— y el turno se grababa con el de día.
 */
export function slotEnMinutos(hora: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(hora ?? '');
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return (h === 0 ? 24 : h) * 60 + min;
}

/**
 * Fecha a `YYYY-MM-DD`, o `null` si no hay forma de leerla.
 *
 * Lo que llega de un agente LLM no siempre viene en ISO prolijo: un tool de n8n
 * manda `""` cuando el modelo deja vacío un parámetro opcional, y cuando lo
 * completa puede escribir `2026-8-6`, `06/08/2026` o un timestamp entero.
 * Rechazar todo eso con un 422 "Fecha inválida" no protege nada: la consulta era
 * válida y el bot termina inventando una respuesta. Se normaliza acá, una vez, y
 * se sigue rechazando lo que de verdad no es una fecha.
 */
export function aFechaISO(v: unknown): string | null {
  const s = String(v ?? '').trim();
  if (!s) return null;

  let y: number, m: number, d: number;

  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(s);
  const latino = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);

  if (iso) [, y, m, d] = iso.map(Number) as unknown as number[];
  else if (latino) {
    // Formato argentino: día primero. `06/08` es el 6 de agosto, nunca el 8 de junio.
    const [, dd, mm, yyyy] = latino.map(Number) as unknown as number[];
    y = yyyy; m = mm; d = dd;
  } else return null;

  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  // El 31 de febrero pasa las validaciones de rango pero no existe: el
  // round-trip por Date lo caza sin tabla de días por mes.
  const fecha = new Date(Date.UTC(y, m - 1, d));
  if (fecha.getUTCMonth() !== m - 1 || fecha.getUTCDate() !== d) return null;
  return fecha.toISOString().slice(0, 10);
}

/**
 * Hora a `HH:MM`, o `null`. Mismo motivo que `aFechaISO`: el cliente escribe
 * "a las 2" y el modelo lo traduce como puede — `14`, `14hs`, `2 PM`, `14.00`.
 * Los minutos se conservan tal cual: si el complejo no abre a las 14:30, eso lo
 * dice la lista de slots, no el parser.
 */
export function aHoraSlot(v: unknown): string | null {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return null;

  const m = /^(\d{1,2})(?:[:.h]?(\d{2}))?\s*(am|pm|hs?)?\.?$/.exec(s);
  if (!m) return null;

  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const sufijo = m[3];
  if (sufijo === 'pm' && h < 12) h += 12;
  if (sufijo === 'am' && h === 12) h = 0;
  if (h > 23 || min > 59) return null;

  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Precio del turno según si el horario cae en tarifa nocturna. */
export function precioDeSlot(
  cancha: { precio_dia: number; precio_noche: number },
  hora: string,
  horaNocturnaDesde: string
): number {
  const h = slotEnMinutos(hora);
  const noche = slotEnMinutos(horaNocturnaDesde ?? '19:00') ?? 19 * 60;
  const esNoche = h !== null && h >= noche;
  return Number(esNoche ? cancha.precio_noche : cancha.precio_dia) || 0;
}

/** Seña sugerida. Espejo de `src/lib/pricing.js::senaSugerida`. */
export function senaDeSlot(precio: number, porcentaje: number | null | undefined): number {
  const pct = Math.min(100, Math.max(0, Number(porcentaje ?? 50) || 0));
  return Math.round(((Number(precio) || 0) * pct) / 100);
}

/**
 * Cuándo arranca de verdad un turno, en hora local del complejo.
 *
 * El slot `'00:00'` del sábado empieza el domingo a la medianoche. Sin esto,
 * "no reservar en el pasado" y la ventana de cancelación quedan corridas 24
 * horas justo en el slot más caro de la semana.
 */
export function inicioDelTurno(fecha: string, hora: string, offsetHoras = -3): Date {
  const min = slotEnMinutos(hora) ?? 0;
  const base = new Date(`${fecha}T00:00:00.000Z`);
  return new Date(base.getTime() + (min - offsetHoras * 60) * 60_000);
}

/** Normaliza a E.164 argentino. Espejo de `src/lib/phone.js`. */
export function normalizarTelefono(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digitos = String(raw).replace(/\D/g, '');
  if (digitos.length < 8) return null;
  if (digitos.startsWith('54')) return `+${digitos}`;
  const sinCero = digitos.replace(/^0/, '').replace(/^(\d{2,4})15/, '$1');
  return `+54${sinCero}`;
}

/**
 * Últimos 10 dígitos: característica + número. Espejo de la columna generada
 * `telefono_clave`.
 *
 * `+543416123456` (un fijo cargado con el 0) y `+5493416123456` (lo que manda
 * WhatsApp, con el 9 de celular) son la misma persona y no coinciden nunca por
 * igualdad. Comparar por el final los une sin inventar reglas sobre el 9 y el
 * 15, que cambian según la característica.
 */
export function claveTelefono(raw: string | null | undefined): string | null {
  const digitos = String(raw ?? '').replace(/\D/g, '');
  return digitos.length >= 8 ? digitos.slice(-10) : null;
}

/** Código corto que el jugador lleva al chat. Sin 0/O/1/I: se dicta en voz alta. */
export function generarCodigo(largo = 6): string {
  const alfabeto = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(largo));
  let out = '';
  for (const b of bytes) out += alfabeto[b % alfabeto.length];
  return out;
}

/** Hoy en el huso del complejo, como `YYYY-MM-DD`. */
export function hoyISO(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Cordoba',
  }).format(new Date());
}

/** `HH:MM` local del complejo, para comparar contra el horario de atención. */
export function ahoraHHMM(): string {
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Cordoba',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}
