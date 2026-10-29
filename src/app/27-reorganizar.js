/* ============================================================
   REORGANIZAR: sesión no hecha o que ya no entra en el horario.
   Motor de reglas (sin IA): opciones según cancha, intensidad, sueño y semana.
   - Fuerza/potencia intensa: ≥ 6 h antes de una cancha intensa; nunca después de ella.
   - Piernas no intensas: ≥ 2-3 h antes de la cancha. Tren superior: 1 h.
   - Nunca dos días intensos seguidos ni más de 3 por semana; descanso y pruebas, intocables.
   ============================================================ */
const RS_LIGHT = ['movilidad', 'recuperacion', 'descanso'];
const rsNames = (types) => types.map(t => (STYPES[t] || { short: t }).short).join(' + ');
const rsHeavy = (s) => STRENGTH_TYPES.includes(s.type) || !!s.intense;
const rsLegs = (s) => !UPPER_TYPES.includes(s.type) && !RS_LIGHT.includes(s.type);
const rsDow = (d) => DOW_LONG[weekday(d)];

/* Contexto del bloque no hecho */
function rsContext(date, types) {
  const today = todayStr(), ag = agendaFor(date), day = dayPlan(date);
  // Pendiente = sin registro o registrada como «no hecha» (se puede recuperar igual)
  const pendingLog = (t) => { const l = findLog(date, t); return !l || l.done === false; };
  const missed = types.map(t => findPlanned(date, t)).filter(s => s && pendingLog(s.type));
  const blockIt = ag.items.find(x => x.block && x.block.sessions.some(s => types.includes(s.type))) || null;
  const field = ag.items.find(x => x.kind === 'train' && (x.key === 'campo' || x.key === 'club') && !blockDone(x.block, date).all) || null;
  const heavy = missed.some(rsHeavy), legs = missed.some(rsLegs);
  const est = blockIt && blockIt.block.sessions.every(s => types.includes(s.type)) ? blockIt.dur : Math.max(20, missed.reduce((a, s) => a + (s.est || 0), 0));
  const sl = ag.slept || null;
  const notDone = missed.map(s => findLog(date, s.type)).filter(Boolean);
  return { today, date, ag, day, missed, notDone, types: missed.map(s => s.type), blockIt, field, fieldIntense: !!(field && field.block.intense), heavy, legs, est, sl,
    shortSleep: !!(sl && sl.h !== null && sl.h < 6), isToday: date === today, past: date < today };
}

/* Primer hueco libre del día que respeta las reglas: antes de la cancha y/o después */
function rsSlot(c, o) {
  const ag = c.ag, lunch = ag.items.find(x => x.key === 'almuerzo'), field = c.field;
  const latestEnd = ag.sleep - (o.heavy ? 120 : 75);
  const res = { before: null, after: null };
  for (let t = ceil15(o.from); t + o.dur <= latestEnd; t += 15) {
    const end = t + o.dur;
    if (lunch && t < lunch.start + (o.legs ? 120 : 90) && end > lunch.start - 15) continue;
    if (!field) { res.before = t; break; }
    if (end <= field.start - o.gap) { if (res.before === null) res.before = t; continue; }
    if (t >= field.end + 15) { if (o.afterField) res.after = t; break; }
  }
  return res;
}
function rsGap(heavy, legs, fieldIntense) { return heavy ? (fieldIntense ? 360 : 180) : legs ? (fieldIntense ? 180 : 120) : 60; }

/* Intensidad de un día, real si ya pasó; `c` permite simular el día de origen sin lo que se quita */
function rsIntenseOn(d, c) {
  const today = todayStr();
  const real = (S.data.sessions || []).some(s => s.date === d && !s.deleted && isIntenseLog(s));
  if (d < today) return real;
  if (c && d === c.date) { const dp = dayPlan(d); return real || dp.sessions.some(s => s.intense && !c.types.includes(s.type)); }
  return real || !!(dayPlan(d) || {}).intense;
}
/* ¿Se puede poner `types` en el día d? Devuelve null si sí, o el motivo */
function rsDayBlock(d, c) {
  const dp = dayPlan(d), prof = S.data.profile || {};
  if (!dp) return 'sin plan';
  if (dp.types.includes('descanso')) return 'es tu día de descanso';
  if (dp.trial || dp.types.some(t => FIXED_TYPES.includes(t))) return 'hay partido o prueba';
  if ((prof.trials || []).includes(addDays(d, 1))) return 'es la víspera de una prueba';
  if (c.types.some(t => dp.types.includes(t))) return 'ya tiene esa sesión';
  if (findLog(d, 'libre') || dp.sessions.some(s => blockKind(s.type) === 'gym' && findLog(d, s.type) && findLog(d, s.type).done !== false)) return 'ya entrenaste gimnasio';
  const gymLegs = dp.sessions.filter(s => blockKind(s.type) === 'gym' && rsLegs(s));
  if (c.legs && gymLegs.length) return 'ya tiene gimnasio de piernas';
  if (!c.heavy) return null;
  if (dp.types.some(t => STRENGTH_TYPES.includes(t))) return 'ya tiene fuerza o potencia';
  if (!dp.intense) {
    if (rsIntenseOn(addDays(d, -1), c) || rsIntenseOn(addDays(d, 1), c)) return 'quedarían dos días intensos seguidos';
    const ws = weekStartOf(d); let n = 0;
    for (let i = 0; i < 7; i++) { const x = addDays(ws, i); if (x !== c.date && rsIntenseOn(x, c)) n++; }
    if (n >= 3) return 'la semana ya tiene 3 días intensos';
  }
  return null;
}
/* Mejores días para mover la sesión (hasta 7 días): primero los que ya son intensos (alto-bajo), después los más cercanos */
function rsDays(c, max) {
  const start = c.past ? c.today : addDays(c.date, 1), out = [], rejected = [];
  for (let i = 0; i < 8; i++) {
    const d = addDays(start, i);
    if (d === c.date || diffDays(d, c.today) > 7) continue;
    const why = rsDayBlock(d, c);
    if (why) { rejected.push({ d, why }); continue; }
    if (d === c.today) {
      const ag = agendaFor(d), fl = ag.items.find(x => x.kind === 'train' && (x.key === 'campo' || x.key === 'club'));
      const cc = Object.assign({}, c, { ag, field: fl || null, fieldIntense: !!(fl && fl.block.intense) });
      const sl = rsSlot(cc, { from: Math.max(nowMin() + 20, ag.wake + WAKE_TO_GYM), dur: c.est, gap: rsGap(c.heavy, c.legs, cc.fieldIntense), heavy: c.heavy, legs: c.legs, afterField: !(c.heavy && cc.fieldIntense) });
      if (sl.before === null && sl.after === null) { rejected.push({ d, why: 'hoy ya no entra en horario' }); continue; }
    }
    out.push({ d, dp: dayPlan(d), score: (dayPlan(d).intense ? 0 : 10) + i });
  }
  out.sort((a, b) => a.score - b.score);
  return { list: out.slice(0, max || 2), rejected };
}
/* Sustituto para hoy cuando lo pesado de piernas ya no entra: tren superior (no fatiga las piernas antes de la cancha) */
function rsSubstitute(c) {
  const hasUpper = (d, done) => done ? (S.data.sessions || []).some(s => s.date === d && !s.deleted && s.done !== false && UPPER_TYPES.includes(s.type)) : (dayPlan(d) || { types: [] }).types.some(t => UPPER_TYPES.includes(t));
  if (c.day.types.some(t => UPPER_TYPES.includes(t) && !c.types.includes(t)) || hasUpper(addDays(c.date, -1), true)) return { type: 'movilidad', why: 'Ayer u hoy ya hay tren superior: movilidad y respiración, sin fatiga.' };
  for (const k of [1, 2]) {
    const d = addDays(c.date, k), dp = dayPlan(d);
    if (!dp) continue;
    const t = dp.types.find(x => UPPER_TYPES.includes(x) && !findLog(d, x));
    if (t) return { type: t, from: d, why: STYPES[t].short + ' se adelanta del ' + rsDow(d) + ': el ' + rsDow(d) + ' queda más liviano.' };
  }
  return { type: 'superior', why: 'Tren superior y core: suma fuerza sin cansar las piernas.' };
}
function rsEst(type, date) { const s = makeSession(type, date, ST); return Math.max(20, s.est || 45); }

/* Opciones en orden de recomendación */
function rsOptions(c) {
  const opts = [], why = [];
  const now = nowMin(), from = c.isToday ? Math.max(now + 20, c.ag.wake + WAKE_TO_GYM) : 0;
  const name = rsNames(c.types);
  if (c.isToday && c.ag.lateWake) why.push('Te levantaste a las ' + fmtHM(c.ag.wake) + '.');
  if (c.shortSleep) why.push('Dormiste ' + fmtDur(c.sl.h * 60) + ': hoy mejor sin cargas máximas.');
  let same = { before: null, after: null };
  if (c.isToday) {
    same = rsSlot(c, { from, dur: c.est, gap: rsGap(c.heavy, c.legs, c.fieldIntense), heavy: c.heavy, legs: c.legs, afterField: !(c.heavy && c.fieldIntense) });
    if (c.heavy && c.field && same.before === null) why.push(name + ' es intensa para las piernas: necesita ' + (c.fieldIntense ? '6 h' : '3 h') + ' antes de la cancha de las ' + fmtHM(c.field.start) + (c.fieldIntense ? ' (' + c.field.block.short + ')' : '') + '. Hoy ya no entra antes.');
    if (c.heavy && c.fieldIntense && same.before === null) why.push('Después de una cancha intensa tampoco: se juntaría demasiado trabajo explosivo para el recto femoral.');
  }
  const fieldTxt = (t, dur) => c.field ? (t + dur <= c.field.start ? 'Termina ' + fmtDur(c.field.start - t - dur) + ' antes de la cancha.' : 'Después de la cancha.') : 'Hoy no hay cancha.';
  if (same.before !== null) opts.push({ kind: 'time', start: same.before, title: 'Hoy a las ' + fmtHM(same.before), subt: 'Misma sesión · ' + name, lines: [fieldTxt(same.before, c.est)] });
  // Versión adaptada para hoy: solo cuando lo que falta es pesado de piernas
  if (c.isToday && c.heavy && c.legs && (same.before === null || c.shortSleep)) {
    const sub = rsSubstitute(c), dur = rsEst(sub.type, c.date);
    const sl = rsSlot(c, { from, dur, gap: sub.type === 'movilidad' ? 30 : 60, heavy: false, legs: false, afterField: true });
    const start = sl.before !== null ? sl.before : sl.after;
    const dest = rsDays(c, 1);
    const lines = [sub.why];
    if (dest.list.length) lines.push(name + ' pasa al ' + rsDow(dest.list[0].d) + ' ' + fmtDate(dest.list[0].d) + '.');
    else {
      const next = rsNextSame(c);
      const why2 = dest.rejected.some(r => /seguidos/.test(r.why)) ? 'no hay día en la semana sin juntar dos días intensos seguidos' : dest.rejected.some(r => /3 días/.test(r.why)) ? 'la semana ya tiene 3 días intensos' : 'no hay un hueco seguro en 7 días';
      lines.push(name + ' no se recupera: ' + why2 + '.' + (next ? ' La próxima es el ' + rsDow(next) + ' ' + fmtDate(next) + '.' : '') + (c.fieldIntense && c.field.block.types.includes('sprint') && c.types.some(t => /potencia/i.test(t)) ? ' El sprint de hoy ya da el estímulo de velocidad.' : ''));
    }
    if (start !== null) opts.push({ kind: 'adapt', start, sub, dest: dest.list[0] ? dest.list[0].d : null, title: 'Hoy a las ' + fmtHM(start) + ' · ' + STYPES[sub.type].n, subt: 'Versión adaptada · no carga las piernas', lines });
  }
  if (same.after !== null) opts.push({ kind: 'time', start: same.after, title: 'Hoy después de la cancha · ' + fmtHM(same.after), subt: 'Misma sesión · ' + name, lines: ['Termina a las ' + fmtHM(same.after + c.est) + '; dormir a las ' + fmtHM(c.ag.sleep) + '.'] });
  const days = rsDays(c, 2);
  days.list.forEach(x => { if (!opts.some(o => o.dest === x.d)) opts.push({ kind: 'move', to: x.d, title: capFirst(rsDow(x.d)) + ' ' + fmtDate(x.d), subt: 'Misma sesión · ' + name, lines: [(x.d === c.today ? 'Hoy: ' : 'Ese día: ') + dayTitle(x.dp) + (x.dp.intense ? ' · ya es intenso, no suma otro día intenso.' : '.')] }); });
  // Recomendada
  let rec = 0;
  const iAdapt = opts.findIndex(o => o.kind === 'adapt');
  if (c.shortSleep && iAdapt >= 0) rec = iAdapt;
  if (opts[rec]) opts[rec].rec = true;
  return { opts, why };
}
function rsNextSame(c) {
  for (let i = 1; i <= 7; i++) { const d = addDays(c.date, i), dp = dayPlan(d); if (dp && c.types.some(t => dp.types.includes(t))) return d; }
  return null;
}

/* ---------- Hoja ---------- */
function openResched(date, types) {
  const c = rsContext(date, types);
  if (!c.missed.length) { toast('No hay nada pendiente para reorganizar.', 'info'); return; }
  UI.rs = { date, types: c.types };
  openSheet({ id: 'resched', render: reschedHtml });
}
function reschedHtml() {
  const q = UI.rs; if (!q) return sheetHead('Reorganizar');
  const c = rsContext(q.date, q.types);
  if (!c.missed.length) return sheetHead('Reorganizar') + '<div class="sheet-body"><p class="sub">Ya no queda nada pendiente.</p></div>';
  const R = rsOptions(c); UI.rs.opts = R.opts;
  let h = sheetHead(c.past ? '¿Cuándo la recuperas?' : '¿Cuándo la haces?', esc(rsNames(c.types)) + ' · ' + esc(capFirst(fmtDateLong(c.date))) + (c.heavy ? ' · <span class="c-load">intensa</span>' : '')) + '<div class="sheet-body">';
  if (R.why.length) h += note(R.why.some(w => /Dormiste/.test(w)) ? 'sleep' : 'blue', esc(R.why.join(' ')));
  if (!R.opts.length) h += note('warn', 'Sin un hueco seguro en los próximos 7 días. Puedes elegir un día a mano o dejarla como no hecha.');
  h += '<div class="stack-sm">' + R.opts.map((o, i) => '<div class="rs-opt"><button class="blk" data-act="rs-apply" data-i="' + i + '"><span class="c' + (o.kind === 'adapt' ? ' lime' : o.kind === 'move' ? '' : '') + '">' + ic(o.kind === 'move' ? 'cal' : o.kind === 'adapt' ? 'swap' : 'clock') + '</span><span class="grow">' + (o.rec ? chip('Recomendado', 'lime', 'check').replace('class="chip', 'class="rec chip') : '') + '<span class="t">' + esc(o.title) + '</span><span class="s">' + esc(o.subt || '') + '</span>' + o.lines.map(l => '<span class="s fg2">' + esc(l) + '</span>').join('') + '</span>' + ic('chev') + '</button></div>').join('') + '</div>';
  const first = c.types[0];
  h += '<div class="grid2"><button class="btn sm" data-act="move" data-date="' + c.date + '" data-type="' + first + '"' + (c.types.length > 1 ? ' disabled' : '') + '>' + ic('cal') + 'Elegir otro día</button><button class="btn sm ghost" data-act="rs-skip">' + ic('x') + 'No recuperarla</button></div>';
  return h + '</div>';
}

/* ---------- Aplicar ---------- */
function rsSnapshot(dates) {
  const plan = (S.data.settings && S.data.settings.plan) || {}, snap = { plan: {}, agenda: {}, logs: [], prevLogs: [] };
  dates.forEach(d => { snap.plan[d] = plan[d] ? clone(plan[d]) : null; const a = agendaDoc(d); snap.agenda[d] = a ? clone(a) : null; });
  return snap;
}
function rsWritePlans(map) {
  const s = clone(S.data.settings || {}); delete s.id; s.plan = s.plan || {};
  for (const d of Object.keys(map)) { if (map[d] === null) delete s.plan[d]; else s.plan[d] = map[d]; }
  return put('settings', 'main', s);
}
function rsAgenda(date, key, start, kind) {
  const doc = clone(agendaDoc(date) || { date, items: {} }); delete doc.id; doc.date = date; doc.items = doc.items || {};
  if (key && start !== null && start !== undefined) doc.items[key] = Object.assign({}, doc.items[key] || {}, { start });
  doc.resched = { at: Date.now(), kind };
  return put('agenda', date, doc);
}
/* Al recuperar una sesión marcada «no hecha», ese registro se quita (se guarda para deshacer) */
function rsClearNotDone(c, snap) {
  c.notDone.forEach(l => { const d = clone(l); delete d.id; snap.prevLogs.push({ id: l.id, doc: d }); remove('sessions', l.id); });
}
function rsLogMissed(c, note) {
  const ids = [];
  c.missed.forEach(s => { const prev = findLog(c.date, s.type); const id = prev ? prev.id : 's-' + c.date + '-' + s.type; ids.push(prev ? { id, doc: Object.assign(clone(prev), { id: undefined }) } : id); put('sessions', id, { date: c.date, type: s.type, title: s.title, done: false, source: 'app', exercises: [], notes: note || '' }); });
  return ids;
}
function applyResched(i) {
  const q = UI.rs; if (!q || !q.opts || !q.opts[i]) return;
  const o = q.opts[i], c = rsContext(q.date, q.types);
  const today = c.today, dayTypes = c.day.types.slice();
  let snap, msg;
  if (o.kind === 'time') {
    const key = c.blockIt ? c.blockIt.key : 'gym';
    snap = rsSnapshot([c.date]);
    rsAgenda(c.date, key, o.start, 'time');
    rsClearNotDone(c, snap);
    msg = rsNames(c.types) + ' pasa a las ' + fmtHM(o.start) + '.';
  } else if (o.kind === 'adapt') {
    const dates = [c.date].concat(o.sub.from ? [o.sub.from] : []).concat(o.dest ? [o.dest] : []);
    snap = rsSnapshot(dates);
    const map = {};
    const kept = dayTypes.filter(t => !c.types.includes(t));
    if (!kept.includes(o.sub.type)) kept.push(o.sub.type);
    map[c.date] = { types: kept, resched: true };
    if (o.sub.from) { const ft = dayPlan(o.sub.from).types.filter(t => t !== o.sub.type); map[o.sub.from] = { types: ft.length ? ft : ['movilidad'], resched: true }; }
    if (o.dest) { const dt = dayPlan(o.dest).types.filter(t => t !== 'descanso'); c.types.forEach(t => { if (!dt.includes(t)) dt.push(t); }); map[o.dest] = { types: dt, resched: true }; }
    rsWritePlans(map);
    rsAgenda(c.date, blockKind(o.sub.type), o.start, 'adapt');
    if (!o.dest) snap.logs = rsLogMissed(c, 'Reemplazada por ' + STYPES[o.sub.type].n + '.'); else rsClearNotDone(c, snap);
    msg = 'Hoy ' + STYPES[o.sub.type].short + ' a las ' + fmtHM(o.start) + (o.dest ? '; ' + rsNames(c.types) + ' el ' + rsDow(o.dest) + '.' : '.');
  } else if (o.kind === 'move') {
    const dates = c.past ? [o.to] : [c.date, o.to];
    snap = rsSnapshot(dates.concat([c.date]).filter((v, k, a) => a.indexOf(v) === k));
    const map = {};
    const dt = dayPlan(o.to).types.filter(t => t !== 'descanso'); c.types.forEach(t => { if (!dt.includes(t)) dt.push(t); });
    map[o.to] = { types: dt, resched: true };
    if (!c.past) { const kept = dayTypes.filter(t => !c.types.includes(t)); map[c.date] = { types: kept.length ? kept : ['descanso'], resched: true }; }
    rsWritePlans(map);
    if (c.past) snap.logs = rsLogMissed(c, 'Pasada al ' + rsDow(o.to) + ' ' + fmtDate(o.to) + '.');
    else { rsAgenda(c.date, null, null, 'move'); rsClearNotDone(c, snap); }
    if (o.to === today && !agendaFor(today).items.some(x => x.key === 'gym')) { const ag = agendaFor(today), fl = ag.items.find(x => x.kind === 'train' && (x.key === 'campo' || x.key === 'club')); const cc = Object.assign({}, c, { ag, field: fl || null, fieldIntense: !!(fl && fl.block.intense) }); const sl = rsSlot(cc, { from: Math.max(nowMin() + 20, ag.wake + WAKE_TO_GYM), dur: c.est, gap: rsGap(c.heavy, c.legs, cc.fieldIntense), heavy: c.heavy, legs: c.legs, afterField: !(c.heavy && cc.fieldIntense) }); const st = sl.before !== null ? sl.before : sl.after; if (st !== null) rsAgenda(today, 'gym', st, 'move'); }
    msg = rsNames(c.types) + ' pasa al ' + rsDow(o.to) + ' ' + fmtDate(o.to) + '.';
  }
  UI.rsUndo = snap; UI.rs = null;
  closeAllSheets(); haptic(14);
  setTimeout(() => toast(msg, 'ok', { label: 'Deshacer', act: 'rs-undo' }), 120);
}
function undoResched() {
  const u = UI.rsUndo; if (!u) return;
  const map = {}; Object.keys(u.plan).forEach(d => { map[d] = u.plan[d]; });
  rsWritePlans(map);
  Object.keys(u.agenda).forEach(d => { if (u.agenda[d]) { const a = clone(u.agenda[d]); delete a.id; put('agenda', d, a); } else if (agendaDoc(d)) remove('agenda', d); });
  (u.logs || []).forEach(x => { if (typeof x === 'string') remove('sessions', x); else { const d = clone(x.doc); delete d.id; put('sessions', x.id, d); } });
  (u.prevLogs || []).forEach(x => put('sessions', x.id, x.doc));
  UI.rsUndo = null; $('#toast').hidden = true; toast('Deshecho.', 'info');
}
function skipResched() {
  const q = UI.rs; if (!q) return;
  const c = rsContext(q.date, q.types);
  if (c.isToday) { const a = agendaDoc(c.date); if (!a || !a.resched) rsAgenda(c.date, null, null, 'skip'); }
  c.types.forEach(t => { if (!findLog(c.date, t)) markNotDone(c.date, t); });
  closeAllSheets(); toast('Queda como no hecha.', 'info');
  UI.rs = null;
}

/* ---------- Hoy: te levantaste tarde y lo de la mañana ya no cumple las reglas ---------- */
function rsHoyCard(ag, today) {
  const doc = agendaDoc(today); if (doc && doc.resched) return '';
  // Marcada «no hecha» hoy sin reorganizar: ofrecerlo
  const nd = ag.items.filter(x => x.kind === 'train' && x.key === 'gym').map(x => ({ x, ls: x.block.sessions.map(s => findLog(today, s.type)).filter(l => l && l.done === false && !l.notes) })).find(o => o.ls.length);
  if (nd) {
    const types = nd.ls.map(l => l.type);
    return '<div class="mini-alert blue" role="status"><button class="mini-main" data-act="resched" data-date="' + today + '" data-types="' + esc(types.join(',')) + '">' + ic('refresh') + '<span class="grow"><span class="t">' + esc(rsNames(types)) + ' quedó sin hacer</span><span class="s">Moverla o adaptarla según la cancha · reorganizar</span></span>' + ic('chev') + '</button>' +
      '<button class="mini-x" data-act="rs-keep" data-date="' + today + '" aria-label="Dejarla como no hecha">' + ic('x') + '</button></div>';
  }
  if (!ag.lateWake) return '';
  const gym = ag.items.find(x => x.key === 'gym' && x.lateShift);
  if (!gym || blockDone(gym.block, today).some) return '';
  const c = rsContext(today, gym.block.sessions.map(s => s.type));
  if (!c.missed.length) return '';
  const clash = (c.heavy && c.field && gym.end > c.field.start - rsGap(true, true, c.fieldIntense)) || gym.end > ag.sleep - 120 || (c.shortSleep && c.heavy);
  if (!clash) return '';
  const txt = c.shortSleep && c.heavy ? 'Dormiste ' + fmtDur(c.sl.h * 60) + ': ' + rsNames(c.types) + ' no conviene hoy' : rsNames(c.types) + ' ya no entra antes de la cancha';
  return '<div class="mini-alert blue" role="status"><button class="mini-main" data-act="resched" data-date="' + today + '" data-types="' + esc(c.types.join(',')) + '">' + ic('sunrise') + '<span class="grow"><span class="t">Te levantaste a las ' + fmtHM(ag.wake) + '</span><span class="s">' + esc(txt) + ' · reorganizar</span></span>' + ic('chev') + '</button>' +
    '<button class="mini-x" data-act="rs-keep" data-date="' + today + '" aria-label="Mantener el horario">' + ic('x') + '</button></div>';
}
