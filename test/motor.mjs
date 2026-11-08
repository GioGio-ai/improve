// Motor v4.1-v4.2: seguridad, sesiones movidas, semana de la prueba (fase A) y estructura, progresión y sueño (fase B).
// Sin navegador ni fixture externo.
// node test/motor.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get;
const BANK_INDEX = G('BANK_INDEX'), exMg = G('exMg'), isIntenseLog = G('isIntenseLog'), SPRINT_REPS = G('SPRINT_REPS'), KICK_TARGET = G('KICK_TARGET');
const freezeTargets = (() => { try { return G('freezeTargets'); } catch (e) { return null; } })();
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const addDays = E.addDays;

/* ---------- Datos sintéticos: RF derecho en F3, K5 0/2, S3, prueba el lunes 16 nov ---------- */
function fixture() {
  const sessions = [];
  let n = 0;
  const S = (o) => sessions.push(Object.assign({ id: 'f-' + (++n), done: true, source: 'entreno', createdAt: 1700000000000 + n }, o));
  const ex = (id, slot, sets, side) => ({ id, slot, sets: Array.from({ length: sets * (side ? 2 : 1) }, (_, i) => ({ side: side ? (i % 2 ? 'i' : 'd') : undefined, kg: 20, reps: 8, done: true })), fb: 'justo', pain: 0 });
  [['2026-10-14', 1], ['2026-10-16', 2], ['2026-10-20', 3], ['2026-10-23', 3], ['2026-10-27', 4]].forEach(([date, level]) => S({ date, type: 'golpeo', kick: { level, pd: 0, pn: 0 }, minutes: 25, rpe: 5 }));
  [['2026-10-15', 1], ['2026-10-22', 2], ['2026-10-28', 1]].forEach(([date, level]) => S({ date, type: 'sprint', spr: { level, pd: 0, pn: 0 }, minutes: 20, rpe: 6 }));
  ['2026-10-20', '2026-10-24', '2026-10-27', '2026-10-31'].forEach(date => S({ date, type: 'fuerzaA', minutes: 70, est: 60, rpe: 7, exercises: [
    ex('iso_rf_zancada', 'rf_iso_largo', 4, true), ex('rev_nordic_asist', 'rf_exc', 3), ex('ext_uni_exc', 'ext_uni', 4, true), ex('bulgara_rf_atras', 'uni_sent', 3, true), ex('nordic', 'isquio_exc', 3), ex('copenhagen', 'aductor', 3, true)] }));
  return {
    profile: { weight: 88, height: 196, restDay: 6, trials: ['2026-11-16'], matchDays: [], teamDays: [], schedule: {} },
    settings: { plan: {}, choices: {} },
    weights: [{ id: 'w-1', date: '2026-10-25', kg: 88 }],
    injuries: [{ id: 'inj-1', date: '2026-09-02', status: 'activa', side: 'd', phase: 3, kickStart: 1, sprintStart: 1,
      phaseLog: [{ phase: 1, date: '2026-09-02' }, { phase: 2, date: '2026-09-20' }, { phase: 3, date: '2026-10-14' }] }],
    tests: [{ id: 't-1', date: '2026-10-25', ext8: { d: 40, i: 43 }, hop1: { d: 150, i: 162 }, hop3: { d: 480, i: 520 }, stretch: { d: 3, i: 1 }, rn: 'completo', rnPain: 0, palp: 0 }],
    checkins: [], sessions, molestias: [],
  };
}
const BASE = fixture();
function plan(today, patch) {
  const d = clone(BASE); patch = patch || {};
  if (patch.injury) Object.assign(d.injuries[0], patch.injury);
  if (patch.profile) Object.assign(d.profile, patch.profile);
  if (patch.sessions) d.sessions = d.sessions.concat(patch.sessions);
  if (patch.checkins) d.checkins = d.checkins.concat(patch.checkins);
  if (patch.molestias) d.molestias = patch.molestias;
  if (patch.plan) d.settings.plan = patch.plan;
  const st = E.deriveState({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: d.injuries, tests: d.tests, checkins: d.checkins, sessions: d.sessions, agenda: patch.agenda || [], molestias: d.molestias, customExercises: [] }, today);
  const ws = E.weekStartOf(today);
  const week = E.buildWeek(st, ws, today).concat(E.buildWeek(st, addDays(ws, 7), today));
  return { st, week, day: (dt) => week.find(x => x.date === dt) };
}
const types = (day) => day.sessions.map(s => s.type);
const desc = (day) => day ? day.sessions.map(s => s.type + (s.level ? '(' + s.level + ')' : '')).join('+') + (day.intense ? ' [INT]' : '') : '—';
const ses = (day, t) => day.sessions.find(s => s.type === t) || null;
const ci = (date, o) => Object.assign({ id: date, date, sleepH: 9, sleepQ: 4, fatigue: 4, soreness: 4, stress: 4, rfPain: 0 }, o);
let molN = 0;
const mol = (o) => Object.assign({ id: 'mol-' + (++molN), hora: '10:00', resuelta: false, updates: [] }, o);
const match = (date) => ({ id: 'match-' + date, date, type: 'partido', done: true, minutes: 90, rpe: 8 });
const s6 = [{ id: 's6a', date: '2026-10-21', type: 'sprint', done: true, spr: { level: 6, pd: 0, pn: 0 } }, { id: 's6b', date: '2026-10-23', type: 'sprint', done: true, spr: { level: 6, pd: 0, pn: 0 } }];
const MON = '2026-11-02', TUE = '2026-11-03', WED = '2026-11-04', THU = '2026-11-05', SAT = '2026-11-07';
const rfItems = (day) => day.sessions.flatMap(s => s.items || []).filter(it => (exMg(BANK_INDEX[it.id]) || {}).recto_femoral >= 1);
const hasRF = (day) => rfItems(day).length > 0;

/* ---------- E1 · Lo movido aparece al día siguiente ---------- */
{
  const p1 = plan(TUE, { sessions: [match(MON)] });
  const d = p1.day(TUE);
  ok(d.swapTo === WED, 'E1: el martes tras partido no mueve lo intenso al miércoles (' + desc(d) + ')');
  ok(typeof freezeTargets === 'function', 'E1: falta freezeTargets en el motor');
  if (freezeTargets) {
    const F = freezeTargets(p1.week, TUE, {});
    ok(F[TUE] && F[WED], 'E1: no congela el día receptor');
    ok(F[WED] && F[WED].auto && F[WED].types.includes('fuerzaA'), 'E1: el receptor no lleva la Fuerza A movida');
    const logs = d.sessions.filter(s => s.type !== 'descanso').map(s => ({ id: 'l-' + s.type, date: TUE, type: s.type, done: true, minutes: s.est, rpe: 5 }));
    const p2 = plan(WED, { sessions: [match(MON)].concat(logs), plan: F });
    const w = p2.day(WED);
    ok(w.sessions.some(s => s.type === 'fuerzaA') && w.sessions.some(s => s.type === 'golpeo') && w.intense, 'E1: el miércoles no aparece lo movido: ' + desc(w));
    ok(!w.override, 'E1: el día receptor queda bloqueado como cambio manual');
    // Con molestia el martes, resuelta el miércoles
    const mq = mol({ fecha: TUE, zona: 'cuadriceps', lado: 'd', tipo: 'cargado', nivel: 8 });
    const q1 = plan(TUE, { molestias: [mq] });
    const Fq = freezeTargets(q1.week, TUE, {});
    ok(Fq[WED] && Fq[WED].types.includes('fuerzaA'), 'E1: con molestia, el receptor no lleva la sesión movida');
    const mq2 = Object.assign(clone(mq), { resuelta: true, resueltaEn: WED, updates: [{ fecha: WED, estado: 'ya_no' }] });
    const q2 = plan(WED, { molestias: [mq2], plan: Fq, sessions: q1.day(TUE).sessions.filter(s => s.type !== 'descanso').map(s => ({ id: 'q-' + s.type, date: TUE, type: s.type, done: true, minutes: s.est, rpe: 5 })) });
    ok(q2.day(WED).sessions.some(s => s.type === 'fuerzaA'), 'E1: molestia resuelta y el miércoles sin lo movido: ' + desc(q2.day(WED)));
  }
}

/* ---------- E3 · Dolor y sueño también en días modificados ---------- */
{
  const pl = {}; pl[TUE] = { types: ['fuerzaA', 'sprint', 'golpeo'] };
  const r = plan(TUE, { plan: pl, checkins: [ci(TUE, { rfPain: 4 })] }).day(TUE);
  ok(!types(r).some(t => ['sprint', 'golpeo', 'fuerzaA'].includes(t)) && !r.intense, 'E3: día modificado con dolor RF 4 sigue intenso: ' + desc(r));
  ok(r.notes.some(n => /Dolor 4\/10/.test(n)), 'E3: sin nota de dolor en el día modificado');
  const s = plan(TUE, { plan: pl, checkins: [ci(TUE, { sleepH: 4.5, bedTime: '02:00', wakeTime: '06:30' })] }).day(TUE);
  ok(!types(s).includes('fuerzaA'), 'E3: día modificado con 4,5 h de sueño mantiene Fuerza A: ' + desc(s));
}

/* ---------- E4 · El test se pospone y cuenta como intenso ---------- */
{
  const base = plan(TUE).day(TUE);
  ok(types(base).includes('test'), 'E4: la línea base no tiene test el martes (' + desc(base) + ')');
  const cases = [
    ['dolor RF 4 (check-in)', { checkins: [ci(TUE, { rfPain: 4 })] }],
    ['dolor RF 4 (mapa)', { molestias: [mol({ fecha: TUE, zona: 'recto_femoral', lado: 'd', tipo: 'dolor', nivel: 4 })] }],
    ['RF cargado 8 activo', { molestias: [mol({ fecha: MON, zona: 'recto_femoral', lado: 'd', tipo: 'cargado', nivel: 8, updates: [{ fecha: TUE, estado: 'igual', nivel: 8 }] })] }],
    ['4,5 h de sueño', { checkins: [ci(TUE, { sleepH: 4.5, bedTime: '02:00', wakeTime: '06:30' })] }],
    ['sin check-in tras dolor 4 ayer', { checkins: [ci(MON, { rfPain: 4 })] }],
    ['partido ayer', { sessions: [match(MON)], plan: { [WED]: { types: ['partido'] } } }],
  ];
  for (const [label, patch] of cases) {
    const p = plan(TUE, patch), d = p.day(TUE);
    ok(!types(d).includes('test'), 'E4: test con ' + label + ': ' + desc(d));
  }
  // Pospuesto: aparece más adelante en la semana
  const p = plan(TUE, { checkins: [ci(TUE, { rfPain: 4 })] });
  const later = p.week.filter(x => x.date > TUE && x.date <= addDays(E.weekStartOf(TUE), 6) && types(x).includes('test'));
  ok(later.length === 1, 'E4: el test pospuesto no aparece una vez más adelante (' + later.map(x => x.date).join(',') + ')');
  ok(isIntenseLog({ type: 'test', date: TUE, done: true, tests: ['ext8', 'hop1'] }), 'E4: el test no cuenta como intenso');
  ok(!isIntenseLog({ type: 'test', date: TUE, done: true, tests: ['palp'] }), 'E4: un test solo de palpación cuenta como intenso');
  // Un solo test por semana aunque haya un día modificado con test
  const pl = {}; pl[TUE] = { types: ['test', 'fuerzaA', 'sprint', 'golpeo', 'balon'] };
  const q = plan(TUE, { plan: pl });
  const nTests = q.week.filter(x => x.date >= TUE && x.date <= addDays(E.weekStartOf(TUE), 6) && types(x).includes('test')).length;
  ok(nTests === 1, 'E4: ' + nTests + ' tests en la semana');
}

/* ---------- E5 · Con dolor RF ≥ 3 no queda carga del recto femoral ---------- */
{
  const d = plan(TUE, { checkins: [ci(TUE, { rfPain: 4 })] }).day(TUE);
  ok(!hasRF(d), 'E5: con dolor RF 4 quedan ejercicios de RF: ' + rfItems(d).map(i => i.id).join(','));
  ok(!types(d).includes('balon'), 'E5: con dolor RF 4 queda Balón (check-in y mapa deben dar lo mismo)');
  const m = plan(TUE, { molestias: [mol({ fecha: TUE, zona: 'recto_femoral', lado: 'd', tipo: 'dolor', nivel: 4 })] }).day(TUE);
  ok(JSON.stringify(types(d)) === JSON.stringify(types(m)), 'E5: dolor por check-in (' + desc(d) + ') y por mapa (' + desc(m) + ') dan planes distintos');
}

/* ---------- E6 · F5: los topes de sprint se respetan ---------- */
{
  const inj = { phase: 5, sprintStart: 6, kickStart: 8 };
  const m = plan(TUE, { injury: inj, sessions: s6, molestias: [mol({ fecha: TUE, zona: 'isquio', lado: 'd', tipo: 'cargado', nivel: 5 })] }).day(TUE);
  const sp = ses(m, 'sprint');
  ok(!sp || sp.level <= 2, 'E6: F5 con isquio cargado 5 → sprint S' + (sp && sp.level));
  const c = plan(TUE, { injury: inj, sessions: s6.concat([match(MON)]), plan: { [WED]: { types: ['partido'] } } }).day(TUE);
  const sc = ses(c, 'sprint');
  ok(!sc || sc.level <= 2, 'E6: F5 entre dos partidos → sprint S' + (sc && sc.level));
}

/* ---------- E7 · Tras el intercambio, las molestias siguen mandando ---------- */
{
  const d = plan(TUE, { molestias: [mol({ fecha: TUE, zona: 'recto_femoral', lado: 'd', tipo: 'cargado', nivel: 8 })] }).day(TUE);
  ok(!types(d).some(t => ['balon', 'golpeo', 'sprint', 'rt'].includes(t)), 'E7: RF cargado 8 y el día tiene ' + desc(d));
}

/* ---------- E8 · Las molestias miran el lado ---------- */
{
  const base = plan(TUE).day(TUE), kBase = (ses(base, 'golpeo') || {}).level;
  const zurdas = (d) => ((ses(d, 'balon') || { field: { drills: [] } }).field.drills || []).filter(x => x.foot === 'izq');
  ok(zurdas(base).length > 0, 'E8: la línea base del martes no tiene zurda');
  for (const m of [mol({ fecha: TUE, zona: 'aductor', lado: 'i', tipo: 'cargado', nivel: 5 }), mol({ fecha: TUE, zona: 'flexor_cadera', lado: 'i', tipo: 'dolor', nivel: 2 })]) {
    const d = plan(TUE, { molestias: [m] }).day(TUE);
    ok((ses(d, 'golpeo') || {}).level === kBase, 'E8: ' + m.zona + ' izquierdo baja el golpeo derecho a K' + (ses(d, 'golpeo') || {}).level);
    ok(!zurdas(d).length, 'E8: ' + m.zona + ' izquierdo mantiene remates de zurda: ' + zurdas(d).map(x => x.id).join(','));
  }
  const r = plan(TUE, { molestias: [mol({ fecha: TUE, zona: 'aductor', lado: 'd', tipo: 'cargado', nivel: 5 })] }).day(TUE);
  ok((ses(r, 'golpeo') || {}).level <= 3, 'E8: aductor derecho no baja el golpeo');
  ok(zurdas(r).length > 0, 'E8: aductor derecho quita la zurda');
}

/* ---------- E9 · El criterio de F5 mira el dolor del mapa ---------- */
{
  const p = plan(TUE, { injury: { phase: 5, phaseLog: [{ phase: 5, date: '2026-10-10' }] }, molestias: [mol({ fecha: '2026-10-30', zona: 'recto_femoral', lado: 'd', tipo: 'dolor', nivel: 5 })] });
  ok(p.st.recentPain === true, 'E9: recentPain ignora el dolor RF del mapa');
}

/* ---------- E10 · Sin respuesta no es sin dolor ---------- */
{
  const m = mol({ fecha: TUE, zona: 'isquio', lado: 'd', tipo: 'dolor', nivel: 6 });
  const d = plan(THU, { molestias: [m] }).day(THU);
  ok(!types(d).includes('sprint'), 'E10: isquio dolor 6 sin respuesta y el jueves hay sprint: ' + desc(d));
  const act = G('activeMolestias')(plan(THU, { molestias: [m] }).st, THU);
  ok(act.length === 1 && act[0].sinConfirmar, 'E10: la molestia sin respuesta no queda «sin confirmar»');
  const late = G('activeMolestias')(plan('2026-11-12', { molestias: [m] }).st, '2026-11-12');
  ok(!late.length, 'E10: la molestia sin respuesta no vence a los 7 días');
  const mod = G('activeMolestias')(plan(THU, { molestias: [mol({ fecha: TUE, zona: 'isquio', lado: 'd', tipo: 'cargado', nivel: 5 })] }).st, THU);
  ok(!mod.length, 'E10: una carga moderada sin respuesta no debería seguir activa');
  const c = plan(TUE, { checkins: [ci(MON, { rfPain: 4 })] }).day(TUE);
  ok(!types(c).some(t => ['sprint', 'golpeo', 'test'].includes(t)) && !c.intense, 'E10: sin check-in tras dolor 4 ayer: ' + desc(c));
  ok(c.notes.some(n => /check-in/.test(n)), 'E10: sin nota que pida el check-in');
}

/* ---------- E15 · El nivel previsto no cuenta sesiones con tope ---------- */
{
  const p = plan(TUE, { injury: { phase: 4, phaseLog: [{ phase: 4, date: '2026-10-30' }] }, molestias: [mol({ fecha: TUE, zona: 'aductor', lado: 'd', tipo: 'cargado', nivel: 5 })] });
  const sat = ses(p.day(SAT), 'golpeo');
  ok(sat && sat.level === 5, 'E15: el sábado figura K' + (sat && sat.level) + ' (debería repetir K5)');
}

/* ---------- Semana de la prueba (lunes 16 nov; descanso el domingo) ---------- */
{
  const p = plan('2026-11-09');
  const cleanMax = (type, f) => Math.max(0, ...p.st.sessions.filter(s => s.type === type && s[f] && G('outcome')(s[f].pd, s[f].pn, s[f].partial) === 'clean').map(s => Number(s[f].level)));
  const kMax = cleanMax('golpeo', 'kick'), sMax = cleanMax('sprint', 'spr');
  for (const dt of ['2026-11-11', '2026-11-12', '2026-11-13', '2026-11-14', '2026-11-15']) {
    const d = p.day(dt), g = ses(d, 'golpeo'), s = ses(d, 'sprint');
    ok(!g || g.level <= Math.max(kMax, 1), 'Prueba: ' + dt + ' estrena K' + (g && g.level) + ' (máx limpio K' + kMax + ')');
    ok(!s || s.level <= Math.max(sMax, 1), 'Prueba: ' + dt + ' estrena S' + (s && s.level) + ' (máx limpio S' + sMax + ')');
  }
  const p2 = p.day('2026-11-14'), p1 = p.day('2026-11-15');
  ok(types(p2).join() === 'descanso', 'Prueba: P-2 debería ser descanso cuando el descanso cae en P-1 (' + desc(p2) + ')');
  ok(types(p1).includes('activacion'), 'Prueba: P-1 sin activación');
  ok(!p.week.filter(x => x.date >= '2026-11-14' && x.date <= '2026-11-16').some(x => x.sessions.some(s => (s.items || []).some(it => it.fill))), 'Prueba: rellenos de series en P-2, P-1 o P');
  const p4 = p.day('2026-11-12'), sp4 = ses(p4, 'sprint'), g4 = ses(p4, 'golpeo');
  ok(sp4 && sp4.field.reps < SPRINT_REPS[sp4.level], 'Prueba: P-4 sin menos volumen de sprint');
  ok(g4 && g4.field.target < KICK_TARGET[g4.level], 'Prueba: P-4 sin menos volumen de golpeo');
  ok(p4.notes.some(n => /Semana de la prueba/.test(n)), 'Prueba: P-4 sin nota');
  // Prueba un miércoles: P-2 (lunes) con prevención solo isométrica
  const q = plan('2026-11-16', { profile: { trials: ['2026-11-18'] } });
  const q2 = q.day('2026-11-16');
  const exc = q2.sessions.flatMap(s => s.items || []).filter(it => BANK_INDEX[it.id] && ['exc', 'pliom'].includes(BANK_INDEX[it.id].c));
  ok(types(q2).includes('prevencion') && !exc.length, 'Prueba: P-2 con excéntricos: ' + exc.map(x => x.id).join(','));
  ok((ses(q2, 'prevencion') || { items: [] }).items.some(it => it.isoTrial), 'Prueba: P-2 sin marcar los isométricos que reemplazan');
  const dayKind = G('dayKind');
  ok(dayKind(p2, p.st.profile) === 'moderado', 'Prueba: P-2 en descanso con carbohidratos de «' + dayKind(p2, p.st.profile) + '»');
  const p1d = plan('2026-11-16').day('2026-11-17');
  ok(dayKind(p1d, p.st.profile) === 'moderado', 'Prueba: P+1 con carbohidratos de «' + dayKind(p1d, p.st.profile) + '»');
  ok(!q.day('2026-11-15') || types(q.day('2026-11-15')).includes('descanso'), 'Prueba: el descanso de P-3 cambió');
}

/* ---------- Simulación: 3 semanas día por día, con partido el lunes 2 y congelando como la app ---------- */
if (freezeTargets) {
  const d = clone(BASE); d.sessions.push(match(MON));
  let id = 0; const moved = [];
  for (let i = 0; i < 21; i++) {
    const today = addDays(TUE, i);
    const st = E.deriveState({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: d.injuries, tests: d.tests, checkins: d.checkins, sessions: d.sessions, agenda: [], molestias: [], customExercises: [] }, today);
    const week = E.buildWeek(st, E.weekStartOf(today), today);
    const day = week.find(x => x.date === today);
    Object.assign(d.settings.plan, freezeTargets(week, today, d.settings.plan));
    if (day.swapTo) moved.push(day.swapTo);
    for (const s of day.sessions) {
      if (s.type === 'descanso') continue;
      const L = { id: 'sim-' + (++id), date: today, type: s.type, done: true, minutes: s.est || 30, rpe: s.intense ? 8 : 5, est: s.est, source: 'entreno' };
      if (s.field && s.field.kind === 'golpeo') L.kick = { level: s.level, pd: 0, pn: 0 };
      if (s.field && s.field.kind === 'sprint') L.spr = { level: s.level, pd: 0, pn: 0 };
      if (s.field && s.field.kind === 'rt') L.rt = { level: s.level };
      if (s.type === 'test') { L.tests = ['ext8', 'hop1', 'hop3', 'rn', 'palp']; d.tests.push({ id: 't-' + today, date: today, ext8: { d: 48, i: 50 }, hop1: { d: 160, i: 165 }, hop3: { d: 510, i: 520 }, rn: 'completo', rnPain: 0, palp: 0 }); }
      if (s.items && s.items.length) L.exercises = s.items.map(it => ({ id: it.id, slot: it.slot, sets: Array.from({ length: (it.spec && it.spec.s) || 0 }, () => ({ kg: 20, reps: 8, done: true })) }));
      d.sessions.push(L);
    }
  }
  const intenseOn = (dt) => d.sessions.some(s => s.date === dt && isIntenseLog(s));
  for (const dt of moved) ok(intenseOn(dt), 'Simulación: lo movido al ' + dt + ' no se hizo');
  for (let i = 0; i < 20; i++) { const a = addDays(TUE, i), b = addDays(TUE, i + 1); ok(!(intenseOn(a) && intenseOn(b)), 'Simulación: dos días intensos seguidos ' + a + ' y ' + b); }
  const wk = {}; for (let i = 0; i < 21; i++) { const a = addDays(TUE, i); if (intenseOn(a)) wk[E.weekStartOf(a)] = (wk[E.weekStartOf(a)] || 0) + 1; }
  Object.entries(wk).forEach(([w, n]) => ok(n <= 3, 'Simulación: ' + n + ' días intensos en la semana del ' + w));
  ok(moved.length > 0, 'Simulación: no hubo ningún movimiento para comprobar');
}

/* ======================= Fase B (v4.2) ======================= */
const dayBlocks = E.dayBlocks, deriveKick = G('deriveKick'), KICK_REQ = G('KICK_REQ'), buildAgenda = G('buildAgenda'), hm = G('hm');
const k8 = [{ id: 'k8a', date: '2026-10-26', type: 'golpeo', done: true, kick: { level: 8, pd: 0, pn: 0 } }];
const F5 = { phase: 5, kickStart: 8, sprintStart: 6, phaseLog: [{ phase: 4, date: '2026-10-10' }, { phase: 5, date: '2026-10-25' }] };
const WEEK = [MON, TUE, WED, THU, '2026-11-06', SAT, '2026-11-08'];
const campoOrder = (day) => ((dayBlocks(day).find(b => b.key === 'campo') || { sessions: [] }).sessions).map(s => s.type);

/* ---------- E2 · F5 sin club: golpeo, sprint y balón; 3 intensos no seguidos ---------- */
{
  const p = plan(MON, { injury: F5, sessions: s6.concat(k8) });
  const wk = WEEK.map(dt => p.day(dt));
  const n = (t) => wk.filter(x => types(x).includes(t)).length;
  ok(n('golpeo') >= 2, 'E2: F5 sin club con ' + n('golpeo') + ' golpeos: ' + wk.map(desc).join(' · '));
  ok(n('sprint') + n('testRend') >= 1, 'E2: F5 sin club sin sprint');
  ok(n('balon') >= 6, 'E2: F5 sin club con balón ' + n('balon') + ' días');
  const ints = wk.map(x => x.intense);
  ok(ints.filter(Boolean).length <= 3 && !ints.some((v, i) => v && ints[i + 1]), 'E2: intensos ' + wk.map(x => (x.intense ? 'I' : '·')).join(''));
  const fm = wk.flatMap(x => x.sessions).find(s => s.type === 'fuerzaMax');
  ok(fm && fm.est <= 80, 'E17: Fuerza máxima de ' + (fm && fm.est) + ' min');
  const sat = p.day(SAT), j = ses(sat, 'juego');
  ok(j && /Simulación/.test(j.title) && j.field.steps.length === 4, 'E12: sin compañeros el sábado no es simulación de partido: ' + (j && j.title));
  const q = plan(MON, { injury: F5, sessions: s6.concat(k8), profile: { partners: true } });
  ok(/Juego reducido/.test((ses(q.day(SAT), 'juego') || { field: { steps: [{}] } }).field.steps[0].n || ''), 'E12: con compañeros no hay juego reducido');
  /* E11 · K8 con fatiga: el jueves después del RT; sin RT, un RT corto antes */
  const thu = p.day(THU), tue = p.day(TUE);
  const order = campoOrder(thu);
  ok(order.indexOf('rt') >= 0 && order.indexOf('golpeo') > order.indexOf('rt'), 'E11: el jueves el golpeo K8 no va después del RT: ' + order.join(','));
  ok(ses(thu, 'golpeo') && !ses(thu, 'golpeo').field.pre, 'E11: con RT en el día, el K8 no debería sumar otro RT');
  ok(ses(tue, 'golpeo') && ses(tue, 'golpeo').field.pre && ses(tue, 'golpeo').field.pre.series === 2, 'E11: K8 sin RT en el día y sin RT corto antes');
  const gNo = E.makeSession('golpeo', TUE, p.st, { noRT: true });
  ok(gNo.level === 8 && !gNo.field.pre, 'E11: con una molestia que quita el RT, el K8 suma un RT corto');
  const iq = plan(TUE, { injury: F5, sessions: s6.concat(k8), molestias: [mol({ fecha: TUE, zona: 'isquio', lado: 'd', tipo: 'cargado', nivel: 8 })] });
  ok(!iq.week.filter(x => x.date >= TUE && x.date <= WED).some(x => (ses(x, 'golpeo') || { field: {} }).field.pre), 'E11: isquio cargado 8 y un día con RT corto antes del K8');
}

/* ---------- D9 · Golpeo primero hasta K7 ---------- */
{
  const tue = plan(TUE).day(TUE), order = campoOrder(tue);
  ok(order[0] === 'golpeo' && order.indexOf('sprint') > 0, 'D9: el martes F3 la cancha no empieza por el golpeo: ' + order.join(','));
}

/* ---------- D2 · Ritmo de progresión ---------- */
{
  ok(KICK_REQ[6] === 2, 'D2: K6 debería pedir 2 sesiones limpias');
  const L = (arr) => deriveKick(arr.map(([date, level], i) => ({ id: 'k' + i, date, type: 'golpeo', done: true, kick: { level, pd: 0, pn: 0 } })), 1);
  const a = L([['2026-10-05', 1], ['2026-10-06', 2]]);
  ok(a.level === 2 && a.hold, 'D2: K1 y K2 en días seguidos suben a K' + a.level + ' (máximo un nivel cada 48 h)');
  const b = L([['2026-10-05', 1], ['2026-10-06', 2], ['2026-10-07', 2]]);
  ok(b.level === 3, 'D2: a las 48 h no sube: K' + b.level);
  // Plan con aceleración (F2-F3): el golpeo previsto nunca sube dos días seguidos
  const p = plan(MON, { injury: { phase: 3, kickStart: 1, sprintStart: 1 } , sessions: [] });
  const base = clone(BASE); base.sessions = base.sessions.filter(s => s.type !== 'golpeo' && s.type !== 'sprint');
  const st = E.deriveState({ profile: base.profile, settings: base.settings, weights: base.weights, injuries: base.injuries, tests: base.tests, checkins: [], sessions: base.sessions, agenda: [], molestias: [], customExercises: [] }, MON);
  const wk = E.buildWeek(st, MON, MON).concat(E.buildWeek(st, addDays(MON, 7), MON));
  let prev = null, lastUp = null;
  for (const x of wk) { const g = ses(x, 'golpeo'); if (!g) continue; if (prev !== null && g.level > prev) { ok(!lastUp || E.addDays(lastUp, 2) <= x.date, 'D2: el golpeo previsto sube el ' + lastUp + ' y otra vez el ' + x.date); lastUp = x.date; } prev = g.level; }
  ok(p.st, 'D2: estado');
  // K7 en dos pasos
  const k7 = [['2026-10-12', 6], ['2026-10-15', 6], ['2026-10-19', 6]].map(([date, level], i) => ({ id: 'k7-' + i, date, type: 'golpeo', done: true, kick: { level, pd: 0, pn: 0 } }));
  const q = plan(TUE, { injury: { phase: 4, phaseLog: [{ phase: 4, date: '2026-10-10' }] }, sessions: k7 });
  const g7 = ses(q.day(TUE), 'golpeo');
  ok(q.st.kick.level === 7 && g7 && g7.level === 7 && g7.field.target === 30, 'D2: la primera sesión de K7 no es 20 remates + 10 centros: K' + (g7 && g7.level) + ' · ' + (g7 && g7.field.target));
  const volley = ((ses(q.day(TUE), 'balon') || { field: { drills: [] } }).field.drills || []).filter(x => x.foot === 'der');
  ok(!volley.length, 'D2: la primera sesión de K7 ya tiene voleas con la derecha en Balón: ' + volley.map(x => x.id).join(','));
  const q2 = plan(THU, { injury: { phase: 4, phaseLog: [{ phase: 4, date: '2026-10-10' }] }, sessions: k7.concat([{ id: 'k7-x', date: TUE, type: 'golpeo', done: true, kick: { level: 7, pd: 0, pn: 0 } }]) });
  const g72 = ses(q2.day(THU), 'golpeo');
  ok(g72 && g72.level === 7 && g72.field.target === 40, 'D2: la segunda sesión de K7 no es completa: ' + (g72 && g72.field.target));
  // Piso de días desde la lesión
  const recent = plan(MON, { injury: { phase: 2, date: '2026-10-25', phaseLog: [{ phase: 1, date: '2026-10-25' }, { phase: 2, date: '2026-10-30' }] } });
  ok(recent.st.criteria && !recent.st.criteria.ready && recent.st.criteria.items.some(i => /días desde la lesión/.test(i.label) && !i.ok), 'D2: lesión de 8 días lista para F3');
  const pr = E.project(recent.st, MON);
  ok(!pr.phases[3] || pr.phases[3] >= '2026-11-08', 'D2: la proyección pasa a F3 el ' + pr.phases[3] + ', antes de los 14 días');
  const own = plan(MON, { injury: { phase: 2, date: '2026-10-25', floors: { 3: 5 }, phaseLog: [{ phase: 1, date: '2026-10-25' }, { phase: 2, date: '2026-10-30' }] } });
  ok(own.st.criteria && own.st.criteria.ready, 'D2: el piso configurado en la lesión no se usa');
  const old = plan(MON);
  ok(!(old.st.criteria.items || []).some(i => /días desde la lesión/.test(i.label) && !i.ok), 'D2: el piso frena una lesión de 2 meses');
}

/* ---------- D5 · Sueño acumulado ---------- */
{
  const short = plan(TUE, { checkins: [ci(TUE, { sleepH: 5.5 })] }).day(TUE);
  ok((ses(short, 'golpeo') || { level: 0 }).level <= 3 && (ses(short, 'sprint') || { level: 0 }).level <= 2 && !types(short).includes('test'), 'D5: 5,5 h de sueño: ' + desc(short));
  const nights = [0, 1, 2, 3, 4, 5, 6].map(k => ci(addDays(TUE, -k), { sleepH: 8.2 }));
  const debt = plan(TUE, { checkins: nights });
  const dT = debt.day(TUE), dW = debt.day(WED);
  ok((ses(dT, 'golpeo') || { level: 0 }).level <= 3 && !types(dT).includes('test'), 'D5: deuda de 5,6 h y el martes: ' + desc(dT));
  ok(dT.notes.some(n => /de sueño en 7 días/.test(n)), 'D5: sin nota de la deuda de sueño');
  ok(G('sleepDebt')(debt.st, TUE).debt >= 5, 'D5: la deuda no suma 5 h');
  const fine = plan(TUE, { checkins: [0, 1, 2, 3, 4, 5, 6].map(k => ci(addDays(TUE, -k), { sleepH: 9.5 })) }).day(TUE);
  ok((ses(fine, 'golpeo') || {}).level === (ses(plan(TUE).day(TUE), 'golpeo') || {}).level, 'D5: con 9,5 h el golpeo cambia');
  if (buildAgenda) {
    const ag = buildAgenda(dT, debt.st, null), ag0 = buildAgenda(plan(TUE).day(TUE), plan(TUE).st, null);
    ok(ag.sleep === ag0.sleep - 30, 'D5: con deuda la hora de dormir no se adelanta 30 min (' + ag.sleep + ' vs ' + ag0.sleep + ')');
    const pt = plan('2026-11-12');
    const agT = buildAgenda(pt.day('2026-11-12'), pt.st, null);
    ok(agT.sleep === hm('21:30') - 30, 'D5: a 4 días de la prueba no se adelanta la hora de dormir');
  }
}

/* ---------- D7 · Dolor muscular alto: saltos a la mitad y sin estrenar nivel ---------- */
{
  const base = plan(THU).day(THU), sore = plan(THU, { checkins: [ci(THU, { soreness: 1 })] }).day(THU);
  const jumps = (d) => d.sessions.flatMap(s => s.items || []).filter(it => BANK_INDEX[it.id] && BANK_INDEX[it.id].c === 'pliom').reduce((a, it) => a + it.spec.s, 0);
  ok(jumps(base) > 0 && jumps(sore) <= Math.ceil(jumps(base) / 2) + 1, 'D7: saltos ' + jumps(base) + ' → ' + jumps(sore));
  const st = plan(THU).st, best = Math.max(1, ...st.sessions.filter(s => s.type === 'golpeo' && s.kick && G('outcome')(s.kick.pd, s.kick.pn) === 'clean').map(s => s.kick.level));
  ok(!ses(sore, 'golpeo') || ses(sore, 'golpeo').level <= best, 'D7: con dolor muscular estrena K' + (ses(sore, 'golpeo') || {}).level);
}

/* ---------- D8 · Día de test más liviano ---------- */
{
  const d = plan(TUE).day(TUE), fa = ses(d, 'fuerzaA');
  ok(types(d).includes('test') && fa && !fa.items.some(it => it.slot === 'ext_uni'), 'D8: el día de test la Fuerza A repite la extensión de rodilla');
  ok(fa && fa.items.some(it => it.cutTest), 'D8: el día de test la Fuerza A no baja una serie');
}

/* ---------- E16 · Tipo de día para la comida ---------- */
{
  const dayKind = G('dayKind');
  const p = plan(TUE), d = p.day(TUE);
  const skipped = d.sessions.map(s => ({ id: 'n-' + s.type, date: TUE, type: s.type, done: false }));
  ok(dayKind(d, p.st.profile, skipped) !== 'alto', 'E16: con todo «No la hice» el día sigue en carga alta');
  const m = plan(TUE, { sessions: [match(MON)] });
  ok(['moderado', 'alto'].includes(dayKind(m.day(TUE), m.st.profile, m.st.sessions)), 'E16: el día después de un partido es «' + dayKind(m.day(TUE), m.st.profile, m.st.sessions) + '»');
}

/* ---------- Simulación de 6 semanas día por día (F2 → F5 y F5 sin club), congelando como la app ---------- */
function simulate(start, nDays, patch) {
  const d = clone(BASE); patch = patch || {};
  if (patch.injury) Object.assign(d.injuries[0], patch.injury);
  if (patch.keep) d.sessions = d.sessions.filter(patch.keep);
  if (patch.sessions) d.sessions = d.sessions.concat(patch.sessions);
  let id = 0; const moved = [], levelUps = { k: [], s: [] }, plans = [];
  let prevK = null, prevS = null;
  for (let i = 0; i < nDays; i++) {
    const today = addDays(start, i);
    const mk = () => E.deriveState({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: d.injuries, tests: d.tests, checkins: d.checkins, sessions: d.sessions, agenda: [], molestias: [], customExercises: [] }, today);
    let st = mk();
    if (st.criteria && st.criteria.ready && st.phase < 5) { d.injuries[0].phase = st.phase + 1; d.injuries[0].phaseLog.push({ phase: st.phase + 1, date: today }); st = mk(); }
    if (prevK !== null && st.kick.level > prevK) levelUps.k.push(today);
    if (prevS !== null && st.sprint.level > prevS) levelUps.s.push(today);
    prevK = st.kick.level; prevS = st.sprint.level;
    const week = E.buildWeek(st, E.weekStartOf(today), today);
    const day = week.find(x => x.date === today);
    plans.push({ date: today, phase: st.phase, day });
    Object.assign(d.settings.plan, freezeTargets(week, today, d.settings.plan));
    if (day.swapTo) moved.push(day.swapTo);
    for (const s of day.sessions) {
      if (s.type === 'descanso') continue;
      const L = { id: 'sim-' + (++id), date: today, type: s.type, done: true, minutes: s.est || 30, rpe: s.intense ? 8 : 5, est: s.est, source: 'entreno' };
      if (s.field && s.field.kind === 'golpeo') L.kick = { level: s.level, pd: 0, pn: 0 };
      if (s.field && s.field.kind === 'sprint') L.spr = { level: s.level, pd: 0, pn: 0 };
      if (s.field && s.field.kind === 'rt') L.rt = { level: s.level };
      if (s.type === 'test') { L.tests = ['ext8', 'hop1', 'hop3', 'rn', 'palp']; d.tests.push({ id: 't-' + today, date: today, ext8: { d: 48, i: 50 }, hop1: { d: 160, i: 165 }, hop3: { d: 510, i: 520 }, rn: 'completo', rnPain: 0, palp: 0 }); }
      if (s.items && s.items.length) L.exercises = s.items.map(it => ({ id: it.id, slot: it.slot, sets: Array.from({ length: (it.spec && it.spec.s) || 0 }, () => ({ kg: 20, reps: 8, done: true })) }));
      d.sessions.push(L);
    }
  }
  return { d, moved, levelUps, plans };
}
function invariants(tag, R, start, nDays) {
  const intenseOn = (dt) => R.d.sessions.some(s => s.date === dt && isIntenseLog(s));
  for (const dt of R.moved) if (dt < addDays(start, nDays)) ok(intenseOn(dt), tag + ': lo movido al ' + dt + ' no se hizo');
  for (let i = 0; i + 1 < nDays; i++) { const a = addDays(start, i), b = addDays(start, i + 1); ok(!(intenseOn(a) && intenseOn(b)), tag + ': dos días intensos seguidos ' + a + ' y ' + b); }
  const wk = {}; for (let i = 0; i < nDays; i++) { const a = addDays(start, i); if (intenseOn(a)) wk[E.weekStartOf(a)] = (wk[E.weekStartOf(a)] || 0) + 1; }
  Object.entries(wk).forEach(([w, n]) => ok(n <= 3, tag + ': ' + n + ' días intensos en la semana del ' + w));
  for (const k of ['k', 's']) { const u = R.levelUps[k]; for (let i = 1; i < u.length; i++) ok(E.addDays(u[i - 1], 2) <= u[i], tag + ': sube de nivel ' + k.toUpperCase() + ' el ' + u[i - 1] + ' y el ' + u[i]); }
}
if (freezeTargets) {
  // Desde F2 con K1 y S1, todo limpio: avanza de fase al cumplir criterios
  const A = simulate(MON, 42, { injury: { phase: 2, kickStart: 1, sprintStart: 1, phaseLog: [{ phase: 1, date: '2026-09-02' }, { phase: 2, date: '2026-09-20' }] }, keep: s => s.type !== 'golpeo' && s.type !== 'sprint' });
  invariants('Sim F2', A, MON, 42);
  const kFirst7 = A.d.sessions.filter(s => s.kick && s.kick.level === 7).sort((a, b) => (a.date < b.date ? -1 : 1))[0];
  const p7 = kFirst7 && A.plans.find(x => x.date === kFirst7.date);
  ok(!kFirst7 || (p7 && ses(p7.day, 'golpeo').field.target === 30), 'Sim F2: la primera sesión de K7 no es el paso 1');
  const k8s = A.plans.filter(x => (ses(x.day, 'golpeo') || {}).level === 8);
  /* v4.6: los sprints repetidos o el juego del día también dan la fatiga previa del K8 */
  const fat = (x) => ses(x.day, 'golpeo').field.pre || ['rt', 'rsa', 'juego'].some(t => types(x.day).includes(t));
  ok(k8s.every(fat), 'Sim F2: K8 sin fatiga previa el ' + k8s.filter(x => !fat(x)).map(x => x.date).join(','));
  const days48 = A.plans.filter(x => (ses(x.day, 'golpeo') || {}).level >= 1).length;
  ok(days48 > 0, 'Sim F2: sin golpeo');
  console.log('  sim F2 → fase final F' + A.plans[A.plans.length - 1].phase + ' · subidas K ' + A.levelUps.k.join(' ') + ' · S ' + A.levelUps.s.join(' '));
  // F5 sin club, 6 semanas
  const B = simulate(MON, 42, { injury: F5, sessions: s6.concat(k8) });
  invariants('Sim F5', B, MON, 42);
  for (let w = 0; w < 6; w++) {
    const ws = addDays(MON, 7 * w), we = addDays(ws, 6);
    if (BASE.profile.trials.some(t => t >= ws && t <= we)) continue; // la semana de la prueba tiene su propio plan
    const inW = (t) => B.d.sessions.filter(s => s.date >= ws && s.date <= we && s.type === t).length;
    ok(inW('golpeo') >= 2 && inW('sprint') + inW('testRend') >= 1, 'Sim F5: semana del ' + ws + ' con ' + inW('golpeo') + ' golpeos y ' + inW('sprint') + ' sprints');
    ok(inW('balon') >= 5, 'Sim F5: semana del ' + ws + ' con balón ' + inW('balon') + ' días');
  }
}

/* ======================= Fase C (v4.3) ======================= */
const dayStatus = G('dayStatus'), loadModel = G('loadModel'), readinessBaseline = G('readinessBaseline'), shotsWeek = G('shotsWeek'), sanaShotCap = G('sanaShotCap');
const dayTargets = G('dayTargets'), slotTargets = G('slotTargets'), habitSkips = G('habitSkips'), buildMenu = G('buildMenu'), WX = G('WX');

/* ---------- M1 · Deuda de sesiones ---------- */
{
  const w = plan(WED).day(WED);
  ok(w.debtFrom === TUE && types(w).includes('fuerzaA') && w.intense, 'M1: el martes sin hacer no se recupera el miércoles: ' + desc(w));
  ok(w.notes.some(n => /Recuperas la sesión del martes/.test(n)), 'M1: sin nota de la sesión recuperada');
  const p = plan(WED), wk = p.week.filter(x => x.date >= WED && x.date <= '2026-11-08');
  const ints = wk.map(x => x.intense);
  ok(!ints.some((v, i) => v && ints[i + 1]), 'M1: con la deuda quedan intensos seguidos: ' + wk.map(desc).join(' · '));
  const pained = plan(WED, { checkins: [ci(TUE, { rfPain: 4 }), ci(WED, { rfPain: 0 })] }).day(WED);
  ok(!pained.debtFrom, 'M1: se recupera una sesión que no se hizo por dolor');
  const done = plan(WED, { sessions: [{ id: 'd1', date: TUE, type: 'fuerzaA', done: true, minutes: 60, rpe: 7, exercises: [] }] }).day(WED);
  ok(!done.debtFrom, 'M1: deuda con la sesión hecha');
  const skipped = plan(WED, { sessions: [{ id: 'nd', date: TUE, type: 'fuerzaA', done: false }] }).day(WED);
  ok(skipped.debtFrom === TUE, 'M1: «No la hice» sin dolor no deja deuda');
  ok(freezeTargets(p.week, WED, {})[WED].types.includes('fuerzaA'), 'M1: al registrar, el día no queda con la sesión recuperada');
}

/* ---------- M4 · Estado contra la línea base ---------- */
{
  const hist = []; for (let k = 1; k <= 14; k++) hist.push(ci(addDays(TUE, -k), { sleepH: 9, sleepQ: 5, fatigue: 5, soreness: 5, stress: 5 }));
  const good = plan(TUE, { checkins: hist.concat([ci(TUE, { sleepH: 9, sleepQ: 5, fatigue: 5, soreness: 5, stress: 5 })]) });
  ok(dayStatus(good.st, TUE).level === 'verde', 'M4: con todo bien el estado no es verde: ' + dayStatus(good.st, TUE).reasons.join(', '));
  const low = plan(TUE, { checkins: hist.concat([ci(TUE, { sleepH: 8, sleepQ: 3, fatigue: 3, soreness: 4, stress: 3 })]) });
  const bl = readinessBaseline(low.st, TUE);
  ok(bl && bl.low && bl.today >= 50, 'M4: estado ' + (bl && bl.today) + ' con media ' + (bl && bl.mean) + ' no cuenta como bajo para ti');
  const dl = low.day(TUE), g = ses(dl, 'golpeo');
  ok(g && g.level <= 4, 'M4: estado bajo para ti y estrena K' + (g && g.level));
  ok(dayStatus(low.st, TUE).level === 'ambar', 'M4: estado bajo para ti no es ámbar');
  const histT = []; for (let k = 1; k <= 14; k++) histT.push(ci(addDays(THU, -k), { sleepH: 9, sleepQ: 5, fatigue: 5, soreness: 5, stress: 5 }));
  const lowT = plan(THU, { checkins: histT.concat([ci(THU, { sleepH: 8, sleepQ: 3, fatigue: 3, soreness: 4, stress: 3 })]) }).day(THU);
  ok(lowT.sessions.some(s => (s.items || []).some(it => it.cutState)), 'M4: estado bajo para ti sin una serie menos en accesorios: ' + desc(lowT));
  const red = plan(TUE, { checkins: [ci(TUE, { rfPain: 4 })] });
  ok(dayStatus(red.st, TUE).level === 'rojo', 'M4: dolor RF 4 no es rojo');
  const three = hist.slice(3).concat([0, 1, 2].map(k => ci(addDays(TUE, -k), { sleepH: 8, sleepQ: 3, fatigue: 3, soreness: 3, stress: 3 })));
  const tl = plan(TUE, { checkins: three }).day(TUE), sp = ses(tl, 'sprint');
  ok(sp && sp.field.reps < SPRINT_REPS[sp.level], 'M4: tres días bajos sin descarga: ' + (sp && sp.field.reps));
}

/* ---------- M3 · Carga ---------- */
{
  const short = plan(TUE);
  ok(loadModel(short.st, TUE).ratio === null, 'M3: con menos de 4 semanas de registros hay cociente');
  const old = []; for (let k = 10; k <= 50; k += 2) old.push({ id: 'o' + k, date: addDays(TUE, -k), type: 'prevencion', done: true, minutes: 40, rpe: 4 });
  const spike = []; for (let k = 1; k <= 6; k++) spike.push({ id: 'sp' + k, date: addDays(TUE, -k), type: 'fuerzaA', done: true, minutes: 90, rpe: 9 });
  const p = plan(TUE, { sessions: old.concat(spike) });
  const lm = loadModel(p.st, addDays(TUE, -1));
  ok(lm.ratio !== null && lm.ratio > 1.5, 'M3: el pico de carga no da cociente alto: ' + lm.ratio);
  ok(p.day(TUE).notes.some(n => /Carga de los últimos 7 días/.test(n)), 'M3: sin aviso de carga');
  const noRpe = loadModel(plan(TUE, { sessions: [{ id: 'nr', date: MON, type: 'fuerzaA', done: true, minutes: 60 }] }).st, MON);
  ok(noRpe.week >= 60 * 4, 'M3: una sesión sin RPE suma 0');
}

/* ---------- D4 · Remates fuertes con la pierna sana ---------- */
{
  const p = plan(MON);
  const cap = sanaShotCap(p.st.sessions, MON);
  const planned = p.week.filter(x => x.date >= MON && x.date <= '2026-11-08').reduce((a, x) => a + ((ses(x, 'balon') || {}).shotsPlan || 0), 0);
  ok(cap >= 30 && cap <= 70 && planned <= cap, 'D4: la semana planifica ' + planned + ' remates con la zurda (tope ' + cap + ')');
  const many = [{ id: 'zz', date: MON, type: 'balon', done: true, ball: { drills: [{ id: 'zurda_parado', valor: 20, intentos: 36 }] } }];
  const q = plan(TUE, { sessions: many });
  const left = q.week.filter(x => x.date >= TUE && x.date <= '2026-11-08').reduce((a, x) => a + ((ses(x, 'balon') || {}).shotsPlan || 0), 0);
  ok(shotsWeek(q.st.sessions, MON).sana === 36 && left + 36 <= sanaShotCap(q.st.sessions, MON), 'D4: con 36 remates hechos el plan suma ' + left);
}

/* ---------- M7 · Batería de rendimiento, descarga y énfasis ---------- */
{
  const p = plan(MON, { injury: F5, sessions: s6.concat(k8) });
  const t = ses(p.day(TUE), 'testRend');
  ok(t && t.field.steps.some(x => x.key === 's10') && !ses(p.day(TUE), 'sprint'), 'M7: F5 sin batería de rendimiento el martes: ' + desc(p.day(TUE)));
  ok(campoOrder(p.day(TUE))[0] === 'testRend', 'M7: la batería no va primero en la cancha');
  const done = plan(TUE, { injury: F5, sessions: s6.concat(k8).concat([{ id: 'tr1', date: '2026-10-20', type: 'testRend', done: true, tests: ['s10', 's30'] }]) });
  ok(!done.week.some(x => x.date >= TUE && x.date <= '2026-11-08' && types(x).includes('testRend')), 'M7: batería a menos de 4 semanas de la anterior');
  const blocked = plan(TUE, { injury: F5, sessions: s6.concat(k8), checkins: [ci(TUE, { sleepH: 5 })] }).day(TUE);
  ok(!types(blocked).includes('testRend') && types(blocked).includes('sprint') && blocked.notes.some(n => /Test de rendimiento pospuesto/.test(n)), 'M7: batería con 5 h de sueño: ' + desc(blocked));
  ok(isIntenseLog({ type: 'testRend', date: TUE, done: true, tests: ['s10'] }), 'M7: la batería no cuenta como intensa');
  const em = plan(MON, { injury: F5, sessions: s6.concat(k8), profile: { emphasis: 'fuerza' } });
  ok(types(em.day(THU)).includes('fuerzaMax'), 'M7: énfasis en fuerza sin fuerza máxima el jueves: ' + desc(em.day(THU)));
  const ev = plan(MON, { injury: F5, sessions: s6.concat(k8), profile: { emphasis: 'velocidad' } });
  ok(types(ev.day(THU)).includes('sprint') && !types(ev.day(THU)).includes('rt'), 'M7: énfasis en velocidad sin sprint el jueves: ' + desc(ev.day(THU)));
  // F6: la 4.ª semana del bloque es de descarga
  const f6 = plan(MON, { injury: { status: 'resuelta' }, profile: { blockStart: addDays(MON, -21) } });
  const tue6 = f6.day(TUE);
  ok(tue6.deload && f6.week.some(x => x.notes.some(n => /Semana de descarga/.test(n))), 'M7: F6 sin semana de descarga');
  const wk6 = f6.week.filter(x => x.date >= MON && x.date <= '2026-11-08'), g6 = wk6.map(x => ses(x, 'golpeo')).filter(Boolean);
  ok(g6.length && g6.every(g => g.field.target < KICK_TARGET[g.level]), 'M7: la descarga no baja el volumen del golpeo: ' + g6.map(g => g.field.target).join(','));
  const f6n = plan(MON, { injury: { status: 'resuelta' }, profile: { blockStart: MON } });
  ok(!f6n.day(TUE).deload, 'M7: descarga en la 1.ª semana del bloque');
}

/* ---------- M6 · Nutrición adaptativa ---------- */
{
  const p = plan(TUE), d = p.day(TUE);
  const ag = buildAgenda(d, p.st, null);
  // Carbohidratos alrededor de lo intenso: la merienda antes de la cancha pesa más
  const T = dayTargets(p.st, TUE, ag), base = slotTargets(ag, T, null, {});
  const mer = ag.items.find(x => x.key === 'merienda'), col = ag.items.find(x => x.key === 'nocturna') || ag.items.find(x => x.key === 'desayuno');
  ok(mer && base.merienda && base.merienda.c / T.c > 0.9 * 0.13, 'M6: la merienda antes de la cancha sin más carbohidratos: ' + JSON.stringify(base.merienda));
  // Lo comido cuenta: si el desayuno fue grande, las comidas que faltan bajan
  const eaten = { keys: new Set(['desayuno']), tot: { p: 80, c: 200, f: 40 } };
  const re = slotTargets(ag, T, null, { eaten });
  ok(re.almuerzo.p < base.almuerzo.p && re.almuerzo.c < base.almuerzo.c, 'M6: con un desayuno grande el almuerzo no baja: ' + JSON.stringify(base.almuerzo) + ' → ' + JSON.stringify(re.almuerzo));
  const little = slotTargets(ag, T, null, { eaten: { keys: new Set(['desayuno']), tot: { p: 5, c: 10, f: 2 } } });
  ok(little.almuerzo.p > base.almuerzo.p && little.almuerzo.p <= Math.round(base.almuerzo.p * 1.6), 'M6: con un desayuno chico el almuerzo no sube con límite');
  // Comidas que se saltan seguido: opción rápida y menos peso
  const meals = [1, 2, 3].map(k => ({ id: 'sk' + k, date: addDays(TUE, -k), slot: 'desayuno', skipped: true, items: [] }));
  const hs = habitSkips(meals, TUE);
  ok(hs.has('desayuno'), 'M6: tres desayunos saltados no cuentan como hábito');
  const q = buildMenu('desayuno', { p: 30, c: 60, f: 10 }, TUE, 0, true);
  ok(/Yogur|Leche/.test(q.name) && /salteaste/.test(q.tip), 'M6: sin opción rápida para el desayuno que se salta: ' + q.name);
  ok(slotTargets(ag, T, null, { habit: hs }).desayuno.p < base.desayuno.p, 'M6: la comida que se salta no pesa menos');
  // Calor: más agua
  WX[TUE] = { tmax: 34 };
  const Th = dayTargets(p.st, TUE, ag);
  ok(Th.heat && Th.heat.extra > 0 && Th.water > T.water, 'M6: 34 °C sin agua extra');
  delete WX[TUE];
  // Meta de peso: −250 kcal en días de carga media o baja, nunca en carga alta
  const wts = [{ id: 'w1', date: addDays(TUE, -14), kg: 90 }, { id: 'w2', date: addDays(TUE, -7), kg: 90.2 }, { id: 'w3', date: addDays(TUE, -1), kg: 90.3 }];
  const pw = plan(TUE, { profile: { weightTarget: '88' } }); pw.st.weights = wts; pw.st.weight = 90.3;
  const agW = buildAgenda(pw.day(WED), pw.st, null), TW = dayTargets(pw.st, WED, agW);
  ok(TW.weightAdj && TW.weightAdj.kcal === -250, 'M6: meta 88 kg con 90,3 y subiendo sin recorte el miércoles: ' + JSON.stringify(TW.weightAdj));
  const agT = buildAgenda(pw.day(TUE), pw.st, null), TT = dayTargets(pw.st, TUE, agT);
  ok(agT.kind !== 'alto' || (TT.weightAdj && TT.weightAdj.kcal === 0), 'M6: recorte de kcal en un día de carga alta');
  // Día de prueba: comida previa 3-4 h antes y snack 1 h antes; prueba de mañana: despertar 3 h antes
  const pt = plan('2026-11-16'), dp = pt.day('2026-11-16');
  const agP = buildAgenda(dp, pt.st, null), club = agP.items.find(x => x.key === 'club'), lunch = agP.items.find(x => x.key === 'almuerzo');
  ok(club && lunch && club.start - lunch.start >= 180 && club.start - lunch.start <= 240 && /Comida previa/.test(lunch.why), 'M6: día de prueba sin comida previa 3-4 h antes: ' + (club && fmt(club.start)) + ' / ' + (lunch && fmt(lunch.start)));
  const agAM = buildAgenda(dp, pt.st, { items: { club: { start: 9 * 60 } } });
  const wk = agAM.items.find(x => x.key === 'wake'), des = agAM.items.find(x => x.key === 'desayuno'), post = agAM.items.find(x => x.key === 'post');
  ok(wk && wk.start <= 6 * 60 && des && /Comida previa/.test(des.why) && post, 'M6: prueba a las 9:00 sin despertar 3 h antes, desayuno previo o comida después');
  ok(!agAM.items.some(x => x.key === 'colacion' && x.start >= 8 * 60 && x.start <= 11 * 60), 'M6: media mañana encima de la prueba');
}
function fmt(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

/* ---------- Dormir siempre de noche (perfil o cambio del día guardados en la mañana) ---------- */
{
  const SUN = '2026-11-01', normBed = G('normBed'), scheduleOf = G('scheduleOf');
  const ck = [{ id: SUN, date: SUN, bedTime: '21:30', wakeTime: '07:30', sleepH: 10 }];
  const check = (label, sched, agendaDoc, wantSleep) => {
    const p = plan(SUN, { profile: { schedule: sched }, checkins: ck });
    const ag = buildAgenda(p.day(SUN), p.st, agendaDoc);
    const it = (k) => ag.items.find(x => x.key === k);
    const sl = it('sleep'), cena = it('cena'), alm = it('almuerzo'), des = it('desayuno');
    ok(sl && sl.start === hm(wantSleep) + (hm(wantSleep) < 6 * 60 ? 1440 : 0), 'Dormir ' + label + ': quedó a las ' + (sl && fmt(sl.start % 1440)) + ' (esperado ' + wantSleep + ')');
    ok(cena && alm && des && cena.start > alm.end && cena.start > des.end, 'Cena ' + label + ': antes del almuerzo o del desayuno (' + (cena && fmt(cena.start % 1440)) + ')');
    ok(sl && cena && sl.start - cena.end >= 45, 'Cena ' + label + ': pegada a dormir');
    ok(ag.items.every((x, i, a) => !i || a[i - 1].start <= x.start), 'Orden ' + label + ': la agenda no sale ordenada');
    ok(sl && ag.items[ag.items.length - 1].key === 'sleep', 'Dormir ' + label + ': no es lo último del día');
  };
  check('10:30 en el perfil (a. m. por error)', { sleep: '10:30' }, null, '22:30');
  check('21:30 en el perfil', { sleep: '21:30' }, null, '21:30');
  check('00:30 en el perfil (después de medianoche)', { sleep: '00:30' }, null, '00:30');
  check('cambiado hoy a las 10:30', {}, { items: { sleep: { start: 10 * 60 + 30 } } }, '22:30');
  check('cambiado hoy a las 00:15', {}, { items: { sleep: { start: 15 } } }, '00:15');
  ok(scheduleOf({ schedule: { sleep: '10:30' } }).sleep === '22:30', 'Perfil: 10:30 no se lee como 22:30');
  ok(scheduleOf({ schedule: { sleep: 'xx' } }).sleep === '21:30', 'Perfil: hora de dormir inválida sin valor por defecto');
  ok(normBed(17 * 60) === 17 * 60 && normBed(23 * 60) === 23 * 60 && normBed(31 * 60) === 30 * 60, 'normBed: noche mal normalizada');
}

/* ---------- v4.5 · Lo que se hace de más cambia el plan ---------- */
{
  const isLegExercise = G('isLegExercise'), extraLoad = G('extraLoad'), carryRule = G('carryRule'), campoMaxFromText = G('campoMaxFromText'), parseTrainText = G('parseTrainText'), campoFromAi = G('campoFromAi');
  const SUN = '2026-11-01', MON2 = '2026-11-02', TUE2 = '2026-11-03', WED2 = '2026-11-04', THU2 = '2026-11-05';
  const heavy = (o, c) => Object.assign({ id: 'free-sun', date: SUN, type: 'cancha', done: true, source: 'ia', minutes: 120, rpe: 8, title: 'Definición', campo: Object.assign({ side: 'd', bloques: [
    { id: 'cl_def_ambas', n: 'Definición', cat: 'remate', min: 65, pies: 'ambos', int: 'alta' }, { id: 'cl_tiros_libres', n: 'Tiros libres', cat: 'balon_parado', min: 15, pies: 'der', int: 'alta' }, { id: 'cl_1v1', n: '1 contra 1', cat: 'duelo', min: 20, pies: 'ambos', int: 'alta' }, { id: 'cl_cambio_frente', n: 'Cambios de frente', cat: 'pase_largo', min: 20, pies: 'ambos', int: 'alta' }],
    golpes: { der: 'muchos', izq: 'muchos' }, cabezazos: 'no', sprints: 'varios', companeros: 1, pd: 0, pn: 0 }, c || {}) }, o || {});
  const fieldTypes = (d) => d.sessions.filter(s => ['sprint', 'rt', 'golpeo', 'golpeoTec', 'juego', 'balon', 'testRend'].includes(s.type)).map(s => s.type);

  /* Domingo pesado → lunes sin cancha, con rodillo, sin rellenos de piernas y con el tren superior intacto */
  const base = plan(MON2), p = plan(MON2, { sessions: [heavy()] });
  const m0 = base.day(MON2), m = p.day(MON2);
  ok(fieldTypes(m0).length > 0, 'v4.5: sin sesión extra el lunes debería tener cancha: ' + desc(m0));
  ok(fieldTypes(m).length === 0, 'v4.5: tras 2 h fuertes el domingo, el lunes sigue con cancha: ' + desc(m));
  ok(types(m).includes('recupPiernas') && types(m).includes('superiorA'), 'v4.5: el lunes debería ser tren superior + rodillo y movilidad: ' + desc(m));
  ok(ses(m, 'recupPiernas').items.some(it => it.id === 'foam_piernas'), 'v4.5: la recuperación no trae el rodillo de tren inferior');
  ok(ses(m, 'superiorA').items.every(it => !it.taper), 'v4.5: la carga de piernas no debería recortar el tren superior');
  ok(!(m.notes.join(' ').match(/Se suma/)), 'v4.5: el día de recuperación recibe rellenos: ' + m.notes.join(' | '));
  ok(/fuera del plan/.test(m.notes.join(' ')) && /48 h/.test(m.notes.join(' ')), 'v4.5: el lunes no explica el ajuste: ' + m.notes.join(' | '));
  ok(m.recover && E.dayKind(m, p.st.profile, p.st.sessions) === 'moderado', 'v4.5: el día después de mucha carga debería comer como carga media: ' + E.dayKind(m, p.st.profile, p.st.sessions));

  /* Martes (48 h): vuelve el golpeo, con menos volumen y sin el test */
  const t = p.day(TUE2);
  ok(types(t).includes('golpeo'), 'v4.5: a las 48 h debería volver el golpeo: ' + desc(t));
  ok(ses(t, 'golpeo').field.target < KICK_TARGET[ses(t, 'golpeo').level], 'v4.5: el martes no baja el volumen de golpeo');
  ok(!types(t).includes('test') && /Test de control pospuesto/.test(t.notes.join(' ')), 'v4.5: el test debería pasar a otro día: ' + desc(t));
  ok(!/Semana de la prueba/.test(t.sessions.flatMap(s => s.notes).join(' ')), 'v4.5: la nota habla de la semana de la prueba sin que haya prueba cerca');

  /* Con el plan congelado al registrar algo hoy: también se ajusta y no se pierde lo registrado */
  const frozen = plan(MON2, { sessions: [heavy(), { id: 'sup', date: MON2, type: 'superiorA', done: true, minutes: 79, rpe: 4, source: 'entreno' }], plan: { [MON2]: { types: ['superiorA', 'sprint', 'balon', 'rt'] } } });
  ok(fieldTypes(frozen.day(MON2)).length === 0 && types(frozen.day(MON2)).includes('superiorA'), 'v4.5: el día congelado no se ajusta: ' + desc(frozen.day(MON2)));
  const donePart = plan(MON2, { sessions: [heavy(), { id: 'b', date: MON2, type: 'balon', done: true, minutes: 30, rpe: 5 }], plan: { [MON2]: { types: ['superiorA', 'balon', 'rt'] } } });
  ok(types(donePart.day(MON2)).includes('balon') && !types(donePart.day(MON2)).includes('rt'), 'v4.5: se quitó un bloque ya registrado o quedó el RT: ' + desc(donePart.day(MON2)));

  /* Una extra hoy cambia lo que queda de hoy */
  const today = plan(MON2, { sessions: [heavy({ date: MON2, id: 'free-mon' })] });
  ok(fieldTypes(today.day(MON2)).length === 0, 'v4.5: una extra pesada hoy no quita la cancha de la tarde: ' + desc(today.day(MON2)));

  /* Extra moderada: mismo día, menos volumen */
  const mid = plan(MON2, { sessions: [{ id: 'mid', date: SUN, type: 'libre', done: true, minutes: 50, rpe: 6, title: 'Sesión libre' }] });
  ok(mid.day(MON2).notes.some(n => /40 % menos volumen/.test(n)) && types(mid.day(MON2)).includes('rt'), 'v4.5: la extra moderada debería bajar el volumen sin quitar la cancha: ' + desc(mid.day(MON2)));
  ok(ses(mid.day(MON2), 'balon').field.min < ses(m0, 'balon').field.min, 'v4.5: la extra moderada no baja el balón');
  /* Extra suave o de tren superior: no cambia nada */
  const soft = plan(MON2, { sessions: [{ id: 'sf', date: SUN, type: 'libre', done: true, minutes: 30, rpe: 3 }] });
  ok(desc(soft.day(MON2)) === desc(m0), 'v4.5: una extra suave no debería cambiar el lunes: ' + desc(soft.day(MON2)));
  const upper = plan(MON2, { sessions: [{ id: 'up', date: SUN, type: 'superiorB', done: true, minutes: 90, rpe: 9 }] });
  ok(!carryRule(upper.st, MON2, MON2), 'v4.5: una extra de tren superior no debería contar para las piernas');
  const upperLibre = { id: 'ul', date: SUN, type: 'libre', done: true, minutes: 90, rpe: 8, exercises: [{ id: 'press_mancuernas', sets: [{ kg: 20, reps: 8, done: true }] }, { id: 'remo_mancuerna', sets: [{ kg: 20, reps: 8, done: true }] }] };
  ok(!carryRule(plan(MON2, { sessions: [upperLibre] }).st, MON2, MON2), 'v4.5: una sesión libre de tren superior no debería contar para las piernas');
  /* Sesión libre sin bloques, dura y larga: cuenta como intensa y como carga */
  const plain = { id: 'pl', date: SUN, type: 'libre', done: true, minutes: 120, rpe: 9, title: 'Sesión libre' };
  ok(isIntenseLog(plain), 'v4.5: 120 min RPE 9 sin bloques no cuenta como intensa');
  ok(fieldTypes(plan(MON2, { sessions: [plain] }).day(MON2)).every(t => t === 'balon'), 'v4.5: la sesión libre sin bloques no cambia el lunes');
  /* Lo planificado no es extra; lo planificado que se reemplaza, tampoco */
  const planned = plan(WED2, { sessions: [{ id: 'fa', date: TUE2, type: 'fuerzaA', done: true, minutes: 70, rpe: 7 }, { id: 'kk', date: TUE2, type: 'golpeo', done: true, minutes: 25, rpe: 5, kick: { level: 5, pd: 0, pn: 0 } }, { id: 'sp', date: TUE2, type: 'sprint', done: true, minutes: 25, rpe: 6, spr: { level: 3, pd: 0, pn: 0 } }, { id: 'bb', date: TUE2, type: 'balon', done: true, minutes: 20, rpe: 5 }] });
  ok(extraLoad(planned.st, TUE2).net === 0 && !carryRule(planned.st, WED2, WED2), 'v4.5: un día hecho como estaba planificado cuenta como extra: ' + JSON.stringify(extraLoad(planned.st, TUE2)));
  const replaced = plan(WED2, { sessions: [{ id: 'rp', date: TUE2, type: 'cancha', done: true, minutes: 60, rpe: 6, campo: { side: 'd', bloques: [{ n: 'Rondo', cat: 'juego', min: 60, pies: 'ambos', int: 'media' }], golpes: { der: 'no', izq: 'no' }, cabezazos: 'no', sprints: 'no' } }] });
  ok(!carryRule(replaced.st, WED2, WED2), 'v4.5: una sesión libre que reemplaza a la del plan no es carga de más');

  /* 48 h entre días de golpeo fuerte, también con lo planificado */
  const kk = plan(WED2, { sessions: [{ id: 'k5', date: TUE2, type: 'golpeo', done: true, minutes: 25, rpe: 5, kick: { level: 5, pd: 0, pn: 0 } }] });
  const wball = ses(kk.day(WED2), 'balon');
  ok(wball && wball.field.drills.every(d => d.foot !== 'izq' && d.foot !== 'der' && !/Definición|Voleas/.test(d.n)), 'v4.5: el día después de patear fuerte quedan remates en Balón: ' + (wball ? wball.field.drills.map(d => d.n).join(', ') : '—'));
  ok(!types(kk.day(WED2)).includes('golpeo'), 'v4.5: golpeo dos días seguidos');
  for (let w = 0; w < 2; w++) { const days = plan(MON2).week; for (let i = 1; i < days.length; i++) { const a = ses(days[i - 1], 'golpeo'), b = ses(days[i], 'golpeo'); ok(!(a && a.level >= 4 && b), 'v4.5: golpeo fuerte seguido de golpeo el ' + days[i].date); } }

  /* Cuarto día intenso en 7, contando el domingo */
  const sat = p.day(SAT);
  ok(sat.intense && sat.notes.some(n => /4 días intensos en 7/.test(n)), 'v4.5: el sábado no cuenta el domingo intenso: ' + sat.notes.join(' | '));
  ok(!plan(MON2).day(SAT).notes.some(n => /días intensos en 7/.test(n)), 'v4.5: una semana normal no debería tocar el tope de 7 días');

  /* Golpeo demostrado en cancha: pendiente, limpio, al 100 %, con dolor */
  const kLevel0 = plan(MON2).st.kick.level;
  const pend = plan(MON2, { sessions: [heavy({}, { pn: null })] }).st;
  ok(pend.kick.level === kLevel0 && !pend.kick.demo, 'v4.5: sin saber cómo amaneció, la cancha no debería subir el nivel');
  const low = () => { const d = clone(BASE); d.sessions = d.sessions.filter(s => s.type !== 'golpeo' || s.kick.level <= 3); return d; };
  const stOf = (extra, mut) => { const d = low(); d.sessions = d.sessions.concat(extra); if (mut) mut(d); return E.deriveState(Object.assign({}, d, { agenda: [], customExercises: [] }), MON2); };
  ok(stOf([]).kick.level === 4, 'v4.5: el fixture debería estar en K4: K' + stOf([]).kick.level);
  const clean5 = stOf([heavy()]);
  ok(clean5.kick.level === 5 && clean5.kick.demo && clean5.kick.demo.level === 5, 'v4.5: muchos golpes fuertes sin dolor deberían contar como K5 sin confirmar el 100 %: K' + clean5.kick.level);
  const clean7 = stOf([heavy({}, { max: { der: true } })]);
  ok(clean7.kick.level === 7 && clean7.kick.streak === 1, 'v4.5: al 100 % sin dolor debería contar como K7 (1 de 2): K' + clean7.kick.level + ' ' + clean7.kick.streak);
  ok(stOf([heavy({}, { golpes: { der: 'varios', izq: 'no' }, max: { der: true } })]).kick.level === 6, 'v4.5: varios al 100 % debería ser K6');
  const var4 = stOf([heavy({}, { golpes: { der: 'varios', izq: 'no' } })]);
  ok(var4.kick.demo && var4.kick.demo.level === 4 && var4.kick.level === 5, 'v4.5: varios sin el 100 % debería contar como K4 limpio (sube a K5): ' + JSON.stringify(var4.kick.demo) + ' K' + var4.kick.level);
  ok(stOf([heavy({}, { golpes: { der: 'no', izq: 'muchos' } })]).kick.level === 4, 'v4.5: los golpes con la otra pierna no cuentan para esta escalera');
  ok(stOf([heavy({}, { max: { der: true }, pn: 1 })]).kick.level === 4, 'v4.5: con dolor 1 al día siguiente no debería subir');
  ok(stOf([heavy({}, { max: { der: true }, pd: 4 })]).kick.level === 3, 'v4.5: con dolor 4 durante debería bajar un nivel, no subir: K' + stOf([heavy({}, { max: { der: true }, pd: 4 })]).kick.level);
  ok(stOf([heavy({ date: '2026-08-20' }, { max: { der: true } })]).kick.level === 4, 'v4.5: una cancha de antes de la lesión no cuenta');
  /* Se planifica y se proyecta con lo demostrado, aunque la fase tenga otro tope */
  const wk7 = E.buildWeek(clean7, E.weekStartOf(MON2), MON2), tue7 = wk7.find(d => d.date === TUE2);
  ok(clean7.phase === 3 && ses(tue7, 'golpeo') && ses(tue7, 'golpeo').level === 7, 'v4.5: el martes debería ser K7 aunque F3 tope en K5: ' + desc(tue7));
  ok(clean7.criteria.items.find(i => /Golpeo K5/.test(i.label)).ok, 'v4.5: el criterio de golpeo de F3 debería cumplirse');
  const pj0 = E.project(stOf([]), MON2), pj7 = E.project(clean7, MON2);
  ok(pj7.k8 && pj0.k8 && pj7.k8 < pj0.k8 && pj7.phases[5] <= pj0.phases[5], 'v4.5: la proyección no se acorta: ' + JSON.stringify(pj0) + ' → ' + JSON.stringify(pj7));
  /* Sin estrenar nivel solo mientras no se sepa cómo amaneció */
  const pendWk = E.buildWeek(stOf([heavy({}, { pn: null, max: { der: true } })]), E.weekStartOf(MON2), MON2);
  ok(ses(pendWk.find(d => d.date === TUE2), 'golpeo').level <= 4, 'v4.5: sin saber cómo amaneció, el martes no debería estrenar nivel');

  /* Lectura del relato */
  const mt = campoMaxFromText('pude patear con la derecha a full y sin ninguna molestia');
  ok(mt && mt.der === true && !mt.izq, 'v4.5: no lee «con la derecha a full»: ' + JSON.stringify(mt));
  ok(!campoMaxFromText('mucha definición con ambas piernas y tiros libres'), 'v4.5: inventa el 100 % sin que lo diga el relato');
  ok(!campoMaxFromText('fue una sesión a tope de 2 horas'), 'v4.5: «a tope» sin hablar de patear no es golpeo al máximo');
  const pt = parseTrainText('Definición y tiros libres, pateé con la derecha al 100 %, sin dolor. 2 horas', {});
  ok(pt.campo && pt.campo.max && pt.campo.max.der === true && pt.campo.pd === 0, 'v4.5: el lector no guarda el 100 % ni el sin dolor: ' + JSON.stringify(pt.campo && { max: pt.campo.max, pd: pt.campo.pd }));
  const ai = campoFromAi({ bloques: [{ n: 'Definición', cat: 'remate', min: 60, pies: 'ambos', int: 'alta' }], golpesFuertes: { der: 'muchos', izq: 'no' }, alMaximo: { der: true } }, { text: 'definición' });
  ok(ai.campo.max && ai.campo.max.der === true, 'v4.5: no toma alMaximo de la IA');

  /* Tren superior: «derecha» es el brazo */
  for (const id of ['remo_mancuerna', 'press_landmine', 'rot_ext_banda', 'press_mancuernas', 'curl_biceps', 'elev_lateral']) ok(!isLegExercise(BANK_INDEX[id]), 'v4.5: ' + id + ' se marca como ejercicio de piernas');
  for (const id of ['bulgara', 'bulgara_rf_atras', 'ext_uni_exc', 'copenhagen', 'iso_rf_zancada', 'gemelo_uni', 'step_down']) ok(isLegExercise(BANK_INDEX[id]), 'v4.5: ' + id + ' no se marca como ejercicio de piernas');
  const upperU = E.BANK.filter(b => b.lat === 'U' && ['empuje_h', 'empuje_v', 'traccion_h', 'traccion_v', 'hombro'].includes(b.pat));
  ok(upperU.length >= 3 && upperU.every(b => !isLegExercise(b)), 'v4.5: unilaterales de brazos marcados como piernas: ' + upperU.filter(b => isLegExercise(b)).map(b => b.id).join(', '));
}

console.log('motor · fallos:', fails.length);
fails.forEach(f => console.log('  ', f));
process.exit(fails.length ? 1 : 0);
