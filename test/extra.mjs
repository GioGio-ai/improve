// v4.5 en la app (modo local): sesión extra del domingo → lunes sin cancha, pregunta del 100 %, escalera y lado en tren superior.
// sh test/serve.sh &  node test/extra.mjs <fixture.json> <outdir>
// El fixture necesita una lesión activa del recto femoral derecho en F3 y el domingo de descanso.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-extra'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const SUN = '2026-11-01', MON = '2026-11-02';
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
/* Golpeo en K4 y sprint en S2, sin nada registrado desde el sábado */
d.sessions = (d.sessions || []).filter(s => s.date < SUN && !(s.type === 'golpeo' && s.kick && s.kick.level > 3)).concat([
  { id: 'free-sun', date: SUN, type: 'cancha', done: true, source: 'ia', title: 'Definición y cambios de frente', minutes: 120, rpe: 8,
    campo: { side: 'd', bloques: [{ id: 'cl_def_ambas', n: 'Definición con ambas piernas', cat: 'remate', min: 65, pies: 'ambos', int: 'alta' }, { id: 'cl_tiros_libres', n: 'Tiros libres', cat: 'balon_parado', min: 15, pies: 'der', int: 'alta' }, { id: 'cl_1v1', n: '1 contra 1', cat: 'duelo', min: 20, pies: 'ambos', int: 'alta' }, { id: 'cl_cambio_frente', n: 'Cambios de frente', cat: 'pase_largo', min: 20, pies: 'ambos', int: 'alta' }],
      golpes: { der: 'muchos', izq: 'muchos' }, cabezazos: 'no', sprints: 'varios', companeros: 1, pd: 0, pn: 0, ia: true, texto: 'Mucha definición con ambas piernas' } },
]);
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
const shot = async (name, full) => { await page.waitForTimeout(400); await page.screenshot({ path: outDir + '/' + name + '.png', fullPage: !!full }); };
const goto = async (hash) => { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(600); };
try {
  await page.clock.setFixedTime(new Date(MON + 'T08:30:00-03:00'));
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await page.waitForTimeout(700);
  /* 1 · Hoy: pregunta del 100 % */
  const card = page.locator('section.card.t-blue:has-text("al 100 %")');
  ok(await card.count() === 1, 'no pregunta si llegó al 100 % con la derecha');
  await shot('01-hoy');
  await card.screenshot({ path: outDir + '/02-pregunta.png' }).catch(() => {});
  /* 2 · Lunes sin cancha */
  await goto('#entreno');
  await page.waitForSelector('.day-sec.is-today', { timeout: 10000 });
  const mon = await page.locator('.day-sec.is-today').innerText();
  ok(/fuera del plan/.test(mon) && /48 h/.test(mon), 'el lunes no explica el ajuste: ' + mon.replace(/\n/g, ' | ').slice(0, 300));
  ok(!/Circuito RT|Sprint ·|Golpeo ·|Balón ·/.test(mon), 'el lunes sigue con cancha: ' + mon.replace(/\n/g, ' | ').slice(0, 300));
  ok(/Recuperación de piernas/.test(mon), 'el lunes no trae rodillo y movilidad: ' + mon.replace(/\n/g, ' | ').slice(0, 300));
  await shot('03-lunes');
  /* 3 · Camino antes y después de contestar */
  const road = async () => (await page.locator('section.panel:has-text("Camino a las pruebas")').first().innerText()).replace(/\n/g, ' | ');
  const before = await road();
  await goto('#hoy');
  await card.locator('[data-act="cl-max"][data-v="1"]').click();
  await page.waitForTimeout(600);
  const saved = (await local()).sessions['free-sun'];
  ok(saved.campo.max && saved.campo.max.der === true, 'no guarda el 100 %: ' + JSON.stringify(saved.campo.max));
  ok(await page.locator('section.card.t-blue:has-text("al 100 %")').count() === 0, 'la pregunta sigue después de contestar');
  await goto('#entreno');
  await page.waitForSelector('.day-sec.is-today', { timeout: 10000 });
  const after = await road();
  ok(/Golpeo K7 hecho en cancha/.test(after), 'el camino no muestra el golpeo demostrado: ' + after);
  ok(after !== before, 'el camino no cambia con el 100 %');
  ok(/marca la fecha es el sprint/.test(after), 'el camino no dice qué marca la fecha: ' + after);
  await page.locator('section.panel:has-text("Camino a las pruebas")').first().screenshot({ path: outDir + '/04-camino.png' }).catch(() => {});
  /* 4 · Martes: golpeo K7 con menos volumen */
  const tue = await page.locator('.day-sec:has-text("Martes 3 nov")').first().innerText();
  ok(/Golpeo · K7/.test(tue) && /40 % menos volumen/.test(tue), 'el martes no refleja K7 con menos volumen: ' + tue.replace(/\n/g, ' | ').slice(0, 300));
  await goto('#progreso');
  const prog = await page.locator('main').innerText();
  ok(/1\/2 limpias/.test(prog) && !/Hasta K5 en F3/.test(prog), 'Progreso no refleja la escalera: ' + prog.slice(0, 200));
  /* 5 · La revisión de la sesión dice que cuenta */
  await goto('#entreno');
  /* 6 · Tren superior: «derecha» es el brazo; en piernas, la pierna a reforzar */
  await page.locator('.day-sec.is-today [data-act="session"][data-type="superiorA"]').first().click();
  await page.waitForTimeout(500);
  const start = page.locator('[data-act="start"]').first();
  await start.click();
  await page.waitForTimeout(700);
  const seen = [];
  for (let i = 0; i < 14; i++) {
    const body = await page.locator('body').innerText();
    if (/Remo a una mano|Remo con mancuerna|Press landmine/i.test(body) && /Derecha/.test(body)) {
      seen.push(body);
      ok(!/Derecha · (lesionada|a reforzar)/.test(body), 'tren superior con la marca de la pierna: ' + body.replace(/\n/g, ' | ').slice(0, 260));
      ok(/al otro lado/.test(body) && !/a la otra pierna/.test(body), 'tren superior habla de la otra pierna');
      await shot('05-superior-unilateral');
      break;
    }
    const next = page.locator('[data-act="tr-next"]').first();
    if (!(await next.count())) break;
    await next.click(); await page.waitForTimeout(250);
  }
  ok(seen.length > 0, 'no se llegó a un ejercicio de brazos a una mano');
  /* 7 · En piernas sí se marca: la pierna a reforzar (no «lesionada» desde F3) */
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
  await ctx2.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
  const p2 = await ctx2.newPage();
  await p2.clock.setFixedTime(new Date('2026-11-03T08:30:00-03:00'));
  await p2.goto('http://127.0.0.1:8765/?local=1#entreno');
  await p2.waitForSelector('.day-sec.is-today', { timeout: 15000 });
  await p2.waitForTimeout(600);
  await p2.locator('.day-sec.is-today [data-act="session"][data-type="fuerzaA"]').first().click();
  await p2.waitForTimeout(500);
  await p2.locator('[data-act="start"]').first().click();
  await p2.waitForTimeout(700);
  let legSeen = false;
  for (let i = 0; i < 16 && !legSeen; i++) {
    const body = await p2.locator('body').innerText();
    if (/Derecha · a reforzar/.test(body)) { legSeen = true; ok(/a la otra pierna/.test(body), 'en piernas debería decir «a la otra pierna»'); ok(!/lesionada/i.test(body.split('Por lado')[1] || ''), 'sigue diciendo lesionada'); await p2.screenshot({ path: outDir + '/06-piernas.png' }); break; }
    const next = p2.locator('[data-act="tr-next"]').first();
    if (!(await next.count())) break;
    await next.click(); await p2.waitForTimeout(250);
  }
  ok(legSeen, 'en los ejercicios de piernas no aparece «Derecha · a reforzar»');
  await ctx2.close();
} catch (e) { fails.push('PASO: ' + String(e.message || e).split('\n')[0]); await shot('zz-error').catch(() => {}); }
console.log('extra · fallos: ' + fails.length + ' · errores: ' + errors.length);
fails.forEach(f => console.log('  ' + f)); errors.slice(0, 10).forEach(e => console.log('  ' + e));
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
