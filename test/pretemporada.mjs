// Motor v4.6: días de enfermedad con vuelta gradual y bloque de pretemporada hacia una prueba.
// Sin navegador ni fixture externo (datos sintéticos propios).
// node test/pretemporada.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get, addDays = E.addDays;
const freezeTargets = G('freezeTargets'), isIntenseLog = G('isIntenseLog'), fmtSpec = G('fmtSpec');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const clone = (o) => JSON.parse(JSON.stringify(o));

/* RF derecho en F3 desde hace semanas, K7 1/2, S2 cumplido (pendiente de subir), sin calendario de club */
const SUN = '2026-11-08', MON = '2026-11-09', TUE = '2026-11-10', TRIAL = '2026-11-23';
function fixture() {
  const sessions = []; let n = 0;
  const S = (o) => sessions.push(Object.assign({ id: 'f-' + (++n), done: true, source: 'entreno', minutes: 30, rpe: 6 }, o));
  [['2026-10-19', 1], ['2026-10-21', 2], ['2026-10-23', 3], ['2026-10-25', 4], ['2026-10-27', 5], ['2026-10-29', 5], ['2026-10-31', 6], ['2026-11-02', 6], ['2026-11-04', 7]].forEach(([date, level]) => S({ date, type: 'golpeo', kick: { level, pd: 0, pn: 0 } }));
  [['2026-10-29', 1], ['2026-10-30', 2]].forEach(([date, level]) => S({ date, type: 'sprint', spr: { level, pd: 0, pn: 0 } }));
  ['2026-10-27', '2026-11-03'].forEach(date => S({ date, type: 'fuerzaA', minutes: 70, rpe: 7 }));
  return {
    profile: { restDay: 6, trials: [], matchDays: [], teamDays: [], schedule: {} },
    settings: { plan: {} }, weights: [{ id: 'w', date: '2026-10-25', kg: 85 }],
    injuries: [{ id: 'inj', date: '2026-09-02', status: 'activa', side: 'd', phase: 3, kickStart: 1, sprintStart: 1, phaseLog: [{ phase: 1, date: '2026-09-02' }, { phase: 3, date: '2026-10-20' }] }],
    tests: [{ id: 't', date: '2026-10-27', ext8: { d: 50, i: 52 }, rn: 'completo', rnPain: 0, palp: 0 }],
    checkins: [], sessions, molestias: [],
  };
}
const stOf = (d, today) => E.deriveState({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: d.injuries, tests: d.tests, checkins: d.checkins, sessions: d.sessions, agenda: [], molestias: d.molestias || [], customExercises: [] }, today);
const weekOf = (d, today, ws) => E.buildWeek(stOf(d, today), ws || E.weekStartOf(today), today);
const dayOf = (d, today, date) => { date = date || today; return E.buildWeek(stOf(d, today), E.weekStartOf(date), today).find(x => x.date === date); };
const types = (day) => day.sessions.map(s => s.type);
const ses = (day, t) => day.sessions.find(s => s.type === t);
const withPre = (d) => { d.profile.trials = [TRIAL]; d.profile.block = { tipo: 'pretemporada', desde: MON, hasta: TRIAL }; return d; };

/* ---------- Enfermedad ---------- */
{
  const d = fixture();
  /* Jueves y sábado con sesión intensa planificada que no se hizo, por estar enfermo */
  d.profile.sick = [{ from: '2026-11-05', to: SUN, kind: 'leve' }];
  ['2026-11-05', '2026-11-07'].forEach(date => ['fuerzaA', 'sprint', 'golpeo'].forEach(type => d.sessions.push({ id: date + type, date, type, done: false, sick: true })));
  const mon = dayOf(d, MON);
  ok(!mon.debtFrom && !/Recuperas la sesión/.test(mon.notes.join(' ')), 'Enfermo: el lunes recupera una sesión perdida por enfermedad: ' + mon.notes.join(' | '));
  ok(mon.ramp && mon.ramp.day === 1 && /Vuelta tras la enfermedad/.test(mon.notes.join(' ')), 'Enfermo: el lunes no marca la vuelta gradual: ' + mon.notes.join(' | '));
  ok(!types(mon).some(t => ['sprint', 'golpeo'].includes(t)) || mon.sessions.filter(s => ['sprint', 'golpeo'].includes(s.type)).every(s => s.level <= 2), 'Enfermo: la vuelta suma golpeo o sprint de nivel nuevo: ' + types(mon));
  /* La deuda mira dentro de la semana: el martes intenso no hecho se recupera el miércoles, salvo que haya sido por enfermedad */
  const WED = '2026-11-11';
  const miss = (dd) => ['fuerzaA', 'sprint', 'golpeo', 'balon'].forEach(type => dd.sessions.push({ id: TUE + type, date: TUE, type, done: false }));
  const d2 = fixture(); miss(d2);
  ok(dayOf(d2, WED).debtFrom === TUE, 'Deuda: sin enfermedad el miércoles debería recuperar el martes');
  const d2b = fixture(); miss(d2b); d2b.profile.sick = [{ from: TUE, to: TUE, kind: 'leve' }];
  const w2 = dayOf(d2b, WED);
  ok(!w2.debtFrom && w2.ramp, 'Deuda: el miércoles recupera el martes perdido por enfermedad o no marca la vuelta: ' + w2.notes.join(' | '));
  /* Enfermo hoy: descanso */
  const d3 = fixture(); d3.profile.sick = [{ from: SUN, to: MON, kind: 'fiebre' }];
  const m3 = dayOf(d3, MON);
  ok(types(m3).every(t => t === 'descanso'), 'Enfermo hoy: debería ser descanso: ' + types(m3));
  /* Con fiebre: 3 días de vuelta, el primero sin nada intenso */
  const t3 = dayOf(d3, TUE, TUE), w3 = dayOf(d3, TUE, '2026-11-11');
  ok(t3.ramp && t3.ramp.hard && !t3.intense, 'Fiebre: el primer día de vuelta es intenso: ' + types(t3));
  ok(w3.ramp && !w3.ramp.hard && w3.ramp.day === 2, 'Fiebre: el segundo día de vuelta no está marcado');
  ok(!types(t3).includes('test'), 'Fiebre: hay test de control el primer día de vuelta');
  /* La proyección no avanza los días enfermos */
  const P = G('project');
  const pr1 = P(stOf(fixture(), SUN), SUN), d4 = fixture(); d4.profile.sick = [{ from: SUN, to: '2026-11-14', kind: 'leve' }];
  const pr2 = P(stOf(d4, SUN), SUN);
  ok(!pr1.phases[4] || !pr2.phases[4] || pr2.phases[4] > pr1.phases[4], 'Enfermo: la proyección no se retrasa con una semana enfermo: ' + JSON.stringify(pr1.phases) + ' vs ' + JSON.stringify(pr2.phases));
}

/* ---------- Niveles pendientes: pasadas 48 h, la próxima sesión ya es del nivel nuevo ---------- */
{
  const d = fixture();
  const tue = dayOf(d, SUN, TUE);
  const sp = ses(tue, 'sprint');
  ok(sp && sp.level === 3, 'Pendiente: S2 cumplido hace más de 48 h y el martes repite S' + (sp && sp.level));
}

/* ---------- Pretemporada: plantilla ---------- */
{
  const d = withPre(fixture());
  const wk = weekOf(d, MON, MON);
  const by = Object.fromEntries(wk.map(x => [x.date, x]));
  ok(types(by[MON]).includes('intervalos') && types(by['2026-11-11']).includes('intervalos') && types(by['2026-11-13']).includes('intervalos'), 'Pre: faltan intervalos en lun, mié o vie');
  ok(/10\/10/.test(ses(by[MON], 'intervalos').title) && /4 × 4/.test(ses(by['2026-11-11'], 'intervalos').title) && /15\/15/.test(ses(by['2026-11-13'], 'intervalos').title), 'Pre: formatos de intervalos por día');
  ok(ses(by[MON], 'intervalos').items[0].cycle === 10 && ses(by['2026-11-13'], 'intervalos').items[0].cycle === 15, 'Pre: los intervalos 10/10 y 15/15 deberían pitar en cada cambio');
  ok(/min/.test(fmtSpec(ses(by[MON], 'intervalos').items[0].spec)), 'Pre: los bloques de 6 min se muestran en segundos');
  ok(types(by[TUE]).includes('rsa') && types(by['2026-11-12']).includes('agilidad') && types(by['2026-11-14']).includes('juego'), 'Pre: faltan sprints repetidos, agilidad o juego en los días altos');
  ok(by['2026-11-15'] && types(by['2026-11-15']).every(t => t === 'descanso'), 'Pre: el domingo no es descanso');
  ok(wk.filter(x => !x.past && x.intense).length <= 3, 'Pre: más de 3 días intensos en la semana');
  for (let i = 1; i < wk.length; i++) ok(!(wk[i].intense && wk[i - 1].intense), 'Pre: dos días intensos seguidos ' + wk[i - 1].date + ' y ' + wk[i].date);
  const rsa = ses(by[TUE], 'rsa'), spr = ses(by[TUE], 'sprint');
  ok(rsa && spr && rsa.level === spr.level && rsa.intense === (spr.level >= 3), 'Pre: los sprints repetidos no siguen el nivel del sprint del día');
  const order = G('dayBlocks')(by[TUE]).find(b => b.key === 'campo').sessions.map(s => s.type);
  ok(order.indexOf('sprint') < order.indexOf('rsa') && order.indexOf('rsa') < order.indexOf('balon'), 'Pre: orden de la cancha del martes: ' + order.join(','));
  /* Sin pretemporada, la semana F3 no tiene intervalos */
  ok(!weekOf(fixture(), MON, MON).some(x => types(x).includes('intervalos')), 'Pre: hay intervalos sin pretemporada');
  /* En F2 la pretemporada no se aplica */
  const d2 = withPre(fixture()); d2.injuries[0].phase = 2;
  ok(!types(dayOf(d2, MON)).includes('intervalos'), 'Pre: se aplica en F2');
}

/* ---------- Pretemporada: reglas de dolor y molestias se aplican a lo nuevo ---------- */
{
  const d = withPre(fixture()); d.checkins = [{ id: TUE, date: TUE, sleepH: 9, rfPain: 4, fatigue: 4, soreness: 4, stress: 4, sleepQ: 4 }];
  const t = dayOf(d, TUE);
  ok(!types(t).some(x => ['intervalos', 'rsa', 'agilidad', 'sprint'].includes(x)), 'Pre: con dolor RF 4 quedan carreras: ' + types(t));
  const d2 = withPre(fixture()); d2.molestias = [{ id: 'm1', fecha: TUE, hora: '08:00', zona: 'isquio', lado: 'd', tipo: 'dolor', nivel: 5 }];
  const t2 = dayOf(d2, TUE);
  ok(!types(t2).includes('rsa') && !types(t2).includes('sprint'), 'Pre: con dolor de isquio quedan sprints repetidos: ' + types(t2));
}

/* ---------- Pretemporada: 15 días día por día hasta la prueba ---------- */
{
  const d = withPre(fixture());
  d.profile.sick = [{ from: '2026-11-05', to: SUN, kind: 'leve' }];
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
      if (s.type === 'test') { L.tests = ['ext8', 'hop1', 'hop3', 'rn', 'palp']; d.tests.push({ id: 't-' + today, date: today, ext8: { d: 52, i: 54 }, hop1: { d: 160, i: 165 }, hop3: { d: 510, i: 520 }, rn: 'completo', rnPain: 0, palp: 0 }); }
      d.sessions.push(L);
    }
  }
  const on = (date) => log.find(x => x.date === date).day;
  const intenseOn = (dt) => d.sessions.some(s => s.date === dt && isIntenseLog(s));
  for (let i = 1; i <= 14; i++) { const a = addDays(MON, i - 1), b = addDays(MON, i); ok(!(intenseOn(a) && intenseOn(b)), 'Sim pre: dos días intensos seguidos ' + a + ' y ' + b); }
  const kicks = d.sessions.filter(s => s.date >= MON && s.type === 'golpeo').map(s => s.date).sort();
  for (let i = 1; i < kicks.length; i++) ok(E.addDays(kicks[i - 1], 2) <= kicks[i], 'Sim pre: golpeo en días seguidos ' + kicks[i - 1] + ' y ' + kicks[i]);
  ok(on(MON).ramp && !types(on(MON)).includes('sprint'), 'Sim pre: el lunes de vuelta tiene sprint o no marca la vuelta');
  /* Afinamiento: P-6 y P-5 con menos volumen, P-2 descanso, P-1 activación */
  const iv = (dt) => { const s = ses(on(dt), 'intervalos'); return s ? s.items[0].spec.s : null; };
  ok(iv('2026-11-18') !== null && iv('2026-11-11') !== null && iv('2026-11-18') < iv('2026-11-11'), 'Sim pre: el miércoles P-5 no baja los intervalos: ' + iv('2026-11-11') + ' → ' + iv('2026-11-18'));
  ok(/Afinamiento/.test(on('2026-11-17').notes.join(' ')), 'Sim pre: P-6 sin afinamiento');
  ok(types(on('2026-11-21')).every(t => t === 'descanso'), 'Sim pre: P-2 no es descanso: ' + types(on('2026-11-21')));
  ok(types(on('2026-11-22')).includes('activacion'), 'Sim pre: P-1 sin activación');
  ok(types(on(TRIAL)).includes('prueba'), 'Sim pre: el día de la prueba');
  /* Sin niveles nuevos a 5 días o menos de la prueba */
  const lv = (dt, t) => { const s = ses(on(dt), t); return s ? s.level : null; };
  const before = Math.max(...['2026-11-10', '2026-11-12', '2026-11-14', '2026-11-17'].map(dt => lv(dt, 'sprint') || 0));
  ['2026-11-18', '2026-11-19', '2026-11-20'].forEach(dt => { const L = lv(dt, 'sprint'); ok(L === null || L <= before, 'Sim pre: sprint de nivel nuevo el ' + dt + ' (S' + L + ')'); });
  ok(before >= 5, 'Sim pre: con todo limpio debería llegar a S5 antes de la prueba (llegó a S' + before + ')');
  const ints = log.filter(x => x.date < TRIAL).map(x => x.date).filter(intenseOn);
  const wk1 = ints.filter(x => x < '2026-11-16').length, wk2 = ints.filter(x => x >= '2026-11-16').length;
  ok(wk1 <= 3 && wk2 <= 3, 'Sim pre: días intensos por semana ' + wk1 + ' y ' + wk2);
  console.log('  sim pre · intensos ' + ints.join(' ') + ' · golpeo ' + kicks.join(' ') + ' · sprint ' + log.map(x => lv(x.date, 'sprint')).filter(Boolean).map(l => 'S' + l).join(' '));
}

console.log('pretemporada · fallos: ' + fails.length);
fails.forEach(f => console.log('  ' + f));
process.exit(fails.length ? 1 : 0);
