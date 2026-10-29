// Series por grupo: la semana planificada queda dentro del objetivo y Superior A/B entran en ≈ 60 min.
// node test/coverage.js <fixture.json> [YYYY-MM-DD]
const fs = require('fs'), path = require('path');
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(__dirname, '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get;
const [fixture, today = '2026-10-29'] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const muscleLedger = G('muscleLedger'), groupGaps = G('groupGaps'), UPPER = G('UPPER_TYPES'), BANK = G('BANK');
ok(BANK.every(b => b.mg && typeof b.mg === 'object'), 'ejercicio sin campo mg');
for (const phase of [3, 4, 6]) {
  const inj = JSON.parse(JSON.stringify(d.injuries)); inj[0].phase = phase; if (phase === 6) inj[0].status = 'resuelta';
  // Semana futura sin registros: el plan solo
  const st = E.deriveState({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: inj, tests: d.tests, checkins: [], sessions: d.sessions.filter(s => s.date < E.weekStartOf(today)), agenda: [], customExercises: [] }, today);
  const ws = E.addDays(E.weekStartOf(today), 7);
  const days = E.buildWeek(st, ws, today);
  const types = days.flatMap(x => x.sessions.map(s => s.type));
  if (phase <= 4) ok(types.includes('superiorA') && types.includes('superiorB'), 'F' + phase + ' sin Superior A y B');
  for (const day of days) for (const s of day.sessions) if (UPPER.includes(s.type)) ok(s.estRaw <= 66, 'F' + phase + ' ' + day.date + ' ' + s.type + ' dura ' + s.estRaw + ' min');
  const led = muscleLedger(st, ws, today, days);
  const rows = groupGaps(led, st.phase);
  for (const r of rows) { ok(r.have >= r.lo - 2, 'F' + phase + ' ' + r.n + ': ' + r.have + ' < ' + r.lo); if (!['gluteo', 'isquios', 'aductores', 'core'].includes(r.g)) ok(r.have <= r.hi + 6, 'F' + phase + ' ' + r.n + ': ' + r.have + ' muy por encima de ' + r.hi); }
  console.log('F' + phase, rows.map(r => r.n + ' ' + r.have + '/' + r.lo + '-' + r.hi).join(' · '));
}
console.log('coverage · fallos:', fails.length); fails.forEach(f => console.log(' ', f));
process.exit(fails.length ? 1 : 0);
