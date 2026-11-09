// Motor v5.1: puesta a punto de puesto (9 de referencia) hacia una prueba y día de viaje.
// Sin navegador ni fixture externo (datos sintéticos propios).
// node test/puesto.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get, addDays = E.addDays;
const freezeTargets = G('freezeTargets'), isIntenseLog = G('isIntenseLog'), BALL_DRILL_INDEX = G('BALL_DRILL_INDEX'), SIM9_STEPS = G('SIM9_STEPS');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

/* RF derecho en F4, K7 hecho, S3, prueba el lunes 23 nov, sin calendario de club */
const SUN = '2026-11-08', MON = '2026-11-09', TUE = '2026-11-10', WED = '2026-11-11', THU = '2026-11-12', FRI = '2026-11-13', SAT = '2026-11-14', TRIAL = '2026-11-23';
function fixture() {
  const sessions = []; let n = 0;
  const S = (o) => sessions.push(Object.assign({ id: 'f-' + (++n), done: true, source: 'entreno', minutes: 30, rpe: 6 }, o));
  [['2026-10-19', 1], ['2026-10-21', 2], ['2026-10-23', 3], ['2026-10-25', 4], ['2026-10-27', 5], ['2026-10-29', 5], ['2026-10-31', 6], ['2026-11-02', 6], ['2026-11-04', 7]].forEach(([date, level]) => S({ date, type: 'golpeo', kick: { level, pd: 0, pn: 0 } }));
  [['2026-10-29', 1], ['2026-10-31', 2], ['2026-11-03', 3]].forEach(([date, level]) => S({ date, type: 'sprint', spr: { level, pd: 0, pn: 0 } }));
  ['2026-10-27', '2026-11-03'].forEach(date => S({ date, type: 'fuerzaA', minutes: 70, rpe: 7 }));
  return {
    profile: { restDay: 6, trials: [TRIAL], matchDays: [], teamDays: [], schedule: {} },
    settings: { plan: {} }, weights: [{ id: 'w', date: '2026-10-25', kg: 88 }],
    injuries: [{ id: 'inj', date: '2026-09-02', status: 'activa', side: 'd', phase: 4, kickStart: 1, sprintStart: 1, phaseLog: [{ phase: 1, date: '2026-09-02' }, { phase: 3, date: '2026-10-20' }, { phase: 4, date: '2026-11-04' }] }],
    tests: [{ id: 't', date: '2026-11-03', ext8: { d: 52, i: 54 }, hop1: { d: 160, i: 165 }, hop3: { d: 510, i: 520 }, rn: 'completo', rnPain: 0, palp: 0 }],
    checkins: [], sessions, molestias: [],
  };
}
const stOf = (d, today) => E.deriveState({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: d.injuries, tests: d.tests, checkins: d.checkins, sessions: d.sessions, agenda: [], molestias: d.molestias || [], customExercises: [] }, today);
const weekOf = (d, today, ws) => E.buildWeek(stOf(d, today), ws || E.weekStartOf(today), today);
const dayOf = (d, today, date) => { date = date || today; return E.buildWeek(stOf(d, today), E.weekStartOf(date), today).find(x => x.date === date); };
const types = (day) => day.sessions.map(s => s.type);
const ses = (day, t) => day.sessions.find(s => s.type === t);
const drills = (s) => ((s && s.field && s.field.drills) || []);
const hdrAlta = (s) => drills(s).filter(x => x.header === 'alta').reduce((a, x) => a + x.target, 0);
const withBlock = (d, enfoque) => { d.profile.block = { tipo: 'pretemporada', desde: MON, hasta: TRIAL, enfoque }; return d; };

/* ---------- Plantilla de la semana ---------- */
{
  const d = withBlock(fixture(), 'puesto');
  const wk = weekOf(d, MON, MON), by = Object.fromEntries(wk.map(x => [x.date, x]));
  ok(wk.every(x => !types(x).includes('rsa') && !types(x).includes('agilidad')), '9: quedan sprints repetidos o agilidad: ' + wk.map(x => types(x).join('+')).join(' | '));
  ok(wk.filter(x => types(x).includes('intervalos')).map(x => x.date).join() === MON, '9: intervalos fuera del lunes: ' + wk.filter(x => types(x).includes('intervalos')).map(x => x.date));
  ok(ses(by[MON], 'intervalos').items[0].spec.s === 2, '9: el 10/10 del lunes 9 debería ser de 2 bloques: ' + ses(by[MON], 'intervalos').items[0].spec.s);
  [TUE, THU, SAT].forEach(dt => ok(types(by[dt]).includes('golpeo') && types(by[dt]).includes('sprint'), '9: el ' + dt + ' no tiene golpeo y sprint: ' + types(by[dt])));
  ok(types(by[SAT]).includes('juego') && ses(by[SAT], 'juego').title === 'Simulación de 9', '9: el sábado sin simulación de 9: ' + (ses(by[SAT], 'juego') || {}).title);
  ok(JSON.stringify(ses(by[SAT], 'juego').field.steps.map(x => x.n)) === JSON.stringify(SIM9_STEPS.map(x => x.n)), '9: pasos de la simulación de 9');
  ok(types(by['2026-11-15']).every(t => t === 'descanso'), '9: el domingo no es descanso');
  for (let i = 1; i < wk.length; i++) ok(!(wk[i].intense && wk[i - 1].intense), '9: dos días intensos seguidos ' + wk[i - 1].date + ' y ' + wk[i].date);
  ok(wk.filter(x => x.intense).length <= 3, '9: más de 3 días intensos');
  /* Trabajo de 9 todos los días de lunes a viernes */
  [MON, TUE, WED, THU, FRI].forEach(dt => { const b = ses(by[dt], 'balon'); ok(b && /^Trabajo de 9/.test(b.title) && b.nine, '9: el ' + dt + ' no tiene trabajo de 9: ' + (b && b.title)); });
  ok(drills(ses(by[WED], 'balon')).some(x => BALL_DRILL_INDEX[x.id].only9), '9: el miércoles sin estaciones de 9: ' + drills(ses(by[WED], 'balon')).map(x => x.id));
  /* Cabezazos de fuerza alta: 5 el martes y 5 el jueves; ninguno el resto */
  ok(hdrAlta(ses(by[TUE], 'balon')) === 5 && hdrAlta(ses(by[THU], 'balon')) === 5, '9: cabezazos de fuerza alta mar/jue: ' + hdrAlta(ses(by[TUE], 'balon')) + '/' + hdrAlta(ses(by[THU], 'balon')));
  ok([MON, WED, FRI].every(dt => hdrAlta(ses(by[dt], 'balon')) === 0), '9: cabezazos de fuerza alta en un día medio');
  ok(wk.reduce((a, x) => a + hdrAlta(ses(x, 'balon')), 0) <= 10, '9: más de 10 cabezazos de fuerza alta en la semana');
  /* Miércoles y viernes van después de un día de golpeo fuerte: sin remates */
  [WED, FRI].forEach(dt => ok(!drills(ses(by[dt], 'balon')).some(x => x.foot === 'izq' || x.foot === 'der'), '9: remates el ' + dt + ': ' + drills(ses(by[dt], 'balon')).map(x => x.id)));
  /* Cuello en Prevención y nota de velocidad en el sprint */
  ok(ses(by[WED], 'prevencion').items.some(it => it.slot === 'cuello'), '9: Prevención sin cuello: ' + ses(by[WED], 'prevencion').items.map(it => it.slot));
  ok(/Velocidad de 9/.test(ses(by[TUE], 'sprint').notes.join(' ')), '9: el sprint sin la nota de velocidad de 9');
  /* Segunda semana: un solo bloque de 10/10 */
  const w2 = weekOf(d, MON, '2026-11-16');
  ok(ses(w2[0], 'intervalos') && ses(w2[0], 'intervalos').items[0].spec.s === 1, '9: el 10/10 del lunes 16 debería ser de 1 bloque');
  ok(types(w2.find(x => x.date === '2026-11-21')).every(t => t === 'descanso') && types(w2.find(x => x.date === '2026-11-22')).includes('activacion'), '9: P-2 descanso y P-1 activación');
}

/* ---------- Sin el enfoque, la pretemporada general no cambia y el balón normal no trae estaciones de 9 ---------- */
{
  const d = withBlock(fixture());
  const wk = weekOf(d, MON, MON), by = Object.fromEntries(wk.map(x => [x.date, x]));
  ok(types(by[TUE]).includes('rsa') && types(by[THU]).includes('agilidad') && types(by[WED]).includes('intervalos'), 'General: cambió la pretemporada general: ' + wk.map(x => types(x).join('+')).join(' | '));
  ok(wk.every(x => !drills(ses(x, 'balon')).some(y => BALL_DRILL_INDEX[y.id].only9)), 'General: estaciones de 9 en el balón normal');
  ok(ses(by[SAT], 'juego').title === 'Simulación de partido', 'General: la simulación cambió de nombre');
  const n = weekOf(fixture(), MON, MON);
  ok(n.every(x => !drills(ses(x, 'balon')).some(y => BALL_DRILL_INDEX[y.id].only9)), 'Sin bloque: estaciones de 9 en el balón normal');
}

/* ---------- Con compañeros: juego reducido con el 9 fijo ---------- */
{
  const d = withBlock(fixture(), 'puesto'); d.profile.partners = true;
  const j = ses(dayOf(d, MON, SAT), 'juego');
  ok(j && /Juego reducido/.test(j.field.steps[0].n) && /9 fijo/.test(j.notes.join(' ')), '9: con compañeros no es juego reducido con el 9 fijo');
}

/* ---------- Seguridad: dolor del RF y molestias mandan sobre lo nuevo ---------- */
{
  const d = withBlock(fixture(), 'puesto'); d.checkins = [{ id: TUE, date: TUE, sleepH: 9, rfPain: 4, fatigue: 4, soreness: 4, stress: 4, sleepQ: 4 }];
  const t = dayOf(d, TUE);
  ok(!types(t).some(x => ['balon', 'golpeo', 'sprint', 'juego'].includes(x)), '9: con dolor RF 4 queda cancha: ' + types(t));
  const d2 = withBlock(fixture(), 'puesto'); d2.molestias = [{ id: 'm1', fecha: TUE, hora: '08:00', zona: 'aductor', lado: 'i', tipo: 'cargado', nivel: 5 }];
  const t2 = dayOf(d2, TUE);
  ok(!drills(ses(t2, 'balon')).some(x => x.foot === 'izq'), '9: con el aductor de la pierna sana cargado hay remates con ella: ' + drills(ses(t2, 'balon')).map(x => x.id));
}

/* ---------- Viaje ---------- */
{
  const d = withBlock(fixture(), 'puesto'); d.profile.viaje = { fecha: '2026-11-21', horas: 18 };
  const v = dayOf(d, '2026-11-16', '2026-11-21');
  ok(v.md === 'Viaje' && types(v).join() === 'movilidad' && /Día de viaje/.test(v.notes.join(' ')) && /parada/.test(v.notes.join(' ')), 'Viaje: el sábado 21 no es día de viaje: ' + v.md + ' ' + types(v) + ' ' + v.notes.join(' | '));
  ok(types(dayOf(d, '2026-11-16', '2026-11-22')).includes('activacion'), 'Viaje: P-1 sin activación');
  const d2 = withBlock(fixture(), 'puesto'); d2.profile.viaje = { fecha: '2026-11-22', horas: 4 };
  const p1 = dayOf(d2, '2026-11-16', '2026-11-22');
  ok(p1.md === 'P-1' && types(p1).includes('activacion') && /al llegar/.test(p1.notes.join(' ')) && !/parada/.test(p1.notes.join(' ')), 'Viaje: viajar en P-1 no da la activación al llegar: ' + types(p1) + ' ' + p1.notes.join(' | '));
  const trial = dayOf(d2, '2026-11-16', TRIAL);
  ok(types(trial).includes('prueba'), 'Viaje: la prueba no se toca');
}

/* ---------- 15 días día por día hasta la prueba ---------- */
{
  const d = withBlock(fixture(), 'puesto');
  let id = 0; const log = [];
  for (let i = 0; i <= 14; i++) {
    const today = addDays(MON, i);
    let st = stOf(d, today);
    if (st.criteria && st.criteria.ready && st.phase < 5) { d.injuries[0].phase = st.phase + 1; d.injuries[0].phaseLog.push({ date: today, phase: st.phase + 1 }); st = stOf(d, today); }
    const week = E.buildWeek(st, E.weekStartOf(today), today), day = week.find(x => x.date === today);
    Object.assign(d.settings.plan, freezeTargets(week, today, d.settings.plan));
    log.push({ date: today, day, phase: st.phase });
    for (const s of day.sessions) {
      if (['descanso', 'prueba'].includes(s.type)) continue;
      const L = { id: 'sim-' + (++id), date: today, type: s.type, done: true, minutes: s.est || 30, rpe: s.intense ? 8 : 6, est: s.est };
      if (s.field && s.field.kind === 'golpeo') L.kick = { level: s.level, pd: 0, pn: 0 };
      if (s.field && s.field.kind === 'sprint') L.spr = { level: s.level, pd: 0, pn: 0 };
      if (s.type === 'balon') L.ball = { drills: drills(s).map(x => ({ id: x.id, valor: x.target, unidad: x.unit, pie: x.foot, intentos: x.target })), headersAlta: hdrAlta(s) };
      if (s.type === 'test') { L.tests = ['ext8', 'hop1', 'hop3', 'rn', 'palp']; d.tests.push({ id: 't-' + today, date: today, ext8: { d: 53, i: 54 }, hop1: { d: 162, i: 165 }, hop3: { d: 515, i: 520 }, rn: 'completo', rnPain: 0, palp: 0 }); }
      d.sessions.push(L);
    }
  }
  const on = (date) => log.find(x => x.date === date).day;
  const intenseOn = (dt) => d.sessions.some(s => s.date === dt && isIntenseLog(s));
  for (let i = 1; i <= 14; i++) { const a = addDays(MON, i - 1), b = addDays(MON, i); ok(!(intenseOn(a) && intenseOn(b)), 'Sim 9: dos días intensos seguidos ' + a + ' y ' + b); }
  const kicks = d.sessions.filter(s => s.date >= MON && s.type === 'golpeo').map(s => s.date).sort();
  for (let i = 1; i < kicks.length; i++) ok(addDays(kicks[i - 1], 2) <= kicks[i], 'Sim 9: golpeo en días seguidos ' + kicks[i - 1] + ' y ' + kicks[i]);
  const wkH = (ws) => d.sessions.filter(s => s.date >= ws && s.date <= addDays(ws, 6) && s.ball).reduce((a, s) => a + (s.ball.headersAlta || 0), 0);
  ok(wkH(MON) <= 10 && wkH('2026-11-16') <= 10, 'Sim 9: más de 10 cabezazos de fuerza alta en una semana: ' + wkH(MON) + ' y ' + wkH('2026-11-16'));
  ok(log.every(x => !types(x.day).some(t => ['rsa', 'agilidad'].includes(t))), 'Sim 9: aparecen sprints repetidos o agilidad');
  ok(types(on('2026-11-21')).every(t => t === 'descanso') && types(on('2026-11-22')).includes('activacion') && types(on(TRIAL)).includes('prueba'), 'Sim 9: P-2, P-1 o la prueba');
  ok(/Afinamiento/.test(on('2026-11-17').notes.join(' ')), 'Sim 9: P-6 sin afinamiento');
  console.log('  sim 9 · ' + log.map(x => x.date.slice(8) + ' ' + x.day.sessions.map(s => s.short).join('+')).join(' | '));
  console.log('  sim 9 · intensos ' + log.map(x => x.date).filter(intenseOn).join(' ') + ' · cabezazos fuertes ' + wkH(MON) + ' y ' + wkH('2026-11-16'));
}

console.log('puesto · fallos: ' + fails.length);
fails.forEach(f => console.log('  ✗ ' + f));
process.exitCode = fails.length ? 1 : 0;
