// Aprende: dato del día estable y rotativo, ficha completa, guardar/lo aplico, búsqueda,
// investigación con citas validadas (modo local), privadas fuera de la lista y del coach.
// node test/aprende.mjs <fixture.json> <outdir>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-aprende'] = process.argv.slice(2);
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
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const errors = [];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
const page = await ctx.newPage();
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
let n = 0;
const shot = async (name, full) => { await page.waitForTimeout(400); await page.screenshot({ path: outDir + '/' + String(++n).padStart(2, '0') + '-' + name + '.png', fullPage: !!full }); };
const click = async (sel) => { await page.locator(sel).first().click({ timeout: 6000 }); await page.waitForTimeout(200); };
const db = (col) => page.evaluate((c) => (JSON.parse(localStorage.getItem('improve-local-v1') || '{}')[c]) || {}, col);
try {
  await page.clock.setFixedTime(new Date(today + 'T09:30:00-03:00'));
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await page.waitForSelector('.dato-card .dato-t', { timeout: 8000 });
  ok(await page.locator('.topbar a[href="#aprende"]').count() === 1, 'sin acceso a Aprende en la cabecera');
  const t1 = await page.locator('.dato-card .dato-t').innerText();
  const a1 = (await db('aprende')).main || {};
  ok(a1.dia && a1.dia.fecha === today && a1.vistos && a1.vistos[a1.dia.id] === today, 'dato del día no guardado: ' + JSON.stringify(a1.dia));
  await page.locator('.dato-card').scrollIntoViewIfNeeded();
  await shot('hoy-dato');
  // Estable al recargar
  await page.reload(); await page.waitForSelector('.dato-card .dato-t', { timeout: 8000 });
  ok(await page.locator('.dato-card .dato-t').innerText() === t1, 'el dato del día cambió al recargar');
  // Más información → Aprende con la ficha abierta
  await click('.dato-card [data-act="dato-open"].linkbtn');
  await page.waitForSelector('.sheet .dato-hero', { timeout: 6000 });
  ok(await page.evaluate(() => location.hash) === '#aprende', 'no navegó a #aprende');
  ok(await page.locator('#nav a[data-nav="hoy"].on').count() === 1, 'Aprende no marca Hoy en la barra');
  const sheetTxt = await page.locator('.sheet').innerText();
  ok(/Por qué funciona/i.test(sheetTxt) && /Qué dice la evidencia/i.test(sheetTxt) && /Cómo aplicarlo/i.test(sheetTxt), 'ficha incompleta');
  ok(await page.locator('.sheet a.study[href*="pubmed.ncbi.nlm.nih.gov"]').count() >= 1, 'ficha sin enlace a PubMed');
  await shot('ficha');
  await click('.sheet [data-act="dato-save"]');
  await click('.sheet [data-act="dato-aplico"]');
  const a2 = (await db('aprende')).main || {};
  ok((a2.guardados || []).includes(a1.dia.id) && (a2.aplico || []).includes(a1.dia.id), 'guardar / lo aplico no guardado');
  await click('.sheet [data-act="close"]');
  // Filtros y búsqueda
  await click('[data-act="apr-filter"][data-v="guardados"]');
  ok(await page.locator('.dt-row[data-act="dato-open"]').count() === 1, 'filtro guardados ≠ 1');
  await click('[data-act="apr-filter"][data-v="todos"]');
  ok(await page.locator('.dt-row[data-act="dato-open"]').count() === 90, 'lista completa ≠ 90: ' + await page.locator('.dt-row[data-act="dato-open"]').count());
  await page.locator('#apr-q').fill('creatina');
  await page.waitForTimeout(500);
  const rows = await page.locator('.dt-row[data-act="dato-open"]').count();
  ok(rows >= 2 && rows < 10, 'búsqueda «creatina»: ' + rows);
  await page.locator('#apr-q').fill('');
  await page.waitForTimeout(400);
  await shot('aprende-lista');
  // Investigar (modo local: estudios e IA simulados)
  await click('[data-act="apr-tab"][data-v="investigar"]');
  await page.locator('#inv-q').fill('¿Cuánto afecta dormir poco al sprint?');
  await click('[data-act="inv-go"]');
  await page.waitForSelector('.sheet .findings', { timeout: 15000 });
  await shot('informe');
  const inv = Object.values(await db('investigaciones'));
  ok(inv.length === 1, 'investigación no guardada');
  const x = inv[0] || {};
  ok(x.nivel === 'B', 'nivel no conservador: ' + x.nivel);
  ok((x.hallazgos || []).length === 2 && x.hallazgos.every(h => h.ids.every(id => id !== 'E9')), 'citas inválidas no descartadas: ' + JSON.stringify(x.hallazgos));
  ok((x.estudios || []).every(s => s.id !== 'E9') && (x.stats || {}).participantes === 40, 'estudios o participantes mal: ' + JSON.stringify(x.stats));
  ok(await page.locator('.sheet .cite').count() >= 2, 'sin citas en el informe');
  await click('.sheet [data-act="close"]');
  // Privada: no aparece en la lista ni en el contexto del coach
  await click('[data-act="inv-priv"]');
  await page.locator('#inv-q').fill('Tema privado de prueba');
  await click('[data-act="inv-go"]');
  await page.waitForSelector('.sheet .findings', { timeout: 15000 });
  await click('.sheet [data-act="close"]');
  await click('[data-act="inv-showpriv"]');
  const visible = await page.locator('[data-act="inv-open"]').count();
  ok(visible === 1, 'la privada se ve en la lista por defecto: ' + visible);
  const cc = await page.evaluate(() => window.IMPROVE.coachCtx().aprendizaje);
  ok(cc && cc.investigaciones.length === 1 && !cc.investigaciones.some(i => /privado/i.test(i.tema)), 'el coach ve la privada: ' + JSON.stringify(cc && cc.investigaciones.map(i => i.tema)));
  ok(cc && cc.loQueAplica.length === 1 && cc.datoDeHoy, 'el coach no ve lo que aplica o el dato de hoy');
  await shot('investigar');
  // Otro día: dato distinto (rota sin repetir)
  await page.clock.setFixedTime(new Date(addDays(today, 1) + 'T09:30:00-03:00'));
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.dato-card .dato-t', { timeout: 8000 });
  ok(await page.locator('.dato-card .dato-t').innerText() !== t1, 'el dato de mañana repite el de hoy');
} catch (e) { fails.push('PASO: ' + e.message.split('\n')[0]); await shot('ERROR'); }
await browser.close();
fs.writeFileSync(outDir + '/errors.txt', errors.concat(fails).join('\n'));
console.log('aprende · fallos: ' + fails.length + ' · errores: ' + errors.length);
fails.concat(errors).slice(0, 20).forEach(x => console.log('  ' + x));
