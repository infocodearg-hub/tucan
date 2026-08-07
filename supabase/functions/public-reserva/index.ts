/**
 * Edge Function `public-reserva` — la página que abre el jugador con el QR.
 *
 * Es la única puerta entre un desconocido y la base. El navegador del jugador
 * NO tiene la anon key de la app ni una sesión: solo puede hacer lo que esta
 * función le permite, y esta función solo hace dos cosas:
 *
 *   GET  ?slug=<complejo>&fecha=YYYY-MM-DD  → qué hay libre ese día
 *   POST { slug, fecha, hora, canchaId, nombre, telefono } → reservar
 *
 * El POST crea el turno en estado `pendiente`, con vencimiento y con un código
 * corto. Ocupa el slot para que nadie se lo lleve mientras el jugador va a
 * transferir, pero se libera solo si no confirma. La confirmación pasa por el
 * bot de WhatsApp, que reconoce la reserva por ese código.
 *
 * Decisiones de seguridad, todas deliberadas:
 *   - Se devuelve únicamente lo que el jugador necesita ver. El alias, el CBU y
 *     los datos de otros clientes no salen de acá.
 *   - El precio lo calcula el servidor con los precios de la base. Si viniera
 *     del cliente, cualquiera podría reservar a $1.
 *   - El choque de horario lo resuelve el índice único de la base, no un SELECT
 *     previo: entre el "está libre" y el "lo reservo" hay una carrera que dos
 *     personas pueden ganar a la vez.
 *   - Límite de peticiones por IP para que no se pueda llenar la grilla con un
 *     script.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  claveDeLimite, error, generarCodigo, generarId, hoyISO, inicioDelTurno, json,
  normalizarTelefono, precioDeSlot, preflight, senaDeSlot, slotEnMinutos,
} from '../_shared/http.ts';
import { turnosFijosOcupados } from '../_shared/turnosFijos.ts';
import { horasHabilitadasEnFecha, horasUnion } from '../_shared/disponibilidad.ts';

const LIMITE_CONSULTAS = 60;   // por IP y por minuto
const LIMITE_RESERVAS = 5;     // por IP y por hora
const DIAS_MAX_ADELANTO = 60;

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } }
);

const ISO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

const sumarDias = (iso: string, dias: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + dias));
  return dt.toISOString().slice(0, 10);
};

async function buscarComplejo(slug: string) {
  const { data } = await admin
    .from('tenants')
    .select('id, nombre, slug, activo')
    .eq('slug', slug)
    .maybeSingle();
  return data?.activo ? data : null;
}

async function limiteExcedido(req: Request, prefijo: string, limite: number, ventana: string) {
  const clave = await claveDeLimite(req, prefijo);
  const { data } = await admin.rpc('registrar_intento', {
    p_clave: clave,
    p_limite: limite,
    p_ventana: ventana,
  });
  return data === true;
}

Deno.serve(async (req) => {
  const pre = preflight(req);
  if (pre) return pre;

  try {
    if (req.method === 'GET') return await manejarConsulta(req);
    if (req.method === 'POST') return await manejarReserva(req);
    return error(req, 'Método no permitido.', 405);
  } catch (err) {
    console.error('[public-reserva]', err);
    return error(req, 'Hubo un problema. Probá de nuevo en un momento.', 500);
  }
});

// ─────────────────────────────────────────────────── GET: disponibilidad

async function manejarConsulta(req: Request) {
  if (await limiteExcedido(req, 'pub-get', LIMITE_CONSULTAS, '1 minute')) {
    return error(req, 'Demasiadas consultas. Esperá un momento.', 429);
  }

  const url = new URL(req.url);
  const slug = url.searchParams.get('slug') ?? '';
  const fecha = url.searchParams.get('fecha') ?? hoyISO();

  if (!ISO_FECHA.test(fecha)) return error(req, 'Fecha inválida.');

  const complejo = await buscarComplejo(slug);
  if (!complejo) return error(req, 'No encontramos ese complejo.', 404);

  // Los pendientes vencidos se cancelan antes de contar ocupación: si no, el
  // jugador ve tomado un horario que en realidad se liberó hace media hora.
  await admin.rpc('expirar_pendientes', { p_tenant: complejo.id });

  const [{ data: config }, { data: canchas }, { data: ocupados }, fijos] = await Promise.all([
    admin.from('tenant_config').select('complejo, pagos, operacion').eq('tenant_id', complejo.id).maybeSingle(),
    admin.from('canchas').select('id, nombre, subtitulo, deporte, color, precio_dia, precio_noche, orden')
      .eq('tenant_id', complejo.id).eq('activa', true).order('orden'),
    admin.from('bookings').select('cancha_id, hora')
      .eq('tenant_id', complejo.id).eq('fecha', fecha).neq('estado', 'cancelado'),
    // Un turno fijo nunca es una fila de `bookings` hasta que alguien lo
    // materializa: sin este merge la web pública ofrece libre un horario que
    // la grilla del dueño ya muestra ocupado. Ver la nota en turnosFijos.ts.
    turnosFijosOcupados(admin, complejo.id, [fecha]),
  ]);

  // De `config` sale SOLO lo que el jugador necesita ver. `pagos.alias` y
  // `pagos.cbu` se quedan adentro a propósito: se pasan por WhatsApp, cuando ya
  // hay una persona del otro lado.
  return json(req, {
    complejo: {
      nombre: config?.complejo?.nombre ?? complejo.nombre,
      ciudad: config?.complejo?.ciudad ?? '',
      direccion: config?.complejo?.direccion ?? '',
      telefono: config?.complejo?.telefono ?? '',
    },
    senaMinimaPorcentaje: Number(config?.pagos?.senaMinimaPorcentaje ?? 50),
    // Cuánto le dura la reserva sin confirmar. Se lo decimos antes de que
    // reserve, no después: es la diferencia entre una regla y una sorpresa.
    minutosExpiracionPendiente: Number(config?.operacion?.minutosExpiracionPendiente ?? 60),
    // Horas habilitadas ESE día de semana puntual, no la lista global.
    slots: horasHabilitadasEnFecha(config?.operacion, fecha),
    horaNocturnaDesde: config?.operacion?.horaNocturnaDesde ?? '19:00',
    canchas: (canchas ?? []).map((c) => ({
      id: c.id,
      nombre: c.nombre,
      subtitulo: c.subtitulo,
      deporte: c.deporte,
      color: c.color,
      precioDia: Number(c.precio_dia),
      precioNoche: Number(c.precio_noche),
    })),
    ocupados: [
      ...(ocupados ?? []).map((b) => ({ canchaId: b.cancha_id, hora: b.hora })),
      ...[...fijos].map((clave) => {
        const [, canchaId, hora] = clave.split('|');
        return { canchaId, hora };
      }),
    ],
    fecha,
  });
}

// ─────────────────────────────────────────────────── POST: reservar

async function manejarReserva(req: Request) {
  if (await limiteExcedido(req, 'pub-post', LIMITE_RESERVAS, '1 hour')) {
    return error(req, 'Ya hiciste varias reservas seguidas. Escribinos por WhatsApp.', 429);
  }

  const body = await req.json().catch(() => null);
  if (!body) return error(req, 'Pedido inválido.');

  const { slug, fecha, hora, canchaId, nombre, telefono } = body;

  if (!ISO_FECHA.test(fecha ?? '')) return error(req, 'Fecha inválida.');
  if (slotEnMinutos(hora ?? '') === null) return error(req, 'Horario inválido.');
  if (!String(nombre ?? '').trim()) return error(req, 'Necesitamos tu nombre para reservar.');

  const nombreLimpio = String(nombre).trim().slice(0, 80);

  // Ventana de fechas: ni turnos en el pasado ni reservas a un año vista.
  const hoy = hoyISO();
  if (fecha < hoy) return error(req, 'No se puede reservar una fecha que ya pasó.');
  if (fecha > sumarDias(hoy, DIAS_MAX_ADELANTO)) {
    return error(req, `Solo se puede reservar hasta ${DIAS_MAX_ADELANTO} días antes.`);
  }

  const complejo = await buscarComplejo(slug);
  if (!complejo) return error(req, 'No encontramos ese complejo.', 404);

  await admin.rpc('expirar_pendientes', { p_tenant: complejo.id });

  const [{ data: cancha }, { data: config }] = await Promise.all([
    admin.from('canchas').select('id, nombre, precio_dia, precio_noche, activa')
      .eq('tenant_id', complejo.id).eq('id', canchaId).maybeSingle(),
    admin.from('tenant_config').select('operacion, pagos').eq('tenant_id', complejo.id).maybeSingle(),
  ]);

  if (!cancha?.activa) return error(req, 'Esa cancha no está disponible.');

  // El horario tiene que ser uno de los que el complejo publica ESE día de
  // semana. Sin esta validación se podrían crear turnos a las 04:30 que
  // después nadie ve en la grilla porque esa fila no existe.
  //
  // Gate por "¿el complejo abre ALGÚN día?" y no por el largo de `horasDelDia`
  // — un día explícitamente cerrado (horasDelDia vacío A PROPÓSITO) tiene que
  // rechazar igual; el mismo detalle que en supabase/functions/bot/index.ts.
  const horasDelDia = horasHabilitadasEnFecha(config?.operacion, fecha);
  if (horasUnion(config?.operacion).length && !horasDelDia.includes(hora)) {
    return error(req, 'Ese horario no está habilitado.');
  }

  // El turno de hoy a las 20 no se puede reservar a las 21. La validación de
  // "fecha pasada" de arriba mira el día; esta mira la hora.
  if (inicioDelTurno(fecha, hora).getTime() <= Date.now()) {
    return error(req, 'Ese horario ya pasó.');
  }

  // Anticipación mínima, mismo criterio que en el bot de WhatsApp.
  const anticipacionMin = Number(config?.operacion?.anticipacionMinHoras ?? 0);
  if (anticipacionMin > 0) {
    const horasHastaElTurno = (inicioDelTurno(fecha, hora).getTime() - Date.now()) / 3600_000;
    if (horasHastaElTurno < anticipacionMin) {
      return error(req, `Ese horario está a menos de ${anticipacionMin} horas: reservá con más anticipación.`);
    }
  }

  // Mismo criterio que en manejarConsulta(): un turno fijo nunca es una fila
  // de `bookings`, así que sin este chequeo un desconocido podía reservar
  // encima de un equipo con horario fijo. Mismo mensaje que el choque real
  // de `bookings` más abajo — es la misma situación desde afuera.
  const fijos = await turnosFijosOcupados(admin, complejo.id, [fecha]);
  if (fijos.has(`${fecha}|${canchaId}|${hora}`)) {
    return error(req, 'Justo tomaron ese horario. Elegí otro, por favor.', 409);
  }

  const precio = precioDeSlot(cancha, hora, config?.operacion?.horaNocturnaDesde ?? '19:00');
  const senaMinima = Number(config?.pagos?.senaMinimaPorcentaje ?? 50);
  const minutos = Number(config?.operacion?.minutosExpiracionPendiente ?? 60);

  // El turno nace SIN CONFIRMAR y con fecha de vencimiento. Ocupa el slot —el
  // índice único no distingue estados salvo `cancelado`—, así que nadie se lo
  // puede llevar mientras el jugador va a transferir; pero si no confirma, se
  // libera solo. Antes nacía confirmado: un desconocido se quedaba con un
  // sábado a la noche sin poner un peso ni dejar forma de contactarlo.
  const expiraAt = new Date(Date.now() + minutos * 60_000).toISOString();

  // El código es el único vínculo confiable entre esta reserva y el chat: el
  // teléfono de este formulario es opcional y casi nunca es el WhatsApp real.
  let creado: { id: string; codigo: string } | null = null;
  let ultimoError: { code?: string; message?: string } | null = null;

  for (let intento = 0; intento < 3 && !creado; intento++) {
    const id = generarId('bkg');
    const codigo = generarCodigo();
    const { error: errInsert } = await admin.from('bookings').insert({
      id,
      codigo,
      tenant_id: complejo.id,
      fecha,
      hora,
      cancha_id: cancha.id,
      cliente_nombre: nombreLimpio,
      cliente_telefono: normalizarTelefono(telefono),
      estado: 'pendiente',
      expira_at: expiraAt,
      precio_cancha: precio,
      notas: 'Reserva desde la web pública.',
      canal: 'web',
    });

    if (!errInsert) { creado = { id, codigo }; break; }
    ultimoError = errInsert;

    // Los dos choques posibles son 23505 y significan cosas opuestas: código
    // repetido es mala suerte y se reintenta; slot repetido es que el horario
    // está tomado y reintentar sería insistir contra la realidad.
    if (errInsert.code === '23505' && String(errInsert.message).includes('bookings_slot_unico')) {
      return error(req, 'Justo tomaron ese horario. Elegí otro, por favor.', 409);
    }
    if (errInsert.code !== '23505') break;
  }

  if (!creado) {
    console.error('[public-reserva] insert', ultimoError);
    return error(req, 'No pudimos guardar la reserva. Probá de nuevo.', 500);
  }

  return json(req, {
    ok: true,
    codigo: creado.codigo,
    precio,
    sena: senaDeSlot(precio, senaMinima),
    expiraEn: minutos,
    cancha: cancha.nombre,
    fecha,
    hora,
  });
}
