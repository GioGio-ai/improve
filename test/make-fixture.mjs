// Fixture sintético para las pruebas en el navegador (sin datos personales).
// RF derecho en F3, K4, S1, test del 25 oct, prueba el lunes 16 nov, domingo de descanso.
// node test/make-fixture.mjs <salida.json> [--sin-sabado]   (--sin-sabado: sin registros del sábado 31 oct)
import fs from 'node:fs';
const [out = 'fixture.json', flag] = process.argv.slice(2);
const sessions = [];
let n = 0;
const S = (o) => sessions.push(Object.assign({ id: 'f-' + (++n), done: true, source: 'entreno', createdAt: 1700000000000 + n }, o));
const ex = (id, slot, sets, side) => ({ id, slot, sets: Array.from({ length: sets * (side ? 2 : 1) }, (_, i) => ({ side: side ? (i % 2 ? 'i' : 'd') : undefined, kg: 20, reps: 8, done: true })), fb: 'justo', pain: 0 });
[['2026-10-14', 1], ['2026-10-16', 2], ['2026-10-20', 3], ['2026-10-23', 3], ['2026-10-27', 4]].forEach(([date, level]) => S({ date, type: 'golpeo', kick: { level, pd: 0, pn: 0 }, minutes: 25, rpe: 5 }));
[['2026-10-15', 1], ['2026-10-22', 2], ['2026-10-28', 1]].forEach(([date, level]) => S({ date, type: 'sprint', spr: { level, pd: 0, pn: 0 }, minutes: 20, rpe: 6 }));
['2026-10-20', '2026-10-24', '2026-10-27', '2026-10-31'].forEach(date => S({ date, type: 'fuerzaA', minutes: 70, est: 60, rpe: 7, exercises: [
  ex('iso_rf_zancada', 'rf_iso_largo', 4, true), ex('rev_nordic_asist', 'rf_exc', 3), ex('ext_uni_exc', 'ext_uni', 4, true), ex('bulgara_rf_atras', 'uni_sent', 3, true), ex('nordic', 'isquio_exc', 3), ex('copenhagen', 'aductor', 3, true)] }));
const data = {
  profile: { id: 'main', name: 'Atleta', weight: 88, height: 196, birth: '2000-01-01', restDay: 6, trials: ['2026-11-16'], matchDays: [], teamDays: [], schedule: {}, goalText: 'Volver a patear al 100 %' },
  settings: { id: 'main', plan: {}, choices: {} },
  weights: [{ id: 'w-1', date: '2026-10-25', kg: 88 }],
  injuries: [{ id: 'inj-1', date: '2026-09-02', status: 'activa', side: 'd', muscle: 'recto_femoral', phase: 3, kickStart: 1, sprintStart: 1,
    phaseLog: [{ phase: 1, date: '2026-09-02' }, { phase: 2, date: '2026-09-20' }, { phase: 3, date: '2026-10-14' }] }],
  tests: [{ id: 't-1', date: '2026-10-25', ext8: { d: 40, i: 43 }, hop1: { d: 150, i: 162 }, hop3: { d: 480, i: 520 }, stretch: { d: 3, i: 1 }, rn: 'completo', rnPain: 0, palp: 0 }],
  checkins: [], sessions: flag === '--sin-sabado' ? sessions.filter(s => s.date !== '2026-10-31') : sessions, molestias: [],
};
fs.writeFileSync(out, JSON.stringify(data, null, 1));
console.log('fixture →', out, '·', data.sessions.length, 'sesiones');
