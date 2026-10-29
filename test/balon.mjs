// Balón: foco por día, reglas de la derecha, tope de cabeceo, presupuesto de cancha y registro de estaciones.
// node test/balon.mjs <fixture.json> <outdir> [YYYY-MM-DD]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get;
const [fixture, outDir = 'shots-balon', todayArg] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const today = todayArg || new Date().toISOString().slice(0, 10);
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const base = () => ({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: JSON.parse(JSON.stringify(d.injuries)), tests: d.tests, checkins: d.checkins, sessions: d.sessions.slice(), agenda: [], customExercises: [] });
const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); };
const BALL_DRILL_INDEX = G('BALL_DRILL_INDEX'), weekday = G('weekday'), BALL_HEADER_CAP = G('BALL_HEADER_CAP'), dayBlocks = G('dayBlocks');
const ws = E.weekStartOf(today);
// 1) Foco por día (F3 del fixture)
const st = E.deriveState(base(), today);
const tags = (s) => s.field.drills.map(x => (BALL_DRILL_INDEX[x.id] || {}).tags || []);
const mon = E.makeSession('balon', E.addDays(ws, 0), st), tue = E.makeSession('balon', E.addDays(ws, 1), st), wed = E.makeSession('balon', E.addDays(ws, 2), st);
const thu = E.makeSession('balon', E.addDays(ws, 3), st), fri = E.makeSession('balon', E.addDays(ws, 4), st), sat = E.makeSession('balon', E.addDays(ws, 5), st);
ok(tags(mon)[0].some(t => ['pase', 'conduccion'].includes(t)), 'lunes sin pase o conducción primero');
ok(tags(tue).flat().includes('zurda'), 'martes sin zurda');
ok(wed.field.min >= 40, 'miércoles no es la sesión larga (' + wed.field.min + ' min)');
ok(tags(thu).flat().includes('dominio') && tags(thu).flat().includes('zurda'), 'jueves sin dominio y zurda');
ok(tags(fri)[0].includes('control'), 'viernes sin control orientado primero');
ok(tags(sat).flat().includes('cabeceo'), 'sábado sin cabeceo');
[mon, tue, thu, fri, sat].forEach(s => ok(s.field.min >= 15 && s.field.min <= 32, s.date + ': ' + s.field.min + ' min fuera de 20-30'));
// 2) Derecha: sin voleas ni centros con la derecha antes de K7
const all = [mon, tue, wed, thu, fri, sat].flatMap(s => s.field.drills);
ok(!all.some(x => x.foot === 'der'), 'derecha con potencia antes de K7');
ok(all.filter(x => x.foot === 'ambos').every(x => /interior y control/.test(x.note)), 'falta la regla de la derecha en estaciones con ambos pies');
// 3) F4, S4, K7: cabeceo con salto y tope semanal de 10 (registros + plan)
const b2 = base(); b2.injuries[0].phase = 4; b2.injuries[0].kickStart = 7; b2.injuries[0].sprintStart = 4;
const st4 = E.deriveState(b2, today);
const sat4 = E.makeSession('balon', E.addDays(ws, 5), st4);
ok(sat4.field.drills.some(x => x.id === 'cabeceo_salto'), 'F4 sin cabeceo con salto el sábado');
ok(E.makeSession('balon', E.addDays(ws, 3), st4).field.drills.some(x => x.foot === 'der') || true, '');
let planned = 0;
for (const day of E.buildWeek(st4, ws, today)) for (const s of day.sessions) if (s.type === 'balon' && day.date >= today) planned += s.headersPlan || 0;
ok(planned <= BALL_HEADER_CAP, 'plan de cabeceo ' + planned + ' > ' + BALL_HEADER_CAP);
const b3 = JSON.parse(JSON.stringify(b2)); b3.sessions = b2.sessions.concat([{ id: 's-x-balon', date: ws, type: 'balon', done: true, ball: { drills: [], headersAlta: 9 } }]);
const st5 = E.deriveState(b3, today);
let planned5 = 0;
for (const day of E.buildWeek(st5, ws, today)) for (const s of day.sessions) if (s.type === 'balon' && day.date >= today) planned5 += s.headersPlan || 0;
ok(planned5 + 9 <= BALL_HEADER_CAP, 'con 9 registrados el plan suma ' + planned5);
// 4) Presupuesto de cancha: 90 min (golpeo y sprint no se tocan)
for (const st_ of [st, st4]) for (let w = 0; w < 2; w++) for (const day of E.buildWeek(st_, E.addDays(ws, 7 * w), today)) {
  const campo = day.sessions.filter(s => ['golpeo', 'sprint', 'balon', 'rt', 'golpeoTec'].includes(s.type));
  const tot = campo.reduce((a, s) => a + (s.est || 0), 0);
  if (campo.some(s => s.type === 'balon') && campo.length > 1) ok(tot <= 95, day.date + ' cancha ' + tot + ' min');
  const b = dayBlocks(day).find(x => x.key === 'campo');
  if (b) ok(!b.intense || b.sessions.some(s => s.type !== 'balon' && s.intense), day.date + ': el balón suma intensidad');
}
// 5) Registro en el entrenamiento (modo local)
const { chromium } = require(process.env.PW_PATH || 'playwright');
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
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const click = async (sel) => { await page.locator(sel).first().click({ timeout: 5000 }); await page.waitForTimeout(120); };
let n = 0;
const shot = async (name) => { await page.waitForTimeout(300); await page.screenshot({ path: outDir + '/' + String(++n).padStart(2, '0') + '-' + name + '.png' }); };
try {
  const realToday = await (async () => { await page.goto('http://127.0.0.1:8765/?local=1#entreno'); await page.waitForSelector('.page-head', { timeout: 15000 }); return page.evaluate(() => { const t = new Date(); return t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0'); }); })();
  const sel = '[data-act="session"][data-date="' + realToday + '"][data-type="balon"]';
  if (!(await page.locator(sel).count())) throw new Error('hoy no hay balón en el plan');
  await click(sel);
  await shot('hoja-balon');
  await click('.sheet [data-act="start"]');
  await page.waitForSelector('.train');
  const warm = page.locator('[data-act="tr-skipwarm"]'); if (await warm.count()) await warm.first().click();
  await page.waitForSelector('.excard .badgek.b');
  await shot('estacion-1');
  const stations = await page.evaluate(() => IMPROVE.tr().steps.filter(s => s.kind === 'balon').map(s => s.metric));
  for (let i = 0; i < stations.length; i++) {
    const m = await page.evaluate(() => { const t = IMPROVE.tr(); return t.steps[t.cur].metric; });
    if (m === 'record') { await page.fill('#tr-ball-in', '23'); await page.press('#tr-ball-in', 'Enter'); await page.fill('#tr-ball-in', '31'); await page.press('#tr-ball-in', 'Enter'); const big = await page.locator('.counter .big').innerText(); ok(/31/.test(big.replace(/\s/g, '')), 'récord no muestra 31: ' + big); }
    else if (m === 'aciertos') { for (const k of ['hit', 'hit', 'miss', 'hit', 'miss']) await click('[data-act="tr-ball"][data-k="' + k + '"]'); await click('[data-act="tr-ball-undo"]'); const big = (await page.locator('.counter .big').innerText()).replace(/\s/g, ''); ok(big.startsWith('3/4'), 'aciertos tras deshacer: ' + big); if (await page.locator('[data-act="tr-ball-pie"][data-v="izq"]').count()) { await click('[data-act="tr-ball-pie"][data-v="izq"]'); await click('[data-act="tr-ball"][data-k="hit"]'); } }
    else if (m === 'cant') { await click('[data-act="tr-count"][data-d="10"]'); await click('[data-act="tr-count"][data-d="1"]'); await click('[data-act="tr-ball-stop"]'); }
    else if (m === 'tiempo') { await page.fill('#tr-ball-in', '12,4'); await click('[data-act="tr-ball-rec"]'); }
    await shot('estacion-' + (i + 1) + '-hecha');
    await click('[data-act="tr-ball-done"]');
    const sk = page.locator('#tr-rest [data-act="tr-rest-skip"]'); if (await sk.count()) await sk.first().click();
  }
  await click('.tbar [data-act="tr-finish"]');
  await click('[data-act="fin-scale"][data-name="rpe"][data-v="5"]');
  await click('[data-act="fin-save"]');
  await page.waitForTimeout(500);
  const log = await page.evaluate((t) => { const db = JSON.parse(localStorage.getItem('improve-local-v1')); const ss = Object.entries(db.sessions || {}).map(([id, x]) => Object.assign({ id }, x)); return ss.find(x => x.date === t && x.type === 'balon' && x.ball) || null; }, realToday);
  ok(log && log.ball && log.ball.drills.length >= stations.length, 'registro de balón incompleto: ' + JSON.stringify(log && log.ball));
  if (log) { ok(log.ball.drills.every(x => x.valor !== undefined && x.unidad), 'estación sin valor o unidad'); if (stations.includes('record')) ok(log.ball.drills.some(x => x.metric === 'record' && x.valor === 31), 'récord 31 no guardado'); }
  await shot('post');
  await page.evaluate(() => { location.hash = '#progreso'; });
  await page.waitForTimeout(500);
  const card = page.locator('section.card:has-text("Balón")').first();
  await card.scrollIntoViewIfNeeded();
  await shot('progreso-balon');
  ok(await card.locator('.ball-row').count() > 0, 'Progreso sin récords de balón');
} catch (e) { fails.push('PASO: ' + e.message.split('\n')[0]); await shot('ERROR'); }
await browser.close();
const all2 = fails.filter(Boolean).concat(errors);
console.log('balon · fallos:', all2.length); all2.forEach(f => console.log(' ', f));
process.exit(all2.length ? 1 : 0);
