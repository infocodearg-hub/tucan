import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { obtenerSesion, STORAGE_KEY } from './sesionPrueba.mjs';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = process.env.OUT || 'C:/Users/Rodrigo/AppData/Local/Temp/claude/c--Users-Rodrigo-Desktop-CODEARG-PAGINAS-WEBS-sistema-de-canchas/d8acc843-94fc-483a-9c34-f0277ed0d1a9/scratchpad/shots';

const VIEWPORTS = (process.env.VIEWPORTS || '390x844,768x1024,1440x900')
  .split(',')
  .map((v) => {
    const [w, h] = v.split('x').map(Number);
    return { width: w, height: h };
  });

// 'light' (el oficial) y 'dark' (el "Deep Pitch" de siempre) — ver
// src/theme/ThemeProvider.jsx. Mismo localStorage que usa el toggle real.
const THEMES = (process.env.THEME || 'light').split(',');

// `vista_publica` ya no es un tab del panel: vive en /reserva/<slug> como página
// aparte y se captura por separado.
const TABS = (process.env.TABS || 'grilla,turnos_fijos,cantina,clientes,reportes,configuracion').split(',');

// Sesión real de Supabase. No alcanza con un token inventado: el AuthProvider
// resuelve la membresía contra la base y RLS filtra por el usuario del token.
const { session } = await obtenerSesion();

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});

const errors = [];
const page = await browser.newPage();
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[console] ${m.text()}`);
});
page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));

// Inyecta la sesion y el tema ANTES de que cargue el bundle, para saltar
// LoginScreen y no depender del toggle real en cada corrida. `networkidle0`
// no alcanza como espera: despues del login la app todavia tiene que traer
// los datos del complejo, por eso cada goto suma una pausa.
async function inyectarSesionYTema(tema) {
  await page.evaluateOnNewDocument(
    (key, ses, temaKey, tema) => {
      localStorage.setItem(key, JSON.stringify(ses));
      localStorage.setItem(temaKey, tema);
    },
    STORAGE_KEY,
    session,
    'tucan:ui:theme',
    tema
  );
}

for (const tema of THEMES) {
for (const vp of VIEWPORTS) {
  await page.setViewport({ ...vp, deviceScaleFactor: 2 });
  await inyectarSesionYTema(tema);
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 1500));

  for (const tab of TABS) {
    // Click sidebar (desktop) o bottom-nav (mobile) segun exista
    const clicked = await page.evaluate((t) => {
      const el = document.querySelector(`#nav-${t}`);
      if (el) {
        el.click();
        return true;
      }
      const btns = [...document.querySelectorAll('.bottom-nav-item')];
      const map = { grilla: 'Grilla', turnos_fijos: 'Fijos', cantina: 'Cantina', clientes: 'Clientes', reportes: 'Reportes' };
      const label = map[t];
      const b = btns.find((x) => x.textContent.trim() === label);
      if (b) {
        b.click();
        return true;
      }
      return false;
    }, tab);
    if (!clicked) continue;
    await new Promise((r) => setTimeout(r, 450));

    const file = path.join(OUT, `${tema}-${vp.width}-${tab}.png`);
    await page.screenshot({ path: file, fullPage: true });
  }
}
} // fin for (tema)

// Overflow horizontal check — un solo tema alcanza, no es donde vive el riesgo
await page.setViewport({ width: 320, height: 720, deviceScaleFactor: 2 });
await inyectarSesionYTema(THEMES[0]);
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));
const overflow = await page.evaluate(() => {
  const bad = [];
  const docW = document.documentElement.clientWidth;
  for (const el of document.querySelectorAll('*')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > docW + 1 || r.left < -1)) {
      bad.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && String(el.className).slice(0, 60)) || '',
        text: (el.textContent || '').trim().slice(0, 40),
        right: Math.round(r.right),
        left: Math.round(r.left),
      });
    }
  }
  return { docW, scrollW: document.documentElement.scrollWidth, bad: bad.slice(0, 25) };
});
await page.screenshot({ path: path.join(OUT, `${THEMES[0]}-320-grilla.png`), fullPage: true });

console.log(JSON.stringify({ errors: [...new Set(errors)].slice(0, 20), overflow }, null, 2));
await browser.close();
