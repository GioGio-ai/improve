// Cancha libre contada (v4.4): lector sin IA, validación de la IA y cómo la lee el motor.
// Sin navegador ni fixture externo: node test/campo.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get;
const parseTrainText = G('parseTrainText'), campoFromAi = G('campoFromAi'), isIntenseLog = G('isIntenseLog'), shotsWeek = G('shotsWeek');
const ballHeaderCount = G('ballHeaderCount'), ballMinutesByWeek = G('ballMinutesByWeek'), dayKind = G('dayKind'), painToday = G('painToday');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const clone = (o) => JSON.parse(JSON.stringify(o));
const addDays = E.addDays;

/* ---------- Lector sin IA con una nota real de sesión (sin datos personales) ---------- */
const NOTE = 'Sesión con un compañero, (Calentamiento 15 mins.) mucha definición con ambas piernas, diferentes posiciones, control+definicion, en velocidad de primera cruzado, tiros libres, 1vs1, cambios de frente por abajo y por arriba de muy lejos y lejos. Para terminar un poco de estiramiento y caminata y tomar agua.';
const p = parseTrainText(NOTE, { total: 120 });
const ids = p.campo ? p.campo.bloques.map(b => b.id) : [];
ok(p.tipo === 'cancha', 'lector: no reconoce una sesión de cancha');
ok(JSON.stringify(ids) === JSON.stringify(['cl_calentamiento', 'cl_def_ambas', 'cl_def_control', 'cl_def_primera', 'cl_tiros_libres', 'cl_1v1', 'cl_cambio_frente', 'cl_estiramiento']), 'lector: bloques o el orden no coinciden: ' + ids.join(','));
ok(p.campo && p.campo.bloques[0].min === 15, 'lector: el calentamiento no respeta los 15 min dichos');
ok(p.campo && p.campo.bloques.reduce((a, b) => a + b.min, 0) === 120, 'lector: los bloques no suman los 120 min');
ok(p.campo && p.campo.bloques.every(b => b.min >= 5 && b.min % 5 === 0), 'lector: minutos fuera de múltiplos de 5');
ok(p.campo && p.campo.golpes.der === 'muchos' && p.campo.golpes.izq === 'muchos', 'lector: «mucha definición con ambas piernas» no da muchos golpes fuertes por pierna: ' + JSON.stringify(p.campo && p.campo.golpes));
ok(p.campo && p.campo.sprints === 'varios', 'lector: el 1 contra 1 no suma sprints y duelos');
ok(p.campo && p.campo.companeros === 1, 'lector: no lee «con un compañero»');
ok(/compañero/.test(p.titulo) && p.titulo.length <= 60, 'lector: título raro: ' + p.titulo);
ok(p.campo.bloques.find(b => b.id === 'cl_estiramiento').pies === 'ninguno', 'lector: el estiramiento no debería usar pierna');
const p2 = parseTrainText('Fui al gimnasio: sentadilla y press de banca, una hora');
ok(p2.tipo === 'libre' && !p2.campo && p2.minutos === 60, 'lector: el gimnasio no debería crear bloques de cancha');
const p3 = parseTrainText('De 17:30 a 19:00 dominio, pases con la zurda y 20 min de cabeceo, suave');
ok(p3.minutos === 90 && p3.inicio === '17:30' && p3.fin === '19:00', 'lector: no lee la hora de inicio y fin: ' + p3.minutos + ' ' + p3.inicio + '-' + p3.fin);
ok(p3.rpe === 4, 'lector: «suave» no baja el esfuerzo');
ok(p3.campo && p3.campo.bloques.find(b => b.cat === 'cabeceo').min === 20, 'lector: no respeta «20 min de cabeceo»');
ok(p3.campo && p3.campo.golpes.der === 'no', 'lector: solo zurda no debería sumar golpes con la derecha');

/* ---------- La respuesta de la IA se valida ---------- */
const ai = campoFromAi({ titulo: 'Cancha', minutos: 100, rpe: 14, bloques: [{ n: 'Definición', cat: 'inventada', min: 70, pies: 'x', int: 'mucha' }, { id: 'cl_1v1', n: '1 contra 1', cat: 'duelo', min: 70, pies: 'ambos', int: 'alta' }], golpesFuertes: { der: 'muchisimos', izq: 'varios' }, cabezazos: 'pocos', sprints: 'muchos', companeros: 1, ejercicios: [{ id: 'nordic', n: 'Nórdico', series: 40, reps: 5 }] }, {});
ok(ai.rpe === 10, 'IA: RPE fuera de rango sin limitar');
ok(ai.campo.bloques[0].cat === 'otro' && ai.campo.bloques[0].pies === 'ambos' && ai.campo.bloques[0].int === 'media', 'IA: valores inválidos de bloque sin corregir');
ok(ai.campo.bloques.reduce((a, b) => a + b.min, 0) === 100, 'IA: los bloques no se ajustan a la duración total');
ok(ai.campo.golpes.der === 'no' && ai.campo.golpes.izq === 'varios', 'IA: banda inválida sin corregir');
ok(ai.ejercicios[0].series === 12, 'IA: series sin limitar');
const ai2 = campoFromAi({ bloques: [{ n: 'Rondo', cat: 'juego', min: 30 }], inicio: '18:50', fin: '20:50' }, { intensity: 'alta' });
ok(ai2.minutos === 120 && ai2.rpe === 8 && !ai2.rpeEst, 'IA: la duración por horas o la intensidad elegida no mandan');

/* ---------- Motor ---------- */
const SUN = '2026-11-01', MON = '2026-11-02', TUE = '2026-11-03';
const camp = (o) => Object.assign({ id: 'c-' + Math.random().toString(36).slice(2, 7), date: SUN, type: 'cancha', done: true, minutes: 120, rpe: 8, campo: { side: 'd', bloques: p.campo.bloques, golpes: { der: 'muchos', izq: 'muchos' }, cabezazos: 'pocos', sprints: 'varios', companeros: 1, pd: null, pn: null } }, o || {});
const free = camp();
ok(isIntenseLog(free), 'motor: la cancha libre con muchos golpes con la derecha no cuenta como intensa');
const soft = camp({ rpe: 5, minutes: 60, campo: { side: 'd', bloques: [{ n: 'Dominio', cat: 'dominio', min: 30, pies: 'ambos', int: 'baja' }, { n: 'Pases', cat: 'pase', min: 30, pies: 'ambos', int: 'media' }], golpes: { der: 'no', izq: 'pocos' }, cabezazos: 'no', sprints: 'no' } });
ok(!isIntenseLog(soft), 'motor: una cancha suave cuenta como intensa');
ok(isIntenseLog(camp({ campo: Object.assign({}, soft.campo, { golpes: { der: 'varios', izq: 'no' } }), rpe: 5, minutes: 60 })), 'motor: varios golpes fuertes con la pierna lesionada no cuentan como intensos');
ok(!isIntenseLog(camp({ campo: Object.assign({}, soft.campo, { side: 'i', golpes: { der: 'varios', izq: 'no' } }), rpe: 5, minutes: 60 })), 'motor: con la lesión en la izquierda, los golpes con la derecha no deberían hacerla intensa');
ok(isIntenseLog(camp({ campo: soft.campo, rpe: 8, minutes: 90 })), 'motor: RPE 8 y 90 min no cuentan como intensos');
ok(!isIntenseLog(camp({ done: false })), 'motor: una sesión no hecha cuenta como intensa');
const wk = shotsWeek([free], '2026-10-26');
ok(wk.les === 40 && wk.sana === 40, 'motor: los golpes fuertes estimados no suman por pierna: ' + JSON.stringify(wk));
ok(ballHeaderCount([free], '2026-10-26') === 3, 'motor: los cabezazos estimados no suman al tope semanal');
ok(ballMinutesByWeek([free], SUN, 1)[0].min === 95, 'motor: los minutos con balón no descuentan calentamiento y vuelta a la calma: ' + ballMinutesByWeek([free], SUN, 1)[0].min);

/* Plan: datos sintéticos (RF derecho en F3, golpeo hasta K4 limpio) */
function data(extra) {
  const sessions = [];
  [['2026-10-14', 1], ['2026-10-16', 2], ['2026-10-20', 3], ['2026-10-23', 3], ['2026-10-27', 4]].forEach(([date, level], i) => sessions.push({ id: 'k' + i, date, type: 'golpeo', done: true, kick: { level, pd: 0, pn: 0 }, minutes: 25, rpe: 5 }));
  [['2026-10-15', 1], ['2026-10-22', 2], ['2026-10-28', 2]].forEach(([date, level], i) => sessions.push({ id: 's' + i, date, type: 'sprint', done: true, spr: { level, pd: 0, pn: 0 }, minutes: 20, rpe: 6 }));
  return {
    profile: { weight: 88, height: 186, restDay: 6, trials: ['2026-11-16'], matchDays: [], teamDays: [], schedule: {} }, settings: { plan: {}, choices: {} }, weights: [{ id: 'w', date: '2026-10-25', kg: 88 }],
    injuries: [{ id: 'i', date: '2026-09-02', status: 'activa', side: 'd', phase: 3, kickStart: 1, sprintStart: 1, phaseLog: [{ phase: 1, date: '2026-09-02' }, { phase: 2, date: '2026-09-20' }, { phase: 3, date: '2026-10-14' }] }],
    tests: [{ id: 't', date: '2026-10-25', ext8: { d: 40, i: 43 }, hop1: { d: 150, i: 162 }, hop3: { d: 480, i: 520 }, stretch: { d: 3, i: 1 }, rn: 'completo', rnPain: 0, palp: 0 }],
    checkins: (extra && extra.checkins) || [], sessions: sessions.concat((extra && extra.sessions) || []), molestias: [], agenda: [], customExercises: [],
  };
}
const week = (today, extra) => { const st = E.deriveState(data(extra), today); const ws = E.weekStartOf(today); return { st, days: E.buildWeek(st, ws, today).concat(E.buildWeek(st, addDays(ws, 7), today)) }; };
{
  const base = week(MON), w = week(MON, { sessions: [free] });
  const tue0 = base.days.find(d => d.date === TUE), tue = w.days.find(d => d.date === TUE);
  const kOf = (d) => (d.sessions.find(s => s.type === 'golpeo') || {}).level || 0;
  ok(tue.notes.some(n => /golpes fuertes con la derecha fuera de la escalera/.test(n)), 'motor: el martes no avisa del golpeo sin estrenar nivel tras la cancha del domingo: ' + tue.notes.join(' | '));
  ok(!kOf(tue0) || kOf(tue) <= 4, 'motor: el martes estrena nivel de golpeo tras la cancha libre (K' + kOf(tue) + ')');
  ok(!w.days.find(d => d.date === MON).intense, 'motor: el lunes queda intenso después de una cancha libre intensa');
  const wed = week('2026-11-04', { sessions: [free] }).days.find(d => d.date === '2026-11-04');
  ok(!wed.notes.some(n => /fuera de la escalera/.test(n)), 'motor: la regla de 48 h sigue el miércoles');
  // Sin lesión activa: no hay escalera que cuidar
  const healed = (() => { const d = data({ sessions: [free] }); d.injuries[0].status = 'resuelta'; const st = E.deriveState(d, MON); return E.buildWeek(st, E.weekStartOf(MON), MON).concat(E.buildWeek(st, addDays(E.weekStartOf(MON), 7), MON)); })();
  ok(!healed.some(d => d.notes.some(n => /fuera de la escalera/.test(n))), 'motor: sin lesión activa no debería limitar el golpeo');
}
{
  // Dolor al día siguiente de la cancha libre: manda como el del golpeo
  const hurt = camp({ campo: Object.assign({}, free.campo, { pn: 4 }) });
  const st = E.deriveState(data({ sessions: [hurt] }), MON);
  ok(painToday(st, MON).next === 4, 'motor: el dolor al día siguiente de la cancha libre no se lee');
  const mon = E.buildWeek(st, E.weekStartOf(MON), MON).find(d => d.date === MON);
  ok(!mon.sessions.some(s => ['golpeo', 'sprint', 'balon', 'rt', 'juego'].includes(s.type)), 'motor: con dolor 4/10 tras la cancha libre el lunes sigue con cancha: ' + mon.sessions.map(s => s.type).join('+'));
  const d5 = (pd) => { const d = data({ sessions: [camp({ campo: Object.assign({}, free.campo, { pd }) })] }); d.injuries[0].phase = 5; d.injuries[0].phaseLog.push({ phase: 4, date: '2026-10-20' }, { phase: 5, date: '2026-10-25' }); return E.deriveState(d, MON); };
  const painItem = (st) => ((st.criteria && st.criteria.items) || []).find(i => /dolor/i.test(i.label));
  ok(painItem(d5(0)) && painItem(d5(0)).ok, 'motor: sin dolor, el criterio de 14 días sin dolor no se cumple: ' + JSON.stringify(painItem(d5(0))));
  ok(painItem(d5(3)) && !painItem(d5(3)).ok, 'motor: el dolor 3/10 durante la cancha libre no cuenta para el criterio de 14 días: ' + JSON.stringify(painItem(d5(3))));
}
{
  // Comida: un domingo de descanso con 2 h de cancha intensa no es «descanso»
  const st = E.deriveState(data({ sessions: [free] }), SUN);
  const sun = E.buildWeek(st, E.weekStartOf(SUN), SUN).find(d => d.date === SUN);
  ok(dayKind(sun, st.profile, st.sessions) === 'alto', 'comida: el domingo con cancha libre intensa no es carga alta: ' + dayKind(sun, st.profile, st.sessions));
  const st0 = E.deriveState(data(), SUN), sun0 = E.buildWeek(st0, E.weekStartOf(SUN), SUN).find(d => d.date === SUN);
  ok(dayKind(sun0, st0.profile, st0.sessions.concat([soft])) === 'moderado', 'comida: un domingo con cancha suave debería ser moderado: ' + dayKind(sun0, st0.profile, st0.sessions.concat([soft])));
  ok(dayKind(sun0, st0.profile, st0.sessions) === 'descanso', 'comida: el descanso sin nada registrado cambió');
}

console.log('campo · fallos: ' + fails.length);
fails.forEach(f => console.log('  ' + f));
process.exit(fails.length ? 1 : 0);
