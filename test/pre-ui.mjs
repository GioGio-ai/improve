// v4.6 en la app (modo local): «Estuve enfermo» marca lo planificado como no hecho y la pretemporada cambia el plan.
// node test/pre-ui.mjs <fixture.json> <outdir>
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
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
/* Lunes 9 de noviembre a las 10:00: el lunes es un día medio con intervalos */
await ctx.clock.install({ time: new Date('2026-11-09T10:00:00-03:00') });
await ctx.addInitScript((s) => { if (!localStorage.getItem('improve-local-v1')) localStorage.setItem('improve-local-v1', s); }, JSON.stringify(store));
const page = await ctx.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
const shot = async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: outDir + '/' + name + '.png', fullPage: true }); };
const local = () => page.evaluate(() => JSON.parse(localStorage.getItem('improve-local-v1') || '{}'));
try {
  await page.goto('http://127.0.0.1:8765/?local=1#perfil');
  await page.waitForSelector('[data-act="sick-new"]', { timeout: 15000 });
  /* Enfermo del jueves al domingo */
  await page.click('[data-act="sick-new"]');
  await page.fill('#sick-from', '2026-11-05'); await page.dispatchEvent('#sick-from', 'input');
  await page.fill('#sick-to', '2026-11-08'); await page.dispatchEvent('#sick-to', 'input');
  await page.click('[data-act="sick-kind"][data-v="leve"]');
  ok(await page.inputValue('#sick-from') === '2026-11-05', 'la fecha se pierde al elegir el tipo');
  await shot('01-enfermo');
  await page.click('[data-act="sick-save"]');
  await page.waitForTimeout(600);
  let L = await local();
  const prof = L.profile && L.profile.main;
  ok(prof && prof.sick && prof.sick.length === 1 && prof.sick[0].from === '2026-11-05' && prof.sick[0].to === '2026-11-08', 'no se guardó la enfermedad: ' + JSON.stringify(prof && prof.sick));
  const notDone = Object.entries(L.sessions || {}).filter(([, s]) => s.sick && s.done === false);
  ok(notDone.length >= 3, 'no se marcó lo planificado como no hecho: ' + notDone.length);
  ok(!notDone.some(([, s]) => s.date > '2026-11-08' || s.type === 'descanso'), 'se marcó algo fuera del rango o un descanso');
  ok(Object.values(L.sessions || {}).filter(s => s.done !== false && s.date >= '2026-11-05' && s.date <= '2026-11-08').length === Object.values(store.sessions || {}).filter(s => s.done !== false && s.date >= '2026-11-05' && s.date <= '2026-11-08').length, 'se tocó una sesión ya hecha');
  /* Pretemporada hasta la prueba del 23 */
  await page.click('[data-act="block-edit"]');
  await page.fill('#blk-desde', '2026-11-09'); await page.dispatchEvent('#blk-desde', 'input');
  await page.fill('#blk-hasta', '2026-11-23'); await page.dispatchEvent('#blk-hasta', 'input');
  await shot('02-pretemporada');
  await page.click('[data-act="block-save"]');
  await page.waitForTimeout(600);
  L = await local();
  const p2 = L.profile.main;
  ok(p2.block && p2.block.desde === '2026-11-09' && p2.block.hasta === '2026-11-23', 'no se guardó el bloque: ' + JSON.stringify(p2.block));
  ok((p2.trials || []).includes('2026-11-23'), 'la prueba no se sumó al calendario');
  ok(p2.sick && p2.sick.length === 1, 'guardar el bloque borró la enfermedad');
  await shot('03-perfil');
  /* Hoy: chips de la vuelta y de la pretemporada, intervalos en la cancha */
  await page.evaluate(() => { location.hash = '#hoy'; });
  await page.waitForTimeout(800);
  const hoy = await page.locator('main').innerText();
  ok(/Pretemporada · día 1 de 15/.test(hoy), 'Hoy sin chip de pretemporada');
  ok(/Vuelta gradual · día 1 de 1/.test(hoy), 'Hoy sin chip de vuelta gradual');
  ok(/Vuelta tras la enfermedad/.test(hoy), 'Hoy sin la nota de la vuelta');
  await shot('04-hoy');
  await page.evaluate(() => { location.hash = '#entreno'; });
  await page.waitForTimeout(800);
  const sem = await page.locator('main').innerText();
  ok(/Intervalos/.test(sem), 'la semana no muestra intervalos');
  await shot('05-semana');
  /* La sesión de intervalos: bloques en minutos y pitido en cada cambio */
  const btn = page.locator('[data-act="session"][data-type="intervalos"]').first();
  if (await btn.count()) {
    await btn.click(); await page.waitForTimeout(500);
    const sh = await page.locator('.sheet').last().innerText();
    ok(/× 6 min/.test(sh), 'la hoja de intervalos no muestra los bloques en minutos: ' + sh.slice(0, 200));
    await shot('06-intervalos');
    await page.click('[data-act="start"][data-type="intervalos"]');
    await page.waitForSelector('.train', { timeout: 8000 });
    /* Salta el calentamiento hasta la tarjeta de intervalos */
    const sw = page.locator('[data-act="tr-skipwarm"]'); if (await sw.count()) { await sw.first().click(); await page.waitForTimeout(300); }
    for (let i = 0; i < 12; i++) { const t = await page.locator('.train').innerText(); if (/Intervalos 10\/10/.test(t)) break; const nx = page.locator('[data-act="tr-next"]'); if (await nx.count()) await nx.first().click(); else break; await page.waitForTimeout(150); }
    const tr = await page.locator('.train').innerText();
    ok(/Intervalos 10\/10/.test(tr), 'el modo entrenamiento no llega a los intervalos');
    await shot('07-entreno-intervalos');
  } else fails.push('no hay sesión de intervalos para abrir en la semana');
} catch (e) { fails.push('PASO: ' + String(e.message || e).split('\n')[0]); await shot('zz-error').catch(() => {}); }
console.log('pre-ui · fallos: ' + fails.length + ' · errores: ' + errors.length);
fails.forEach(f => console.log('  ' + f)); errors.slice(0, 5).forEach(e => console.log('  error: ' + e));
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
