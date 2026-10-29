// Lugares: cancha sin máquinas; gimnasio sin correr ni balón; casa sin rodillo; alternativas del mismo lugar; cambio del día.
// node test/places.mjs <fixture.json> [YYYY-MM-DD]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { loadEngine } = require('./engine-run.js');
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'src', 'app');
const E = loadEngine(fs.readdirSync(ROOT).filter(f => /^0\d-/.test(f)).sort());
const G = E.get;
const [fixture, today = '2026-10-29'] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(fixture, 'utf8'));
const data = (extra) => Object.assign({ profile: d.profile, settings: d.settings, weights: d.weights, injuries: d.injuries, tests: d.tests, checkins: d.checkins, sessions: d.sessions, agenda: [], customExercises: [] }, extra || {});
const fails = [];
const ok = (c, msg) => { if (!c) fails.push(msg); };
const exAvailable = G('exAvailable'), needsSpace = G('needsSpace'), BANK_INDEX = G('BANK_INDEX'), busyAlternatives = G('busyAlternatives'), dayBlocks = G('dayBlocks'), MACHINES = G('BUSY_EQ');
function checkWeek(st, label) {
  let n = 0;
  for (let w = 0; w < 2; w++) {
    const ws = E.addDays(E.weekStartOf(today), 7 * w);
    for (const day of E.buildWeek(st, ws, today)) {
      if (day.date < today) continue;
      for (const b of dayBlocks(day)) for (const s of b.sessions) {
        const place = s.place;
        for (const it of s.items) {
          const ex = BANK_INDEX[it.id]; n++;
          ok(exAvailable(ex, place, st.profile), label + ' ' + day.date + ' ' + s.type + ': ' + it.id + ' no se puede hacer en ' + place);
          if (place === 'cancha') ok(!(ex.eq || []).some(e => MACHINES.includes(e)), label + ' cancha con máquina: ' + it.id);
          if (place === 'gimnasio') ok(!needsSpace(ex) && !(ex.eq || []).includes('balón'), label + ' gimnasio con carrera o balón: ' + it.id);
          if (place === 'casa') ok(!(ex.eq || []).includes('rodillo'), label + ' casa con rodillo: ' + it.id);
          const alt = busyAlternatives(it.id, it.slot, st, place);
          alt.list.forEach(a => ok(exAvailable(a, place, st.profile), label + ' alternativa de otro lugar: ' + it.id + ' → ' + a.id + ' (' + place + ')'));
        }
        for (const w of (s.warmup && s.warmup.items) || []) ok(exAvailable(BANK_INDEX[w.id], place, st.profile), label + ' calentamiento ' + day.date + ' ' + s.type + ': ' + w.id + ' en ' + place);
      }
    }
  }
  return n;
}
// 1) Plan normal
const st = E.deriveState(data(), today);
const n1 = checkWeek(st, 'normal');
// 2) La cancha de golpeo no trae banco ni extensora en el calentamiento
const g = E.makeSession('golpeo', today, st, { place: 'cancha' });
ok(!(g.warmup.items || []).some(w => ['iso_rf_zancada', 'iso_ext_90', 'iso_ext_60'].includes(w.id)), 'calentamiento de golpeo en cancha con banco o extensora');
// 3) Sin pared en la cancha → banda al arco
const st2 = E.deriveState(data({ profile: Object.assign({}, d.profile, { places: { cancha: { off: ['pared'] } } }) }), today);
const g2 = E.makeSession('golpeo', today, st2, { place: 'cancha' });
ok((g2.warmup.items || []).every(w => w.id !== 'iso_rf_zancada_pared'), 'sin pared sigue la isometría contra la pared');
// 4) Cambio del día: gimnasio → casa
const st3 = E.deriveState(data({ agenda: [{ id: today, date: today, items: { gym: { place: 'casa' } } }] }), today);
const day3 = E.buildWeek(st3, E.weekStartOf(today), today).find(x => x.date === today);
const gym3 = dayBlocks(day3).find(b => b.key === 'gym');
if (gym3) { ok(gym3.place === 'casa', 'el bloque no tomó el cambio a casa'); gym3.sessions.forEach(s => s.items.forEach(it => ok(exAvailable(BANK_INDEX[it.id], 'casa', st3.profile), 'casa: ' + it.id))); }
checkWeek(st3, 'cambio');
// 5) Movilidad nocturna en casa: sin rodillo, con reemplazo
const mov = E.makeSession('movilidad', today, st, { place: 'casa' });
ok(mov.items.length >= 4, 'movilidad en casa quedó corta (' + mov.items.length + ')');
ok(mov.items.some(it => ['estir_isquio_banda', 'mov_gluteo_supino'].includes(it.id)), 'movilidad en casa sin reemplazo del rodillo');
console.log('places · ejercicios revisados:', n1, '· fallos:', fails.length);
fails.slice(0, 30).forEach(f => console.log(' ', f));
process.exit(fails.length ? 1 : 0);
