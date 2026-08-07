/**
 * test-e2e.mjs — el camino completo de una cuenta nueva, contra Supabase real.
 *
 * ⚠ DESTRUCTIVO: vacía el complejo del usuario de `.env.local` antes de empezar.
 *   Correr solo contra el proyecto de desarrollo.
 *
 *   npm run dev          (en otra terminal)
 *   node tools/test-e2e.mjs
 *
 * Existe por dos bugs concretos que costaron caro y que no se ven compilando:
 *
 *   1. Al recargar, la app BORRABA la cuenta entera. `hidratar()` marcaba el
 *      estado como sincronizado dentro del efecto de carga, y el efecto de
 *      guardado —que corre después en el mismo commit— todavía veía el estado
 *      vacío del arranque. Comparaba "caché con datos" contra "vacío" y mandaba
 *      los DELETE. No pasaba en la primera carga (no hay caché todavía): pasaba
 *      siempre a partir de la segunda.
 *
 *   2. `App.jsx` abría el modal de turno con `canchaId: 'c1'`, un id heredado de
 *      los datos de demostración. En una cuenta real esa cancha no existe, así
 *      que la base rechazaba el turno por clave foránea.
 *
 * Los dos se veían igual desde afuera: "cargué todo y al recargar no está".
 * Por eso el test mira la BASE, no la pantalla.
 */

import puppeteer from 'puppeteer-core';
import { createClient } from '@supabase/supabase-js';
import { obtenerSesion, STORAGE_KEY, cargarEnv } from './sesionPrueba.mjs';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5173';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

let fallas = 0;
const ok = (t) => console.log('  ✓', t);
const mal = (t) => { console.log('  ✕', t); fallas++; };

// ─── dejar el complejo vacío, como una cuenta recién creada ───────────────────
const env = cargarEnv();
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
await db.auth.signInWithPassword({ email: env.TEST_EMAIL, password: env.TEST_PASSWORD });
const { data: tid } = await db.rpc('current_tenant_id');
if (!tid) { console.error('  ✕ el usuario de prueba no tiene complejo asignado'); process.exit(1); }

await db.from('bookings').delete().neq('id', '');
await db.from('canchas').delete().neq('id', '');
await db.from('tenant_config').update({ complejo: {}, operacion: { slots: [] } }).eq('tenant_id', tid);
console.log('\n  complejo vaciado, arranca como cuenta nueva\n');

const { session } = await obtenerSesion();
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const escrituras = [];
page.on('response', (r) => {
  const m = r.request().method();
  if (!r.url().includes('/rest/v1/') || m === 'GET' || m === 'OPTIONS') return;
  escrituras.push({ metodo: m, url: r.url().split('/rest/v1/')[1], estado: r.status() });
});
const errores = [];
page.on('pageerror', (e) => errores.push('[pageerror] ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errores.push('[console] ' + m.text().slice(0, 160)); });

await page.evaluateOnNewDocument((k, s) => localStorage.setItem(k, JSON.stringify(s)), STORAGE_KEY, session);
await page.goto(BASE, { waitUntil: 'networkidle0' });
await esperar(2500);

const escribir = (sel, v, i = 0) => page.evaluate((s, val, idx) => {
  const el = document.querySelectorAll(s)[idx];
  if (!el) throw new Error('no existe ' + s + '[' + idx + ']');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(el, val);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}, sel, v, i);

const click = async (txt) => {
  const encontrado = await page.evaluate((t) => {
    const b = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().includes(t));
    if (b) { b.click(); return true; }
    return false;
  }, txt);
  if (!encontrado) throw new Error('no encontré el botón: ' + txt);
  await esperar(600);
};

// ─── 1. Wizard de alta ────────────────────────────────────────────────────────
if (!(await page.evaluate(() => /Configurá tu complejo/.test(document.body.innerText)))) {
  mal('una cuenta sin canchas debería mostrar el asistente de alta');
} else ok('cuenta nueva: aparece el asistente de alta');

await escribir('.form-input', 'Complejo E2E');
await click('Siguiente');
await escribir('input[type="number"]', '18000', 0);
await escribir('input[type="number"]', '24000', 1);
await click('Siguiente');
await click('Siguiente');
await click('Terminar y entrar');
await esperar(3500);

if (await page.$('#nav-grilla')) ok('al terminar el alta se entra al panel');
else mal('después del alta no se llegó al panel');

const { data: canchasDB } = await db.from('canchas').select('id, nombre');
if (canchasDB?.length === 1) ok('la cancha quedó guardada en la base');
else mal(`se esperaba 1 cancha en la base, hay ${canchasDB?.length ?? 0}`);

// ─── 2. Crear un turno desde el botón "+ Turno" ───────────────────────────────
// Esta es la puerta por donde entraba el `'c1'` fantasma: el modal abierto sin
// venir de un slot de la grilla.
await click('Turno');
await esperar(800);
await page.evaluate(() => {
  const i = document.querySelector('.modal-content input[type="text"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(i, 'Cliente E2E');
  i.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.evaluate(() => document.querySelector('.modal-content form button[type="submit"]')?.click());
await esperar(3000);

const fallidas = escrituras.filter((e) => e.estado >= 300);
if (fallidas.length) mal(`escrituras rechazadas: ${JSON.stringify(fallidas)}`);
else ok('ninguna escritura rechazada por la base');

const { data: bkDB } = await db.from('bookings').select('id, cancha_id, cliente_nombre');
if (bkDB?.length === 1) ok('el turno quedó guardado en la base');
else mal(`se esperaba 1 turno en la base, hay ${bkDB?.length ?? 0}`);
if (bkDB?.[0] && bkDB[0].cancha_id === canchasDB?.[0]?.id) ok('el turno apunta a una cancha que existe');
else if (bkDB?.[0]) mal(`el turno apunta a "${bkDB[0].cancha_id}", que no es una cancha del complejo`);

// ─── 3. Recargar: NO se puede escribir nada ───────────────────────────────────
// El bug del borrado en cadena aparecía exactamente acá.
escrituras.length = 0;
await page.reload({ waitUntil: 'networkidle0' });
await esperar(4000);

if (escrituras.length === 0) ok('recargar no dispara ninguna escritura');
else mal(`recargar disparó escrituras: ${JSON.stringify(escrituras)}`);

const tras = await page.evaluate(() => ({
  panel: !!document.querySelector('#nav-grilla'),
  turno: /Cliente E2E/.test(document.body.innerText),
}));
if (tras.panel) ok('tras recargar sigue en el panel, no vuelve al alta');
else mal('tras recargar volvió al asistente de alta: los datos se perdieron');
if (tras.turno) ok('el turno sigue visible después de recargar');
else mal('el turno desapareció al recargar');

// ─── 4. Sin caché: el dato tiene que venir de la base ─────────────────────────
await page.evaluate(() => {
  for (const k of Object.keys(localStorage)) if (k.startsWith('tucan:cache:')) localStorage.removeItem(k);
});
await page.reload({ waitUntil: 'networkidle0' });
await esperar(4000);
if (await page.evaluate(() => /Cliente E2E/.test(document.body.innerText))) {
  ok('sobrevive sin caché local: el dato está en Supabase');
} else mal('sin caché local el turno no aparece: no llegó a la base');

// ─── 5. Consola ───────────────────────────────────────────────────────────────
const relevantes = [...new Set(errores)].filter((e) => !/favicon|ResizeObserver/i.test(e));
if (relevantes.length === 0) ok('sin errores de consola');
else mal('errores de consola:\n      ' + relevantes.slice(0, 6).join('\n      '));

await browser.close();
console.log(fallas ? `\n  ${fallas} falla(s).\n` : '\n  Todo en verde.\n');
process.exit(fallas ? 1 : 0);
