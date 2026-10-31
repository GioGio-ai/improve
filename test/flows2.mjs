// Flujos extra: check-in, editor, test en vivo, mover día. node test/flows2.mjs <fixture.json> <outdir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots2'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const store = {};
for (const [col, v] of Object.entries(d)) {
  if (Array.isArray(v)) { store[col] = {}; v.forEach(doc => { const { id, ...rest } = doc; store[col][id] = rest; }); }
  else if (v && typeof v === 'object') { const { id, ...rest } = v; store[col] = { main: rest }; }
}
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); localStorage.removeItem('improve-entreno-v3'); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
let n = 0;
const shot = async (name) => { await page.waitForTimeout(420); await page.screenshot({ path: outDir + '/' + String(++n).padStart(2, '0') + '-' + name + '.png' }); };
const click = async (sel) => { await page.locator(sel).first().click({ timeout: 5000 }); await page.waitForTimeout(160); };
const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push('PASO ' + name + ': ' + e.message.split('\n')[0]); await shot('ERROR-' + name); } };
await page.goto('http://127.0.0.1:8765/?local=1#hoy');
await page.waitForSelector('.topbar', { timeout: 15000 });
await step('checkin', async () => {
  await click('[data-act="checkin"]');
  await click('[data-act="ck-scale"][data-name="soreness"][data-v="2"]');
  await click('[data-act="ck-scale"][data-name="rfPain"][data-v="0"]');
  await shot('checkin');
  await click('[data-act="ck-save"]');
  // Con dolor muscular alto, el check-in abre una vez el mapa para marcar dónde: se cierra para seguir
  await page.waitForTimeout(500);
  if (await page.locator('.sheet .bmap.m-select').count()) { await shot('checkin-mapa'); await click('.sheet [data-act="close"]'); }
  await shot('hoy-tras-checkin');
});
await step('dia-pasado', async () => {
  await click('[data-act="hoy-day"][data-date="2026-10-27"]');
  await shot('hoy-dia-27');
  await click('.hero [data-act="day"]');
  await shot('revision-dia-27');
  await click('.sheet [data-act="session"][data-type="fuerzaA"]');
  await shot('revision-fuerzaA');
  await page.locator('.sheet').evaluate(el => el.scrollTo(0, 900));
  await shot('revision-fuerzaA-2');
  await click('.sheet [data-act="close"]');
  await click('.sheet [data-act="close"]');
});
await step('editor', async () => {
  await page.evaluate(() => { location.hash = '#entreno'; });
  await page.waitForTimeout(400);
  await click('.page-head [data-act="new-log"]');
  await shot('editor-nuevo');
  await click('[data-act="ed-add"]');
  await click('[data-act="pick-tab"][data-v="banco"]');
  await page.fill('#pick-q', 'nordic');
  await page.waitForTimeout(400);
  await shot('picker');
  await click('#pick-list [data-act="pick"]');
  await shot('editor-con-ej');
  await click('[data-act="ed-sets"]');
  await shot('set-editor');
  await click('.sheet [data-act="close"]');
  await click('[data-act="ed-save"]');
  await shot('editor-guardado');
});
await step('historial', async () => {
  await click('[data-act="en-tab"][data-v="historial"]');
  await shot('historial');
  await click('[data-act="en-tab"][data-v="ejercicios"]');
  await shot('ejercicios');
  await click('.exrow[data-act="ex"]');
  await shot('ficha');
  await click('.sheet [data-act="close"]');
});
await step('test-en-vivo', async () => {
  await click('[data-act="en-tab"][data-v="semana"]');
  if (!(await page.locator('[data-act="session"][data-type="test"]').count())) { await click('[data-act="week"][data-d="1"]'); await page.waitForTimeout(300); }
  await shot('semana-con-test');
  await click('[data-act="session"][data-type="test"]');
  await click('.sheet [data-act="start"]');
  await page.waitForSelector('.train');
  await click('[data-act="tr-skipwarm"]');
  await shot('test-ext8');
  await page.fill('input[data-bind="tr-test"][data-s="i"]', '55');
  await page.fill('input[data-bind="tr-test"][data-s="d"]', '52,5');
  await page.waitForTimeout(900);
  await shot('test-ext8-lleno');
  await click('[data-act="tr-next"]');
  await click('[data-act="tr-test-rn"][data-v="completo"]');
  await click('[data-act="tr-test-scale"][data-name="rnPain"][data-v="0"]');
  await shot('test-rn');
  await click('.tbar [data-act="tr-min"]');
  await page.evaluate(() => { location.hash = '#progreso'; });
  await page.waitForTimeout(500);
  await shot('progreso-tras-test');
});
await step('mover-dia', async () => {
  await page.evaluate(() => { location.hash = '#hoy'; });
  await page.waitForTimeout(300);
  // Primer día futuro de esta semana con gimnasio (la prueba ya no depende de una fecha fija)
  const days = await page.locator('.week .wd:not(.past):not(.today)').evaluateAll(els => els.map(e => e.getAttribute('data-date')));
  let found = false;
  for (const dt of days) {
    await click('[data-act="hoy-day"][data-date="' + dt + '"]');
    if (await page.locator('.tl-blk[data-key="gym"] .main').count()) { found = true; break; }
  }
  if (!found) { console.log('mover-dia: sin día futuro con gimnasio en esta semana (se omite)'); return; }
  await click('.tl-blk[data-key="gym"] .main');
  await click('.sheet [data-act="session"]');
  await shot('sesion-viernes');
  await click('.sheet [data-act="move"]');
  await shot('mover');
});
fs.writeFileSync(outDir + '/errors.txt', errors.join('\n'));
console.log('errores:', errors.length); errors.forEach(e => console.log(' ', e));
await browser.close();
