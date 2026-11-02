// Contar el entreno (v4.4) en la app, modo local: relato → bloques con IA (simulada) o sin IA → editor → registro → plan.
// sh test/serve.sh &  node test/contar.mjs <fixture.json> <outdir>
// El fixture necesita una lesión activa del recto femoral derecho y el domingo 1 nov de descanso.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
const [fixture, outDir = 'shots-contar'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const SUN = '2026-11-01', MON = '2026-11-02';
const NOTE = 'Sesión con un compañero, (Calentamiento 15 mins.) mucha definición con ambas piernas, diferentes posiciones, control+definicion, en velocidad de primera cruzado, tiros libres, 1vs1, cambios de frente por abajo y por arriba de muy lejos y lejos. Para terminar un poco de estiramiento y caminata y tomar agua.';
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
d.sessions = (d.sessions || []).filter(s => s.date < SUN).concat([{ id: 's-notas', date: '2026-10-31', type: 'libre', title: 'Sesión libre', done: true, minutes: 60, notes: 'Dominio y pases con la zurda a la pared, tranqui', source: 'manual' }]);
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
const sessions = async () => Object.entries((await local()).sessions || {}).map(([id, v]) => Object.assign({ id }, v));
const shot = (n) => page.screenshot({ path: outDir + '/' + n + '.png' });
const sheet = page.locator('.sheet');
const tap = async (sel) => { await page.locator(sel).first().click(); await page.waitForTimeout(250); };
try {
  await page.clock.setFixedTime(new Date(SUN + 'T21:10:00-03:00'));
  await page.goto('http://127.0.0.1:8765/?local=1#entreno');
  await page.waitForSelector('.day-sec.is-today', { timeout: 15000 });

  /* 1 · Contar con IA desde Entreno */
  await tap('.page-head [data-act="train-text"]');
  ok(await sheet.locator('#tt-txt').count() === 1, 'no abre la hoja Contar el entreno');
  await sheet.locator('#tt-txt').fill(NOTE);
  await sheet.locator('#tt-start').fill('18:50');
  await sheet.locator('#tt-end').fill('20:50');
  await page.waitForTimeout(150);
  ok(/2 h de sesión/.test(await sheet.locator('#tt-min').innerText()), 'la duración no sale de las horas: ' + await sheet.locator('#tt-min').innerText());
  await shot('01-contar');
  await tap('.sheet [data-act="tt-go"]');
  await page.waitForSelector('.sheet[data-sid="editor"]', { timeout: 8000 });
  await page.waitForTimeout(300);
  const ed = page.locator('.sheet[data-sid="editor"]');
  ok(await ed.locator('.cl-item').count() === 7, 'el editor no muestra los 7 bloques de la IA: ' + await ed.locator('.cl-item').count());
  ok(/Cancha con un compañero/.test(await ed.locator('#ed-title').inputValue()), 'el título no viene de la IA');
  ok(await ed.locator('[data-act="cl-band"][data-k="der"][data-v="muchos"].on').count() === 1, 'golpes con la derecha no quedan en «muchos»');
  ok(/Estimado por lo que contaste/.test(await ed.innerText()), 'falta el aviso de RPE estimado');
  ok(/por encima de tu escalera/.test(await ed.innerText()), 'falta el aviso de golpes fuertes por encima de la escalera');
  ok((await ed.locator('#ed-min').inputValue()).startsWith('120'), 'los minutos no son 120: ' + await ed.locator('#ed-min').inputValue());
  await shot('02-editor-cancha');
  await page.screenshot({ path: outDir + '/02-editor-cancha-full.png', fullPage: false });
  // Corregir: zurda «varios», un bloque a intensidad media, dolor 1 durante
  await tap('.sheet [data-act="cl-band"][data-k="izq"][data-v="varios"]');
  ok(await ed.locator('[data-act="cl-band"][data-k="izq"][data-v="varios"].on').count() === 1, 'no cambia la banda de la izquierda');
  await tap('.sheet .cl-item [data-act="cl-blk"] >> nth=4');
  ok(await page.locator('.sheet[data-sid="cl-blk"]').count() === 1, 'no abre la hoja del bloque');
  await shot('03-bloque');
  await tap('.sheet [data-act="cl-set"][data-k="int"][data-v="media"]');
  await tap('.sheet [data-act="close"]');
  ok(/1 contra 1[\s\S]*Media/.test(await ed.locator('.cl-item >> nth=4').innerText()), 'el cambio de intensidad del bloque no se ve');
  await tap('.sheet [data-act="cl-pain"][data-name="pd"][data-v="1"]');
  await tap('.sheet [data-act="ed-save"]');
  await page.waitForTimeout(500);
  const saved = (await sessions()).find(s => s.date === SUN && s.type === 'cancha');
  ok(saved, 'no se guardó la sesión de cancha del domingo');
  if (saved) {
    ok(saved.campo && saved.campo.bloques.length === 7 && saved.campo.golpes.der === 'muchos' && saved.campo.golpes.izq === 'varios', 'bloques o bandas mal guardados: ' + JSON.stringify(saved.campo && saved.campo.golpes));
    ok(saved.campo.side === 'd' && saved.campo.pd === 1 && saved.campo.ia === true && !('auto' in saved.campo), 'lado, dolor o marca de IA mal guardados');
    ok(saved.minutes === 120 && saved.rpe === 8 && saved.source === 'ia', 'minutos, RPE o fuente mal guardados: ' + saved.minutes + ' ' + saved.rpe + ' ' + saved.source);
    ok(saved.campo.texto === NOTE && saved.notes === NOTE, 'no se guardó el relato');
    ok(saved.campo.start === '18:50' && saved.campo.end === '20:50', 'no se guardaron las horas');
  }
  ok(/intenso/.test(await page.locator('#toast').innerText().catch(() => '')), 'el aviso al guardar no dice que cuenta como intenso');
  const sunTxt = await page.locator('.day-sec.is-today').innerText();
  ok(/Cancha con un compañero/.test(sunTxt), 'el domingo no muestra la sesión contada');
  await shot('04-semana');

  /* 2 · Revisión del registro */
  await page.locator('.day-sec.is-today [data-act="edit-log"]').first().click();
  await page.waitForTimeout(300);
  await tap('.sheet [data-act="close"]');
  await tap('.seg [data-act="en-tab"][data-v="historial"]');
  await page.locator('.day-sec [data-act="session"][data-type="cancha"]').first().click();
  await page.waitForTimeout(400);
  const rev = await sheet.innerText();
  ok(/Intensa para el RF/i.test(rev) && /Golpes fuertes estimados/i.test(rev) && /no cuenta para subir de nivel/i.test(rev), 'la revisión no muestra la tarjeta de cancha');
  await shot('05-revision');
  await tap('.sheet [data-act="close"]');

  /* 3 · Notas viejas → «Ordenar mis notas con IA» → sin IA */
  await page.locator('.day-sec [data-act="session"][data-type="libre"]').first().click();
  await page.waitForTimeout(400);
  ok(await sheet.locator('[data-act="train-text"]').count() === 1, 'falta «Ordenar mis notas con IA» en un registro con notas');
  await tap('.sheet [data-act="train-text"]');
  ok((await sheet.locator('#tt-txt').inputValue()).startsWith('Dominio y pases'), 'el relato no trae las notas del registro');
  await tap('.sheet [data-act="tt-local"]');
  await page.waitForSelector('.sheet[data-sid="editor"]', { timeout: 5000 });
  const ed2 = page.locator('.sheet[data-sid="editor"]');
  ok(await ed2.locator('.cl-item').count() === 2, 'sin IA: no ordena dominio y pases en 2 bloques: ' + await ed2.locator('.cl-item').count());
  ok(await ed2.locator('[data-act="cl-band"][data-k="der"][data-v="no"].on').count() === 1, 'sin IA: la zurda sola no debería sumar golpes con la derecha');
  await tap('.sheet [data-act="ed-save"]');
  await page.waitForTimeout(400);
  const re = (await sessions()).find(s => s.id === 's-notas');
  ok(re && re.type === 'cancha' && re.campo && re.campo.bloques.length === 2 && re.minutes === 60 && re.rpe === 4, 'el registro ordenado no queda como cancha con sus datos: ' + JSON.stringify(re && { t: re.type, m: re.minutes, r: re.rpe }));
  ok((await sessions()).filter(s => s.date === '2026-10-31' && s.notes && s.notes.startsWith('Dominio')).length === 1, 'ordenar duplicó el registro');

  /* 4 · Balón en el selector de ejercicios */
  await tap('.seg [data-act="en-tab"][data-v="semana"]');
  await tap('.page-head [data-act="new-log"]');
  await tap('.sheet [data-act="ed-add"]');
  await tap('.sheet [data-act="pick-tab"][data-v="balon"]');
  ok(await sheet.locator('[data-act="pick"][data-id="cl_1v1"]').count() === 1, 'el selector no tiene la pestaña Balón con 1 contra 1');
  await shot('06-selector-balon');
  await tap('.sheet [data-act="pick"][data-id="cl_1v1"]');
  const ed3 = page.locator('.sheet[data-sid="editor"]');
  ok(await ed3.locator('.cl-item').count() === 1, 'el bloque elegido no aparece en el editor');
  ok((await ed3.locator('#ed-min').inputValue()).startsWith('15'), 'los minutos no siguen al bloque agregado');
  ok(await ed3.locator('[data-act="cl-band"][data-k="sprints"].on').getAttribute('data-v') !== 'no', 'el 1 contra 1 no suma sprints y duelos');
  await tap('.sheet [data-act="close"]');

  /* 5 · Biblioteca de balón y hoja del día */
  await tap('.seg [data-act="en-tab"][data-v="ejercicios"]');
  await tap('.seg [data-act="ex-tab"][data-v="balon"]');
  const lib = await page.locator('#view').innerText();
  ok(/Con compañeros o por tu cuenta/i.test(lib) && /Cambios de frente/i.test(lib) && /Tiros libres/i.test(lib), 'la biblioteca de balón no muestra las actividades libres');
  await page.screenshot({ path: outDir + '/07-biblioteca-balon.png', fullPage: true });
  await tap('.seg [data-act="en-tab"][data-v="semana"]');
  await page.locator('.day-sec.is-today [data-act="day"]').first().click();
  await page.waitForTimeout(400);
  ok(await sheet.locator('[data-act="train-text"]').count() === 1, 'la hoja del día no ofrece «Contarla con IA»');
  await tap('.sheet [data-act="close"]');

  /* 6 · Lunes: ¿cómo amaneció el recto femoral? → 4/10 manda sobre el plan */
  await page.clock.setFixedTime(new Date(MON + 'T08:30:00-03:00'));
  await page.goto('http://127.0.0.1:8765/?local=1#hoy');
  await page.waitForSelector('.topbar', { timeout: 15000 });
  await page.waitForTimeout(700);
  const prompt = page.locator('section.card.t-pain:has-text("tras la cancha del domingo")');
  ok(await prompt.count() === 1, 'el lunes no pregunta cómo amaneció el recto femoral tras la cancha');
  await prompt.screenshot({ path: outDir + '/08-dolor-lunes.png' }).catch(() => {});
  await prompt.locator('[data-act="pn"][data-v="4"]').click();
  await page.waitForTimeout(600);
  const after = (await sessions()).find(s => s.date === SUN && s.type === 'cancha');
  ok(after && after.campo.pn === 4, 'no guarda el dolor del día siguiente en la cancha');
  await page.evaluate(() => { location.hash = '#entreno'; });
  await page.waitForSelector('.day-sec.is-today', { timeout: 10000 });
  await page.waitForTimeout(500);
  const monTxt = await page.locator('.day-sec.is-today').innerText();
  ok(/Dolor 4\/10/.test(monTxt) && !/Balón|Circuito RT/.test(monTxt), 'el lunes sigue con cancha tras el dolor 4/10: ' + monTxt.replace(/\n/g, ' | ').slice(0, 300));
  await shot('09-lunes');
} catch (e) { fails.push('PASO: ' + String(e.message || e).split('\n')[0]); await shot('zz-error').catch(() => {}); }
console.log('contar · fallos: ' + fails.length + ' · errores: ' + errors.length);
fails.forEach(f => console.log('  ' + f)); errors.slice(0, 10).forEach(e => console.log('  ' + e));
await browser.close();
process.exit(fails.length || errors.length ? 1 : 0);
