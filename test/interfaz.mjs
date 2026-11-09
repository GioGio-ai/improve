// v5.1.1 · interfaz en el teléfono (modo local): lo que se rompía a 360-390 px y al volver a la app.
// node test/interfaz.mjs <fixture.json> <outdir>
// Fija su propia fecha (lunes 9 nov 2026, 11:30): no depende del día en que se corra.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PW_PATH || 'playwright');
import fs from 'node:fs';
const [fixture, outDir = 'shots'] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const d = fixture ? JSON.parse(fs.readFileSync(fixture, 'utf8')) : {};
/* Puesta a punto de 9 hacia el 23 (como el plan real): suma el chip largo de Hoy y la tarjeta del bloque */
if (d.profile) Object.assign(d.profile, { trials: ['2026-11-23'], block: { tipo: 'pretemporada', desde: '2026-11-09', hasta: '2026-11-23', enfoque: 'puesto' }, viaje: { fecha: '2026-11-21', horas: 18 } });
const store = {};
for (const [col, v] of Object.entries(d)) {
  if (Array.isArray(v)) { store[col] = {}; v.forEach(doc => { const { id, ...rest } = doc; store[col][id] = rest; }); }
  else if (v && typeof v === 'object') { const { id, ...rest } = v; store[col] = { main: rest }; }
}
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const errors = [];
const browser = await chromium.launch();

/* Área táctil real: el elemento más su ::before/::after posicionado (así se agrandan pills, chips y botones chicos) */
const SMALL_TARGETS = (rootSel) => {
  const root = document.querySelector(rootSel); if (!root) return ['sin ' + rootSel];
  const hit = (el) => {
    const r = el.getBoundingClientRect(); let L = r.left, T = r.top, R = r.right, B = r.bottom;
    const es = getComputedStyle(el);
    if (es.position !== 'static') for (const ps of ['::before', '::after']) {
      const cs = getComputedStyle(el, ps);
      if (cs.content === 'none' || cs.content === 'normal' || cs.position !== 'absolute' || cs.pointerEvents === 'none') continue;
      const v = ['top', 'left', 'right', 'bottom'].map(k => parseFloat(cs[k])); if (v.some(isNaN)) continue;
      const pl = r.left + parseFloat(es.borderLeftWidth), pt = r.top + parseFloat(es.borderTopWidth);
      L = Math.min(L, pl + v[1]); T = Math.min(T, pt + v[0]); R = Math.max(R, pl + el.clientWidth - v[2]); B = Math.max(B, pt + el.clientHeight - v[3]);
    }
    return [R - L, B - T];
  };
  const out = [];
  root.querySelectorAll('button, a[href], [data-act]:not(polygon):not(.scrim), input:not([type=hidden]), select, textarea').forEach(el => {
    if (!el.getClientRects().length || el.closest('details:not([open])') && !el.closest('summary') || el.closest('[hidden]') || getComputedStyle(el).visibility === 'hidden') return;
    const [w, h] = hit(el);
    if (w < 43.5 || h < 43.5) out.push((el.getAttribute('data-act') || el.className || el.tagName) + ' ' + Math.round(w) + '×' + Math.round(h) + ' «' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24) + '»');
  });
  return out;
};
/* Controles encimados (un <input type=date> que tapa al de al lado) */
const OVERLAPS = (rootSel) => {
  /* El pie fijo de la hoja («Guardar») flota sobre el contenido a propósito: no cuenta */
  const els = [...document.querySelectorAll(rootSel + ' input, ' + rootSel + ' select, ' + rootSel + ' textarea, ' + rootSel + ' button')].filter(e => e.getClientRects().length && !e.closest('.sheet-foot'));
  const out = [];
  for (let i = 0; i < els.length; i++) for (let j = i + 1; j < els.length; j++) {
    const a = els[i].getBoundingClientRect(), b = els[j].getBoundingClientRect();
    if (els[i].contains(els[j]) || els[j].contains(els[i])) continue;
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) out.push((els[i].id || els[i].className) + ' ⟂ ' + (els[j].id || els[j].className));
  }
  return out;
};

for (const [W, H] of [[360, 740], [390, 844]]) {
  const tag = W + 'px';
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
  await ctx.clock.install({ time: new Date('2026-11-09T11:30:00-03:00') });
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
  const page = await ctx.newPage();
  page.on('console', m => { if (m.type() === 'error') errors.push(tag + ' ' + m.text()); });
  page.on('pageerror', e => errors.push(tag + ' pageerror: ' + e.message));
  const go = async (h) => { await page.evaluate((x) => { location.hash = x; }, h); await page.waitForTimeout(450); };
  const closeAll = async () => { for (let i = 0; i < 4 && await page.locator('#sheet-root .scrim:not(.out)').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(150); } await page.waitForTimeout(320); };
  try {
    await page.goto('http://127.0.0.1:8765/?local=1#hoy');
    await page.waitForSelector('.topbar', { timeout: 15000 });
    await page.waitForTimeout(500);

    /* Hoy · agenda: ningún bloque corta su texto (el de 45-53 min cortaba el título) */
    const blk = await page.evaluate(() => [...document.querySelectorAll('.tl-blk')].map(b => { const m = b.querySelector('.main'); return { cls: b.className, over: m.scrollHeight - m.clientHeight, txt: b.innerText.replace(/\n/g, ' / ') }; }));
    ok(blk.length >= 2, tag + ' la agenda no tiene bloques');
    blk.forEach(b => ok(b.over <= 1, tag + ' bloque cortado (' + b.over + ' px): ' + b.txt));
    ok(blk.some(b => /\bmid\b/.test(b.cls)), tag + ' sin bloque de dos líneas (Cancha de ~50 min)');
    /* Hoy · el chip de la puesta a punto se lee entero */
    const chip = await page.evaluate(() => { const c = document.querySelector('.hoy-head [data-g="puesto9"]'); if (!c) return null; const r = c.getBoundingClientRect(); return { right: r.right, w: innerWidth }; });
    ok(chip && chip.right <= chip.w - 8, tag + ' el chip «Puesta a punto» queda cortado: ' + JSON.stringify(chip));
    /* Íconos: ninguno vacío (faltaban «pin» y «more») */
    const empty = async () => page.evaluate(() => [...document.querySelectorAll('span.ic')].filter(s => !s.querySelector('svg') && s.getClientRects().length).map(s => (s.parentElement.textContent || '').trim().slice(0, 30)));
    ok(!(await empty()).length, tag + ' íconos vacíos en Hoy: ' + (await empty()).join(' | '));
    ok(!(await page.evaluate(SMALL_TARGETS, '#view')).length, tag + ' objetivos táctiles < 44 px en Hoy: ' + (await page.evaluate(SMALL_TARGETS, '#view')).join(' · '));

    /* Perfil · tarjeta del bloque: viaje con su ícono y botones en una línea */
    await go('perfil');
    ok(!(await empty()).length, tag + ' íconos vacíos en Perfil: ' + (await empty()).join(' | '));
    const lines = await page.evaluate(() => [...document.querySelectorAll('.grid2.btns .btn')].map(b => { const t = [...b.childNodes].find(n => n.nodeType === 3); const r = document.createRange(); r.selectNodeContents(t); return b.textContent.trim() + ':' + new Set([...r.getClientRects()].map(x => Math.round(x.top))).size; }));
    ok(lines.length >= 4 && lines.every(l => l.endsWith(':1')), tag + ' botones partidos en dos líneas: ' + lines.join(', '));
    ok(!(await page.evaluate(SMALL_TARGETS, '#view')).length, tag + ' objetivos táctiles < 44 px en Perfil: ' + (await page.evaluate(SMALL_TARGETS, '#view')).join(' · '));

    /* Hojas con fechas en dos columnas: nada encimado (el campo de fecha tapaba al vecino a 360 y 390 px) */
    for (const act of ['edit-profile', 'block-edit', 'sick-new', 'edit-injury']) {
      await closeAll(); await go('perfil');
      await page.click('[data-act="' + act + '"]'); await page.waitForTimeout(450);
      const ov = await page.evaluate(OVERLAPS, '#sheet-root');
      ok(!ov.length, tag + ' ' + act + ': controles encimados: ' + ov.join(', '));
      const sx = await page.evaluate(() => { const s = document.querySelector('#sheet-root .sheet'); return s ? s.scrollWidth - s.clientWidth : -1; });
      ok(sx === 0, tag + ' ' + act + ': la hoja se corre de costado (' + sx + ' px)');
    }
    await page.screenshot({ path: outDir + '/' + tag + '-lesion.png' });

    /* Check-in: escalas de 44 px; a las 11:30 la hora de levantarse es la habitual (antes daba 14 h de sueño) */
    await closeAll(); await go('hoy');
    await page.click('[data-act="checkin"]'); await page.waitForTimeout(450);
    ok(await page.inputValue('#ck-wakeTime') === '07:30', tag + ' check-in a las 11:30: se levantó a las ' + await page.inputValue('#ck-wakeTime'));
    ok(!(await page.evaluate(SMALL_TARGETS, '#sheet-root')).length, tag + ' objetivos < 44 px en el check-in: ' + (await page.evaluate(SMALL_TARGETS, '#sheet-root')).join(' · '));
    /* Al cerrar, la hoja sale animada y después se quita (no queda nada que tape la pantalla) */
    await page.click('.sheet [data-act="close"]');
    ok(await page.locator('#sheet-root .scrim.out').count() === 1, tag + ' la hoja no sale animada');
    await page.waitForTimeout(400);
    ok(await page.locator('#sheet-root > *').count() === 0, tag + ' la hoja cerrada quedó en la pantalla');

    /* Ejercicios: las 5 pestañas entran sin deslizar */
    await go('entreno'); await page.click('[data-act="en-tab"][data-v="ejercicios"]'); await page.waitForTimeout(350);
    const seg = await page.evaluate(() => { const s = [...document.querySelectorAll('.seg')].find(x => x.children.length === 5); return s ? s.scrollWidth - s.clientWidth : -1; });
    ok(seg === 0, tag + ' las pestañas de Ejercicios no entran (' + seg + ' px de más)');

    /* Entrenamiento: series de kg y reps con botones de 44 px; dolor 0-10 en dos filas */
    await go('entreno'); await page.click('[data-act="en-tab"][data-v="semana"]'); await page.waitForTimeout(300);
    await page.click('[data-act="session"][data-date="2026-11-09"][data-type="superiorA"]'); await page.waitForTimeout(400);
    await page.click('.sheet [data-act="start"]'); await page.waitForSelector('.train', { timeout: 5000 });
    if (await page.locator('[data-act="tr-skipwarm"]').count()) await page.click('[data-act="tr-skipwarm"]');
    await page.waitForTimeout(400);
    ok(!(await page.evaluate(SMALL_TARGETS, '#train-root')).length, tag + ' objetivos < 44 px en el entrenamiento: ' + (await page.evaluate(SMALL_TARGETS, '#train-root')).join(' · '));
    await page.screenshot({ path: outDir + '/' + tag + '-serie.png' });
    /* El aviso de arriba se cierra con un toque (tapaba «Terminar») */
    await page.evaluate(() => { const t = document.getElementById('toast'); t.innerHTML = '<span>Aviso de prueba</span>'; t.hidden = false; });
    await page.click('#toast', { position: { x: 12, y: 12 } }); await page.waitForTimeout(150);
    ok(await page.locator('#toast').isHidden(), tag + ' el aviso no se cierra al tocarlo');
    await page.click('.tbar [data-act="tr-finish"]'); await page.waitForTimeout(450);
    const rpe = await page.evaluate(() => { const b = [...document.querySelectorAll('.sheet [data-name="rpe"]')]; return b.length ? Math.round(b[0].getBoundingClientRect().width) : 0; });
    ok(rpe >= 44, tag + ' el RPE mide ' + rpe + ' px de ancho');
    await ctx.close();
  } catch (e) { errors.push(tag + ' FLUJO: ' + e.message.split('\n')[0]); await page.screenshot({ path: outDir + '/' + tag + '-ERROR.png' }).catch(() => {}); await ctx.close(); }
}

/* Volver a la app al día siguiente: Hoy muestra la fecha nueva y lo que sigue hoy, no el día que habías elegido */
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'es-PY', timezoneId: 'America/Asuncion' });
  await ctx.clock.install({ time: new Date('2026-11-09T22:30:00-03:00') });
  await ctx.addInitScript((s) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem('improve-local-v1', s); sessionStorage.setItem('seeded', '1'); } }, JSON.stringify(store));
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push('día nuevo pageerror: ' + e.message));
  try {
    await page.goto('http://127.0.0.1:8765/?local=1#hoy'); await page.waitForSelector('.topbar', { timeout: 15000 }); await page.clock.runFor(600);
    await page.click('[data-act="hoy-day"][data-date="2026-11-12"]'); await page.clock.runFor(300);
    /* El teléfono duerme: los relojes de la página no corren hasta que vuelve */
    await page.clock.setSystemTime(new Date('2026-11-10T07:45:00-03:00'));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.clock.runFor(200);
    const h1 = await page.locator('h1').first().innerText();
    const hero = await page.locator('.hero').first().innerText();
    ok(/Martes 10/.test(h1), 'al volver al otro día el título sigue en ' + h1);
    ok(/SIGUIENTE/i.test(hero) && !/JUEVES 12/i.test(hero), 'al volver al otro día Hoy sigue en el día elegido: ' + hero.split('\n')[0]);
  } catch (e) { errors.push('día nuevo: ' + e.message.split('\n')[0]); }
  await ctx.close();
}
await browser.close();
errors.forEach(e => fails.push(e));
console.log('interfaz · fallos: ' + fails.length);
fails.forEach(f => console.log('  ✗ ' + f));
process.exitCode = fails.length ? 1 : 0;
