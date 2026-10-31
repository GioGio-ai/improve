// Molestias: vigencia, reglas por tipo e intensidad, deshacer, patrones y flujo en la app.
// node test/molestias.mjs <fixture.json> <outdir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get;
const [fixture, outDir = 'shots-mol'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const now = new Date(), today = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const activeMolestias = G('activeMolestias'), molestiaInsights = G('molestiaInsights'), BANK_INDEX = G('BANK_INDEX'), exMg = G('exMg'), addDays = E.addDays;
const mol = (o) => Object.assign({ id: 'mol-' + Math.random().toString(36).slice(2, 7), fecha: today, hora: '10:00', resuelta: false, updates: [] }, o);
function plan(mols, injPatch) {
  const inj = JSON.parse(JSON.stringify(d.injuries)); Object.assign(inj[0], injPatch || {});
  const st = E.deriveState({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: inj, tests: d.tests, checkins: [], sessions: d.sessions.filter(s => s.date < today), agenda: [], molestias: mols, customExercises: [] }, today);
  const week = E.buildWeek(st, E.weekStartOf(today), today).concat(E.buildWeek(st, addDays(E.weekStartOf(today), 7), today));
  return { st, day: week.find(x => x.date === today), next: week.find(x => x.date === addDays(today, 1)), week };
}
const loads = (s, groups) => (s.items || []).filter(it => groups.some(g => (exMg(BANK_INDEX[it.id]) || {})[g] >= 0.5));
// Línea base: F4, K7, S4 para que haya golpeo y sprint altos
const B = { phase: 4, kickStart: 7, sprintStart: 4 };
const base = plan([], B);
const baseTypes = base.day.sessions.map(s => s.type);
// 1) Vigencia
{
  const st = plan([mol({ fecha: addDays(today, -1), zona: 'isquio', lado: 'd', tipo: 'cargado', nivel: 5 }), mol({ fecha: addDays(today, -3), zona: 'aductor', lado: 'i', tipo: 'cargado', nivel: 5 }),
    mol({ fecha: addDays(today, -3), zona: 'pantorrilla', lado: 'd', tipo: 'cargado', nivel: 5, updates: [{ fecha: addDays(today, -1), estado: 'igual', nivel: 5 }] }), mol({ fecha: addDays(today, -1), zona: 'lumbar', lado: 'd', tipo: 'dolor', nivel: 4, resuelta: true, resueltaEn: today })], B).st;
  const act = activeMolestias(st, today).map(m => m.zona).sort().join(',');
  ok(act === 'isquio,pantorrilla', 'vigencia: activas = ' + act);
}
// 2) Cargado 1-3: sin cambios
{ const p = plan([mol({ zona: 'aductor', lado: 'i', tipo: 'cargado', nivel: 2 })], B); ok(JSON.stringify(p.day.sessions.map(s => s.type)) === JSON.stringify(baseTypes) && !(p.day.molAdj || []).length, 'cargado 2 cambió el plan'); }
// 3) Cargado 4-6 en aductor: golpeo ≤ K3 y −1 serie en lo que trabaja el aductor
{
  const p = plan([mol({ zona: 'aductor', lado: 'i', tipo: 'cargado', nivel: 5 })], B);
  const g = p.day.sessions.find(s => s.type === 'golpeo');
  if (baseTypes.includes('golpeo')) ok(g && g.level <= 3, 'aductor 5: golpeo K' + (g && g.level));
  const bs = base.day.sessions.flatMap(s => loads(s, ['aductores'])), ms = p.day.sessions.flatMap(s => loads(s, ['aductores']));
  bs.forEach(b => { const m = ms.find(x => x.id === b.id); if (m && b.spec && b.spec.s > 1) ok(m.spec.s === b.spec.s - 1, 'aductor 5: ' + b.id + ' sin −1 serie'); });
  ok((p.day.molAdj || []).length === 1, 'aductor 5: sin nota de ajuste');
}
// 4) Cargado 4-6 en isquio: sprint ≤ S2, excéntricos → isométricos
{
  const p = plan([mol({ zona: 'isquio', lado: 'd', tipo: 'cargado', nivel: 5 })], B);
  const s = p.day.sessions.find(x => x.type === 'sprint');
  if (baseTypes.includes('sprint')) ok(s && s.level <= 2, 'isquio 5: sprint S' + (s && s.level));
  const exc = p.day.sessions.flatMap(x => loads(x, ['isquios'])).filter(it => BANK_INDEX[it.id] && ['exc', 'pliom'].includes(BANK_INDEX[it.id].c));
  ok(!exc.length, 'isquio 5: quedan excéntricos ' + exc.map(x => x.id).join(','));
}
// 5) Dolor ≥ 3 en isquio: sin sprint y aviso de consultar
{
  const p = plan([mol({ zona: 'isquio', lado: 'd', tipo: 'dolor', nivel: 4 })], B);
  ok(!p.day.sessions.some(x => x.type === 'sprint'), 'isquio dolor: hay sprint');
  ok((p.day.notes || []).some(n => /consulta/.test(n)), 'isquio dolor: sin aviso de consultar');
  ok(!p.day.sessions.flatMap(x => loads(x, ['isquios'])).some(it => (exMg(BANK_INDEX[it.id]).isquios || 0) >= 1), 'isquio dolor: ejercicios de isquio');
  ok(!p.next.sessions.some(x => x.type === 'sprint'), 'isquio dolor: mañana hay sprint');
}
// 6) Cargado 7-10 en cuádriceps: nada que lo cargue y lo intenso se mueve
{
  const p = plan([mol({ zona: 'cuadriceps', lado: 'd', tipo: 'cargado', nivel: 8 })], B);
  ok(!p.day.sessions.flatMap(x => loads(x, ['cuadriceps'])).length, 'cuádriceps 8: ejercicios que lo cargan');
  if (base.day.intense) ok(!p.day.intense, 'cuádriceps 8: el día sigue intenso');
}
// 7) Dolor ≥ 3 en recto femoral: regla del recto femoral (nada intenso, sin campo)
{ const p = plan([mol({ zona: 'recto_femoral', lado: 'd', tipo: 'dolor', nivel: 4 })], B); ok(!p.day.sessions.some(x => ['golpeo', 'sprint', 'rt'].includes(x.type)) && !p.day.intense, 'RF dolor: hay campo o intensidad'); }
// 8) Deshacer: noAdjust hoy
{ const p = plan([mol({ zona: 'isquio', lado: 'd', tipo: 'dolor', nivel: 4, noAdjust: [today] })], B); ok(JSON.stringify(p.day.sessions.map(s => s.type)) === JSON.stringify(baseTypes), 'deshacer no restauró el plan'); }
// 9) Patrón: aductor izquierdo 3 veces en 14 días
{
  const st = plan([mol({ fecha: addDays(today, -10), zona: 'aductor', lado: 'i', tipo: 'cargado', nivel: 4 }), mol({ fecha: addDays(today, -5), zona: 'aductor', lado: 'i', tipo: 'tirante', nivel: 4 }), mol({ fecha: today, zona: 'aductor', lado: 'i', tipo: 'cargado', nivel: 3 })], B).st;
  const ins = molestiaInsights(st, today);
  ok(ins.length === 1 && /Copenhagen/.test(ins[0].tip) && /zurda/.test(ins[0].tip), 'patrón aductor: ' + JSON.stringify(ins));
}
// 9b) Patrón por días: una sola molestia confirmada con «¿Sigue?» dos días más cuenta 3 días
{
  const st = plan([mol({ fecha: addDays(today, -2), zona: 'isquio', lado: 'i', tipo: 'cargado', nivel: 4, updates: [{ fecha: addDays(today, -1), estado: 'igual', nivel: 4 }, { fecha: today, estado: 'igual', nivel: 4 }] })], B).st;
  const ins = molestiaInsights(st, today);
  ok(ins.length === 1 && ins[0].n === 3, 'patrón por días: ' + JSON.stringify(ins.map(x => x.n)));
}
// 9c) Isquios en los dos lados: un ejercicio bilateral pierde UNA serie (no dos) y sale una sola nota de zona
{
  const p = plan([mol({ zona: 'isquio', lado: 'd', tipo: 'cargado', nivel: 5 }), mol({ zona: 'isquio', lado: 'i', tipo: 'cargado', nivel: 5 })], B);
  const bs = base.day.sessions.flatMap(s => loads(s, ['isquios'])).filter(b => b.spec && b.spec.s > 1);
  const ms = p.day.sessions.flatMap(s => s.items || []);
  bs.forEach(b => { const m = ms.find(x => x.id === b.id) || ms.find(x => x.mol && b.slot && x.slot === b.slot); if (m) ok(m.spec.s === b.spec.s - 1, 'isquios ×2: ' + b.id + ' ' + b.spec.s + '→' + m.spec.s); });
  const notes = (p.day.molAdj || []).filter(a => !a.fatiga);
  ok(notes.length === 1 && /ambos lados/.test(notes[0].text) && (notes[0].ids || []).length === 2, 'isquios ×2: notas ' + JSON.stringify(notes.map(a => a.text)));
}
// 9d) Fatiga general: isquios y gemelos en las dos piernas → aviso, sprint ≤ S2 y una serie menos en accesorios
{
  const four = ['isquio', 'pantorrilla'].flatMap(z => ['d', 'i'].map(l => mol({ zona: z, lado: l, tipo: 'cargado', nivel: 4 })));
  const p = plan(four, B);
  const fat = (p.day.molAdj || []).find(a => a.fatiga);
  ok(!!fat && fat.ids.length === 4, 'fatiga general sin aviso: ' + JSON.stringify((p.day.molAdj || []).map(a => a.text)));
  const spr = p.day.sessions.find(x => x.type === 'sprint');
  if (spr) ok(spr.level <= 2, 'fatiga general: sprint S' + spr.level);
  const acc = p.day.sessions.flatMap(s => s.items || []).filter(it => it.cutFat);
  const any = base.day.sessions.flatMap(s => s.items || []).some(it => it.prio >= 2 && it.spec && it.spec.s > 2);
  if (any) ok(acc.length > 0, 'fatiga general: ningún accesorio con una serie menos');
  ok(!p.day.sessions.flatMap(s => s.items || []).some(it => it.cutFat && it.cutState), 'fatiga general: doble recorte con el estado');
}
// 10) Proyección intacta sin molestias
{ const p = plan([], {}); const pr = E.project(p.st, today); ok(pr.phases[4] || pr.phases[5], 'proyección vacía'); }

// 11) Flujo en la app
const { chromium } = require(process.env.PW_PATH || 'playwright');
const store = {};
for (const [col, v] of Object.entries(d)) {
  if (Array.isArray(v)) { store[col] = {}; v.forEach(doc => { const { id, ...rest } = doc; store[col][id] = rest; }); }
  else if (v && typeof v === 'object') { const { id, ...rest } = v; store[col] = { main: rest }; }
}
store.molestias = { 'mol-ayer': { fecha: addDays(today, -1), hora: '20:00', zona: 'pantorrilla', lado: 'i', tipo: 'cargado', nivel: 5, resuelta: false, updates: [], nota: '' } };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); localStorage.removeItem('improve-entreno-v3'); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const click = async (sel) => { await page.locator(sel).first().click({ timeout: 5000 }); await page.waitForTimeout(150); };
let n = 0;
const shot = async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: outDir + '/' + String(++n).padStart(2, '0') + '-' + name + '.png' }); };
const db = () => page.evaluate(() => JSON.parse(localStorage.getItem('improve-local-v1')).molestias || {});
try {
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await shot('hoy-sigue');
  ok(await page.locator('[data-act="mol-follow"][data-id="mol-ayer"]').count() > 0, 'sin «¿Sigue?» para la de ayer');
  await click('[data-act="mol-follow"][data-id="mol-ayer"][data-v="mejor"]');
  await page.waitForTimeout(400);
  const m1 = (await db())['mol-ayer'];
  ok(m1 && m1.updates && m1.updates[0] && m1.updates[0].estado === 'mejor' && m1.updates[0].nivel === 3, '«Mejor» no guardado: ' + JSON.stringify(m1 && m1.updates));
  await click('[data-act="mol-new"]');
  await page.waitForSelector('.bmap.m-select');
  await shot('hoja-molestia');
  await click('[data-act="mol-view"][data-v="back"]');
  await page.locator('polygon[data-act="mol-zone"][data-z="isquio"][data-s="d"]').first().click({ force: true });
  await page.waitForTimeout(200);
  await click('[data-act="mol-tipo"][data-v="dolor"]');
  await click('[data-act="mol-lvl"][data-v="4"]');
  await shot('molestia-isquio-dolor');
  ok(/consulta/.test(await page.locator('.sheet').innerText()), 'vista previa sin aviso de consultar');
  await click('[data-act="mol-save"]');
  await page.waitForTimeout(600);
  const all = await db();
  const nueva = Object.entries(all).find(([id, m]) => id !== 'mol-ayer');
  ok(nueva && nueva[1].zona === 'isquio' && nueva[1].lado === 'd' && nueva[1].tipo === 'dolor' && nueva[1].nivel === 4, 'molestia nueva mal guardada: ' + JSON.stringify(nueva));
  await shot('hoy-ajustado');
  ok(await page.locator('.topbar ~ .scroll-x [data-act="mol-open"]').count() >= 1, 'sin chip de molestia activa');
  // Aviso compacto (una línea) que abre el detalle con «deshacer»; al abrirlo ya no vuelve a aparecer hoy
  const line = page.locator('.mini-alert [data-act="mol-adj"]');
  ok(await line.count() === 1, 'sin aviso compacto de ajuste en Hoy');
  ok(await page.locator('section.card:has-text("Ajustes por molestias")').count() === 0, 'sigue la tarjeta grande de ajustes');
  if (await line.count()) { const bb = await page.locator('.mini-alert').first().boundingBox(); ok(bb.height <= 72, 'aviso compacto demasiado alto: ' + bb.height); await line.first().click(); await page.waitForTimeout(400); }
  const undo = page.locator('.sheet [data-act="mol-undo"]');
  ok(await undo.count() > 0, 'sin ajuste con deshacer en el detalle');
  if (await undo.count()) { await undo.first().click(); await page.waitForTimeout(500); const m2 = (await db())[nueva[0]]; ok(m2 && (m2.noAdjust || []).includes(today), 'deshacer no guardado'); }
  await page.evaluate(() => { const c = document.querySelector('.sheet [data-act="close"]'); if (c) c.click(); });
  await page.waitForTimeout(400);
  ok(await page.locator('.mini-alert [data-act="mol-adj"]').count() === 0, 'el aviso compacto sigue tras abrirlo');
  await shot('hoy-deshecho');
  await page.evaluate(() => { location.hash = '#progreso'; });
  await page.waitForTimeout(600);
  const card = page.locator('section.card:has-text("Molestias · 14 días")').first();
  await card.scrollIntoViewIfNeeded();
  await shot('progreso-molestias');
  ok(await card.locator('.bmap').count() === 2, 'Progreso sin mapa de molestias');
  // 12) Varias zonas a la vez: ambos lados, aplicar a todas y un solo guardado
  await page.evaluate(() => { location.hash = '#hoy'; });
  await page.waitForTimeout(500);
  const before = Object.keys(await db()).length;
  await click('[data-act="mol-new"]');
  await page.waitForSelector('.bmap.m-select');
  await click('[data-act="mol-view"][data-v="back"]');
  await click('[data-act="mol-ambos"]');
  await page.locator('polygon[data-act="mol-zone"][data-z="pantorrilla"][data-s="d"]').first().dispatchEvent('click');
  await page.waitForTimeout(150);
  await click('[data-act="mol-lvl"][data-v="5"]');
  await page.locator('polygon[data-act="mol-zone"][data-z="gluteo"][data-s="d"]').first().dispatchEvent('click');
  await page.waitForTimeout(150);
  ok(await page.locator('.mol-row').count() === 4, 'ambos lados: filas = ' + await page.locator('.mol-row').count());
  await click('[data-act="mol-lvl"][data-v="6"]');
  await click('[data-act="mol-all"]');
  await shot('varias-zonas');
  ok(/Guardar 4/.test(await page.locator('[data-act="mol-save"]').innerText()), 'botón sin «Guardar 4»');
  ok(/Fatiga en varias zonas/.test(await page.locator('.sheet').innerText()), 'vista previa sin fatiga general');
  await click('[data-act="mol-save"]');
  await page.waitForTimeout(600);
  const after = await db();
  // La pantorrilla izquierda ya estaba activa (la de ayer): se actualiza; las otras tres se crean con un grupo común
  const grp = Object.values(after).filter(m => m.fecha === today && ['pantorrilla', 'gluteo'].includes(m.zona));
  ok(grp.length === 3 && grp.every(m => m.nivel === 6 && m.tipo === 'cargado') && new Set(grp.map(m => m.grupo)).size === 1, 'guardado múltiple: ' + JSON.stringify(grp.map(m => [m.zona, m.lado, m.nivel, m.grupo])));
  const ayer = after['mol-ayer'];
  ok(ayer && ayer.updates.some(u => u.fecha === today && u.nivel === 6), 'la activa de ayer no se actualizó: ' + JSON.stringify(ayer && ayer.updates));
  ok(Object.keys(after).length === before + 3, 'se duplicó una zona activa: ' + (Object.keys(after).length - before));
  // Volver a marcar una zona activa la actualiza (no la duplica)
  await click('[data-act="mol-new"]');
  await page.waitForSelector('.bmap.m-select');
  await click('[data-act="mol-view"][data-v="back"]');
  await page.locator('polygon[data-act="mol-zone"][data-z="pantorrilla"][data-s="i"]').first().dispatchEvent('click');
  await page.waitForTimeout(150);
  ok(/se actualiza/.test(await page.locator('.mol-row').first().innerText()), 'zona activa sin «se actualiza»');
  await click('[data-act="mol-lvl"][data-v="8"]');
  await click('[data-act="mol-save"]');
  await page.waitForTimeout(600);
  const pi = Object.values(await db()).filter(m => m.zona === 'pantorrilla' && m.lado === 'i');
  ok(pi.length === 1 && pi[0].updates.some(u => u.fecha === today && u.nivel === 8 && u.estado === 'peor'), 'actualizar zona activa: ' + JSON.stringify(pi));
  // Deshacer el último guardado
  const undoBtn = page.locator('#toast [data-act="mol-undo-save"]');
  if (await undoBtn.count()) { await undoBtn.click(); await page.waitForTimeout(500); const pu = Object.values(await db()).find(m => m.zona === 'pantorrilla' && m.lado === 'i'); ok(pu && !pu.updates.some(u => u.nivel === 8) && pu.updates.some(u => u.nivel === 6), 'deshacer guardado no restauró: ' + JSON.stringify(pu && pu.updates)); }
  else fails.push('sin «Deshacer» tras guardar');
  ok(await page.locator('.topbar ~ .scroll-x [data-act="mol-list"]').count() >= 1, 'sin chip unido de los dos lados');
  await shot('hoy-varias');
} catch (e) { fails.push('PASO: ' + e.message.split('\n')[0]); await shot('ERROR'); }
// 13) «¿Siguen?» agrupado para varias molestias de ayer
try {
  const st2 = JSON.parse(JSON.stringify(store));
  st2.molestias = { 'm-a': { fecha: addDays(today, -1), hora: '20:00', zona: 'isquio', lado: 'd', tipo: 'cargado', nivel: 5, resuelta: false, updates: [], nota: '' }, 'm-b': { fecha: addDays(today, -1), hora: '20:00', zona: 'isquio', lado: 'i', tipo: 'cargado', nivel: 5, resuelta: false, updates: [], nota: '' } };
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
  await ctx2.addInitScript((s) => { localStorage.setItem('improve-local-v1', s); }, JSON.stringify(st2));
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await p2.goto('http://127.0.0.1:8765/?local=1#hoy');
  await p2.waitForSelector('.topbar', { timeout: 15000 });
  await p2.waitForTimeout(500);
  ok(await p2.locator('[data-act="mol-follow-all"]').count() === 3, 'sin «¿Siguen?» agrupado');
  await p2.screenshot({ path: outDir + '/siguen.png' });
  await p2.locator('[data-act="mol-follow-all"][data-v="igual"]').click();
  await p2.waitForTimeout(500);
  const m2 = await p2.evaluate(() => JSON.parse(localStorage.getItem('improve-local-v1')).molestias);
  ok(['m-a', 'm-b'].every(id => m2[id].updates.some(u => u.estado === 'igual')), '«Todas igual» no guardó');
  await ctx2.close();
} catch (e) { fails.push('SIGUEN: ' + e.message.split('\n')[0]); }
await browser.close();
const all2 = fails.concat(errors);
console.log('molestias · fallos:', all2.length); all2.forEach(f => console.log(' ', f));
process.exit(all2.length ? 1 : 0);
