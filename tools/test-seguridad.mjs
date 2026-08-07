/**
 * test-seguridad.mjs — verifica que el aislamiento entre complejos funciona
 * DE VERDAD, contra el proyecto linkeado.
 *
 * No prueba la interfaz: prueba la base. Que un tab no se muestre no protege
 * nada; lo que protege es que la consulta falle. Cada vez que se toque una
 * policy, un `default` de `tenant_id` o un índice único, correr esto:
 *
 *   node tools/test-seguridad.mjs
 *
 * Crea unas filas de prueba y las borra al final. Usa el usuario de `.env.local`
 * (TEST_EMAIL / TEST_PASSWORD). Pensado para el proyecto de desarrollo.
 */

import { createClient } from '@supabase/supabase-js';
import { cargarEnv } from './sesionPrueba.mjs';

const env = cargarEnv();
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;

const ok = (t) => console.log('  ✓', t);
const mal = (t) => { console.log('  ✕', t); process.exitCode = 1; };

// ── 1. Sesión del dueño ───────────────────────────────────────────────────────
const dueno = createClient(url, anon, { auth: { persistSession: false } });
const { data: login, error: errLogin } = await dueno.auth.signInWithPassword({
  email: env.TEST_EMAIL, password: env.TEST_PASSWORD,
});
if (errLogin) { mal('login: ' + errLogin.message); process.exit(1); }
ok('login del dueño');

// ── 2. Escribir sin mandar tenant_id ──────────────────────────────────────────
// El default de la columna es current_tenant_id(): el cliente no elige complejo.
const id = 'can_smoke' + Date.now().toString(36);
const { error: errIns } = await dueno.from('canchas').insert({
  id, nombre: 'Smoke test', deporte: 'futbol5', precio_dia: 1, precio_noche: 2, orden: 99,
});
if (errIns) { mal('insert: ' + errIns.message); process.exit(1); }
ok('insert de cancha (tenant_id resuelto por la base)');

const { data: leida } = await dueno.from('canchas').select('id, tenant_id').eq('id', id).maybeSingle();
if (!leida?.tenant_id) mal('la fila no volvió con tenant_id');
else ok(`tenant_id asignado solo: ${leida.tenant_id.slice(0, 8)}…`);

// ── 3. Un anónimo no puede ver ni escribir nada ───────────────────────────────
// Es la prueba de que la anon key, que viaja en el bundle y cualquiera puede
// copiar, no sirve para leer datos de ningún complejo.
const anonimo = createClient(url, anon, { auth: { persistSession: false } });
const { data: espia } = await anonimo.from('canchas').select('id');
if (espia && espia.length > 0) mal(`un anónimo leyó ${espia.length} cancha/s`);
else ok('un anónimo no lee ninguna cancha');

const { error: errAnon } = await anonimo.from('bookings').insert({
  id: 'bkg_hack', fecha: '2026-08-10', hora: '20:00', cancha_id: id, cliente_nombre: 'Intruso',
});
if (!errAnon) mal('un anónimo pudo crear un turno');
else ok('un anónimo no puede crear turnos (' + (errAnon.code ?? errAnon.message.slice(0, 40)) + ')');

// ── 4. No se puede escribir en otro complejo ──────────────────────────────────
const { error: errCruzado } = await dueno.from('canchas').insert({
  id: 'can_cruzado' + Date.now().toString(36),
  tenant_id: '00000000-0000-0000-0000-000000000000',
  nombre: 'De otro complejo', precio_dia: 1, precio_noche: 1,
});
if (!errCruzado) mal('se pudo insertar con un tenant_id ajeno');
else ok('rechaza tenant_id ajeno (' + (errCruzado.code ?? '') + ')');

// ── 5. Índice único de slot ───────────────────────────────────────────────────
const bk = { fecha: '2026-12-24', hora: '20:00', cancha_id: id, cliente_nombre: 'Doble' };
const r1 = await dueno.from('bookings').insert({ id: 'bkg_a' + Date.now().toString(36), ...bk });
const r2 = await dueno.from('bookings').insert({ id: 'bkg_b' + Date.now().toString(36), ...bk });
if (r1.error) mal('el primer turno falló: ' + r1.error.message);
else if (!r2.error) mal('se pudo reservar dos veces el mismo horario');
else if (r2.error.code !== '23505') mal('el choque dio ' + r2.error.code + ', se esperaba 23505');
else ok('doble reserva del mismo slot rechazada (23505)');

// ── 6. Limpieza ───────────────────────────────────────────────────────────────
await dueno.from('bookings').delete().eq('fecha', '2026-12-24');
await dueno.from('canchas').delete().eq('id', id);
const { data: queda } = await dueno.from('canchas').select('id').eq('id', id);
if (queda?.length) mal('no se pudo limpiar la cancha de prueba');
else ok('datos de prueba borrados');

// ── 7. Edge Function pública, sin ninguna credencial ──────────────────────────
const res = await fetch(`${url}/functions/v1/public-reserva?slug=maracana&fecha=2026-12-24`);
const body = await res.json().catch(() => ({}));
if (!res.ok) mal(`public-reserva devolvió ${res.status}: ${body.error ?? ''}`);
else if (body.complejo?.nombre) ok(`public-reserva responde sin credenciales: "${body.complejo.nombre}"`);
else mal('public-reserva respondió sin datos del complejo');

if (body.pagos || body.complejo?.cbu || body.cbu) mal('la función pública expone datos de cobro');
else ok('no expone alias ni CBU');

// ── 8. Bot sin clave ──────────────────────────────────────────────────────────
const bot = await fetch(`${url}/functions/v1/bot`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accion: 'disponibilidad', fecha: '2026-12-24' }),
});
if (bot.status === 401) ok('el bot rechaza a quien no manda clave (401)');
else mal(`el bot devolvió ${bot.status} sin clave`);

console.log(process.exitCode ? '\n  Hay fallas.\n' : '\n  Todo en verde.\n');
