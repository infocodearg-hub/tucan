import puppeteer from 'puppeteer-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:5173';

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.setViewport({ width: 1440, height: 1000 });
await page.goto(BASE, { waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));

// localStorage debe tener el estado sembrado
const seeded = await page.evaluate(() => {
  const raw = localStorage.getItem('tucan:state:v1');
  if (!raw) return null;
  const s = JSON.parse(raw);
  return { bookings: s.bookings.length, clients: s.clients.length, products: s.products.length };
});
console.log('seed en localStorage tras primera carga:', JSON.stringify(seeded));

// Click en un slot libre (Cancha 2, 14:00) y completar el modal
await page.screenshot({ path: 'tools/_before.png' });

const clicked = await page.evaluate(() => {
  const slots = [...document.querySelectorAll('.slot-free')];
  if (slots.length === 0) return false;
  slots[0].click();
  return true;
});
console.log('click en slot libre:', clicked);
await new Promise((r) => setTimeout(r, 400));

const modalOpen = await page.evaluate(() => !!document.querySelector('.modal-content'));
console.log('modal abierto:', modalOpen);

if (modalOpen) {
  await page.type('input[placeholder="Ej: Los Pibes FC"]', 'Test Persistencia FC');
  await page.type('input[placeholder="+54 9 351..."]', '3511234567');
  await page.screenshot({ path: 'tools/_modal.png' });

  const submitted = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button[type="submit"]')].find((b) =>
      b.textContent.includes('Confirmar')
    );
    if (!btn) return false;
    btn.click();
    return true;
  });
  console.log('submit del turno:', submitted);
  await new Promise((r) => setTimeout(r, 500));
}

const afterCreate = await page.evaluate(() => {
  const raw = localStorage.getItem('tucan:state:v1');
  const s = JSON.parse(raw);
  return {
    bookings: s.bookings.length,
    tieneTest: s.bookings.some((b) => b.clienteNombre === 'Test Persistencia FC'),
  };
});
console.log('localStorage después de crear:', JSON.stringify(afterCreate));

await page.screenshot({ path: 'tools/_after-create.png' });

// F5
await page.reload({ waitUntil: 'networkidle0' });
await new Promise((r) => setTimeout(r, 500));

const afterReload = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.slot-booked')].map((e) => e.textContent);
  return { visibleEnGrilla: cards.some((t) => t.includes('Test Persistencia FC')) };
});
console.log('turno visible tras F5:', JSON.stringify(afterReload));
await page.screenshot({ path: 'tools/_after-reload.png' });

console.log('errores de consola:', JSON.stringify([...new Set(errors)]));

await browser.close();
