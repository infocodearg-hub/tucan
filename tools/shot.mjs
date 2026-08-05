import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.BASE || 'http://localhost:5173';
const OUT = process.env.OUT || 'C:/Users/Rodrigo/AppData/Local/Temp/claude/c--Users-Rodrigo-Desktop-CODEARG-PAGINAS-WEBS-sistema-de-canchas/d8acc843-94fc-483a-9c34-f0277ed0d1a9/scratchpad/shots';

const VIEWPORTS = (process.env.VIEWPORTS || '390x844,768x1024,1440x900')
  .split(',')
  .map((v) => {
    const [w, h] = v.split('x').map(Number);
    return { width: w, height: h };
  });

const TABS = (process.env.TABS || 'grilla,turnos_fijos,cantina,clientes,reportes,configuracion,vista_publica').split(',');

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

// Inyecta sesion activa ANTES de que cargue el bundle, para saltar LoginScreen
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('tucan_session_v1', JSON.stringify({ loggedIn: true, ts: Date.now() }));
});

for (const vp of VIEWPORTS) {
  await page.setViewport({ ...vp, deviceScaleFactor: 2 });
  await page.goto(BASE, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

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

    const file = path.join(OUT, `${vp.width}-${tab}.png`);
    await page.screenshot({ path: file, fullPage: true });
  }
}

// Overflow horizontal check
await page.setViewport({ width: 320, height: 720, deviceScaleFactor: 2 });
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
await page.screenshot({ path: path.join(OUT, '320-grilla.png'), fullPage: true });

console.log(JSON.stringify({ errors: [...new Set(errors)].slice(0, 20), overflow }, null, 2));
await browser.close();
