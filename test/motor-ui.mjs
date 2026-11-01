// Motor v4.1 en la app (modo local): al registrar el día con «Lo intenso pasa al miércoles», el miércoles recibe la sesión.
// sh test/serve.sh &  node test/motor-ui.mjs <fixture.json> <outdir>
// El fixture necesita una fase con Fuerza A el martes (F3-F4) y un descanso el domingo; el partido del lunes lo agrega la prueba.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-motor'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const MON = '2026-11-02', TUE = '2026-11-03', WED = '2026-11-04';
d.sessions = (d.sessions || []).filter(s => s.date < MON).concat([{ id: 's-partido-lunes', date: MON, type: 'partido', done: true, minutes: 90, rpe: 8, source: 'app' }]);
d.checkins = []; d.molestias = [];
if (d.settings) d.settings.plan = {};
const store = {};
for (const [col, v] of Object.entries(d)) {
  if (Array.isArray(v)) { store[col] = {}; v.forEach(doc => { const { id, ...rest } = doc; store[col][id] = rest; }); }
  else if (v && typeof v === 'object') { const { id, ...rest } = v; store[col] = { main: rest }; }
}
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const local = () => page.evaluate(() => JSON.parse(localStorage.getItem('improve-local-v1') || '{}'));
const shot = (n) => page.screenshot({ path: outDir + '/' + n + '.png', fullPage: true });
try {
  // Martes: tras el partido, lo intenso pasa al miércoles
  await page.clock.setFixedTime(new Date(TUE + 'T09:00:00-03:00'));
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await page.evaluate(() => { location.hash = '#entreno'; });
  await page.waitForSelector('.day-sec.is-today', { timeout: 15000 });
  await page.waitForTimeout(600);
  const tueText = await page.locator('.day-sec.is-today').innerText();
  ok(/Lo intenso pasa al miércoles/.test(tueText), 'el martes no avisa que lo intenso pasa al miércoles');
  await shot('01-martes');
  // «Hecha tal cual» de una sesión del martes → congela martes y miércoles
  const btn = page.locator('.day-sec.is-today [data-act="session"]').first();
  await btn.click();
  await page.locator('.sheet [data-act="quick-done"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('.sheet [data-act="qd-save"]').first().click();
  await page.waitForTimeout(700);
  const plan = ((await local()).settings || {}).main ? (await local()).settings.main.plan || {} : {};
  ok(plan[TUE] && !plan[TUE].auto && plan[TUE].swapTo === WED, 'el martes no quedó fijo con el aviso del movimiento: ' + JSON.stringify(plan[TUE]));
  ok(plan[WED] && plan[WED].auto && (plan[WED].types || []).includes('fuerzaA'), 'el miércoles no recibe la Fuerza A: ' + JSON.stringify(plan[WED]));
  // Miércoles: la sesión movida está y es intensa
  await page.clock.setFixedTime(new Date(WED + 'T09:00:00-03:00'));
  await page.reload();
  await page.waitForSelector('.day-sec.is-today', { timeout: 15000 });
  await page.waitForTimeout(600);
  const wedText = await page.locator('.day-sec.is-today').innerText();
  ok(/Recibe la sesión intensa del martes/.test(wedText), 'el miércoles no dice que recibe la sesión del martes');
  ok(/Fuerza A/.test(wedText) && /Golpeo/.test(wedText), 'el miércoles sin Fuerza A o Golpeo: ' + wedText.replace(/\s+/g, ' ').slice(0, 200));
  await shot('02-miercoles');
} catch (e) { fails.push('PASO: ' + e.message.split('\n')[0]); }
await browser.close();
console.log('motor-ui · fallos:', fails.length, '· errores:', errors.length);
fails.concat(errors).slice(0, 20).forEach(f => console.log('  ', f));
process.exit(fails.length || errors.length ? 1 : 0);
