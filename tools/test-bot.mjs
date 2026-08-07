/**
 * test-bot.mjs — ejercita las 11 acciones de la Edge Function `bot` contra el
 * proyecto linkeado, incluidos los caminos de error.
 *
 *   node tools/test-bot.mjs
 *
 * Por qué existe: el bot de n8n es un modelo de lenguaje llamando a una API.
 * Si un contrato cambia, no explota nada — el modelo improvisa una respuesta
 * simpática y el complejo se entera cuando alguien aparece un sábado con un
 * turno que no existe. Esto prueba el contrato, no la conversación.
 *
 * Se crea una api key propia al arrancar y se revoca al terminar, así no hace
 * falta pegar la del panel ni dejarla dando vueltas. Crea turnos de prueba en
 * una fecha lejana y los borra al final.
 *
 * DESTRUCTIVO EN LA MEDIDA JUSTA: toca solo las filas que crea. Aun así está
 * pensado para el proyecto de desarrollo.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash, randomBytes } from 'node:crypto';
import { cargarEnv } from './sesionPrueba.mjs';

const env = cargarEnv();
const url = env.SUPABASE_URL ?? env.VITE_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !service) {
  console.error('\n  ✕ Faltan SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local\n');
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const FN = `${url}/functions/v1/bot`;

let fallas = 0;
const ok = (t) => console.log('  ✓', t);
const mal = (t, extra) => { console.log('  ✕', t, extra ? `→ ${JSON.stringify(extra)}` : ''); fallas++; };

// Un teléfono que no existe en la cartera, con formato de celular argentino.
const TEL = '5492219' + String(Date.now()).slice(-6);
// Fecha lejana pero dentro de los 90 días que acepta `reservar`.
const FECHA = (() => {
  const d = new Date(Date.now() + 60 * 86400_000);
  return d.toISOString().slice(0, 10);
})();

// ─── setup: clave de prueba ───────────────────────────────────────────────────

const { data: tenant } = await admin.from('tenants').select('id, slug, nombre').limit(1).maybeSingle();
if (!tenant) { console.error('\n  ✕ No hay ningún complejo en la base.\n'); process.exit(1); }

const clave = 'tucan_test_' + randomBytes(16).toString('hex');
const keyHash = createHash('sha256').update(clave).digest('hex');
const { data: apiKey, error: errKey } = await admin
  .from('tenant_api_keys')
  .insert({
    tenant_id: tenant.id,
    nombre: 'Clave temporal de test-bot.mjs',
    key_hash: keyHash,
    key_prefijo: clave.slice(0, 12),
  })
  .select('id')
  .single();

if (errKey) { console.error('\n  ✕ No se pudo crear la clave de prueba:', errKey.message, '\n'); process.exit(1); }

console.log(`\n  Complejo : ${tenant.nombre} (${tenant.slug})`);
console.log(`  Fecha    : ${FECHA}`);
console.log(`  Teléfono : +${TEL}\n`);

const creados = [];
let fijoCreadoId = null;
// Se toca `tenant_config.operacion` para probar disponibilidad configurable
// y anticipación mínima — se restaura al valor original en `limpiar()`,
// pase lo que pase.
let operacionOriginal = null;

/** Llama a la función. Devuelve `{ status, body }` — nunca tira. */
async function llamar(cuerpo, conClave = true) {
  const res = await fetch(FN, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(conClave ? { 'x-api-key': clave } : {}),
    },
    body: JSON.stringify(cuerpo),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

async function limpiar() {
  if (creados.length) {
    await admin.from('payments').delete().eq('tenant_id', tenant.id).in('booking_id', creados);
    await admin.from('bookings').delete().eq('tenant_id', tenant.id).in('id', creados);
  }
  await admin.from('bookings').delete().eq('tenant_id', tenant.id).eq('fecha', FECHA);
  await admin.from('bot_derivaciones').delete().eq('tenant_id', tenant.id).like('telefono', `%${TEL.slice(-8)}`);
  await admin.from('bot_sesiones').delete().eq('tenant_id', tenant.id).eq('telefono_clave', TEL.slice(-10));
  await admin.from('clients').delete().eq('tenant_id', tenant.id).eq('telefono_clave', TEL.slice(-10));
  if (fijoCreadoId) await admin.from('turnos_fijos').delete().eq('tenant_id', tenant.id).eq('id', fijoCreadoId);
  if (operacionOriginal) {
    await admin.from('tenant_config').update({ operacion: operacionOriginal }).eq('tenant_id', tenant.id);
  }
  try {
    await admin.rpc('desmutear_bot', { p_tenant: tenant.id, p_telefono_clave: TEL.slice(-10) });
  } catch { /* ya desmuteado o la fila ni existe — no es un fallo de limpieza */ }
  await admin.from('tenant_api_keys').delete().eq('id', apiKey.id);
}

try {
  // ── 1. Autenticación ────────────────────────────────────────────────────────
  const sinClave = await llamar({ accion: 'info_complejo' }, false);
  if (sinClave.status === 401) ok('sin clave devuelve 401');
  else mal('sin clave no devolvió 401', sinClave);

  const accionRara = await llamar({ accion: 'formatear_la_base' });
  if (accionRara.status === 400 && accionRara.body.codigo === 'accion_desconocida') {
    ok('una acción inventada devuelve 400 accion_desconocida');
  } else mal('acción desconocida mal manejada', accionRara);

  // ── 2. info_complejo ────────────────────────────────────────────────────────
  const info = await llamar({ accion: 'info_complejo' });
  if (info.status !== 200) mal('info_complejo falló', info);
  else if (!Array.isArray(info.body.canchas) || !info.body.canchas.length) {
    mal('info_complejo no trajo canchas', info.body);
  } else if (info.body.minutosExpiracionPendiente == null || info.body.horasMinimasCancelacion == null) {
    mal('info_complejo no trae las reglas de operación', info.body);
  } else {
    ok(`info_complejo: ${info.body.canchas.length} canchas, seña ${info.body.senaMinimaPorcentaje}%, vence a los ${info.body.minutosExpiracionPendiente} min`);
  }

  const cancha = info.body.canchas?.[0];

  // ── 3. disponibilidad ───────────────────────────────────────────────────────
  const disp = await llamar({ accion: 'disponibilidad', fecha: FECHA });
  const libres = disp.body.dias?.[0]?.canchas?.find((c) => c.id === cancha?.id)?.libres ?? [];
  if (disp.status !== 200 || !disp.body.dias?.length) mal('disponibilidad falló', disp);
  else if (!libres.length) mal('no hay ningún horario libre en una fecha a 60 días');
  else if (libres[0].sena == null) mal('disponibilidad no devuelve la seña calculada', libres[0]);
  else ok(`disponibilidad: ${libres.length} horarios libres, el primero a ${libres[0].precio} (seña ${libres[0].sena})`);

  const rango = await llamar({ accion: 'disponibilidad', fecha: FECHA, fechaHasta: FECHA.slice(0, 8) + '99' });
  if (rango.status === 422) ok('un rango inválido devuelve 422');
  else mal('rango inválido no rechazado', rango);

  const fechaMala = await llamar({ accion: 'disponibilidad', fecha: 'mañana' });
  if (fechaMala.status === 422 && fechaMala.body.codigo === 'fecha_invalida') ok('fecha no ISO devuelve 422 fecha_invalida');
  else mal('fecha inválida mal manejada', fechaMala);

  // Así manda un tool de n8n los parámetros que el modelo dejó vacíos: no los
  // omite, los manda en blanco. Esto devolvía 422 "Fecha inválida" sobre una
  // consulta perfectamente válida, y el agente terminaba contestando de memoria.
  const vacios = await llamar({
    accion: 'disponibilidad', fecha: FECHA, fechaHasta: '', canchaId: '', hora: '',
  });
  if (vacios.status === 200 && vacios.body.dias?.length === 1) {
    ok('los parámetros opcionales vacíos ("") se ignoran, no rompen la consulta');
  } else mal('fechaHasta/canchaId/hora vacíos rompen disponibilidad', vacios);

  // El modelo no siempre escribe ISO prolijo. Todas estas son el mismo día, y
  // se arman a partir del `hoy` del servidor: una fecha fija se volvería pasado
  // mañana y el test fallaría por una razón que no tiene que ver con lo que mide.
  const [aa, mm, dd] = (disp.body.hoy ?? '').split('-');
  const formatos = [`${aa}-${Number(mm)}-${Number(dd)}`, `${dd}/${mm}/${aa}`, `${disp.body.hoy}T21:00:00.000Z`];
  const leidas = [];
  for (const f of formatos) {
    const r = await llamar({ accion: 'disponibilidad', fecha: f });
    leidas.push(r.body?.desde ?? `✕ ${r.status} ${r.body?.codigo ?? ''}`);
  }
  if (leidas.every((d) => d === disp.body.hoy)) ok(`fechas en ${formatos.length} formatos distintos se leen igual`);
  else mal('formatos de fecha no normalizados', { formatos, leidas });

  const horaSuelta = await llamar({ accion: 'disponibilidad', fecha: FECHA, hora: '20' });
  if (horaSuelta.status === 200 || horaSuelta.body.codigo === 'hora_no_habilitada') {
    ok('una hora sin minutos ("20") se lee como 20:00');
  } else mal('hora sin minutos mal manejada', horaSuelta);

  const horaMala = await llamar({ accion: 'disponibilidad', fecha: FECHA, hora: 'a la tarde' });
  if (horaMala.status === 422 && horaMala.body.codigo === 'hora_invalida') ok('una hora que no es hora sigue dando 422');
  else mal('hora inválida mal manejada', horaMala);

  // Un día que ya pasó no tiene disponibilidad, tiene historia. Antes esto
  // devolvía 200 con la grilla entera libre: el bot ofrecía turnos en 2024.
  const anteayer = await llamar({ accion: 'disponibilidad', fecha: '2024-04-27' });
  if (anteayer.status === 422 && anteayer.body.codigo === 'fecha_pasada' && anteayer.body.hoy) {
    ok(`una fecha del pasado devuelve 422 fecha_pasada y el hoy real (${anteayer.body.hoy})`);
  } else mal('una fecha pasada no se rechazó', anteayer);

  // `hoy` tiene que viajar SIEMPRE: es lo que el modelo usa para no inventar.
  if (disp.body.hoy && disp.body.totalLibres != null) ok(`la respuesta trae hoy=${disp.body.hoy} y totalLibres`);
  else mal('disponibilidad no devuelve hoy/totalLibres', disp.body);

  const horaRara = await llamar({ accion: 'disponibilidad', hora: '04:30' });
  if (horaRara.status === 422 && horaRara.body.codigo === 'hora_no_habilitada' && horaRara.body.horariosPublicados?.length) {
    ok(`una hora que el complejo no abre devuelve los ${horaRara.body.horariosPublicados.length} horarios publicados`);
  } else mal('hora no habilitada mal manejada', horaRara);

  // El id de cancha se le pierde al agente entre un mensaje y el siguiente
  // —la memoria guarda la charla, no las respuestas de las herramientas— así
  // que la cancha tiene que poder resolverse por nombre. Sin esto, el bot
  // manda `cancha_1` porque escribió "Cancha 1", y la reserva muere en un 404.
  const porNombre = await llamar({ accion: 'disponibilidad', fecha: FECHA, cancha: cancha.nombre });
  const unaSola = porNombre.body.dias?.[0]?.canchas ?? [];
  if (porNombre.status === 200 && unaSola.length === 1 && unaSola[0].id === cancha.id) {
    ok(`la cancha se resuelve por nombre ("${cancha.nombre}")`);
  } else mal('no resolvió la cancha por nombre', porNombre);

  const numero = cancha.nombre.match(/\d+/)?.[0];
  if (numero) {
    const inventado = await llamar({ accion: 'disponibilidad', fecha: FECHA, canchaId: `cancha_${numero}` });
    const rescatada = inventado.body.dias?.[0]?.canchas ?? [];
    if (inventado.status === 200 && rescatada.length === 1 && rescatada[0].id === cancha.id) {
      ok(`un id inventado por el modelo ("cancha_${numero}") se rescata por el número`);
    } else mal('no rescató el id inventado', inventado);
  }

  const canchaFantasma = await llamar({ accion: 'disponibilidad', fecha: FECHA, canchaId: 'cancha_zzzz9999' });
  if (canchaFantasma.status === 404 && canchaFantasma.body.canchas?.length) {
    ok(`una cancha que no existe devuelve las ${canchaFantasma.body.canchas.length} reales con sus ids`);
  } else mal('una cancha inexistente no devolvió la lista para corregirse', canchaFantasma);

  const hora = libres[0]?.hora;

  // ── 4. reservar ─────────────────────────────────────────────────────────────
  const reserva = await llamar({
    accion: 'reservar', fecha: FECHA, hora, canchaId: cancha.id,
    nombre: 'Jugador De Prueba', telefono: TEL,
  });
  if (reserva.status !== 201) { mal('reservar falló', reserva); throw new Error('sin turno no se puede seguir'); }
  creados.push(reserva.body.bookingId);

  if (reserva.body.estado !== 'pendiente') mal('el turno no nació pendiente', reserva.body);
  else if (!/^[A-HJ-NP-Z2-9]{6}$/.test(reserva.body.codigo ?? '')) mal('el código no tiene el formato esperado', reserva.body);
  else if (!reserva.body.expiraAt) mal('el turno pendiente nació sin vencimiento', reserva.body);
  else ok(`reservar: ${reserva.body.codigo}, pendiente, vence en ${reserva.body.expiraEn} min`);

  // El CRM tiene que quedarse con el cliente nuevo.
  const { data: clienteNuevo } = await admin
    .from('clients').select('id, nombre').eq('tenant_id', tenant.id)
    .eq('telefono_clave', TEL.slice(-10)).maybeSingle();
  if (clienteNuevo) ok(`el cliente quedó en el CRM: ${clienteNuevo.nombre}`);
  else mal('reservar no dio de alta al cliente');

  // ── 5. el pendiente ocupa el slot ───────────────────────────────────────────
  const choque = await llamar({
    accion: 'reservar', fecha: FECHA, hora, canchaId: cancha.id,
    nombre: 'Se cuela', telefono: '5492219000001',
  });
  if (choque.status === 409 && choque.body.codigo === 'slot_ocupado') ok('el pendiente bloquea el slot (409 slot_ocupado)');
  else mal('se pudo reservar encima de un pendiente', choque);

  // ── 5b. un turno fijo (nunca es una fila de `bookings`) también bloquea ────
  // Pasó de verdad: el bot ofreció y reservó libre un horario que la grilla
  // del dueño ya mostraba tomado por un equipo fijo. Se usa el ÚLTIMO horario
  // libre a propósito: los índices bajos (`libres[0]`, `libres[1]`,
  // `libres[2]`) ya los reservan otros bloques de este archivo más abajo.
  const horaFijo = libres[libres.length - 1]?.hora;
  if (!horaFijo) {
    mal('no había un segundo horario libre para probar el turno fijo');
  } else {
    const diaSemana = ((new Date(`${FECHA}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
    const { data: fijo, error: errFijo } = await admin
      .from('turnos_fijos')
      .insert({
        id: 'tf_test_' + randomBytes(6).toString('hex'),
        tenant_id: tenant.id,
        cancha_id: cancha.id,
        dia_semana: diaSemana,
        hora: horaFijo,
        equipo_nombre: 'Equipo de prueba',
        activo: true,
      })
      .select('id')
      .single();

    if (errFijo) {
      mal('no se pudo crear el turno fijo de prueba', errFijo.message);
    } else {
      fijoCreadoId = fijo.id;

      const dispConFijo = await llamar({ accion: 'disponibilidad', fecha: FECHA, canchaId: cancha.id });
      const libresConFijo = dispConFijo.body.dias?.[0]?.canchas?.[0]?.libres ?? [];
      if (!libresConFijo.some((s) => s.hora === horaFijo)) {
        ok('disponibilidad NO ofrece el horario de un turno fijo aunque no tenga booking real');
      } else mal('disponibilidad ofreció libre el horario de un turno fijo', dispConFijo.body);

      const choqueFijo = await llamar({
        accion: 'reservar', fecha: FECHA, hora: horaFijo, canchaId: cancha.id,
        nombre: 'Se cuela sobre el fijo', telefono: '5492219000004',
      });
      if (choqueFijo.status === 409 && choqueFijo.body.codigo === 'slot_ocupado') {
        ok('reservar sobre el horario de un turno fijo devuelve 409 slot_ocupado');
      } else mal('se pudo reservar encima de un turno fijo', choqueFijo);
    }
  }

  const pasado = await llamar({
    accion: 'reservar', fecha: '2020-01-01', hora, canchaId: cancha.id, nombre: 'Viajero', telefono: TEL,
  });
  if (pasado.status === 422 && pasado.body.codigo === 'fecha_pasada') ok('no se puede reservar en el pasado');
  else mal('aceptó una fecha pasada', pasado);

  // Reservar sin el id, solo con el nombre: es lo que le queda al agente dos
  // mensajes después de haber consultado la disponibilidad.
  const horaLibre = libres[2]?.hora;
  const sinId = await llamar({
    accion: 'reservar', fecha: FECHA, hora: horaLibre, cancha: cancha.nombre,
    nombre: 'Jugador De Prueba', telefono: TEL,
  });
  if (sinId.status === 201 && sinId.body.cancha === cancha.nombre) {
    creados.push(sinId.body.bookingId);
    ok(`se puede reservar mandando solo el nombre de la cancha (${sinId.body.codigo})`);
  } else mal('no se pudo reservar por nombre de cancha', sinId);

  const canchaRota = await llamar({
    accion: 'reservar', fecha: FECHA, hora: horaLibre, canchaId: 'no_existe_esta',
    nombre: 'Jugador De Prueba', telefono: TEL,
  });
  if (canchaRota.status === 404 && canchaRota.body.codigo === 'cancha_inexistente' && canchaRota.body.canchas?.length) {
    ok('reservar con una cancha inexistente devuelve la lista con los ids para reintentar');
  } else mal('reservar no explicó qué canchas hay', canchaRota);

  // ── 6. estado_sesion ────────────────────────────────────────────────────────
  const sesion = await llamar({ accion: 'estado_sesion', telefono: TEL, codigo: reserva.body.codigo });
  if (sesion.status !== 200) mal('estado_sesion falló', sesion);
  else if (sesion.body.pausado !== false) mal('la sesión nace pausada', sesion.body);
  else if (!sesion.body.pendientes?.length) mal('estado_sesion no ve el turno pendiente', sesion.body);
  else if (sesion.body.pendientes[0].codigo !== reserva.body.codigo) mal('estado_sesion trajo otro turno', sesion.body.pendientes);
  else ok(`estado_sesion: cliente ${sesion.body.cliente?.nombre ?? '—'}, ${sesion.body.pendientes.length} pendiente, hoy ${sesion.body.hoy}`);

  // ── 7. datos_de_pago ────────────────────────────────────────────────────────
  const pago = await llamar({ accion: 'datos_de_pago', bookingId: reserva.body.bookingId, telefono: TEL });
  if (pago.status === 200) {
    if (pago.body.monto > 0) ok(`datos_de_pago: seña ${pago.body.monto} (${pago.body.porcentaje}%)`);
    else mal('datos_de_pago devolvió monto 0', pago.body);
  } else if (pago.body.codigo === 'sin_datos_de_pago') {
    ok('datos_de_pago avisa que falta cargar alias/CBU (el complejo no los tiene)');
  } else mal('datos_de_pago falló', pago);

  // ── 8. resolución por código, con OTRO teléfono ─────────────────────────────
  // Es el caso normal: el teléfono de la web es opcional y casi nunca es el
  // WhatsApp real. El turno tiene que adoptar el número desde el que escriben.
  const OTRO_TEL = '5492219' + String(Date.now() + 12345).slice(-6);
  const porCodigo = await llamar({ accion: 'mis_turnos', telefono: OTRO_TEL, codigo: reserva.body.codigo });
  if (porCodigo.status === 200 && porCodigo.body.pendientes?.length === 1) {
    ok('resuelve el turno por código aunque el WhatsApp sea otro');
    const { data: adoptado } = await admin
      .from('bookings').select('cliente_telefono_clave, notas')
      .eq('tenant_id', tenant.id).eq('id', reserva.body.bookingId).maybeSingle();
    if (adoptado?.cliente_telefono_clave === OTRO_TEL.slice(-10)) ok('el turno adoptó el número del chat');
    else mal('el turno no adoptó el número', adoptado);
  } else mal('no resolvió por código', porCodigo);

  // ── 9. cancelar: pertenencia y reglas ───────────────────────────────────────
  const ajeno = await llamar({ accion: 'cancelar_turno', bookingId: reserva.body.bookingId, telefono: '5491100000000' });
  if (ajeno.status === 403 && ajeno.body.codigo === 'no_es_tuyo') ok('no se puede cancelar el turno de otro (403)');
  else mal('canceló un turno ajeno', ajeno);

  const inventado = await llamar({ accion: 'cancelar_turno', bookingId: 'bkg_noexiste', telefono: OTRO_TEL });
  if (inventado.status === 403 && inventado.body.codigo === 'no_es_tuyo') {
    ok('un bookingId inventado da el mismo error que uno ajeno (no filtra si existe)');
  } else mal('un id inexistente devolvió otra cosa', inventado);

  // ── 10. confirmar sin comprobante subido ────────────────────────────────────
  const sinArchivo = await llamar({
    accion: 'confirmar_reserva',
    bookingId: reserva.body.bookingId,
    comprobantePath: `${tenant.id}/2026-08/${reserva.body.bookingId}/inventado.jpg`,
    monto: 1000,
  });
  if (sinArchivo.status === 422 && sinArchivo.body.codigo === 'comprobante_no_subido') {
    ok('no confirma si el comprobante no está realmente en Storage');
  } else mal('confirmó sin comprobante', sinArchivo);

  const pathAjeno = await llamar({
    accion: 'confirmar_reserva', bookingId: reserva.body.bookingId,
    comprobantePath: '00000000-0000-0000-0000-000000000000/x/y.jpg', monto: 1000,
  });
  if (pathAjeno.status === 422 && pathAjeno.body.codigo === 'comprobante_invalido') {
    ok('rechaza un path fuera de la carpeta del complejo');
  } else mal('aceptó un path de otro tenant', pathAjeno);

  // ── 11. preparar_comprobante: mime y tamaño ─────────────────────────────────
  const mimeMalo = await llamar({
    accion: 'preparar_comprobante', telefono: OTRO_TEL, codigo: reserva.body.codigo,
    mime: 'application/x-msdownload', tamano: 1000,
  });
  if (mimeMalo.status === 422 && mimeMalo.body.codigo === 'mime_no_soportado') ok('rechaza un archivo que no es imagen ni PDF');
  else mal('aceptó un mime cualquiera', mimeMalo);

  const grande = await llamar({
    accion: 'preparar_comprobante', telefono: OTRO_TEL, codigo: reserva.body.codigo,
    mime: 'image/jpeg', tamano: 50 * 1024 * 1024,
  });
  if (grande.status === 422 && grande.body.codigo === 'archivo_grande') ok('rechaza un archivo de 50 MB');
  else mal('aceptó un archivo enorme', grande);

  const firma = await llamar({
    accion: 'preparar_comprobante', telefono: OTRO_TEL, codigo: reserva.body.codigo,
    mime: 'image/jpeg', tamano: 180_000, refExterna: `wa:test-${Date.now()}`,
  });
  if (firma.status === 200 && firma.body.uploadUrl && firma.body.path?.startsWith(`${tenant.id}/`)) {
    ok('preparar_comprobante firma una subida dentro de la carpeta del complejo');
  } else mal('preparar_comprobante falló', firma);

  // ── 12. el circuito completo del comprobante ────────────────────────────────
  if (firma.body.uploadUrl) {
    const subida = await fetch(firma.body.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      // Un JPEG mínimo válido. No importa el contenido: importa que exista.
      body: Buffer.from('ffd8ffe000104a46494600010100000100010000ffd9', 'hex'),
    });
    if (!subida.ok) mal(`la subida firmada devolvió ${subida.status}`);
    else {
      ok('el archivo sube con la URL firmada, sin credenciales');

      const ref = `wa:test-${Date.now()}`;
      const confirmado = await llamar({
        accion: 'confirmar_reserva', bookingId: reserva.body.bookingId,
        comprobantePath: firma.body.path, monto: 12345, refExterna: ref,
      });
      if (confirmado.status === 200 && confirmado.body.estado === 'reservado') {
        ok('confirmar_reserva pasa el turno a confirmado');
      } else mal('confirmar_reserva falló', confirmado);

      const { data: pagos } = await admin
        .from('payments').select('monto, validado, comprobante_path, ref_externa')
        .eq('tenant_id', tenant.id).eq('booking_id', reserva.body.bookingId);
      if (pagos?.length === 1 && pagos[0].validado === false) ok('el pago quedó registrado SIN validar');
      else mal('el pago no quedó como se esperaba', pagos);

      // Reenviar el mismo mensaje no puede duplicar la plata.
      const repetido = await llamar({
        accion: 'confirmar_reserva', bookingId: reserva.body.bookingId,
        comprobantePath: firma.body.path, monto: 12345, refExterna: ref,
      });
      const { data: pagos2 } = await admin
        .from('payments').select('id').eq('tenant_id', tenant.id).eq('booking_id', reserva.body.bookingId);
      if (pagos2?.length === 1 && repetido.body.ok) ok('el mismo comprobante dos veces NO duplica el pago');
      else mal('el reenvío duplicó el pago', { pagos: pagos2?.length, repetido: repetido.body });

      const { data: turnoFinal } = await admin
        .from('bookings').select('estado, expira_at')
        .eq('tenant_id', tenant.id).eq('id', reserva.body.bookingId).maybeSingle();
      if (turnoFinal?.estado === 'reservado' && turnoFinal.expira_at === null) {
        ok('el turno confirmado ya no vence');
      } else mal('el turno confirmado conserva vencimiento', turnoFinal);

      await admin.storage.from('comprobantes').remove([firma.body.path]);
    }
  }

  // ── 13. expiración ──────────────────────────────────────────────────────────
  const otraHora = libres[1]?.hora;
  if (otraHora) {
    const r2 = await llamar({
      accion: 'reservar', fecha: FECHA, hora: otraHora, canchaId: cancha.id,
      nombre: 'Se le vence', telefono: '5492219000002',
    });
    if (r2.status === 201) {
      creados.push(r2.body.bookingId);
      // Se lo vence a mano, que es lo mismo que hace el cron cinco minutos más tarde.
      await admin.from('bookings')
        .update({ expira_at: new Date(Date.now() - 60_000).toISOString() })
        .eq('tenant_id', tenant.id).eq('id', r2.body.bookingId);

      const { data: cuantos } = await admin.rpc('expirar_pendientes', { p_tenant: tenant.id });
      const { data: vencido } = await admin.from('bookings')
        .select('estado, motivo_cancelacion').eq('tenant_id', tenant.id).eq('id', r2.body.bookingId).maybeSingle();

      if (vencido?.estado === 'cancelado' && vencido.motivo_cancelacion === 'vencimiento') {
        ok(`expirar_pendientes canceló ${cuantos} turno/s vencido/s`);
      } else mal('el pendiente vencido no se canceló', vencido);

      // Y el slot tiene que quedar libre para el que llegue después.
      const r3 = await llamar({
        accion: 'reservar', fecha: FECHA, hora: otraHora, canchaId: cancha.id,
        nombre: 'Llegó después', telefono: '5492219000003',
      });
      if (r3.status === 201) { creados.push(r3.body.bookingId); ok('el horario vencido vuelve a estar libre'); }
      else mal('el slot siguió ocupado después de vencer', r3);

      // Y confirmar el vencido ahora tiene que decir que se lo tomaron.
      const tarde = await llamar({ accion: 'confirmar_reserva', bookingId: r2.body.bookingId, comprobantePath: 'x', monto: 1 });
      if (tarde.body.codigo === 'comprobante_invalido' || tarde.body.codigo === 'slot_tomado_con_pago') {
        ok('confirmar un turno vencido y retomado no lo revive');
      } else mal('confirmó un turno cuyo slot ya se había ido', tarde);
    } else mal('no se pudo crear el segundo turno de prueba', r2);
  }

  // ── 14. disponibilidad configurable: día cerrado + anticipación mínima ─────
  // Hasta acá todos los tests de arriba corrieron SIN `disponibilidad`
  // configurada — es la prueba en sí de que un tenant sin migrar sigue
  // aceptando exactamente las mismas horas que antes (regresión cero).
  const { data: cfgRow } = await admin
    .from('tenant_config').select('operacion').eq('tenant_id', tenant.id).single();
  operacionOriginal = cfgRow.operacion;

  const diaSemanaFecha = ((new Date(`${FECHA}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const slotsGlobales = info.body.slots ?? [];
  const dispConDiaCerrado = Object.fromEntries(
    ['1', '2', '3', '4', '5', '6', '7'].map((d) => [d, d === String(diaSemanaFecha) ? [] : slotsGlobales])
  );
  await admin.from('tenant_config')
    .update({ operacion: { ...operacionOriginal, disponibilidad: dispConDiaCerrado } })
    .eq('tenant_id', tenant.id);

  const diaCerrado = await llamar({
    accion: 'reservar', fecha: FECHA, hora: slotsGlobales[0], canchaId: cancha.id,
    nombre: 'Día cerrado', telefono: '5492219000005',
  });
  if (diaCerrado.status === 422 && diaCerrado.body.codigo === 'hora_no_habilitada') {
    ok('reservar rechaza un día de semana marcado sin horas en la disponibilidad configurada');
  } else mal('no rechazó un día de semana cerrado', diaCerrado);

  // Vuelve a abrir el día (disponibilidad = de siempre) y ahora prueba la
  // anticipación mínima: FECHA está a ~60 días, con 999999 horas pedidas
  // cualquier horario válido tiene que rechazarse igual.
  await admin.from('tenant_config')
    .update({ operacion: { ...operacionOriginal, anticipacionMinHoras: 999999 } })
    .eq('tenant_id', tenant.id);

  const pocaAnticipacion = await llamar({
    accion: 'reservar', fecha: FECHA, hora: slotsGlobales[1] ?? slotsGlobales[0], canchaId: cancha.id,
    nombre: 'Poca antelación', telefono: '5492219000006',
  });
  if (pocaAnticipacion.status === 422 && pocaAnticipacion.body.codigo === 'anticipacion_insuficiente') {
    ok('reservar rechaza si falta la anticipación mínima configurada');
  } else mal('no rechazó por anticipación insuficiente', pocaAnticipacion);

  await admin.from('tenant_config').update({ operacion: operacionOriginal }).eq('tenant_id', tenant.id);
  ok('config de operación restaurada a como estaba');

  // ── 14b. muteados: mutear_bot / desmutear_bot / estado_sesion ──────────────
  const { error: errMute } = await admin.rpc('mutear_bot', {
    p_tenant: tenant.id, p_telefono: TEL, p_nombre: 'Prueba Muteado',
  });
  if (!errMute) ok('mutear_bot corta al bot para el teléfono de prueba');
  else mal('mutear_bot falló', errMute.message);

  const sesionMuteada = await llamar({ accion: 'estado_sesion', telefono: TEL });
  if (sesionMuteada.body.muteado === true) ok('estado_sesion refleja el mute (muteado: true)');
  else mal('el mute no se reflejó en estado_sesion', sesionMuteada.body);

  const { error: errDesmute } = await admin.rpc('desmutear_bot', {
    p_tenant: tenant.id, p_telefono_clave: TEL.slice(-10),
  });
  if (!errDesmute) ok('desmutear_bot reactiva al teléfono');
  else mal('desmutear_bot falló', errDesmute.message);

  const sesionDesmuteada = await llamar({ accion: 'estado_sesion', telefono: TEL });
  if (sesionDesmuteada.body.muteado === false) ok('estado_sesion refleja el desmute (muteado: false)');
  else mal('el desmute no se reflejó', sesionDesmuteada.body);

  // ── 15. derivar ─────────────────────────────────────────────────────────────
  const derivacion = await llamar({
    accion: 'derivar', telefono: TEL, nombre: 'Jugador De Prueba', motivo: 'Prueba automatizada',
  });
  if (derivacion.status === 200 && derivacion.body.pausadoHasta) ok(`derivar pausa el bot ${derivacion.body.horasPausa} h`);
  else mal('derivar falló', derivacion);

  const pausada = await llamar({ accion: 'estado_sesion', telefono: TEL });
  if (pausada.body.pausado === true) ok('estado_sesion refleja la pausa');
  else mal('la pausa no se reflejó', pausada.body);

  await admin.rpc('reactivar_bot', { p_tenant: tenant.id, p_telefono_clave: TEL.slice(-10) });
  const reactivada = await llamar({ accion: 'estado_sesion', telefono: TEL });
  if (reactivada.body.pausado === false && reactivada.body.session_suffix !== pausada.body.session_suffix) {
    ok(`reactivar_bot despierta el bot y cambia la sesión (${pausada.body.session_suffix} → ${reactivada.body.session_suffix})`);
  } else mal('reactivar_bot no funcionó como se esperaba', reactivada.body);

} catch (err) {
  mal('excepción: ' + (err?.message ?? String(err)));
} finally {
  await limpiar();
  ok('datos de prueba borrados y clave revocada');
}

console.log(fallas ? `\n  ${fallas} falla/s.\n` : '\n  Todo en verde.\n');
process.exit(fallas ? 1 : 0);
