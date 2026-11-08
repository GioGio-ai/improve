// Motor v4.1 en la app (modo local): al registrar el día con «Lo intenso pasa al miércoles», el miércoles recibe la sesión.
// sh test/serve.sh &  node test/motor-ui.mjs <fixture.json> <outdir>
// El fixture necesita una fase con Fuerza A el martes (F3-F4) y un descanso el domingo; el partido del lunes lo agrega la prueba.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-motor'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const MON = '2026-11-02', TUE = '2026-11-03', WED = '2026-11-04';
d.sessions = (d.sessions || []).filter(s => s.date < MON).concat([{ id: 's-partido-lunes', date: MON, type: 'partido', done: true, minutes: 90, rpe: 8, source: 'app' }]);
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
const shot = (n) => page.screenshot({ path: outDir + '/' + n + '.png', fullPage: true });
try {
  // Martes: tras el partido, lo intenso pasa al miércoles
  await page.clock.setFixedTime(new Date(TUE + 'T09:00:00-03:00'));
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await page.evaluate(() => { location.hash = '#entreno'; });
  await page.waitForSelector('.day-sec.is-today', { timeout: 15000 });
  await page.waitForTimeout(600);
  const tueText = await page.locator('.day-sec.is-today').innerText();
  ok(/Lo intenso pasa al miércoles/.test(tueText), 'el martes no avisa que lo intenso pasa al miércoles');
  await shot('01-martes');
  // «Hecha tal cual» de una sesión del martes → congela martes y miércoles
  const btn = page.locator('.day-sec.is-today [data-act="session"]').first();
  await btn.click();
  await page.locator('.sheet [data-act="reg-open"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('.sheet [data-act="quick-done"]').first().click();
  await page.waitForTimeout(300);
  await page.locator('.sheet [data-act="qd-save"]').first().click();
  await page.waitForTimeout(700);
  const plan = ((await local()).settings || {}).main ? (await local()).settings.main.plan || {} : {};
  ok(plan[TUE] && !plan[TUE].auto && plan[TUE].swapTo === WED, 'el martes no quedó fijo con el aviso del movimiento: ' + JSON.stringify(plan[TUE]));
  ok(plan[WED] && plan[WED].auto && (plan[WED].types || []).includes('fuerzaA'), 'el miércoles no recibe la Fuerza A: ' + JSON.stringify(plan[WED]));
  // Miércoles: la sesión movida está y es intensa
  await page.clock.setFixedTime(new Date(WED + 'T09:00:00-03:00'));
  await page.reload();
  await page.waitForSelector('.day-sec.is-today', { timeout: 15000 });
  await page.waitForTimeout(600);
  const wedText = await page.locator('.day-sec.is-today').innerText();
  ok(/Recibe la sesión intensa del martes/.test(wedText), 'el miércoles no dice que recibe la sesión del martes');
  ok(/Fuerza A/.test(wedText) && /Golpeo/.test(wedText), 'el miércoles sin Fuerza A o Golpeo: ' + wedText.replace(/\s+/g, ' ').slice(0, 200));
  await shot('02-miercoles');
} catch (e) { fails.push('PASO: ' + e.message.split('\n')[0]); }

/* v4.2 · F5 sin club: K8 con RT corto antes de los remates y simulación de partido sin compañeros */
const f5 = JSON.parse(JSON.stringify(store));
const injId = Object.keys(f5.injuries || {})[0];
if (injId) Object.assign(f5.injuries[injId], { phase: 5, kickStart: 8, sprintStart: 6, phaseLog: [{ phase: 4, date: '2026-10-10' }, { phase: 5, date: '2026-10-25' }] });
f5.sessions = f5.sessions || {};
f5.sessions['k8-limpio'] = { date: '2026-10-26', type: 'golpeo', done: true, kick: { level: 8, pd: 0, pn: 0 } };
f5.sessions['s6-a'] = { date: '2026-10-21', type: 'sprint', done: true, spr: { level: 6, pd: 0, pn: 0 } };
f5.sessions['s6-b'] = { date: '2026-10-23', type: 'sprint', done: true, spr: { level: 6, pd: 0, pn: 0 } };
delete f5.sessions['s-partido-lunes'];
if (f5.profile && f5.profile.main) { f5.profile.main.trials = []; delete f5.profile.main.partners; }
if (f5.settings && f5.settings.main) f5.settings.main.plan = {};
const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion', geolocation: { latitude: 10, longitude: 10 }, permissions: ['geolocation'] });
await ctx2.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); localStorage.removeItem('improve-entreno-v3'); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(f5));
const p2 = await ctx2.newPage();
p2.on('pageerror', e => errors.push('pageerror: ' + e.message));
try {
  await p2.clock.setFixedTime(new Date(TUE + 'T12:00:00-03:00'));
  await p2.goto('http://127.0.0.1:8765/?local=1#hoy');
  await p2.waitForSelector('.topbar', { timeout: 15000 });
  await p2.locator('.tl-blk[data-key="campo"] .main').first().click();
  await p2.locator('.sheet [data-act="start-block"]').first().click();
  await p2.waitForSelector('.train', { timeout: 10000 });
  await p2.waitForTimeout(500);
  const dr = await p2.evaluate(() => JSON.parse(localStorage.getItem('improve-entreno-v3') || 'null'));
  const steps = (dr && dr.steps) || [];
  const gi = steps.findIndex(s => s.kind === 'golpeo');
  ok(gi > 0 && steps[gi - 1].kind === 'rt' && steps[gi - 1].pre, 'F5 martes: el K8 no tiene el RT corto justo antes: ' + steps.map(s => s.kind + (s.pre ? '*' : '')).join(','));
  ok(gi === steps.length - 1 || steps.slice(gi + 1).every(s => s.kind !== 'sprint'), 'F5 martes: el sprint va después de los remates K8');
  /* v4.3 · la batería de rendimiento va primero: 10 m con un valor único que se guarda al escribir */
  const firstWork = steps.findIndex(s => !s.warmup);
  ok(steps[firstWork] && steps[firstWork].kind === 'test' && steps[firstWork].key === 's10', 'F5 martes: la cancha no empieza por la batería (10 m): ' + steps.map(s => s.kind + (s.key ? ':' + s.key : '')).slice(0, 8).join(','));
  await p2.locator('[data-act="tr-skipwarm"]').first().click();
  await p2.waitForSelector('#tr-single', { timeout: 5000 });
  await p2.fill('#tr-single', '1,82');
  await p2.waitForTimeout(900);
  const tdoc = await p2.evaluate((d) => (JSON.parse(localStorage.getItem('improve-local-v1') || '{}').tests || {})['t-' + d], TUE);
  ok(tdoc && Math.abs(tdoc.s10 - 1.82) < 0.001, 'F5 martes: el 10 m no se guardó: ' + JSON.stringify(tdoc));
  await p2.screenshot({ path: outDir + '/03-f5-cancha.png' });
  await p2.locator('[data-act="tr-min"]').first().click();
  await p2.waitForTimeout(300);
  // Sábado: simulación de partido sin compañeros; con compañeros, juego reducido
  await p2.evaluate(() => { location.hash = '#entreno'; });
  await p2.waitForSelector('.day-sec', { timeout: 15000 });
  await p2.waitForTimeout(500);
  const satTxt = await p2.locator('.day-sec').filter({ hasText: /sábado|Sáb/i }).first().innerText().catch(() => '');
  ok(/Simulación/.test(satTxt), 'F5 sábado sin compañeros no muestra la simulación de partido: ' + satTxt.replace(/\s+/g, ' ').slice(0, 160));
  await p2.evaluate(() => { location.hash = '#perfil'; });
  await p2.waitForSelector('[data-act="partners"]', { timeout: 15000 });
  await p2.locator('[data-act="partners"]').first().click();
  await p2.waitForTimeout(500);
  const prof = await p2.evaluate(() => JSON.parse(localStorage.getItem('improve-local-v1') || '{}').profile);
  ok(prof && prof.main && prof.main.partners === true, 'Perfil: «Tengo con quién jugar» no se guarda');
  await p2.evaluate(() => { location.hash = '#entreno'; });
  await p2.waitForSelector('.day-sec', { timeout: 15000 });
  await p2.waitForTimeout(500);
  const satTxt2 = await p2.locator('.day-sec').filter({ hasText: /sábado|Sáb/i }).first().innerText().catch(() => '');
  ok(/Juego/.test(satTxt2) && !/Simulación/.test(satTxt2), 'F5 sábado con compañeros sigue en simulación: ' + satTxt2.replace(/\s+/g, ' ').slice(0, 160));
  /* v5.0 · sin comida: Perfil sin clima para el agua ni meta de peso */
  await p2.evaluate(() => { location.hash = '#perfil'; });
  await p2.waitForSelector('.cover', { timeout: 15000 });
  ok(!(await p2.locator('[data-act="geo"]').count()), 'Perfil: sigue el clima para el agua');
  await p2.screenshot({ path: outDir + '/04-f5-semana.png', fullPage: true });
} catch (e) { fails.push('PASO F5: ' + e.message.split('\n')[0]); await p2.screenshot({ path: outDir + '/ERROR-f5.png' }).catch(() => {}); }
await browser.close();
console.log('motor-ui · fallos:', fails.length, '· errores:', errors.length);
fails.concat(errors).slice(0, 20).forEach(f => console.log('  ', f));
process.exit(fails.length || errors.length ? 1 : 0);
