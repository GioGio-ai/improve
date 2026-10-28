// Ejecuta el motor con un JSON de datos: node test/engine-run.js datos.json [YYYY-MM-DD]
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..', 'src', 'app');
function loadEngine(files) {
  const ctx = { console, Math, Date, JSON };
  vm.createContext(ctx);
  const code = files.map(f => fs.readFileSync(path.join(ROOT, f), 'utf8')).join('\n');
  vm.runInContext(code + '\n;this.__E = { deriveState, buildWeek, weekStartOf, project, makeSession, fmtSpec, estimateSession, dayBlocks, addDays, BANK, BANK_INDEX, ALT, CHAINS, postSuggestions, suggestSets, dayKind, typeof_agenda: typeof buildAgenda !== "undefined" ? buildAgenda : null, typeof_nut: typeof nutritionTargets !== "undefined" ? nutritionTargets : null };', ctx, { filename: 'engine.js' });
  return ctx.__E;
}
module.exports = { loadEngine };
if (require.main === module) {
  const files = fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort();
  const E = loadEngine(files);
  const d = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const today = process.argv[3] || '2026-10-28';
  const data = { profile: d.profile, settings: d.settings, weights: d.weights, injuries: d.injuries, tests: d.tests, checkins: d.checkins, sessions: d.sessions, customExercises: [] };
  const st = E.deriveState(data, today);
  console.log('fase', st.phase, '| K', st.kick.level, st.kick.streak + '/' + st.kick.req, '| S', st.sprint.level, st.sprint.streak + '/' + st.sprint.req, '| RT', st.rt.idx, '| durFactor', st.durFactor);
  console.log('criterios', JSON.stringify(st.criteria));
  for (let w = 0; w < 3; w++) {
    const ws = E.addDays(E.weekStartOf(today), 7 * w);
    for (const day of E.buildWeek(st, ws, today)) {
      const bl = E.dayBlocks(day).map(b => b.key + '[' + b.sessions.map(s => s.short).join('+') + ' ' + b.est + 'm]').join(' ');
      console.log(day.date, day.intense ? 'INT' : '   ', E.dayKind(day, st.profile).padEnd(8), bl, day.notes.length ? '· ' + day.notes.join(' | ') : '');
    }
  }
  console.log('proyección', JSON.stringify(E.project(st, today)), 'sin acel', JSON.stringify(E.project(st, today, 70, { noAccel: true })));
}
