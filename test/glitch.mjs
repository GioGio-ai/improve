// Parpadeo: la opacidad de .train y del descanso queda en 1 al tocar ±15, +1 y repeticiones, y no se remontan.
// node test/glitch.mjs <fixture.json> <outdir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-glitch'] = process.argv.slice(2);
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
const errors = [], fails = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const click = async (sel) => { await page.locator(sel).first().click({ timeout: 5000 }); };
// Mide la opacidad mínima durante 160 ms después del toque
const probe = () => page.evaluate(() => new Promise(res => {
  let min = 1, minRest = 1; const t0 = performance.now();
  const tick = () => {
    const tr = document.querySelector('.train'), rs = document.getElementById('tr-rest');
    if (tr) min = Math.min(min, Number(getComputedStyle(tr).opacity));
    if (rs) minRest = Math.min(minRest, Number(getComputedStyle(rs).opacity));
    if (performance.now() - t0 < 160) requestAnimationFrame(tick); else res({ min, minRest, sameTrain: tr === window.__tr, sameRest: !rs || !window.__rest || rs === window.__rest });
  };
  tick();
}));
await page.goto('http://127.0.0.1:8765/?local=1#hoy');
await page.waitForSelector('.topbar', { timeout: 15000 });
try {
  await click('.tl-blk[data-key="campo"] .main');
  await click('.sheet [data-act="start-block"]');
  await page.waitForSelector('.train');
  await page.waitForTimeout(400);
  await click('[data-act="tr-skipwarm"]');
  await page.waitForTimeout(300);
  await page.evaluate(() => { window.__tr = document.querySelector('.train'); });
  // Sprint: repetición → descanso grande
  await click('.reps button[data-k="0"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => { window.__rest = document.getElementById('tr-rest'); });
  for (let i = 0; i < 20; i++) {
    await click('[data-act="tr-rest"][data-d="' + (i % 2 ? -15 : 15) + '"]');
    const r = await probe();
    if (r.min < 1 || r.minRest < 1 || !r.sameTrain || !r.sameRest) fails.push('±15 #' + i + ' ' + JSON.stringify(r));
  }
  await page.screenshot({ path: outDir + '/descanso.png' });
  await click('[data-act="tr-rest-skip"]');
  for (let k = 1; k < 4; k++) {
    await click('.reps button[data-k="' + k + '"]');
    const r = await probe();
    if (r.min < 1 || !r.sameTrain) fails.push('rep #' + k + ' ' + JSON.stringify(r));
    const sk = page.locator('[data-act="tr-rest-skip"]'); if (await sk.count()) await sk.first().click();
  }
  await click('[data-act="tr-next"]');
  await page.waitForTimeout(300);
  const before = await page.locator('.counter .big').innerText();
  for (let i = 0; i < 20; i++) {
    await click('[data-act="tr-count"][data-d="1"]');
    const r = await probe();
    if (r.min < 1 || !r.sameTrain) fails.push('+1 #' + i + ' ' + JSON.stringify(r));
  }
  const after = await page.locator('.counter .big').innerText();
  if (parseInt(after, 10) - parseInt(before, 10) !== 20) fails.push('contador: ' + before + ' → ' + after);
  await click('[data-act="tr-count"][data-d="10"]');
  const ten = await page.locator('.counter .big').innerText();
  if (parseInt(ten, 10) - parseInt(after, 10) !== 10) fails.push('+10: ' + after + ' → ' + ten);
  for (const v of [0, 1, 2]) { await click('[data-act="tr-pd"][data-v="' + v + '"]'); const r = await probe(); if (r.min < 1 || !r.sameTrain) fails.push('dolor ' + v + ' ' + JSON.stringify(r)); }
  await page.screenshot({ path: outDir + '/contador.png' });
  // Reloj de sesión con cifras de ancho fijo
  const dd = await page.locator('#tr-clock .dd').count();
  if (!dd) fails.push('reloj sin cifras de ancho fijo');
} catch (e) { fails.push('PASO: ' + e.message.split('\n')[0]); await page.screenshot({ path: outDir + '/ERROR.png' }); }
fs.writeFileSync(outDir + '/errors.txt', errors.concat(fails).join('\n'));
console.log('glitch · fallos:', fails.length, '· errores:', errors.length); fails.concat(errors).forEach(e => console.log(' ', e));
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
