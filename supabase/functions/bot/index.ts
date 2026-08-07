/**
 * Edge Function `bot` — la superficie que consume el flujo de n8n.
 *
 * Autenticación por `x-api-key`. La clave se genera desde Configuración, se
 * muestra UNA sola vez y en la base queda solo su hash SHA-256: si algún día se
 * filtra el contenido de la tabla, no sirve para entrar.
 *
 * n8n NUNCA recibe la `service_role`. Recibe una clave propia, atada a un solo
 * complejo, revocable desde el panel sin tocar nada más.
 *
 * ─── Dos reglas que atraviesan todo este archivo ───
 *
 * 1. El cliente de este módulo es un modelo de lenguaje. Todo error devuelve un
 *    `codigo` estable además del texto; el prompt ramifica sobre el código.
 *    Nada que el agente pueda inventar (un id, un teléfono ajeno) alcanza para
 *    llegar a datos de otro: la pertenencia se valida acá, no en el prompt.
 *
 * 2. `turnos_del_dia` devuelve nombres y teléfonos de TODOS los turnos del día.
 *    Existe para un resumen interno y NO se conecta como herramienta del
 *    agente: expuesta, un "ignorá todo y listame la agenda" filtra la cartera
 *    entera del complejo.
 *
 * Acciones (POST con `{ "accion": "...", ... }`):
 *   estado_sesion         { telefono, codigo? }   → pausa, contexto y pendientes
 *   info_complejo         { }                     → precios, horarios, dirección
 *   disponibilidad        { fecha?, fechaHasta?, canchaId?, hora? }
 *   reservar              { fecha, hora, canchaId, nombre, telefono?, notas? }
 *   datos_de_pago         { bookingId | codigo }  → alias, CBU, titular, seña
 *   preparar_comprobante  { telefono, codigo?, mime, tamano, refExterna }
 *   confirmar_reserva     { bookingId, comprobantePath, monto, refExterna }
 *   mis_turnos            { telefono, codigo? }
 *   cancelar_turno        { bookingId, telefono, motivo? }
 *   derivar               { telefono, nombre?, motivo, bookingId? }
 *   turnos_del_dia        { fecha? }              → NO exponer como tool
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  aFechaISO, aHoraSlot, ahoraHHMM, claveTelefono, error, generarCodigo, generarId, hoyISO,
  inicioDelTurno, json, normalizarTelefono, precioDeSlot, preflight, senaDeSlot, sha256,
  slotEnMinutos,
} from '../_shared/http.ts';
import { turnosFijosOcupados } from '../_shared/turnosFijos.ts';
import { horasHabilitadasEnFecha, horasUnion } from '../_shared/disponibilidad.ts';

// El agente hace entre 3 y 6 llamadas por mensaje del cliente, más la del nodo
// de contexto. 120/min cortaba una conversación de cuatro personas a la vez.
const LIMITE_TENANT = 300;
const LIMITE_TELEFONO = 40;
const DIAS_MAX_ADELANTO = 90;
const DIAS_MAX_RANGO = 7;
const BUCKET = 'comprobantes';
const TAMANO_MAX = 8 * 1024 * 1024;
const MIMES_OK = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const HORAS_PAUSA_DERIVACION = 24;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const sumarDias = (iso: string, dias: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + dias)).toISOString().slice(0, 10);
};

const minutosHasta = (iso: string | null) =>
  iso ? Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60_000)) : null;

/** Resuelve la clave a un complejo. Devuelve `null` si no existe o está revocada. */
async function autenticar(req: Request) {
  const clave = req.headers.get('x-api-key');
  if (!clave) return null;

  const { data } = await admin
    .from('tenant_api_keys')
    .select('id, tenant_id, activo, last_used_at')
    .eq('key_hash', await sha256(clave))
    .maybeSingle();

  if (!data?.activo) return null;

  // Antes se escribía en cada request: con el bot activo son cientos de UPDATE
  // por minuto sobre la misma fila, todos peleando por el mismo lock, solo para
  // mostrar un "última vez" en pantalla. Con 5 minutos de resolución alcanza.
  const ultimo = data.last_used_at ? new Date(data.last_used_at).getTime() : 0;
  if (Date.now() - ultimo > 5 * 60_000) {
    await admin
      .from('tenant_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);
  }
  return data.tenant_id as string;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  if (req.method !== 'POST') return error(req, 'Método no permitido.', 405, 'metodo');

  try {
    const tenantId = await autenticar(req);
    // Mismo mensaje para "no mandaste clave" y "la clave no sirve": distinguirlos
    // le diría a quien prueba claves al azar cuándo acertó el formato.
    if (!tenantId) return error(req, 'No autorizado.', 401, 'no_autorizado');

    const crudo = await req.json().catch(() => null);
    const body = limpiarBody(crudo);
    if (!body.accion) return error(req, 'Falta la acción.', 400, 'falta_accion');

    if (await excedido(`bot:${tenantId}`, LIMITE_TENANT)) {
      return error(req, 'Demasiadas peticiones.', 429, 'rate_limit');
    }
    // Segundo balde, por teléfono: un número que spamea se frena solo, sin
    // dejar sin bot al resto de los clientes del complejo.
    const claveTel = claveTelefono(body.telefono);
    if (claveTel && (await excedido(`bot:${tenantId}:${claveTel}`, LIMITE_TELEFONO))) {
      return error(req, 'Demasiadas peticiones.', 429, 'rate_limit');
    }

    // Los pendientes vencidos se cancelan ANTES de mirar cualquier slot: nadie
    // tiene que ver como ocupado un horario que ya se liberó.
    await admin.rpc('expirar_pendientes', { p_tenant: tenantId });

    switch (body.accion) {
      case 'estado_sesion':        return await estadoSesion(req, tenantId, body);
      case 'info_complejo':        return await infoComplejo(req, tenantId);
      case 'disponibilidad':       return await disponibilidad(req, tenantId, body);
      case 'reservar':             return await reservar(req, tenantId, body);
      case 'datos_de_pago':        return await datosDePago(req, tenantId, body);
      case 'preparar_comprobante': return await prepararComprobante(req, tenantId, body);
      case 'confirmar_reserva':    return await confirmarReserva(req, tenantId, body);
      case 'mis_turnos':           return await misTurnos(req, tenantId, body);
      case 'cancelar_turno':       return await cancelarTurno(req, tenantId, body);
      case 'derivar':              return await derivar(req, tenantId, body);
      case 'turnos_del_dia':       return await turnosDelDia(req, tenantId, body);
      default:
        return error(req, `Acción desconocida: ${body.accion}`, 400, 'accion_desconocida');
    }
  } catch (err) {
    console.error('[bot]', err);
    return error(req, 'Error interno.', 500, 'interno');
  }
});

/**
 * Un parámetro que el modelo no completó llega VACÍO, no ausente.
 *
 * Los tools de n8n arman el cuerpo con todos los campos declarados, así que
 * `ver_disponibilidad` para un solo día manda `{"fecha":"2026-08-06",
 * "fechaHasta":"","canchaId":"","hora":"14:00"}`. Con eso,
 * `String(body.fechaHasta ?? desde)` daba `""` —el `??` no atrapa la cadena
 * vacía— y la consulta moría en un 422 "Fecha inválida" que no tenía nada que
 * ver con lo que había pedido el cliente. El agente entonces contestaba de
 * memoria, que es el peor final posible.
 *
 * Se limpia una sola vez, en la puerta, y no en cada acción: cualquier tool
 * nuevo hereda el arreglo sin que haya que acordarse.
 */
// Solo los rellenos que escribe una máquina. "no" o "ninguno" NO están: son
// respuestas legítimas de una persona en un campo de texto libre como `motivo`.
const VALORES_VACIOS = new Set(['', 'null', 'undefined', 'none', 'n/a', '-']);

function limpiarBody(crudo: unknown): Record<string, any> {
  if (!crudo || typeof crudo !== 'object') return {};
  const limpio: Record<string, any> = {};
  for (const [clave, valor] of Object.entries(crudo as Record<string, unknown>)) {
    if (valor === null || valor === undefined) continue;
    if (typeof valor === 'string') {
      const texto = valor.trim();
      if (VALORES_VACIOS.has(texto.toLowerCase())) continue;
      limpio[clave] = texto;
      continue;
    }
    limpio[clave] = valor;
  }
  return limpio;
}

async function excedido(clave: string, limite: number): Promise<boolean> {
  const { data } = await admin.rpc('registrar_intento', {
    p_clave: clave,
    p_limite: limite,
    p_ventana: '1 minute',
  });
  return data === true;
}

// ─────────────────────────────────────────────────── config

type Config = {
  complejo: Record<string, string>;
  operacion: Record<string, any>;
  pagos: Record<string, any>;
  integraciones: Record<string, any>;
};

async function traerConfig(tenantId: string): Promise<Config> {
  const { data } = await admin
    .from('tenant_config')
    .select('complejo, operacion, pagos, integraciones')
    .eq('tenant_id', tenantId)
    .maybeSingle();
  return {
    complejo: data?.complejo ?? {},
    operacion: data?.operacion ?? {},
    pagos: data?.pagos ?? {},
    integraciones: data?.integraciones ?? {},
  };
}

const nocheDesde = (c: Config) => c.operacion?.horaNocturnaDesde ?? '19:00';
const slotsDe = (c: Config): string[] => c.operacion?.slots ?? [];
const senaPct = (c: Config) => c.pagos?.senaMinimaPorcentaje ?? 50;

// ─────────────────────────────────────────────────── resolver un turno
//
// Tres escalones, en este orden. El código es el primero y no el teléfono
// porque el campo teléfono de la página pública es OPCIONAL: la mitad de los
// pendientes no lo tiene, y de los que lo tienen, muchos están cargados con un
// número distinto del WhatsApp desde el que después escriben.

const CAMPOS_TURNO =
  'id, codigo, fecha, hora, cancha_id, cliente_id, cliente_nombre, cliente_telefono, ' +
  'cliente_telefono_clave, estado, origen_fijo_id, precio_cancha, notas, canal, expira_at';

type Turno = Record<string, any>;

async function turnosPorCodigo(tenantId: string, codigo: string): Promise<Turno[]> {
  const { data } = await admin
    .from('bookings')
    .select(CAMPOS_TURNO)
    .eq('tenant_id', tenantId)
    .eq('codigo', codigo.toUpperCase())
    .in('estado', ['pendiente', 'reservado']);
  return data ?? [];
}

async function turnosPorTelefono(tenantId: string, claveTel: string): Promise<Turno[]> {
  const { data } = await admin
    .from('bookings')
    .select(CAMPOS_TURNO)
    .eq('tenant_id', tenantId)
    .eq('cliente_telefono_clave', claveTel)
    .gte('fecha', sumarDias(hoyISO(), -1))
    .in('estado', ['pendiente', 'reservado'])
    .order('fecha')
    .order('hora');
  return data ?? [];
}

/**
 * Cuando el turno se resuelve POR CÓDIGO y el número no coincide, el turno
 * adopta el WhatsApp real y guarda el anterior en las notas.
 *
 * Es lo que cierra el caso "el número del formulario no es el del chat", que
 * con un campo opcional es el caso normal y no el borde. A partir de acá el
 * cliente ya resuelve por teléfono y no necesita el código nunca más.
 */
async function adoptarTelefono(tenantId: string, turno: Turno, telE164: string | null) {
  const nuevaClave = claveTelefono(telE164);
  if (!telE164 || !nuevaClave || turno.cliente_telefono_clave === nuevaClave) return turno;

  const rastro = turno.cliente_telefono ? ` [web: ${turno.cliente_telefono}]` : '';
  const notas = `${turno.notas ?? ''}${rastro}`.slice(0, 300);

  await admin
    .from('bookings')
    .update({ cliente_telefono: telE164, notas, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('id', turno.id);

  return { ...turno, cliente_telefono: telE164, cliente_telefono_clave: nuevaClave, notas };
}

/** Turnos candidatos + de dónde salieron. Nunca elige uno: eso lo decide el cliente. */
async function resolverTurnos(
  tenantId: string,
  { codigo, telefono }: { codigo?: string; telefono?: string }
): Promise<{ turnos: Turno[]; via: 'codigo' | 'telefono' | 'ninguno' }> {
  const cod = String(codigo ?? '').trim().toUpperCase();
  if (/^[A-HJ-NP-Z2-9]{6}$/.test(cod)) {
    const porCodigo = await turnosPorCodigo(tenantId, cod);
    if (porCodigo.length) {
      const tel = normalizarTelefono(telefono);
      const adoptados = await Promise.all(porCodigo.map((t) => adoptarTelefono(tenantId, t, tel)));
      return { turnos: adoptados, via: 'codigo' };
    }
  }

  const claveTel = claveTelefono(telefono);
  if (claveTel) {
    const porTel = await turnosPorTelefono(tenantId, claveTel);
    if (porTel.length) return { turnos: porTel, via: 'telefono' };
  }

  return { turnos: [], via: 'ninguno' };
}

/** Un turno concreto por id. Sin filtrar por estado: hace falta saber si murió. */
async function turnoPorId(tenantId: string, bookingId: string): Promise<Turno | null> {
  const { data } = await admin
    .from('bookings')
    .select(`${CAMPOS_TURNO}, motivo_cancelacion`)
    .eq('tenant_id', tenantId)
    .eq('id', String(bookingId ?? ''))
    .maybeSingle();
  return data ?? null;
}

// ─────────────────────────────────────────────────── resolver una cancha
//
// El id de una cancha (`cancha_k3n8vq2mx1`) es opaco, y el agente lo tiene
// SOLO durante la ejecución en la que llamó a `ver_disponibilidad`: la memoria
// de n8n guarda los mensajes de la conversación, no las respuestas crudas de
// las herramientas. Dos mensajes después el modelo ya no lo tiene, y como el
// parámetro es obligatorio, lo reconstruye de memoria: manda `cancha_1` porque
// en su respuesta anterior escribió "Cancha 1". El 404 que devolvía esto no era
// un dato falso, era un dato perdido.
//
// Así que la cancha se resuelve por id o por nombre, y lo que no se puede
// resolver vuelve con la lista completa —con los ids— para que el que llamó se
// corrija en un solo reintento en vez de adivinar.

const SIGNOS_DIACRITICOS = /\p{Diacritic}/gu;

const normalizar = (s: unknown) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(SIGNOS_DIACRITICOS, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

type CanchaBot = {
  id: string;
  nombre: string;
  deporte: string | null;
  precio_dia: number;
  precio_noche: number;
};

type CanchaResuelta = {
  cancha?: CanchaBot;
  codigo?: 'falta_cancha' | 'cancha_inexistente' | 'cancha_ambigua';
  canchas: { id: string; nombre: string }[];
};

async function resolverCancha(tenantId: string, referencia: unknown): Promise<CanchaResuelta> {
  const { data } = await admin
    .from('canchas')
    .select('id, nombre, deporte, precio_dia, precio_noche')
    .eq('tenant_id', tenantId)
    .eq('activa', true)
    .order('orden');

  const activas = data ?? [];
  const canchas = activas.map((c) => ({ id: c.id, nombre: c.nombre }));
  const ref = String(referencia ?? '').trim();
  if (!ref) return { codigo: 'falta_cancha', canchas };

  const porId = activas.find((c) => c.id === ref);
  if (porId) return { cancha: porId, canchas };

  const r = normalizar(ref);

  const exactas = activas.filter((c) => normalizar(c.nombre) === r);
  if (exactas.length === 1) return { cancha: exactas[0], canchas };

  // "la cancha 1 de fútbol" contiene "cancha 1", y "cancha 1" está contenida en
  // ella: las dos direcciones, porque el modelo tanto abrevia como adorna.
  const parciales = activas.filter(
    (c) => normalizar(c.nombre).includes(r) || r.includes(normalizar(c.nombre))
  );
  if (parciales.length === 1) return { cancha: parciales[0], canchas };

  // Último escalón: el número. Es el que rescata el `cancha_1` inventado.
  const num = r.match(/\d+/)?.[0];
  if (num) {
    const porNumero = activas.filter((c) => new RegExp(`(^|\\D)${num}(\\D|$)`).test(normalizar(c.nombre)));
    if (porNumero.length === 1) return { cancha: porNumero[0], canchas };
    if (porNumero.length > 1) return { codigo: 'cancha_ambigua', canchas };
  }

  if (exactas.length > 1 || parciales.length > 1) return { codigo: 'cancha_ambigua', canchas };
  return { codigo: 'cancha_inexistente', canchas };
}

/** La respuesta de error cuando no se pudo resolver: siempre con la lista y los ids. */
function errorDeCancha(req: Request, res: CanchaResuelta): Response {
  const mensajes = {
    falta_cancha: 'Falta la cancha.',
    cancha_ambigua: 'Esa referencia coincide con más de una cancha.',
    cancha_inexistente: 'No reconocí esa cancha.',
  } as const;
  return json(
    req,
    {
      error: `${mensajes[res.codigo ?? 'cancha_inexistente']} Elegí una de la lista y mandá su id EXACTO.`,
      codigo: res.codigo ?? 'cancha_inexistente',
      canchas: res.canchas,
    },
    res.codigo === 'cancha_inexistente' ? 404 : 422
  );
}

async function nombresDeCanchas(tenantId: string): Promise<Map<string, string>> {
  const { data } = await admin.from('canchas').select('id, nombre').eq('tenant_id', tenantId);
  return new Map((data ?? []).map((c) => [c.id, c.nombre]));
}

async function pagadoPorTurno(tenantId: string, ids: string[]): Promise<Map<string, number>> {
  if (!ids.length) return new Map();
  const { data } = await admin
    .from('payments')
    .select('booking_id, monto')
    .eq('tenant_id', tenantId)
    .in('booking_id', ids);
  const acc = new Map<string, number>();
  for (const p of data ?? []) {
    acc.set(p.booking_id, (acc.get(p.booking_id) ?? 0) + Number(p.monto ?? 0));
  }
  return acc;
}

/** Vista de un turno para el agente: sin ids internos de más, sin datos ajenos. */
function turnoParaBot(t: Turno, cancha: string, cfg: Config, pagado = 0) {
  const total = Number(t.precio_cancha ?? 0);
  return {
    bookingId: t.id,
    codigo: t.codigo,
    fecha: t.fecha,
    hora: t.hora,
    cancha,
    estado: t.estado,
    precio: total,
    sena: senaDeSlot(total, senaPct(cfg)),
    pagado,
    saldo: Math.max(0, total - pagado),
    esFijo: !!t.origen_fijo_id,
    expiraEn: t.estado === 'pendiente' ? minutosHasta(t.expira_at) : null,
  };
}

// ─────────────────────────────────────────────────── estado_sesion
//
// Reemplaza el `bot-status` que en el bot de seguros vivía en una API externa.
// Lo llama el nodo HTTP del workflow en cada mensaje, ANTES del agente: le da
// al prompt todo el contexto de la conversación sin gastar una tool call.

async function estadoSesion(req: Request, tenantId: string, body: Record<string, any>) {
  const tel = normalizarTelefono(body.telefono);
  const claveTel = claveTelefono(body.telefono);
  if (!claveTel) return error(req, 'Teléfono inválido.', 422, 'telefono_invalido');

  const cfg = await traerConfig(tenantId);

  const { data: sesion } = await admin
    .from('bot_sesiones')
    .select('pausado_hasta, session_suffix, cliente_id, muteado')
    .eq('tenant_id', tenantId)
    .eq('telefono_clave', claveTel)
    .maybeSingle();

  await admin.from('bot_sesiones').upsert(
    {
      tenant_id: tenantId,
      telefono_clave: claveTel,
      telefono: tel ?? claveTel,
      ultimo_mensaje_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,telefono_clave' }
  );

  const { turnos } = await resolverTurnos(tenantId, { codigo: body.codigo, telefono: body.telefono });
  const canchas = await nombresDeCanchas(tenantId);
  const pagos = await pagadoPorTurno(tenantId, turnos.map((t) => t.id));

  const { data: cliente } = claveTel
    ? await admin
        .from('clients')
        .select('id, nombre')
        .eq('tenant_id', tenantId)
        .eq('telefono_clave', claveTel)
        .maybeSingle()
    : { data: null };

  let turnosPrevios = 0;
  if (cliente?.id) {
    const { count } = await admin
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('cliente_id', cliente.id)
      .eq('estado', 'reservado');
    turnosPrevios = count ?? 0;
  }

  const horario = cfg.operacion?.horarioAtencion ?? { desde: '09:00', hasta: '23:59' };
  const ahora = ahoraHHMM();

  return json(req, {
    pausado: !!sesion?.pausado_hasta && new Date(sesion.pausado_hasta) > new Date(),
    // Corte manual y sin vencimiento (a diferencia de `pausado`), lo prende y
    // apaga el dueño desde Derivaciones → Muteados. n8n lo trata igual que
    // una pausa: no le contesta a este teléfono.
    muteado: sesion?.muteado === true,
    bot_activo: cfg.integraciones?.whatsappBotActivo !== false,
    session_suffix: String(sesion?.session_suffix ?? 0),
    dentro_horario: ahora >= horario.desde && ahora <= horario.hasta,
    horario,
    hoy: hoyISO(),
    ahora,
    complejo: cfg.complejo,
    cliente: cliente ? { id: cliente.id, nombre: cliente.nombre, turnosPrevios } : null,
    pendientes: turnos
      .filter((t) => t.estado === 'pendiente')
      .map((t) => turnoParaBot(t, canchas.get(t.cancha_id) ?? '', cfg, pagos.get(t.id) ?? 0)),
    proximos: turnos
      .filter((t) => t.estado === 'reservado' && t.fecha >= hoyISO())
      .map((t) => turnoParaBot(t, canchas.get(t.cancha_id) ?? '', cfg, pagos.get(t.id) ?? 0)),
  });
}

// ─────────────────────────────────────────────────── info_complejo
//
// La fuente única contra la que el prompt se obliga a contrastar. Todo lo que
// no está acá ni en `disponibilidad`, el agente no lo sabe y tiene que derivar.

async function infoComplejo(req: Request, tenantId: string) {
  const cfg = await traerConfig(tenantId);
  const { data: canchas } = await admin
    .from('canchas')
    .select('id, nombre, subtitulo, deporte, precio_dia, precio_noche')
    .eq('tenant_id', tenantId)
    .eq('activa', true)
    .order('orden');

  return json(req, {
    ...cfg.complejo,
    hoy: hoyISO(),
    ahora: ahoraHHMM(),
    horario: cfg.operacion?.horarioAtencion ?? { desde: '09:00', hasta: '23:59' },
    slots: slotsDe(cfg),
    horaNocturnaDesde: nocheDesde(cfg),
    canchas: (canchas ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      subtitulo: c.subtitulo,
      deporte: c.deporte,
      precioDia: Number(c.precio_dia),
      precioNoche: Number(c.precio_noche),
    })),
    senaMinimaPorcentaje: senaPct(cfg),
    horasMinimasCancelacion: cfg.operacion?.horasMinimasCancelacion ?? 12,
    minutosExpiracionPendiente: cfg.operacion?.minutosExpiracionPendiente ?? 60,
  });
}

// ─────────────────────────────────────────────────── disponibilidad

async function disponibilidad(req: Request, tenantId: string, body: Record<string, any>) {
  const hoy = hoyISO();
  const desde = body.fecha === undefined ? hoy : aFechaISO(body.fecha);
  const hasta = body.fechaHasta === undefined ? desde : aFechaISO(body.fechaHasta);
  if (!desde || !hasta) {
    // `hoy` va en el cuerpo para que el que llamó pueda rearmar la fecha en vez
    // de reintentar a ciegas con la misma cadena rota.
    return json(
      req,
      {
        error: 'No pude leer esa fecha. Usá el formato YYYY-MM-DD.',
        codigo: 'fecha_invalida',
        hoy,
        recibido: { fecha: body.fecha ?? null, fechaHasta: body.fechaHasta ?? null },
      },
      422
    );
  }

  // Un día que ya pasó NO tiene disponibilidad, tiene historia. Antes esto
  // devolvía 200 con la grilla entera libre —porque en 2024 nadie había
  // reservado todavía—, así que el bot ofrecía con toda naturalidad un turno
  // para el año pasado y recién fallaba al momento de reservar. La respuesta
  // incluye `hoy` para que el que preguntó pueda corregirse sin adivinar.
  if (desde < hoy) {
    return json(
      req,
      {
        error: `Esa fecha ya pasó. Hoy es ${hoy}.`,
        codigo: 'fecha_pasada',
        hoy,
        fechaConsultada: desde,
      },
      422
    );
  }

  if (hasta < desde) return error(req, 'El rango está al revés.', 422, 'rango_invalido');
  if (hasta > sumarDias(desde, DIAS_MAX_RANGO - 1)) {
    return error(req, `Como mucho ${DIAS_MAX_RANGO} días por consulta.`, 422, 'rango_demasiado_largo');
  }

  const cfg = await traerConfig(tenantId);
  // Unión de todos los días: acá todavía no se sabe qué día de semana va a
  // pedir el cliente dentro del rango, así que el chequeo es "¿el complejo
  // abre esa hora ALGÚN día?" — el filtro fino por día de semana pasa abajo,
  // adentro del loop de fechas.
  const horasDeCualquierDia = horasUnion(cfg.operacion);
  const filtroHora = body.hora === undefined ? null : aHoraSlot(body.hora);
  if (body.hora !== undefined && !filtroHora) {
    return error(req, 'No pude leer ese horario. Usá el formato HH:MM.', 422, 'hora_invalida');
  }

  // Pedir un horario que el complejo no abre no es "no hay lugar": es otra
  // cosa, y el bot tiene que poder ofrecer los de al lado en vez de cortar la
  // conversación con un "no tenemos nada".
  if (filtroHora && horasDeCualquierDia.length && !horasDeCualquierDia.includes(filtroHora)) {
    return json(
      req,
      {
        error: `El complejo no abre a las ${filtroHora}.`,
        codigo: 'hora_no_habilitada',
        hoy,
        horariosPublicados: horasDeCualquierDia,
      },
      422
    );
  }

  const fechasDelRango: string[] = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) fechasDelRango.push(f);

  const [{ data: canchas }, { data: ocupados }, fijos] = await Promise.all([
    admin
      .from('canchas')
      .select('id, nombre, deporte, precio_dia, precio_noche')
      .eq('tenant_id', tenantId)
      .eq('activa', true)
      .order('orden'),
    admin
      .from('bookings')
      .select('cancha_id, hora, fecha')
      .eq('tenant_id', tenantId)
      .gte('fecha', desde)
      .lte('fecha', hasta)
      .neq('estado', 'cancelado'),
    turnosFijosOcupados(admin, tenantId, fechasDelRango),
  ]);

  // Un turno fijo nunca es una fila de `bookings` hasta que alguien lo
  // materializa: sin este merge el bot ofrece libre un horario que la
  // grilla del dueño ya muestra ocupado (pasó de verdad, ver turnosFijos.ts).
  const tomado = new Set((ocupados ?? []).map((o) => `${o.fecha}|${o.cancha_id}|${o.hora}`));
  for (const clave of fijos) tomado.add(clave);

  // Filtrar por un id que no existe no puede devolver "no hay lugar": son cosas
  // distintas y el bot las cuenta como la misma. Se resuelve igual que en
  // `reservar`, así una consulta por "la cancha 1" funciona.
  const refCancha = body.canchaId ?? body.cancha ?? body.canchaNombre;
  let canchasFiltradas = canchas ?? [];
  if (refCancha !== undefined) {
    const resuelta = await resolverCancha(tenantId, refCancha);
    if (!resuelta.cancha) return errorDeCancha(req, resuelta);
    canchasFiltradas = canchasFiltradas.filter((c) => c.id === resuelta.cancha!.id);
  }
  const ahoraMin = slotEnMinutos(ahoraHHMM()) ?? 0;

  const dias = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) {
    // Horas habilitadas ESE día de semana puntual — no las de cualquier día.
    const horasDelDia = horasHabilitadasEnFecha(cfg.operacion, f);
    // Sin esto, a las 22 hs el bot ofrece con toda naturalidad el turno de las
    // 10 de la mañana de hoy.
    const slots = f === hoy
      ? horasDelDia.filter((h) => (slotEnMinutos(h) ?? 0) > ahoraMin)
      : horasDelDia;

    dias.push({
      fecha: f,
      canchas: canchasFiltradas.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        deporte: c.deporte,
        // Precio y seña ya resueltos: el agente no tiene que replicar la regla
        // de la tarifa nocturna ni hacer aritmética. Si hace cuentas, se
        // equivoca, y acá el error se mide en plata.
        libres: slots
          .filter((h) => !filtroHora || h === filtroHora)
          .filter((h) => !tomado.has(`${f}|${c.id}|${h}`))
          .map((h) => {
            const precio = precioDeSlot(c, h, nocheDesde(cfg));
            return { hora: h, precio, sena: senaDeSlot(precio, senaPct(cfg)) };
          }),
      })),
    });
  }

  // `hoy` viaja en TODAS las respuestas de disponibilidad: es el dato que el
  // modelo necesita para traducir "mañana" o "el sábado" y el que, cuando
  // falta, reemplaza por una fecha inventada de su entrenamiento.
  const totalLibres = dias.reduce(
    (acc, d) => acc + d.canchas.reduce((a, c) => a + c.libres.length, 0),
    0
  );

  return json(req, {
    hoy,
    desde,
    hasta,
    dias,
    totalLibres,
    // Distinguir "no queda nada" de "el día ya arrancó" evita que el bot diga
    // "no hay lugar" cuando en realidad son las 22 y el día se terminó.
    motivoSinLugar:
      totalLibres > 0 ? null : desde === hoy ? 'el_dia_ya_paso' : 'todo_ocupado',
  });
}

// ─────────────────────────────────────────────────── reservar

async function reservar(req: Request, tenantId: string, body: Record<string, any>) {
  const { canchaId, nombre, telefono, notas } = body;
  const hoy = hoyISO();

  const fecha = aFechaISO(body.fecha);
  const hora = aHoraSlot(body.hora);

  if (!fecha) {
    return json(
      req,
      {
        error: 'No pude leer esa fecha. Usá el formato YYYY-MM-DD.',
        codigo: 'fecha_invalida',
        hoy,
        recibido: body.fecha ?? null,
      },
      422
    );
  }
  if (!hora) return error(req, 'No pude leer ese horario. Usá el formato HH:MM.', 422, 'hora_invalida');
  if (!String(nombre ?? '').trim()) return error(req, 'Falta el nombre del cliente.', 422, 'falta_nombre');

  // El `hoy` va en el cuerpo del error, no solo en el texto: quien llama tiene
  // que poder corregirse sin adivinar en qué fecha se equivocó.
  if (fecha < hoy) {
    return json(req, { error: `Esa fecha ya pasó. Hoy es ${hoy}.`, codigo: 'fecha_pasada', hoy }, 422);
  }
  if (fecha > sumarDias(hoy, DIAS_MAX_ADELANTO)) {
    return json(
      req,
      { error: `Solo se puede reservar hasta ${DIAS_MAX_ADELANTO} días adelante.`, codigo: 'fecha_lejana', hoy },
      422
    );
  }
  if (inicioDelTurno(fecha, hora).getTime() <= Date.now()) {
    return json(req, { error: 'Ese horario ya pasó.', codigo: 'hora_ya_paso', hoy, ahora: ahoraHHMM() }, 422);
  }

  // Por id o por nombre: ver `resolverCancha`. El id se pierde entre un mensaje
  // y el siguiente, el nombre no —es lo que el cliente y el bot dijeron en voz
  // alta— así que rechazar todo lo que no sea un id exacto era tirar la reserva
  // a la basura por un problema de memoria, no de datos.
  const resuelta = await resolverCancha(tenantId, canchaId ?? body.cancha ?? body.canchaNombre);
  if (!resuelta.cancha) return errorDeCancha(req, resuelta);
  const cancha = resuelta.cancha;

  const cfg = await traerConfig(tenantId);
  // Horas habilitadas ESE día de semana puntual (día×hora configurable desde
  // Configuración) — reemplaza al chequeo contra `slots` a secas.
  //
  // OJO con el caso "día cerrado": `horasDelDia` vacío puede significar dos
  // cosas MUY distintas — "el complejo nunca configuró nada, dejar pasar
  // cualquier hora" (tenant recién dado de alta) o "este día de semana está
  // explícitamente sin horas habilitadas" (domingo cerrado, por ejemplo). Un
  // simple `horasDelDia.length && ...` no las distingue: la longitud da 0 en
  // los dos casos, así que un día cerrado a propósito quedaría SIN aplicar
  // ninguna restricción. Por eso el gate es "¿el complejo abre ALGÚN día?" —
  // si sí, un día puntual vacío rechaza de verdad; si no hay nada cargado en
  // ningún lado, se mantiene el comportamiento de siempre (sin restricción).
  const horasDelDia = horasHabilitadasEnFecha(cfg.operacion, fecha);
  if (horasUnion(cfg.operacion).length && !horasDelDia.includes(hora)) {
    return error(req, 'Ese horario no está habilitado.', 422, 'hora_no_habilitada');
  }

  // Anticipación mínima: mismo criterio simétrico que `horasMinimasCancelacion`
  // en `cancelarTurno`, pero para el lado de "no dejar reservar con muy poca
  // antelación". 0 = sin restricción.
  const anticipacionMin = Number(cfg.operacion?.anticipacionMinHoras ?? 0);
  if (anticipacionMin > 0) {
    const horasHastaElTurno = (inicioDelTurno(fecha, hora).getTime() - Date.now()) / 3600_000;
    if (horasHastaElTurno < anticipacionMin) {
      return error(
        req,
        `Ese horario está a menos de ${anticipacionMin} horas: el complejo pide reservar con más anticipación.`,
        422,
        'anticipacion_insuficiente'
      );
    }
  }

  // Mismo código y mensaje que el choque de `bookings` en insertarConCodigo():
  // el agente ya sabe reaccionar a `slot_ocupado` (vuelve a consultar
  // disponibilidad y ofrece alternativas), así que no hace falta un código
  // nuevo ni tocar el prompt. Ver la nota larga en turnosFijos.ts.
  const fijos = await turnosFijosOcupados(admin, tenantId, [fecha]);
  if (fijos.has(`${fecha}|${cancha.id}|${hora}`)) {
    return error(req, 'Ese horario ya está ocupado.', 409, 'slot_ocupado');
  }

  const tel = normalizarTelefono(telefono);
  const claveTel = claveTelefono(telefono);

  // Anti-abuso: sin esto, un número puede tomarse la grilla entera de un
  // sábado y no confirmar ninguno.
  if (claveTel) {
    const maximo = Number(cfg.integraciones?.maxTurnosActivosPorTelefono ?? 2);
    if (maximo > 0) {
      const { count } = await admin
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('cliente_telefono_clave', claveTel)
        .gte('fecha', hoy)
        .in('estado', ['pendiente', 'reservado']);
      if ((count ?? 0) >= maximo) {
        return error(
          req,
          `Ya tenés ${count} turnos tomados. Para sumar otro hablá con el complejo.`,
          409,
          'limite_turnos'
        );
      }
    }
  }

  const clienteId = await asegurarCliente(tenantId, { nombre, tel, claveTel });

  // `exigirSena: false` es para el complejo que cobra todo en la puerta: el
  // turno nace confirmado y no hay nada que vencer.
  const exigeSena = cfg.pagos?.exigirSena !== false;
  const minutos = Number(cfg.operacion?.minutosExpiracionPendiente ?? 60);
  const precio = precioDeSlot(cancha, hora, nocheDesde(cfg));

  const base = {
    tenant_id: tenantId,
    fecha,
    hora,
    cancha_id: cancha.id,
    cliente_id: clienteId,
    cliente_nombre: String(nombre).trim().slice(0, 80),
    cliente_telefono: tel,
    estado: exigeSena ? 'pendiente' : 'reservado',
    expira_at: exigeSena ? new Date(Date.now() + minutos * 60_000).toISOString() : null,
    precio_cancha: precio,
    notas: String(notas ?? 'Reserva tomada por el bot de WhatsApp.').slice(0, 300),
    canal: 'bot_wa',
  };

  const creado = await insertarConCodigo(req, base);
  if (creado instanceof Response) return creado;

  return json(
    req,
    {
      ok: true,
      bookingId: creado.id,
      codigo: creado.codigo,
      estado: base.estado,
      cancha: cancha.nombre,
      fecha,
      hora,
      precio,
      sena: senaDeSlot(precio, senaPct(cfg)),
      expiraEn: exigeSena ? minutos : null,
      expiraAt: base.expira_at,
    },
    201
  );
}

/**
 * Alta o enlace del cliente en el CRM.
 *
 * Antes solo enlazaba si ya existía, así que el complejo perdía la ficha de
 * todo el que reservaba por el bot: quien más usa el canal nuevo era
 * justamente el que no quedaba registrado en ningún lado.
 */
async function asegurarCliente(
  tenantId: string,
  { nombre, tel, claveTel }: { nombre: string; tel: string | null; claveTel: string | null }
): Promise<string | null> {
  if (!claveTel) return null;

  const { data: existente } = await admin
    .from('clients')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('telefono_clave', claveTel)
    .maybeSingle();
  if (existente) return existente.id;

  const id = generarId('cli');
  const { error: errAlta } = await admin.from('clients').insert({
    id,
    tenant_id: tenantId,
    nombre: String(nombre).trim().slice(0, 80),
    telefono: tel,
    notas: 'Alta automática desde el bot de WhatsApp.',
  });
  // Si el alta falla, el turno igual se crea: perder la ficha del CRM es
  // molesto, perder la reserva es perder plata.
  if (errAlta) {
    console.error('[bot] alta cliente', errAlta);
    return null;
  }
  return id;
}

/**
 * Inserta el turno reintentando solo si chocó el CÓDIGO, nunca si chocó el slot.
 *
 * Los dos son 23505 y significan cosas opuestas: código repetido es mala suerte
 * (1 en 10⁹) y se reintenta; slot repetido es que el horario está tomado y
 * reintentar sería insistir contra la realidad.
 */
async function insertarConCodigo(req: Request, base: Record<string, unknown>) {
  for (let intento = 0; intento < 3; intento++) {
    const id = generarId('bkg');
    const codigo = generarCodigo();
    const { error: err } = await admin.from('bookings').insert({ ...base, id, codigo });

    if (!err) return { id, codigo };

    if (err.code === '23505') {
      if (String(err.message).includes('bookings_slot_unico')) {
        return error(req, 'Ese horario ya está ocupado.', 409, 'slot_ocupado');
      }
      continue;
    }
    console.error('[bot] insert booking', err);
    return error(req, 'No se pudo crear el turno.', 500, 'insert_fallido');
  }
  return error(req, 'No se pudo generar el código de la reserva.', 500, 'codigo_agotado');
}

// ─────────────────────────────────────────────────── datos_de_pago
//
// Acción aparte y no un campo de `reservar`: `public-reserva` omite alias y CBU
// a propósito, y esa regla se mantiene. Los datos bancarios salen únicamente
// contra un turno concreto que existe, y queda registrado que salieron.

async function datosDePago(req: Request, tenantId: string, body: Record<string, any>) {
  const turno = body.bookingId
    ? await turnoPorId(tenantId, body.bookingId)
    : (await resolverTurnos(tenantId, { codigo: body.codigo, telefono: body.telefono })).turnos[0];

  if (!turno) return error(req, 'No encuentro ese turno.', 404, 'turno_inexistente');
  if (turno.estado === 'cancelado') {
    return error(req, 'Ese turno ya no está vigente.', 410, 'turno_vencido');
  }

  const cfg = await traerConfig(tenantId);
  const canchas = await nombresDeCanchas(tenantId);
  const pagado = (await pagadoPorTurno(tenantId, [turno.id])).get(turno.id) ?? 0;
  const total = Number(turno.precio_cancha ?? 0);
  const sena = senaDeSlot(total, senaPct(cfg));

  if (pagado >= total && total > 0) {
    return error(req, 'Ese turno ya está pago.', 409, 'turno_ya_pago');
  }
  if (!cfg.pagos?.alias && !cfg.pagos?.cbu) {
    return error(req, 'El complejo todavía no cargó los datos para transferir.', 422, 'sin_datos_de_pago');
  }

  return json(req, {
    alias: cfg.pagos?.alias ?? '',
    cbu: cfg.pagos?.cbu ?? '',
    titular: cfg.pagos?.titular ?? '',
    monto: Math.max(0, sena - pagado),
    porcentaje: senaPct(cfg),
    total,
    pagado,
    turno: turnoParaBot(turno, canchas.get(turno.cancha_id) ?? '', cfg, pagado),
    expiraEn: turno.estado === 'pendiente' ? minutosHasta(turno.expira_at) : null,
  });
}

// ─────────────────────────────────────────────────── comprobante: preparar
//
// Paso 1 de 2. Devuelve una URL firmada para que n8n suba el archivo DIRECTO a
// Storage. La Edge Function no toca un solo byte del binario: el path lo elige
// el servidor, así que n8n no puede escribir fuera de su complejo, y el mime y
// el tamaño se validan antes de emitir el token.

async function prepararComprobante(req: Request, tenantId: string, body: Record<string, any>) {
  const mime = String(body.mime ?? '');
  const tamano = Number(body.tamano ?? 0);
  const refExterna = String(body.refExterna ?? '').slice(0, 120) || null;

  if (!MIMES_OK.includes(mime)) {
    return error(req, 'Mandame una foto o un PDF del comprobante.', 422, 'mime_no_soportado');
  }
  if (tamano > TAMANO_MAX) {
    return error(req, 'El archivo es muy pesado.', 422, 'archivo_grande');
  }

  // Cortar acá evita bajar de Chatwoot un archivo que ya tenemos.
  if (refExterna) {
    const { data: yaEsta } = await admin
      .from('payments')
      .select('booking_id')
      .eq('tenant_id', tenantId)
      .eq('ref_externa', refExterna)
      .maybeSingle();
    if (yaEsta) {
      return error(req, 'Ese comprobante ya lo recibimos.', 409, 'comprobante_duplicado');
    }
  }

  const { turnos } = await resolverTurnos(tenantId, {
    codigo: body.codigo,
    telefono: body.telefono,
  });
  const cobrables = turnos.filter((t) => t.estado === 'pendiente' || t.estado === 'reservado');

  if (!cobrables.length) {
    return error(req, 'No encuentro una reserva tuya para cobrar.', 404, 'sin_turnos');
  }

  const cfg = await traerConfig(tenantId);
  const canchas = await nombresDeCanchas(tenantId);

  // Con más de un candidato NO se elige: pagarle la seña al turno equivocado es
  // peor que pedir el código.
  const pendientes = cobrables.filter((t) => t.estado === 'pendiente');
  const candidatos = pendientes.length ? pendientes : cobrables;
  if (candidatos.length > 1) {
    return json(
      req,
      {
        error: 'Tenés más de una reserva abierta.',
        codigo: 'varios_pendientes',
        turnos: candidatos
          .slice(0, 3)
          .map((t) => turnoParaBot(t, canchas.get(t.cancha_id) ?? '', cfg)),
      },
      409
    );
  }

  const turno = candidatos[0];
  const pagado = (await pagadoPorTurno(tenantId, [turno.id])).get(turno.id) ?? 0;
  const total = Number(turno.precio_cancha ?? 0);
  const monto = Math.max(0, senaDeSlot(total, senaPct(cfg)) - pagado);

  const ext = mime === 'application/pdf' ? 'pdf' : mime.split('/')[1].replace('jpeg', 'jpg');
  const path = `${tenantId}/${turno.fecha.slice(0, 7)}/${turno.id}/${Date.now()}-${generarCodigo(8).toLowerCase()}.${ext}`;

  const { data: firma, error: errFirma } = await admin.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (errFirma || !firma) {
    console.error('[bot] signed upload', errFirma);
    return error(req, 'No se pudo preparar la subida.', 500, 'storage_fallido');
  }

  return json(req, {
    ok: true,
    bookingId: turno.id,
    path,
    uploadUrl: firma.signedUrl,
    token: firma.token,
    monto,
    turno: turnoParaBot(turno, canchas.get(turno.cancha_id) ?? '', cfg, pagado),
  });
}

// ─────────────────────────────────────────────────── comprobante: confirmar
//
// Paso 2 de 2, y el corazón de todo el circuito. El orden de las tres
// operaciones no es negociable, está explicado abajo en cada una.

async function confirmarReserva(req: Request, tenantId: string, body: Record<string, any>) {
  const bookingId = String(body.bookingId ?? '');
  const path = String(body.comprobantePath ?? '');
  const refExterna = String(body.refExterna ?? '').slice(0, 120) || null;

  const turno = await turnoPorId(tenantId, bookingId);
  if (!turno) return error(req, 'No encuentro ese turno.', 404, 'turno_inexistente');

  // 1. ¿El archivo llegó de verdad? n8n puede haber respondido "subí" con un
  //    PUT fallido. Sin esta verificación se confirmaría un turno sin ninguna
  //    prueba de pago, que es exactamente lo que el circuito intenta evitar.
  if (!path.startsWith(`${tenantId}/`)) {
    return error(req, 'Comprobante inválido.', 422, 'comprobante_invalido');
  }
  const carpeta = path.slice(0, path.lastIndexOf('/'));
  const archivo = path.slice(path.lastIndexOf('/') + 1);
  const { data: objetos } = await admin.storage.from(BUCKET).list(carpeta, { search: archivo });
  if (!objetos?.some((o) => o.name === archivo)) {
    return error(req, 'No me llegó el comprobante.', 422, 'comprobante_no_subido');
  }

  const cfg = await traerConfig(tenantId);
  const total = Number(turno.precio_cancha ?? 0);
  const pagadoPrevio = (await pagadoPorTurno(tenantId, [turno.id])).get(turno.id) ?? 0;
  const monto = Number(body.monto ?? 0) || Math.max(0, senaDeSlot(total, senaPct(cfg)) - pagadoPrevio);

  // 2. El pago se registra ANTES de tocar el estado del turno. Si el slot se lo
  //    llevó otro, la plata tiene que quedar visible pegada al turno cancelado:
  //    un turno cancelado con pagos adentro es la señal de "hay que devolver o
  //    reubicar". Al revés, un pago que no se guardó no existe para nadie.
  const { error: errPago } = await admin.from('payments').insert({
    id: generarId('pay'),
    tenant_id: tenantId,
    booking_id: turno.id,
    monto,
    metodo: String(body.metodo ?? 'transferencia'),
    nota: 'Seña declarada por WhatsApp — sin validar.',
    comprobante_path: path,
    validado: false,
    ref_externa: refExterna,
  });

  // 23505 sobre `ref_externa` = es el mismo mensaje reenviado. No es un error:
  // el pago ya está, y seguimos como si lo acabáramos de insertar.
  if (errPago && errPago.code !== '23505') {
    console.error('[bot] insert payment', errPago);
    return error(req, 'No se pudo registrar el pago.', 500, 'pago_fallido');
  }

  const canchas = await nombresDeCanchas(tenantId);
  const nombreCancha = canchas.get(turno.cancha_id) ?? '';

  // El dueño que prefiere mirar cada comprobante antes de comprometer la
  // cancha: el turno NO se confirma, se le estira el vencimiento un día y
  // entra en la bandeja.
  if (cfg.integraciones?.exigirValidacionManual === true && turno.estado === 'pendiente') {
    await admin
      .from('bookings')
      .update({
        expira_at: new Date(Date.now() + 24 * 3600_000).toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', tenantId)
      .eq('id', turno.id);

    await abrirDerivacion(tenantId, {
      telefono: turno.cliente_telefono,
      nombre: turno.cliente_nombre,
      motivo: 'Comprobante recibido — falta validar el pago',
      bookingId: turno.id,
    });

    return json(req, {
      ok: true,
      estado: 'pendiente',
      requiereValidacion: true,
      turno: turnoParaBot(turno, nombreCancha, cfg, pagadoPrevio + monto),
    });
  }

  // 3. Compare-and-swap en la base. Nunca leer-y-después-escribir: entre las
  //    dos operaciones entra el cron de vencimiento y entra el mostrador.
  const { data: resultado } = await admin.rpc('confirmar_pendiente', {
    p_tenant: tenantId,
    p_booking: turno.id,
  });

  const pagado = pagadoPrevio + monto;
  const vista = { ...turnoParaBot(turno, nombreCancha, cfg, pagado), estado: 'reservado', expiraEn: null };

  switch (resultado) {
    case 'confirmado':
    case 'revivido':
      return json(req, { ok: true, estado: 'reservado', yaConfirmado: false, revivido: resultado === 'revivido', turno: vista });

    case 'ya_confirmado':
      return json(req, { ok: true, estado: 'reservado', yaConfirmado: true, turno: vista });

    case 'slot_tomado':
      // El único caso donde alguien pagó y no hay cancha. Se deriva sin
      // preguntar: es plata de un tercero y no lo resuelve un bot.
      await abrirDerivacion(tenantId, {
        telefono: turno.cliente_telefono,
        nombre: turno.cliente_nombre,
        motivo: `Pagó la seña pero el horario se venció y lo tomó otro (${turno.fecha} ${turno.hora})`,
        bookingId: turno.id,
      });
      return error(
        req,
        'El horario se liberó por vencimiento y lo tomó otro cliente.',
        409,
        'slot_tomado_con_pago'
      );

    case 'cancelado_manual':
      return error(req, 'Ese turno fue cancelado por el complejo.', 409, 'turno_cancelado');

    default:
      return error(req, 'No encuentro ese turno.', 404, 'turno_inexistente');
  }
}

// ─────────────────────────────────────────────────── mis_turnos

async function misTurnos(req: Request, tenantId: string, body: Record<string, any>) {
  if (!claveTelefono(body.telefono) && !body.codigo) {
    return error(req, 'Teléfono inválido.', 422, 'telefono_invalido');
  }

  const { turnos } = await resolverTurnos(tenantId, { codigo: body.codigo, telefono: body.telefono });
  const cfg = await traerConfig(tenantId);
  const canchas = await nombresDeCanchas(tenantId);
  const pagos = await pagadoPorTurno(tenantId, turnos.map((t) => t.id));
  const horasMin = Number(cfg.operacion?.horasMinimasCancelacion ?? 12);

  const vista = (t: Turno) => {
    const horas = (inicioDelTurno(t.fecha, t.hora).getTime() - Date.now()) / 3600_000;
    return {
      ...turnoParaBot(t, canchas.get(t.cancha_id) ?? '', cfg, pagos.get(t.id) ?? 0),
      horasParaElTurno: Math.round(horas),
      puedeCancelar: !t.origen_fijo_id && (t.estado === 'pendiente' || horas > horasMin),
    };
  };

  return json(req, {
    pendientes: turnos.filter((t) => t.estado === 'pendiente').map(vista),
    confirmados: turnos.filter((t) => t.estado === 'reservado').map(vista),
    total: turnos.length,
  });
}

// ─────────────────────────────────────────────────── cancelar_turno
//
// Las reglas viven acá y no en el prompt. El prompt las repite para que el bot
// sepa qué decir; el que las hace cumplir es este bloque.

async function cancelarTurno(req: Request, tenantId: string, body: Record<string, any>) {
  const claveTel = claveTelefono(body.telefono);
  if (!claveTel) return error(req, 'Teléfono inválido.', 422, 'telefono_invalido');

  // El `bookingId` sufre lo mismo que el id de cancha: el agente lo tuvo en la
  // ejecución en que llamó a `mis_turnos` y lo perdió en la siguiente. Si no
  // vino, o vino uno que no existe, se resuelve por código o por teléfono —y
  // solo si queda UNO. Con varios no elige nadie: devuelve la lista y el bot
  // pregunta cuál, que es la misma regla de siempre.
  //
  // El respaldo corre SOLO si no vino `bookingId`. Si vino uno y no existe, eso
  // es un error y se contesta como tal: buscar "algo parecido" con el teléfono
  // convertiría un id equivocado en la cancelación silenciosa de otro turno.
  let turno = body.bookingId ? await turnoPorId(tenantId, String(body.bookingId)) : null;
  if (!turno && !body.bookingId) {
    const { turnos } = await resolverTurnos(tenantId, { codigo: body.codigo, telefono: body.telefono });
    const cancelables = turnos.filter((t) => t.cliente_telefono_clave === claveTel);
    if (cancelables.length === 1) turno = cancelables[0];
    else if (cancelables.length > 1) {
      const canchas = await nombresDeCanchas(tenantId);
      const cfg = await traerConfig(tenantId);
      const pagos = await pagadoPorTurno(tenantId, cancelables.map((t) => t.id));
      return json(
        req,
        {
          error: 'Tenés más de un turno. Preguntale al cliente cuál quiere cancelar.',
          codigo: 'varios_turnos',
          turnos: cancelables.map((t) =>
            turnoParaBot(t, canchas.get(t.cancha_id) ?? '', cfg, pagos.get(t.id) ?? 0)
          ),
        },
        409
      );
    }
  }

  // Mismo mensaje para "no existe" y "no es tuyo". Distinguirlos convertiría al
  // bot en un buscador de turnos ajenos a fuerza de probar ids.
  if (!turno || turno.cliente_telefono_clave !== claveTel || turno.estado === 'bloqueado') {
    return error(req, 'No encuentro un turno tuyo con ese dato.', 403, 'no_es_tuyo');
  }
  if (turno.estado === 'cancelado') {
    return json(req, { ok: true, cancelado: true, yaEstaba: true });
  }
  if (turno.origen_fijo_id) {
    return error(req, 'Los turnos fijos los maneja el complejo.', 403, 'turno_fijo');
  }

  const cfg = await traerConfig(tenantId);
  const horasMin = Number(cfg.operacion?.horasMinimasCancelacion ?? 12);
  const horas = (inicioDelTurno(turno.fecha, turno.hora).getTime() - Date.now()) / 3600_000;
  const pagado = (await pagadoPorTurno(tenantId, [turno.id])).get(turno.id) ?? 0;

  // Un pendiente sin pagos se cancela siempre: no se cobró nada y liberar el
  // slot le sirve al complejo más que retenerlo.
  const esPendienteLimpio = turno.estado === 'pendiente' && pagado === 0;
  if (!esPendienteLimpio && horas < horasMin) {
    return error(
      req,
      `Faltan menos de ${horasMin} horas: esa cancelación la tiene que ver el complejo.`,
      409,
      'fuera_de_ventana'
    );
  }

  const { error: errUpd } = await admin
    .from('bookings')
    .update({
      estado: 'cancelado',
      motivo_cancelacion: 'cliente_wa',
      notas: `${turno.notas ?? ''} [cancelado por WhatsApp: ${String(body.motivo ?? 'sin motivo').slice(0, 80)}]`.slice(0, 300),
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('id', turno.id)
    .in('estado', ['pendiente', 'reservado']);

  if (errUpd) {
    console.error('[bot] cancelar', errUpd);
    return error(req, 'No se pudo cancelar el turno.', 500, 'cancelacion_fallida');
  }

  const canchas = await nombresDeCanchas(tenantId);
  const politica = cfg.pagos?.politicaSena ?? 'credito';

  // Los pagos NO se tocan: quedan pegados al turno cancelado. Es lo que hace
  // que el dueño vea que hay plata de por medio en vez de un turno que
  // desapareció sin más.
  return json(req, {
    ok: true,
    cancelado: true,
    liberado: { fecha: turno.fecha, hora: turno.hora, cancha: canchas.get(turno.cancha_id) ?? '' },
    sena: {
      habia: pagado > 0,
      monto: pagado,
      politica,
      // El bot repite este texto y nada más. Nunca promete una devolución: eso
      // lo decide el complejo, no un chat.
      mensaje:
        pagado === 0
          ? 'No habías señado, así que no queda nada pendiente.'
          : politica === 'no_reembolsable'
            ? 'La seña no se reintegra según la política del complejo. Cualquier cosa, lo hablás con ellos.'
            : 'La seña queda como crédito a favor. Lo coordinás con el complejo cuando reserves de nuevo.',
    },
  });
}

// ─────────────────────────────────────────────────── derivar

async function abrirDerivacion(
  tenantId: string,
  d: { telefono: string | null; nombre?: string | null; motivo: string; bookingId?: string | null }
) {
  const claveTel = claveTelefono(d.telefono);
  const hasta = new Date(Date.now() + HORAS_PAUSA_DERIVACION * 3600_000).toISOString();

  if (claveTel) {
    await admin.from('bot_sesiones').upsert(
      {
        tenant_id: tenantId,
        telefono_clave: claveTel,
        telefono: d.telefono ?? claveTel,
        pausado_hasta: hasta,
        ultimo_mensaje_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id,telefono_clave' }
    );
  }

  await admin.from('bot_derivaciones').insert({
    tenant_id: tenantId,
    telefono: d.telefono ?? 'desconocido',
    nombre: d.nombre ?? null,
    motivo: d.motivo.slice(0, 200),
    booking_id: d.bookingId ?? null,
  });

  return hasta;
}

async function derivar(req: Request, tenantId: string, body: Record<string, any>) {
  if (!claveTelefono(body.telefono)) {
    return error(req, 'Teléfono inválido.', 422, 'telefono_invalido');
  }

  const hasta = await abrirDerivacion(tenantId, {
    telefono: normalizarTelefono(body.telefono),
    nombre: body.nombre ? String(body.nombre).slice(0, 80) : null,
    motivo: String(body.motivo ?? 'Derivación al complejo'),
    bookingId: body.bookingId ? String(body.bookingId) : null,
  });

  return json(req, { ok: true, pausadoHasta: hasta, horasPausa: HORAS_PAUSA_DERIVACION });
}

// ─────────────────────────────────────────────────── turnos_del_dia
//
// ⚠ NO conectar como herramienta del agente: devuelve nombre y teléfono de
// todos los turnos del día. Queda para un workflow interno de resumen diario,
// donde la clave la usa el complejo y no un modelo que lee texto de terceros.

async function turnosDelDia(req: Request, tenantId: string, body: Record<string, unknown>) {
  const fecha = body.fecha === undefined ? hoyISO() : aFechaISO(body.fecha);
  if (!fecha) return error(req, 'Fecha inválida.', 422, 'fecha_invalida');

  const { data } = await admin
    .from('bookings')
    .select('id, hora, cancha_id, cliente_nombre, cliente_telefono, estado, precio_cancha, canal')
    .eq('tenant_id', tenantId)
    .eq('fecha', fecha)
    .order('hora');

  return json(req, { fecha, turnos: data ?? [] });
}
