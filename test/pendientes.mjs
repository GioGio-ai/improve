// Pendientes sin registrar: siguen en la figura de inicio hasta registrarlos, «No comí», hora planificada,
// lo de ayer hasta las 12:00 y número en la pestaña Hoy.
// node test/pendientes.mjs <fixture.json> <outdir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-pend'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const store = {};
for (const [col, v] of Object.entries(d)) {
  if (Array.isArray(v)) { store[col] = {}; v.forEach(doc => { const { id, ...rest } = doc; store[col][id] = rest; }); }
  else if (v && typeof v === 'object') { const { id, ...rest } = v; store[col] = { main: rest }; }
}
const tz = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Asuncion', year: 'numeric', month: '2-digit', day: '2-digit' });
const today = tz.format(new Date());
const addDays = (s, n) => { const x = new Date(s + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const at = (date, hhmm) => new Date(date + 'T' + hhmm + ':00-03:00');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const browser = await chromium.launch();
const errors = [];
let n = 0;
async function openAt(date, hhmm, seed) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
  await ctx.addInitScript((s) => { if (s && !sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); sessionStorage.setItem('seeded', '1'); } }, seed ? JSON.stringify(seed) : '');
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.clock.setFixedTime(at(date, hhmm));
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await page.waitForTimeout(500);
  return { ctx, page };
}
const shot = async (page, name) => { await page.waitForTimeout(350); await page.screenshot({ path: outDir + '/' + String(++n).padStart(2, '0') + '-' + name + '.png' }); };
const meals = (page) => page.evaluate(() => Object.values(JSON.parse(localStorage.getItem('improve-local-v1') || '{}').meals || {}));
// Filas de HOY (las de ayer dicen «Ayer · …»)
const rows = (page) => page.evaluate(() => [...document.querySelectorAll('.hero .pend-row .pend-main')].filter(b => !/^Ayer/.test(b.querySelector('.s').textContent)).map(b => b.querySelector('.t').textContent));
const rowSel = (page, text) => page.locator('.hero .pend-row').filter({ hasText: text }).filter({ hasNotText: 'Ayer' });
try {
  // 1) Hoy 11:40 sin nada registrado: el desayuno sigue a la vista
  let { ctx, page } = await openAt(today, '11:40', store);
  await shot(page, 'hoy-1140');
  const r1 = await rows(page);
  ok(r1.some(t => /Desayuno/.test(t)), 'desayuno no aparece en pendientes: ' + r1.join(' | '));
  const badge = await page.locator('#nav a[data-nav="hoy"] .badge').innerText().catch(() => '');
  const total = Number((await page.locator('.hero .pend-h').innerText()).match(/(\d+)/)[1]);
  ok(badge === (total > 9 ? '9+' : String(total)), 'número de la pestaña (' + badge + ') distinto al del panel (' + total + ')');
  // 2) «Comí esto» del desayuno → se guarda a la hora planificada (07:45)
  await rowSel(page, 'Desayuno').locator('[data-act="meal-ate"]').click();
  await page.waitForTimeout(400);
  const m1 = (await meals(page)).find(m => m.slot === 'desayuno' && m.date === today);
  ok(m1 && m1.time === '07:45', 'hora del desayuno tardío: ' + (m1 && m1.time));
  ok(!(await rows(page)).some(t => /Desayuno/.test(t)), 'desayuno sigue pendiente tras registrarlo');
  // 3) Otro pendiente de comida → opciones → «No la comí»
  const r2 = await rows(page);
  const mealRow = r2.find(t => /Post entreno|Media mañana/.test(t));
  if (mealRow) {
    await rowSel(page, mealRow).locator('.pend-main').click();
    await shot(page, 'opciones');
    await page.locator('.sheet [data-act="meal-skip"]').click();
    await page.waitForTimeout(400);
    const sk = (await meals(page)).find(m => m.skipped && m.date === today);
    ok(sk && sk.items.length === 0, 'no se guardó la comida saltada');
    ok(!(await rows(page)).some(t => t === mealRow), mealRow + ' sigue pendiente tras «No comí»');
    ok(await page.locator('.tl-blk.skipped').count() >= 1, 'la agenda no marca la comida saltada');
  } else fails.push('no hay comida de media mañana o post entreno pendiente: ' + r2.join(' | '));
  // 4) Entreno pasado sin registrar en el panel
  ok((await rows(page)).some(t => /Gimnasio/.test(t)), 'el gimnasio pasado no aparece en pendientes');
  await shot(page, 'tras-registrar');
  await ctx.close();

  // 5) De noche, sin nada más por venir: la figura de inicio muestra solo pendientes
  ({ ctx, page } = await openAt(today, '23:15', store));
  ok(await page.locator('.hero.k-pend').count() === 1, 'de noche no aparece la figura de pendientes');
  await shot(page, 'noche');
  // Ver todos
  if (await page.locator('[data-act="pend-all"]').count()) { await page.locator('[data-act="pend-all"]').first().click(); await shot(page, 'todos'); }
  await ctx.close();

  // 6) Mañana a las 09:00: lo de ayer sigue visible; a las 12:30 ya no
  ({ ctx, page } = await openAt(addDays(today, 1), '09:00', store));
  const r3 = await page.locator('.pend-main .s').allInnerTexts();
  ok(r3.some(t => /^Ayer/.test(t)), 'lo de ayer no aparece a las 09:00: ' + r3.join(' | '));
  await shot(page, 'manana-0900');
  await ctx.close();
  ({ ctx, page } = await openAt(addDays(today, 1), '12:30', store));
  const r4 = await page.locator('.pend-main .s').allInnerTexts();
  ok(!r4.some(t => /^Ayer/.test(t)), 'lo de ayer sigue a las 12:30');
  await ctx.close();
} catch (e) { fails.push('excepción: ' + e.message.split('\n')[0]); }
await browser.close();
fs.writeFileSync(outDir + '/errors.txt', errors.concat(fails).join('\n'));
console.log('pendientes · fallos: ' + fails.length + ' · errores: ' + errors.length);
fails.concat(errors).slice(0, 20).forEach(x => console.log('  ' + x));
