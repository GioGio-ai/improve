// Capturas de todas las pantallas a 360, 390 y 430 px (deviceScaleFactor 3) para comparar antes/después.
// node test/shots.mjs <fixture.json> <outdir> [anchos=360,390,430] [HH:MM=11:40]
// Modo local (sh test/serve.sh). La hora se fija con page.clock para que «Hoy» tenga pendientes de la mañana.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-all', widthsArg = '360,390,430', hhmm = '11:40'] = process.argv.slice(2);
const SIZES = { 360: 780, 390: 844, 430: 932 };
const widths = widthsArg.split(',').map(Number).filter(w => SIZES[w]);
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const store = {};
for (const [col, v] of Object.entries(d)) {
  if (Array.isArray(v)) { store[col] = {}; v.forEach(doc => { const { id, ...rest } = doc; store[col][id] = rest; }); }
  else if (v && typeof v === 'object') { const { id, ...rest } = v; store[col] = { main: rest }; }
}
const tz = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit' });
const today = tz.format(new Date());
const at = new Date(today + 'T' + hhmm + ':00-03:00');
const BASE = 'http://127.0.0.1:8765/';
const browser = await chromium.launch();
const errors = [];

async function open(w, hash, opts = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: SIZES[w] }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion', reducedMotion: 'reduce' });
  if (!opts.login) await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.clear(); localStorage.setItem('improve-local-v1', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(w + ' ' + hash + ' pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !opts.login) errors.push(w + ' ' + hash + ' console: ' + m.text()); });
  await page.clock.setFixedTime(at);
  await page.goto(BASE + (opts.login ? '' : '?local=1') + hash);
  if (!opts.login) await page.waitForSelector('.topbar, .page-head', { timeout: 15000 });
  await page.waitForTimeout(700);
  return { ctx, page };
}
const click = async (page, sel) => { await page.locator(sel).first().click({ timeout: 6000 }); await page.waitForTimeout(250); };
const go = async (page, hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(700); };

async function run(w) {
  const dir = outDir + '/' + w;
  fs.mkdirSync(dir, { recursive: true });
  const shot = async (page, name, full) => { await page.waitForTimeout(400); await page.screenshot({ path: dir + '/' + name + '.png', fullPage: !!full }); };
  const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push(w + ' PASO ' + name + ': ' + e.message.split('\n')[0]); } };
  let s;

  await step('hoy', async () => {
    s = await open(w, '#hoy');
    await shot(s.page, '01-hoy');
    await shot(s.page, '02-hoy-full', true);
    await click(s.page, '[data-act="checkin"]');
    await shot(s.page, '03-checkin');
    await click(s.page, '.sheet [data-act="close"]');
    await click(s.page, '[data-act="mol-new"]');
    await shot(s.page, '04-molestia');
    await click(s.page, '[data-act="mol-view"][data-v="back"]');
    await s.page.locator('polygon[data-act="mol-zone"][data-z="isquio"][data-s="d"]').first().dispatchEvent('click');
    await s.page.waitForTimeout(200);
    await shot(s.page, '05-molestia-zona');
    await s.ctx.close();
  });

  await step('vistas', async () => {
    s = await open(w, '#entreno');
    await shot(s.page, '06-entreno-semana', true);
    await click(s.page, '[data-act="en-tab"][data-v="historial"]');
    await shot(s.page, '07-entreno-historial', true);
    await click(s.page, '[data-act="en-tab"][data-v="ejercicios"]');
    await shot(s.page, '08-entreno-ejercicios', true);
    await click(s.page, '.page-head [data-act="reg"]');
    await shot(s.page, '09-registrar');
    await click(s.page, '.sheet [data-act="close"]');
    await go(s.page, '#progreso');
    await shot(s.page, '10-progreso', true);
    await go(s.page, '#perfil');
    await shot(s.page, '11-perfil', true);
    await go(s.page, '#aprende');
    await shot(s.page, '12-aprende', true);
    await click(s.page, '.dt-row[data-act="dato-open"], [data-act="dato-open"]');
    await shot(s.page, '13-aprende-ficha');
    await click(s.page, '.sheet [data-act="close"]');
    await click(s.page, '[data-act="apr-tab"][data-v="investigar"]');
    await shot(s.page, '14-aprende-investigar');
    await go(s.page, '#coach');
    await shot(s.page, '15-coach');
    await s.ctx.close();
  });

  await step('gimnasio', async () => {
    s = await open(w, '#hoy');
    await click(s.page, '.tl-blk[data-key="gym"] .main');
    await shot(s.page, '16-hoja-bloque');
    await click(s.page, '.sheet [data-act="start-block"]');
    await s.page.waitForSelector('.train');
    await shot(s.page, '17-train-calentamiento');
    const warm = s.page.locator('[data-act="tr-skipwarm"]'); if (await warm.count()) await warm.first().click();
    await s.page.waitForTimeout(300);
    await shot(s.page, '18-train-paso');
    for (let i = 0; i < 14 && !(await s.page.locator('.set.cur .go').count()); i++) await click(s.page, '[data-act="tr-next"]');
    await shot(s.page, '19-train-ejercicio');
    for (let i = 0; i < 3 && !(await s.page.locator('#tr-rest').count()); i++) await click(s.page, '.set.cur .go');
    await shot(s.page, '19b-train-descanso');
    await s.ctx.close();
  });

  await step('balon', async () => {
    s = await open(w, '#entreno');
    await click(s.page, '[data-act="session"][data-date="' + today + '"][data-type="balon"]');
    await click(s.page, '.sheet [data-act="start"]');
    await s.page.waitForSelector('.train');
    const warm = s.page.locator('[data-act="tr-skipwarm"]'); if (await warm.count()) await warm.first().click();
    await s.page.waitForSelector('.excard .badgek.b');
    await shot(s.page, '20-train-balon');
    await s.ctx.close();
  });

  await step('login', async () => {
    s = await open(w, '', { login: true });
    await s.page.waitForSelector('#login', { timeout: 15000 });
    await s.page.waitForTimeout(400);
    await s.page.evaluate(() => document.activeElement && document.activeElement.blur());
    await shot(s.page, '21-login');
    await s.ctx.close();
  });
}

for (const w of widths) await run(w);
await browser.close();
fs.writeFileSync(outDir + '/errors.txt', errors.join('\n'));
console.log('shots · ' + widths.join(',') + ' · errores:', errors.length); errors.slice(0, 30).forEach(e => console.log(' ', e));
