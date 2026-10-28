// Flujos principales en modo local: node test/flows.mjs <fixture.json> <outdir> <foto.jpg>
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots', photo] = process.argv.slice(2);
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
const click = async (sel, opts) => { await page.locator(sel).first().click(Object.assign({ timeout: 5000 }, opts || {})); await page.waitForTimeout(160); };
const step = async (name, fn) => { try { await fn(); } catch (e) { errors.push('PASO ' + name + ': ' + e.message.split('\n')[0]); await shot('ERROR-' + name); } };

await page.goto('http://127.0.0.1:8765/?local=1#hoy');
await page.waitForSelector('.topbar', { timeout: 15000 });

await step('arrastre', async () => {
  const grip = page.locator('[data-drag="campo"]').first();
  await grip.scrollIntoViewIfNeeded();
  const b = await grip.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2 + i * 8); await page.waitForTimeout(16); }
  await shot('arrastrando');
  await page.mouse.up();
  await page.waitForTimeout(300);
  await shot('arrastre-soltado');
  const t = await page.locator('#toast').innerText().catch(() => '');
  console.log('toast arrastre:', t.replace(/\n/g, ' '));
  await click('#toast [data-act="ag-undo"]');
  await page.waitForTimeout(300);
});

await step('bloque-cancha', async () => {
  await click('.tl-blk[data-key="campo"] .main');
  await shot('hoja-bloque-cancha');
  await click('.sheet [data-act="start-block"]');
  await page.waitForSelector('.train');
  await shot('entreno-calentamiento-1');
  await click('.set.cur .go, .set .go');
  await shot('entreno-hold');
  await click('[data-act="tr-hold-stop"]');
  await page.waitForTimeout(600);
  await shot('entreno-calentamiento-2');
  await click('[data-act="tr-skipwarm"]');
  await shot('entreno-sprint');
  await click('.reps button[data-k="0"]');
  await shot('entreno-descanso-grande');
  await click('[data-act="tr-rest"][data-d="15"]');
  await click('[data-act="tr-rest-min"]');
  await shot('entreno-descanso-mini');
  await click('.restbar [data-act="tr-rest-skip"]');
  for (let k = 1; k < 6; k++) { await click('.reps button[data-k="' + k + '"]'); const r = page.locator('[data-act="tr-rest-skip"]'); if (await r.count()) await r.first().click(); }
  await click('[data-act="tr-pd"][data-v="0"]');
  await click('[data-act="tr-next"]');
  await shot('entreno-golpeo');
  for (let k = 0; k < 6; k++) await click('[data-act="tr-count"][data-d="5"]');
  await click('[data-act="tr-pd"][data-v="1"]');
  await shot('entreno-golpeo-contado');
  await click('[data-act="tr-copy"]');
  await shot('copiar-nombre');
  await click('.sheet [data-act="close"]');
  await click('.tbar [data-act="tr-finish"]');
  await shot('terminar');
  await click('[data-act="fin-scale"][data-name="rpe"][data-v="6"]');
  await click('[data-act="fin-save"]');
  await shot('post-sesion');
  await click('.sheet-foot [data-act="close"]');
  await shot('hoy-tras-cancha');
});

await step('gimnasio-sabado', async () => {
  await page.evaluate(() => { location.hash = '#entreno'; });
  await page.waitForTimeout(500);
  await click('[data-act="session"][data-date="2026-10-31"][data-type="fuerzaA"]');
  await shot('hoja-sesion-fuerzaA');
  await click('.sheet [data-act="start"]');
  await page.waitForSelector('.train');
  await shot('gym-calentamiento');
  await click('[data-act="tr-skipwarm"]');
  await shot('gym-ej-1');
  for (let i = 0; i < 10; i++) {
    const side = await page.locator('.set .i small').count();
    const reps = await page.locator('.set.open input[data-f="reps"]').count();
    if (side && reps) break;
    await click('[data-act="tr-next"]');
  }
  await shot('gym-unilateral');
  await click('.set.cur .go');
  await shot('gym-unilateral-tras-der');
  await click('.set.cur .go');
  await shot('gym-descanso-tras-ambas');
  await click('[data-act="tr-rest-skip"]');
  await click('[data-act="tr-fb"][data-v="facil"]');
  await shot('gym-feedback');
  await click('[data-act="tr-ai"]');
  await page.waitForTimeout(1200);
  await shot('gym-ia-como-se-hace');
  await click('.sheet [data-act="close"]');
  const busy = page.locator('[data-act="tr-busy"]');
  for (let i = 0; i < 8 && !(await busy.count()); i++) await click('[data-act="tr-next"]');
  if (await busy.count()) { await busy.first().click(); await shot('gym-maquina-ocupada'); await click('.sheet [data-act="tr-alt"][data-mode="hoy"]'); await shot('gym-alternativa-hoy'); }
  await click('.tbar [data-act="tr-min"]');
  await shot('gym-pausado');
});

await step('comida-texto', async () => {
  await page.evaluate(() => { location.hash = '#comida'; });
  await page.waitForTimeout(500);
  await click('[data-act="meal-text"]');
  await page.fill('#meal-txt', '3 huevos revueltos, 200 g de mandioca, un vaso de leche de cabra y una banana con miel');
  await shot('comida-texto');
  await click('[data-act="meal-text-go"]');
  await page.waitForSelector('.ai-items', { timeout: 8000 });
  await shot('comida-confirmar-texto');
  await click('[data-act="meal-save"]');
  await shot('comida-guardada');
});

await step('comida-foto', async () => {
  if (!photo) return;
  const [fc] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-act="meal-photo"]').first().click()]);
  await fc.setFiles(photo);
  await page.waitForTimeout(300);
  await shot('foto-analizando');
  await page.waitForSelector('.ai-items', { timeout: 10000 });
  await shot('foto-confirmar');
  await click('[data-act="meal-save"]');
  await shot('foto-guardada');
});

await step('test-en-vivo', async () => {
  await page.evaluate(() => { location.hash = '#progreso'; });
  await page.waitForTimeout(400);
  await shot('progreso');
  await click('[data-act="guide"][data-g="fks"]');
  await shot('explicacion-fks');
  await click('.sheet [data-act="close"]');
  await page.evaluate(() => { location.hash = '#perfil'; });
  await page.waitForTimeout(400);
  await shot('perfil');
  await page.evaluate(() => { location.hash = '#coach'; });
  await page.waitForTimeout(400);
  await click('[data-act="coach-ask"]');
  await page.waitForTimeout(2600);
  await shot('coach');
});

fs.writeFileSync(outDir + '/errors.txt', errors.join('\n'));
console.log('errores:', errors.length); errors.forEach(e => console.log(' ', e));
await browser.close();
