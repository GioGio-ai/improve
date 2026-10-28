// Prueba de humo en modo local: node test/smoke.mjs <fixture.json> <outdir>
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
import fs from 'node:fs';
const [fixture, outDir = 'shots'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const d = fixture ? JSON.parse(fs.readFileSync(fixture, 'utf8')) : {};
const store = {};
for (const [col, v] of Object.entries(d)) {
  if (Array.isArray(v)) { store[col] = {}; v.forEach(doc => { const { id, ...rest } = doc; store[col][id] = rest; }); }
  else if (v && typeof v === 'object') { const { id, ...rest } = v; store[col] = { main: rest }; }
}
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
await ctx.addInitScript((s) => { if (!localStorage.getItem('improve-local-v1')) localStorage.setItem('improve-local-v1', s); }, JSON.stringify(store));
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const shot = async (name, full) => { await page.waitForTimeout(450); await page.screenshot({ path: outDir + '/' + name + '.png', fullPage: !!full }); };
await page.goto('http://127.0.0.1:8765/?local=1#hoy');
await page.waitForSelector('.topbar', { timeout: 15000 });
await shot('01-hoy');
await shot('01-hoy-full', true);
for (const v of ['entreno', 'comida', 'progreso', 'perfil', 'coach']) {
  await page.evaluate((h) => { location.hash = h; }, '#' + v);
  await page.waitForTimeout(600);
  await shot('02-' + v + '-full', true);
}
fs.writeFileSync(outDir + '/errors.txt', errors.join('\n'));
console.log('errores:', errors.length); errors.slice(0, 30).forEach(e => console.log(' ', e));
await browser.close();
