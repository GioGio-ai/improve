// v5.1 en la app (modo local): puesta a punto de 9, viaje, «Mi rol» y claves la víspera de la prueba.
// node test/puesto-ui.mjs <fixture.json> <outdir>
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
const errors = [];
const open = async (time) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
  await ctx.clock.install({ time: new Date(time) });
  return ctx;
};
const shotOf = (page) => async (name) => { await page.waitForTimeout(400); await page.screenshot({ path: outDir + '/' + name + '.png', fullPage: true }); };
let saved = null;
try {
  /* Martes 10 de noviembre a las 10:00 (el fixture trae una prueba el 16: esta semana ya afina) */
  const ctx = await open('2026-11-10T10:00:00-03:00');
  await ctx.addInitScript((s) => { if (!localStorage.getItem('improve-local-v1')) localStorage.setItem('improve-local-v1', s); }, JSON.stringify(store));
  const page = await ctx.newPage(), shot = shotOf(page);
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  const local = () => page.evaluate(() => JSON.parse(localStorage.getItem('improve-local-v1') || '{}'));
  await page.goto('http://127.0.0.1:8765/?local=1#perfil');
  await page.waitForSelector('[data-act="rol-edit"]', { timeout: 15000 });
  let txt = await page.locator('main').innerText();
  ok(/mi rol/i.test(txt) && /Centrodelantero de referencia/.test(txt) && /Gano el primer balón/.test(txt), 'Perfil sin «Mi rol» con las claves por defecto');
  /* Mi rol: quitar una fortaleza y escribir una clave propia */
  await page.click('[data-act="rol-edit"]');
  await page.click('[data-act="rol-fort"][data-v="duelo"]');
  await page.fill('#rol-c3', 'Ataco el segundo palo si el centro es largo'); await page.dispatchEvent('#rol-c3', 'input');
  await shot('01-rol');
  await page.click('[data-act="rol-save"]');
  await page.waitForTimeout(600);
  let L = await local();
  const r = L.profile.main.rol;
  ok(r && r.puesto === '9' && !r.fortalezas.includes('duelo') && r.fortalezas.includes('aereo') && r.claves[3] === 'Ataco el segundo palo si el centro es largo' && r.claves.length === 4, 'no se guardó el rol: ' + JSON.stringify(r));
  /* Puesta a punto de 9 con viaje */
  await page.click('[data-act="block-edit"]');
  ok(await page.locator('[data-act="blk-enf"][data-v="puesto"].on').count() === 1, 'con rol, el enfoque por defecto no es el puesto');
  await page.fill('#blk-desde', '2026-11-09'); await page.dispatchEvent('#blk-desde', 'input');
  await page.fill('#blk-hasta', '2026-11-23'); await page.dispatchEvent('#blk-hasta', 'input');
  await page.click('[data-act="blk-enf"][data-v="general"]');
  await page.click('[data-act="blk-enf"][data-v="puesto"]');
  ok(await page.inputValue('#blk-desde') === '2026-11-09', 'la fecha se pierde al cambiar el enfoque');
  await page.fill('#blk-viaje', '2026-11-21'); await page.dispatchEvent('#blk-viaje', 'input');
  await page.fill('#blk-horas', '18'); await page.dispatchEvent('#blk-horas', 'input');
  await shot('02-bloque');
  await page.click('[data-act="block-save"]');
  await page.waitForTimeout(600);
  L = await local();
  const p = L.profile.main;
  ok(p.block && p.block.enfoque === 'puesto' && p.block.desde === '2026-11-09' && p.block.hasta === '2026-11-23', 'no se guardó el bloque de 9: ' + JSON.stringify(p.block));
  ok(p.viaje && p.viaje.fecha === '2026-11-21' && p.viaje.horas === 18, 'no se guardó el viaje: ' + JSON.stringify(p.viaje));
  ok(!Object.values(p).some(v => v === undefined) && !Object.values(p.block).some(v => v === undefined), 'el perfil guarda valores undefined');
  txt = await page.locator('main').innerText();
  ok(/puesta a punto · 9/i.test(txt) && /Viaje/.test(txt), 'la tarjeta del bloque no dice puesta a punto o viaje');
  await shot('03-perfil');
  /* Hoy: chip y trabajo de 9 */
  await page.evaluate(() => { location.hash = '#hoy'; });
  await page.waitForTimeout(800);
  txt = await page.locator('main').innerText();
  ok(/Puesta a punto · 9 · día 2 de 15/.test(txt), 'Hoy sin chip de puesta a punto: ' + txt.slice(0, 300));
  ok(/Trabajo de 9/.test(txt), 'Hoy sin trabajo de 9');
  await shot('04-hoy');
  await page.click('[data-act="guide"][data-g="puesto9"]');
  await page.waitForTimeout(500);
  ok(/Juego aéreo/.test(await page.locator('.sheet').last().innerText()), 'la guía del 9 no abre');
  await shot('05-guia');
  await page.evaluate(() => { location.hash = '#entreno'; });
  await page.waitForTimeout(800);
  txt = await page.locator('main').innerText();
  ok(/Trabajo de 9/.test(txt) && !/Sprints repetidos|Agilidad|Intervalos · 4 × 4|15\/15/.test(txt), 'la semana no es la del 9: ' + ((txt.match(/.{0,60}(Sprints repetidos|Agilidad|Simulación).{0,40}/g) || []).join(' | ') || txt.slice(0, 600)));
  /* La sesión de trabajo de 9 de hoy abre con sus estaciones */
  const btn = page.locator('[data-act="session"][data-type="balon"][data-date="2026-11-10"]').first();
  if (await btn.count()) {
    await btn.click(); await page.waitForTimeout(500);
    const sh = await page.locator('.sheet').last().innerText();
    ok(/Juego aéreo: 5 cabezazos/.test(sh), 'la hoja del trabajo de 9 no dice los 5 cabezazos: ' + sh.slice(0, 300));
    await shot('06-sesion');
  } else ok(false, 'no hay sesión de balón en la semana');
  saved = JSON.stringify(await local());
  await ctx.close();

  /* Domingo 22 (P-1): claves en Hoy. Sábado 21: día de viaje */
  for (const [time, name] of [['2026-11-22T09:00:00-03:00', '07-p1'], ['2026-11-21T09:00:00-03:00', '08-viaje']]) {
    const c2 = await open(time);
    await c2.addInitScript((s) => { localStorage.setItem('improve-local-v1', s); }, saved);
    const pg = await c2.newPage();
    pg.on('pageerror', e => errors.push('pageerror: ' + e.message));
    await pg.goto('http://127.0.0.1:8765/?local=1#hoy');
    await pg.waitForSelector('.hoy-head', { timeout: 15000 });
    await pg.waitForTimeout(800);
    const t = await pg.locator('main').innerText();
    if (name === '07-p1') ok(/Tus claves de 9/i.test(t) && /Ataco el segundo palo/.test(t), 'P-1 sin las claves: ' + t.slice(0, 400));
    else ok(/Día de viaje/.test(t) && !/Tus claves de 9/i.test(t), 'el sábado no es día de viaje o muestra claves: ' + t.slice(0, 400));
    await shotOf(pg)(name);
    await c2.close();
  }
} catch (e) { errors.push('PASO: ' + e.message.split('\n')[0]); }
await browser.close();
console.log('puesto-ui · fallos: ' + fails.length + ' · errores: ' + errors.length);
fails.forEach(f => console.log('  ✗ ' + f));
errors.forEach(e => console.log('  ' + e));
process.exitCode = fails.length || errors.length ? 1 : 0;
