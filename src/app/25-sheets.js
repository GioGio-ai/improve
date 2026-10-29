/* ============================================================
   HOJAS: bloque de agenda, sesión, revisión, día, check-in, mover
   ============================================================ */
function openAgendaItem(date, key) {
  const it = agendaFor(date).items.find(x => x.key === key);
  if (!it) return;
  if (it.kind === 'train' || it.kind === 'recup') openBlock(date, key);
  else if (it.kind === 'meal') openMeal(date, key);
  else openSheet({ id: 'ag-' + key, render: () => agendaInfoHtml(date, key) });
}
function timeAdjustHtml(date, it) {
  const sug = buildAgenda(dayPlan(date), ST, null).items.find(x => x.key === it.key);
  return '<div class="row nowrap" style="gap:10px"><button class="iconbtn" data-act="ag-shift" data-date="' + date + '" data-key="' + it.key + '" data-d="-15" aria-label="15 minutos antes">' + ic('minus') + '</button>' +
    '<label class="grow" style="display:grid"><span class="sr">Hora</span><input class="input num" type="time" step="900" value="' + fmtHM(it.start) + '" data-bind="ag-time" data-date="' + date + '" data-key="' + it.key + '"></label>' +
    '<button class="iconbtn" data-act="ag-shift" data-date="' + date + '" data-key="' + it.key + '" data-d="15" aria-label="15 minutos después">' + ic('plus') + '</button></div>' +
    (it.moved && sug ? '<button class="linkbtn" data-act="ag-unmove" data-date="' + date + '" data-key="' + it.key + '">' + ic('undo') + 'Volver a la hora sugerida (' + fmtHM(sug.start) + ')</button>' : '');
}
function agendaInfoHtml(date, key) {
  const ag = agendaFor(date), it = ag.items.find(x => x.key === key);
  if (!it) return sheetHead('Agenda');
  let h = sheetHead(it.title, capFirst(fmtDateLong(date)) + (it.marker ? '' : ' · ' + fmtHM(it.start) + '–' + fmtHM(it.end))) + '<div class="sheet-body">';
  if (it.why) h += note(it.kind === 'sleep' || it.kind === 'nap' ? 'sleep' : 'blue', esc(it.why));
  ag.warnings.filter(w => w.key === key).forEach(w => { h += note('warn', esc(w.text)); });
  if (it.kind === 'sleep') { const ci = checkinFor(addDays(date, 1)); h += '<div class="stats two"><div class="stat sleep"><span class="v">' + fmtDur(ag.wake + 1440 - ag.sleep) + '</span><span class="k">Planificado</span></div><div class="stat"><span class="v">' + (ci && num(ci.sleepH) !== null ? fmtNum(ci.sleepH) + '<small>h</small>' : '—') + '</span><span class="k">Dormido (check-in)</span></div></div>'; }
  h += '<div class="field"><span class="lab">Hora</span>' + timeAdjustHtml(date, it) + '</div>';
  if (it.kind === 'nap') h += '<button class="btn block ghost" data-act="ag-hide" data-date="' + date + '" data-key="' + key + '">' + ic('x') + 'Hoy sin siesta</button>';
  return h + '</div>';
}

/* ---------- Bloque de entrenamiento ---------- */
function openBlock(date, key) { openSheet({ id: 'blk-' + date + key, render: () => blockSheetHtml(date, key) }); }
function blockSheetHtml(date, key) {
  const ag = agendaFor(date), it = ag.items.find(x => x.key === key);
  if (!it || !it.block) return sheetHead('Bloque') + '<div class="sheet-body"><p class="sub">Este bloque ya no está en el plan.</p></div>';
  const b = it.block, today = todayStr(), past = date < today, dn = blockDone(b, date);
  let h = sheetHead(it.title + ' · ' + b.short, capFirst(fmtDateLong(date)) + ' · ' + fmtHM(it.start) + '–' + fmtHM(it.end) + (b.intense ? ' · <span class="c-load">intenso</span>' : '')) + '<div class="sheet-body">';
  ag.warnings.filter(w => w.key === key).forEach(w => { h += note('warn', esc(w.text)); });
  h += '<div class="stack-sm">' + b.sessions.map(s => { const log = findLog(date, s.type); return '<button class="blk' + (log && log.done !== false ? ' done' : '') + '" data-act="session" data-date="' + date + '" data-type="' + s.type + '"><span class="c' + (s.intense ? ' load' : '') + '">' + ic(s.icon || 'dumb') + '</span><div class="grow"><div class="t">' + esc(log && log.modified && log.title ? log.title : s.title) + '</div><div class="s">' + esc(log ? logLine(log) : blockSub(s)) + '</div>' + (!log && s.field && s.field.kind === 'balon' ? '<div class="s fg3">' + esc(s.field.drills.map(d => d.n).join(' · ')) + '</div>' : '') + '</div>' + statusMark(log) + '</button>'; }).join('') + '</div>';
  if (b.warmup) h += '<details><summary>' + ic('flame') + 'Calentamiento · ' + b.warmup.min + ' min</summary><div class="in">' + b.warmup.items.map(w => '<div class="lrow"><span class="fg2">' + esc(w.n) + '</span><span class="sub num">' + esc(w.d || '') + '</span></div>').join('') + '</div></details>';
  if (!past || date === today) h += '<div class="field"><span class="lab">¿Dónde?</span><div class="pills">' + PLACES.map(pl => '<button type="button" class="pill' + (b.place === pl ? ' on' : '') + '" data-act="blk-place" data-date="' + date + '" data-key="' + key + '" data-v="' + pl + '" aria-pressed="' + (b.place === pl) + '">' + PLACE_NAMES[pl] + '</button>').join('') + '</div></div>';
  if (it.why && !ag.warnings.some(w => w.key === key)) h += note('blue', esc(it.why));
  if (!past || date === today) h += '<div class="field"><span class="lab">Hora</span>' + timeAdjustHtml(date, it) + '</div>';
  h += '<div class="stack-sm">';
  if (!dn.all && !past) h += '<button class="btn primary lg block" data-act="start-block" data-date="' + date + '" data-key="' + key + '">' + ic('play') + (dn.some ? 'Seguir con lo pendiente' : 'Empezar ' + it.title.toLowerCase()) + '</button>';
  if (!dn.all) h += '<div class="grid2"><button class="btn sm" data-act="block-done" data-date="' + date + '" data-key="' + key + '">' + ic('check') + 'Hecho tal cual</button><button class="btn sm" data-act="block-short" data-date="' + date + '" data-key="' + key + '">' + ic('timer') + 'Poco tiempo</button></div>';
  if (!dn.all && date <= today && (it.kind === 'train')) h += '<button class="btn sm ghost block" data-act="resched" data-date="' + date + '" data-types="' + esc(b.sessions.filter(s => !findLog(date, s.type)).map(s => s.type).join(',')) + '">' + ic('cal') + (past ? 'No la hice · recuperarla' : 'No llego · reorganizar') + '</button>';
  return h + '</div></div>';
}
function logLine(log) {
  if (log.done === false) return 'No hecha';
  const parts = [log.modified ? 'Hecha con cambios' : 'Hecha'];
  if (log.minutes) parts.push(log.minutes + ' min');
  if (num(log.rpe) !== null) parts.push('RPE ' + log.rpe);
  const k = log.kick || log.spr;
  if (k) parts.push('dolor ' + (k.pd ?? '—') + '/' + (k.pn ?? '—'));
  if (log.ball) { const b = ballLogLine(log); if (b) parts.push(b); }
  return parts.join(' · ');
}

/* ---------- Sesión: plan o revisión ---------- */
function openSession(date, type) { openSheet({ id: 'session-' + date + type, full: !!findLog(date, type), render: () => sessionSheetHtml(date, type) }); }
function itemRow(it, noSwap) {
  const ex = exInfo(it.id, it);
  return '<div class="exrow">' + thumbHtml(ex) + '<button data-act="ex" data-id="' + esc(it.id) + '" style="text-align:left;min-width:0"><div class="t">' + esc(it.n) + (it.doms ? ' ' + chip('isométrica hoy', 'warn') : '') + '</div><div class="s">' + esc(fmtSpec(it.spec, it.side)) + '</div></button>' +
    (!noSwap && it.slot && SLOT_NAMES[it.slot] ? '<button class="iconbtn sm plain" data-act="swap" data-slot="' + esc(it.slot) + '" data-ex="' + esc(it.id) + '" aria-label="Cambiar ' + esc(it.n) + '">' + ic('swap') + '</button>' : '<span></span>') + '</div>';
}
function fieldSummary(s) {
  const f = s.field; if (!f) return '';
  if (f.kind === 'golpeo') return '<div class="card flat tight"><div class="stack-sm"><div class="row nowrap"><span class="chip lime">' + KICK[f.level].n + '</span><span class="h3">' + esc(KICK[f.level].t) + '</span></div><div class="small fg2">' + esc(KICK[f.level].d) + '</div><div class="sub">Objetivo: ' + f.target + ' golpes' + (f.tec ? ' · técnica, no cuenta para subir' : '') + '</div></div></div>';
  if (f.kind === 'sprint') return '<div class="card flat tight"><div class="stack-sm"><div class="row nowrap"><span class="chip load">' + SPRINT[f.level].n + '</span><span class="h3">' + esc(SPRINT[f.level].t) + '</span></div><div class="small fg2">' + esc(SPRINT[f.level].d) + '</div></div></div>';
  if (f.kind === 'rt') return '<div class="card flat tight"><div class="stack-sm"><div class="row nowrap"><span class="chip sleep">RT</span><span class="h3">' + f.reps + ' repeticiones × ' + f.series + ' series</span></div><div class="small fg2">Esfuerzos repetidos: conducción intensa y vuelta trotando. 2-3 min entre series.</div></div></div>';
  if (f.kind === 'test') return '<div class="stack-sm">' + f.steps.map(x => '<div class="lrow"><span class="fg2">' + esc(x.n) + '</span><span class="sub">' + (x.min ? x.min + ' min' : '') + '</span></div>').join('') + '</div>';
  if (f.kind === 'list') return '<div class="stack-sm">' + f.steps.map(x => '<div class="lrow"><span class="fg2">' + esc(x.n) + '<br><span class="sub">' + esc(x.d || '') + '</span></span><span class="sub">' + (x.min ? x.min + ' min' : '') + '</span></div>').join('') + '</div>';
  if (f.kind === 'club') return note('info', 'Sesión con el club. Registra minutos y esfuerzo al terminar.');
  if (f.kind === 'balon') return '<div class="stack-sm">' + (f.focus ? '<div class="row nowrap"><span class="chip lime">' + ic('ball') + (f.min || '') + ' min</span><span class="h3">' + esc(capFirst(f.focus)) + '</span></div>' : '') + f.drills.map(d => {
    const b = ST ? ballBest(ST.sessions, d.id, null) : null;
    return '<div class="lrow"><span class="fg2"><b>' + esc(d.n) + '</b> ' + chip(ballFootLabel(d.foot), d.foot === 'izq' ? 'blue' : '') + (d.header === 'alta' ? ' ' + chip('fuerza alta', 'load') : '') + '<br><span class="sub">' + esc(d.d || '') + (d.note ? ' ' + esc(d.note) : '') + '</span></span><span class="sub num">' + d.min + ' min<br>meta ' + d.target + (b ? '<br>récord ' + fmtNum(b.val) : '') + '</span></div>';
  }).join('') + '</div><button class="btn sm ghost" data-act="guide" data-g="balon">' + ic('info') + 'Guía de balón</button>';
  return '';
}
function sessionSheetHtml(date, type) {
  const s = findPlanned(date, type), log = findLog(date, type);
  if (log) return sessionReviewHtml(log, s);
  if (!s) return sheetHead('Sesión') + '<div class="sheet-body"><p class="sub">Esta sesión ya no está en el plan.</p></div>';
  const today = todayStr(), past = date < today, club = FIXED_TYPES.includes(type);
  let h = sheetHead(s.title, capFirst(fmtDateLong(date)) + (s.intense ? ' · <span class="c-load">intenso para el RF</span>' : '')) + '<div class="sheet-body">';
  h += '<div class="row">' + (s.est ? chip('≈ ' + fmtDur(s.est), '', 'clock') : '') + (s.items.length ? chip(plural(s.items.length, 'ejercicio', 'ejercicios'), '', 'dumb') : '') + (s.warmup ? chip('Calentamiento ' + s.warmup.min + ' min', 'warn', 'flame') : '') + '</div>';
  h += fieldSummary(s);
  if (s.items.length) h += '<div class="exlist">' + s.items.map(it => itemRow(it, past)).join('') + '</div>';
  (s.notes || []).forEach(n => { h += note('info', esc(n)); });
  h += '<div class="stack-sm">';
  if (!club && !past) h += '<button class="btn primary lg block" data-act="start" data-date="' + date + '" data-type="' + type + '">' + ic('play') + 'Empezar solo esta sesión</button>';
  h += '<div class="grid2"><button class="btn sm" data-act="quick-done" data-date="' + date + '" data-type="' + type + '">' + ic('check') + 'Hecha tal cual</button>' +
    '<button class="btn sm" data-act="did-other" data-date="' + date + '" data-type="' + type + '">' + ic('edit') + 'Lo que hice</button></div>';
  h += '<div class="grid2"><button class="btn sm ghost" data-act="' + (date <= today ? 'resched' : 'not-done') + '" data-date="' + date + '" data-type="' + type + '">' + ic('x') + 'No la hice</button>' + (past ? '<span></span>' : '<button class="btn sm ghost" data-act="move" data-date="' + date + '" data-type="' + type + '">' + ic('cal') + 'Otro día</button>') + '</div>';
  return h + '</div></div>';
}
/* Revisión de una sesión hecha: clara y comparada con la vez anterior */
function prevExPerf(exId, log) {
  const list = (S.data.sessions || []).filter(s => s.id !== log.id && s.done !== false && s.date < log.date && (s.exercises || []).some(e => e.id === exId && (e.sets || []).some(x => x && x.done !== false))).sort(byDate);
  if (!list.length) return null;
  const s = list[list.length - 1]; return { date: s.date, e: s.exercises.find(e => e.id === exId) };
}
function bestSetVal(e) {
  let best = 0;
  for (const x of (e.sets || [])) if (x && x.done !== false) { const kg = num(x.kg) || 0, r = num(x.reps) || 0; const v = kg && r ? kg * (1 + Math.min(12, r) / 30) : 0; if (v > best) best = v; }
  return best;
}
function setsTableHtml(e) {
  const sets = (e.sets || []).filter(Boolean);
  if (!sets.length) return '<div class="sub">Sin series registradas.</div>';
  const val = (x) => { if (num(x.secs) !== null) return fmtNum(x.secs) + ' s'; if (num(x.m) !== null) return fmtNum(x.m) + ' m'; if (num(x.c) !== null) return fmtNum(x.c) + ' cont'; if (num(x.reps) !== null) return fmtNum(x.reps) + ' rep'; return '—'; };
  const cell = (x) => !x ? '<span class="fg4">—</span>' : '<span class="' + (x.done === false ? 'fg4' : 'fg') + '">' + (num(x.kg) !== null ? fmtNum(x.kg) + ' kg × ' : '') + val(x) + '</span>';
  const sided = sets.some(x => x.side);
  let rows = '';
  if (sided) {
    const dS = sets.filter(x => x.side === 'd'), iS = sets.filter(x => x.side === 'i'), n = Math.max(dS.length, iS.length);
    for (let i = 0; i < n; i++) rows += '<div class="lrow num small" style="grid-template-columns:30px 1fr 1fr"><span class="fg4">' + (i + 1) + '</span>' + cell(dS[i]) + cell(iS[i]) + '</div>';
    return '<div><div class="lrow small" style="grid-template-columns:30px 1fr 1fr;border:0"><span></span><span class="micro">Derecha' + (ST.side === 'd' ? ' · les.' : '') + '</span><span class="micro">Izquierda' + (ST.side === 'i' ? ' · les.' : '') + '</span></div>' + rows + '</div>';
  }
  sets.forEach((x, i) => { rows += '<div class="lrow num small" style="grid-template-columns:30px 1fr"><span class="fg4">' + (i + 1) + '</span>' + cell(x) + '</div>'; });
  return '<div>' + rows + '</div>';
}
function sessionReviewHtml(log, planned) {
  const T = STYPES[log.type] || STYPES.libre;
  const done = log.done !== false;
  const exs = (log.exercises || []).filter(e => e && e.id && !e.warmup);
  const setsDone = exs.reduce((a, e) => a + (e.sets || []).filter(x => x && x.done !== false).length, 0);
  const setsPlan = exs.reduce((a, e) => a + (e.sets || []).length, 0);
  const vol = Math.round(exs.reduce((a, e) => a + (e.sets || []).filter(x => x && x.done !== false).reduce((b, x) => b + (num(x.kg) || 0) * (num(x.reps) || 0), 0), 0));
  const load = sessionLoad(log);
  let h = sheetHead(log.title || T.n, capFirst(fmtDateLong(log.date)) + ' · ' + (done ? (log.modified ? '<span class="c-lime">hecha con cambios</span>' : '<span class="c-lime">hecha</span>') : '<span class="c-pain">no hecha</span>')) + '<div class="sheet-body">';
  if (done) {
    h += '<div class="stats four"><div class="stat"><span class="v">' + (log.minutes || '—') + '<small>min</small></span><span class="k">Duración</span></div>' +
      '<div class="stat ' + rpeTone(log.rpe) + '"><span class="v">' + (num(log.rpe) === null ? '—' : log.rpe) + '</span><span class="k">Esfuerzo</span></div>' +
      '<div class="stat load"><span class="v">' + (load || '—') + '</span><span class="k">Carga</span></div>' +
      '<div class="stat ' + (setsPlan && setsDone >= setsPlan ? 'lime' : '') + '"><span class="v">' + (setsPlan ? setsDone + '<small>/' + setsPlan + '</small>' : '—') + '</span><span class="k">Series</span></div></div>';
    if (vol) h += '<div class="sub">Volumen ' + vol + ' kg' + (isIntenseLog(log) ? ' · cuenta como día intenso para el RF' : '') + '</div>';
  }
  const k = log.kick || log.spr;
  if (k) {
    const o = outcome(k.pd, k.pn, k.partial);
    h += '<div class="card flat tight"><div class="stack-sm"><div class="row between"><span class="h3">' + (log.kick ? KICK[k.level].n + ' · ' + KICK[k.level].t : SPRINT[k.level].n + ' · ' + SPRINT[k.level].t) + '</span>' + outcomeChip(o) + '</div>' +
      '<div class="grid2"><div class="stat ' + (painTone(k.pd) === 'pain' ? 'pain' : '') + '"><span class="v">' + (k.pd ?? '—') + '<small>/10</small></span><span class="k">Dolor durante</span></div><div class="stat ' + (painTone(k.pn) === 'pain' ? 'pain' : '') + '"><span class="v">' + (k.pn ?? '—') + '<small>/10</small></span><span class="k">Al día siguiente</span></div></div>' +
      (log.kick && log.kick.count ? '<div class="sub">' + log.kick.count + ' golpes' + (log.kick.partial ? ' · sesión parcial' : '') + '</div>' : '') + (log.spr && log.spr.reps ? '<div class="sub">' + log.spr.reps + ' repeticiones</div>' : '') + '</div></div>';
  }
  if (log.tec) h += '<div class="sub">Técnica ' + KICK[log.tec.level].n + ' · ' + (log.tec.count || 0) + ' golpes</div>';
  if (log.ball && (log.ball.drills || []).length) h += '<div class="card flat tight"><div class="stack-sm"><div class="row between"><span class="h3">' + ic('ball') + ' Balón</span>' + (num(log.ball.headersAlta) ? chip(log.ball.headersAlta + ' cabezazos fuerza alta', 'load') : '') + '</div>' + log.ball.drills.map(d => { const b = ballBest((S.data.sessions || []).filter(x => x.id !== log.id), d.id, d.pie || null, log.date); const v = ballEntryVal(d); const rec = d.metric !== 'aciertos' && d.metric !== 'hits' && v !== null && (!b || ((BALL_DRILL_INDEX[d.id] || {}).lowerBetter ? v < b.val : v > b.val)); return '<div class="lrow"><span class="fg2">' + esc(d.n || (BALL_DRILL_INDEX[d.id] || {}).n || d.id) + (d.pie ? ' <span class="fg4">· ' + (d.pie === 'der' ? 'derecha' : 'izquierda') + '</span>' : '') + '</span><b class="num' + (rec ? ' c-lime' : '') + '">' + esc(ballValTxt(d)) + (rec ? ' ★' : '') + '</b></div>'; }).join('') + '</div></div>';
  if (log.rt) h += '<div class="sub">Circuito RT ' + String(log.rt.level).replace('x', ' × ') + (log.rt.series ? ' · ' + log.rt.series + ' series hechas' : '') + '</div>';
  if (exs.length) {
    h += '<div class="stack-sm">' + exs.map(e => {
      const ex = exInfo(e.id, e) || {};
      const pv = prevExPerf(e.id, log);
      const a = bestSetVal(e), b = pv ? bestSetVal(pv.e) : 0;
      const delta = a && b ? Math.round((a / b - 1) * 1000) / 10 : null;
      const trend = delta === null ? '' : delta > 0.5 ? chip('+' + fmtNum(delta) + ' %', 'lime', 'up') : delta < -0.5 ? chip(fmtNum(delta) + ' %', 'warn', 'down') : chip('igual', '');
      const fb = e.fb && FEEDBACK[e.fb] ? chip(FEEDBACK[e.fb].n, e.fb === 'facil' ? 'lime' : e.fb === 'dificil' ? 'load' : e.fb === 'molestia' ? 'pain' : 'blue') : '';
      const pend = (e.sets || []).filter(x => x && x.done === false).length;
      return '<div class="card flat tight"><div class="stack-sm"><div class="row nowrap">' + thumbHtml(Object.assign({}, ex, { n: e.n || ex.n, img: e.img || ex.img })) + '<div class="grow"><button class="h3" data-act="ex" data-id="' + esc(e.id) + '" style="text-align:left">' + esc(e.n || ex.n || e.id) + '</button><div class="row" style="margin-top:4px">' + trend + fb + (num(e.pain) !== null ? chip('dolor ' + e.pain, painTone(e.pain)) : '') + (e.doneAs ? chip('variante', 'blue', 'swap') : '') + (pend ? chip(pend + ' sin hacer', '') : '') + '</div></div></div>' +
        setsTableHtml(e) + (pv ? '<div class="sub">Anterior · ' + fmtDate(pv.date) + ' · ' + esc(fmtSetsShort((pv.e.sets || []).filter(x => x && x.done !== false))) + '</div>' : '') + (e.notes ? '<div class="small fg2">“' + esc(e.notes) + '”</div>' : '') + '</div></div>';
    }).join('') + '</div>';
  }
  if (log.notes) h += note('info', esc(log.notes));
  if (log.plan && (log.plan.items || log.plan.field)) planned = { items: (log.plan.items || []).map(it => Object.assign({}, it)), field: log.plan.field || null };
  if (planned && ((planned.items || []).length || planned.field)) {
    const plan = fieldSummary(planned) + (planned.items.length ? '<div class="exlist">' + planned.items.map(it => itemRow(it, true)).join('') + '</div>' : '');
    h += '<details><summary>' + ic('cal') + 'Plan original</summary><div class="in">' + plan + '</div></details>';
  }
  if (!done && log.date <= todayStr() && planned && !FIXED_TYPES.includes(log.type)) h += '<button class="btn primary block" data-act="resched" data-date="' + log.date + '" data-types="' + esc(log.type) + '">' + ic('refresh') + (log.date === todayStr() ? 'Reorganizar: moverla o adaptarla' : 'Recuperarla otro día') + '</button>';
  h += '<div class="grid2"><button class="btn sm" data-act="edit-log" data-id="' + esc(log.id) + '">' + ic('edit') + 'Editar</button>' + (done ? '<button class="btn sm" data-act="day" data-date="' + log.date + '">' + ic('cal') + 'Ver el día</button>' : (log.date >= todayStr() && !FIXED_TYPES.includes(log.type) ? '<button class="btn sm primary" data-act="start" data-date="' + log.date + '" data-type="' + log.type + '">' + ic('play') + 'Empezar</button>' : '<span></span>')) + '</div>';
  return h + '</div>';
}

/* ---------- Día completo ---------- */
function openDay(date) { openSheet({ id: 'day-' + date, full: true, render: () => dayHtml(date) }); }
function dayHtml(date) {
  const d = dayPlan(date), today = todayStr(), ag = agendaFor(date);
  const ci = checkinFor(date), adv = readinessAdvice(ci);
  const logs = logsFor(date), done = logs.filter(l => l.done !== false);
  const load = done.reduce((a, l) => a + sessionLoad(l), 0);
  const T = nutritionTargets(ST.weight || 88, ag.kind, ag), ms = mealsFor(date), tot = sumItems([].concat(...ms.map(m => m.items || [])));
  const water = (num((nutriDoc(date) || {}).water) || 0) / 1000;
  let h = sheetHead(capFirst(fmtDateLong(date)), (d.intense ? '<span class="c-load">Día intenso para el RF</span>' : 'Carga baja para el RF') + ' · ' + esc(KIND_N[ag.kind] || '')) + '<div class="sheet-body">';
  h += '<div class="tiles">' +
    '<div class="tile ' + (ci ? sleepTone(ci.sleepH) : '') + '"><span class="c">' + ic('moon') + '</span><span class="v">' + (ci && num(ci.sleepH) !== null ? fmtNum(ci.sleepH) + '<small>h</small>' : '—') + '</span><span class="k">Sueño</span></div>' +
    '<div class="tile ' + (adv ? readinessTone(adv.score) : '') + '"><span class="c">' + ic('pulse') + '</span><span class="v">' + (adv ? adv.score : '—') + '</span><span class="k">Estado</span></div>' +
    '<div class="tile ' + (ci && num(ci.rfPain) >= 3 ? 'pain' : '') + '"><span class="c">' + ic('drop') + '</span><span class="v">' + (ci && num(ci.rfPain) !== null ? ci.rfPain + '<small>/10</small>' : '—') + '</span><span class="k">Dolor RF</span></div>' +
    '<div class="tile load"><span class="c">' + ic('flame') + '</span><span class="v">' + (load || '—') + '</span><span class="k">Carga</span></div>' +
    '<div class="tile food"><span class="c">' + ic('fork') + '</span><span class="v">' + tot.p + '<small>/' + T.p + ' g</small></span><span class="k">Proteína</span></div>' +
    '<div class="tile water"><span class="c">' + ic('drop') + '</span><span class="v">' + fmtNum(Math.round(water * 10) / 10) + '<small>/' + fmtNum(T.water) + ' L</small></span><span class="k">Agua</span></div></div>';
  (d.notes || []).forEach(n => { h += note('info', esc(n)); });
  h += '<div class="sec"><span class="t">Entrenamiento</span></div>';
  const blocks = dayBlocks(d);
  const extra = logs.filter(l => !d.sessions.some(s => s.type === l.type));
  if (!blocks.length && !extra.length) h += '<div class="empty"><b>Descanso</b><span class="small">Paseo, movilidad libre y sueño.</span></div>';
  h += '<div class="stack-sm">' + blocks.map(b => b.sessions.map(s => { const log = findLog(date, s.type); return '<button class="blk' + (log && log.done !== false ? ' done' : '') + '" data-act="session" data-date="' + date + '" data-type="' + s.type + '"><span class="c' + (s.intense ? ' load' : log && log.done !== false ? ' lime' : '') + '">' + ic(s.icon || 'dumb') + '</span><div class="grow"><div class="t">' + esc(log && log.title ? log.title : s.title) + '</div><div class="s">' + esc(log ? logLine(log) : (date < today ? 'Sin registrar' : blockSub(s))) + '</div></div>' + statusMark(log) + '</button>'; }).join('')).join('') +
    extra.map(l => '<button class="blk done" data-act="edit-log" data-id="' + esc(l.id) + '"><span class="c lime">' + ic(sessIcon(l.type)) + '</span><div class="grow"><div class="t">' + esc(l.title || STYPES[l.type].n) + '</div><div class="s">' + esc(logLine(l)) + '</div></div>' + statusMark(l) + '</button>').join('') + '</div>';
  const mols = (S.data.molestias || []).filter(m => m && !m.deleted && m.fecha === date);
  if (mols.length) h += '<div class="sec"><span class="t">Molestias</span></div><div class="stack-sm">' + mols.map(m => molRowHtml(Object.assign({}, m, { nivelAct: m.nivel, last: null }))).join('') + '</div>';
  h += '<div class="sec"><span class="t">Comidas</span><a href="#comida" data-act="close-go" data-href="#comida">Ver</a></div>';
  if (!ms.length) h += '<div class="sub">Sin comidas registradas.</div>';
  else h += '<div class="stack-sm">' + ms.map(m => mealRowHtml(m)).join('') + '</div>';
  h += '<div class="stack-sm"><button class="btn block" data-act="new-log" data-date="' + date + '">' + ic('plus') + 'Registrar otra sesión</button>' +
    (d.override && date >= today ? '<button class="btn sm ghost block" data-act="reset-day" data-date="' + date + '">' + ic('undo') + 'Restaurar el plan de este día</button>' : '') + '</div>';
  return h + '</div>';
}

/* ---------- Check-in ---------- */
function openCheckin() {
  const today = todayStr(), ci = checkinFor(today), sch = scheduleOf(S.data.profile), now = nowMin();
  const v = Object.assign({ sleepH: null, sleepQ: null, fatigue: null, soreness: null, stress: null, rfPain: null }, ci || {});
  // Hora de levantarse: la ya guardada; si no, la hora actual si es de mañana (el check-in se hace al despertar); si no, la habitual
  if (!v.wakeTime) v.wakeTime = now >= 4 * 60 && now <= hm(sch.wake) + 300 ? fmtHM(Math.floor(now / 5) * 5) : sch.wake;
  if (!v.bedTime) v.bedTime = num(v.sleepH) !== null ? fmtHM(hm(v.wakeTime) - Math.round(num(v.sleepH) * 60)) : sch.sleep;
  v.sleepH = Math.round(sleepSpan(v.bedTime, v.wakeTime) / 60 * 100) / 100;
  UI.checkinDraft = v;
  openSheet({ id: 'checkin', render: checkinHtml });
}
function ckSleepSum(v) {
  const sch = scheduleOf(S.data.profile), span = sleepSpan(v.bedTime, v.wakeTime);
  if (span === null) return 'Marca las dos horas.';
  const late = (hm(v.bedTime) - hm(sch.sleep) + 1440 + 720) % 1440 - 720, lateW = hm(v.wakeTime) - hm(sch.wake);
  const tips = [];
  if (late >= 45) tips.push('te acostaste ' + fmtDur(late) + ' más tarde de lo habitual');
  if (lateW >= 30) tips.push('el plan de la mañana se corre');
  return '<b class="' + (span < 7 * 60 ? 'short' : '') + '">' + fmtDur(span) + '</b><span>de sueño' + (tips.length ? ' · ' + esc(tips.join(' y ')) : '') + '</span>';
}
function checkinHtml() {
  const v = UI.checkinDraft;
  const five = (k, lab, l, r, tone) => '<div class="field"><span class="lab">' + lab + '</span>' + scaleHtml(k, v[k], { five: true, act: 'ck-scale', l, r, tone }) + '</div>';
  const tin = (name, label, icon) => '<label><span class="lab2">' + ic(icon) + label + '</span><input class="input num" type="time" step="300" id="ck-' + name + '" value="' + esc(v[name] || '') + '" data-bind="ck-time" data-name="' + name + '" autocomplete="off"></label>';
  return sheetHead('¿Cómo amaneciste?', 'Check-in · 30 segundos') + '<div class="sheet-body">' +
    '<div class="field"><span class="lab">Sueño de anoche</span><div class="sleep-times">' + tin('bedTime', 'Me dormí', 'moon') + tin('wakeTime', 'Me levanté', 'sunrise') + '</div><div class="sleep-sum" id="ck-sum" aria-live="polite">' + ckSleepSum(v) + '</div></div>' +
    five('sleepQ', 'Calidad del sueño', 'Mala', 'Excelente', 'sleep') + five('fatigue', 'Energía', 'Agotado', 'Fresco') + five('soreness', 'Dolor muscular general', 'Mucho', 'Nada') + five('stress', 'Estrés', 'Muy alto', 'Bajo') +
    '<div class="field"><span class="lab">Dolor en el recto femoral en reposo</span>' + scaleHtml('rfPain', v.rfPain, { pain: true, act: 'ck-scale', l: '0 nada', r: '10 máximo' }) + '<span class="hint">Dolor, no cansancio ni carga muscular.</span></div>' +
    '<button class="btn block ghost" data-act="mol-new" data-from="checkin">' + ic('plus') + '¿Alguna otra molestia? Marcar en el mapa</button>' +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="ck-save">Guardar</button></div></div>';
}
function saveCheckin() {
  const v = UI.checkinDraft, date = todayStr();
  const span = sleepSpan(v.bedTime, v.wakeTime);
  if (span === null) { toast('Marca a qué hora te dormiste y te levantaste.', 'warn'); return; }
  const sleepH = Math.round(span / 60 * 100) / 100;
  put('checkins', date, { date, bedTime: v.bedTime, wakeTime: v.wakeTime, sleepH, sleepQ: num(v.sleepQ), fatigue: num(v.fatigue), soreness: num(v.soreness), stress: num(v.stress), rfPain: num(v.rfPain) }).then(() => sleepMs(160)).then(() => {
    const sc = readinessScore(Object.assign({}, v, { sleepH }));
    const ag = agendaFor(date), gym = ag.items.find(x => x.key === 'gym');
    const moved = gym && gym.lateShift && !blockDone(gym.block, date).all;
    const clash = moved && rsHoyCard(ag, date) !== '';
    toast(num(v.rfPain) >= 3 ? 'Guardado. Hoy nada intenso para el recto femoral.' : clash ? 'Guardado. Te levantaste tarde: reorganiza el gimnasio arriba.' : moved ? 'Guardado. El gimnasio pasa a las ' + fmtHM(gym.start) + '.' : sleepH < 6 ? 'Guardado. Sueño corto: una serie menos en accesorios y siesta.' : sc < 50 ? 'Guardado. Hoy una serie menos en accesorios.' : 'Check-in guardado.', num(v.rfPain) >= 3 || sc < 50 || sleepH < 6 || moved ? 'warn' : 'ok');
  });
  closeSheet();
}

/* ---------- Hecha tal cual / No la hice ---------- */
function openQuickDone(date, types, est) {
  UI.qd = { date, types, minutes: est || 45, rpe: null, pd: null };
  openSheet({ id: 'qd', render: quickDoneHtml });
}
function quickDoneHtml() {
  const q = UI.qd, ss = q.types.map(t => findPlanned(q.date, t)).filter(Boolean);
  const pain = ss.some(s => s.field && (s.field.kind === 'golpeo' || s.field.kind === 'sprint') && !s.field.tec);
  return sheetHead('Hecho tal cual', esc(ss.map(s => s.short).join(' + '))) + '<div class="sheet-body">' +
    '<div class="field"><span class="lab">Minutos en total</span>' + stepperHtml('qd-min', q.minutes, 'qd-step', 'data-name="minutes"', 'min') + '</div>' +
    '<div class="field"><span class="lab">Esfuerzo (RPE)</span>' + scaleHtml('rpe', q.rpe, { act: 'qd-scale', tone: 'load', l: '0 reposo', r: '10 máximo' }) + '</div>' +
    (pain ? '<div class="field"><span class="lab">Dolor en el recto femoral durante</span>' + scaleHtml('pd', q.pd, { pain: true, act: 'qd-scale', l: '0 nada', r: '10 máximo' }) + '</div>' : '') +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="qd-save">Guardar</button></div></div>';
}
function plannedToLogExercises(s, date) {
  return (s.items || []).map(it => {
    const ex = exInfo(it.id, it);
    const sg = suggestSets(it, ex, ST.sessions, date, ST.side);
    const e = { id: it.id, n: it.n, slot: it.slot || null, spec: it.spec || null, side: !!it.side, mode: it.mode || specMode(it.spec), sets: sg.sets.map(x => Object.assign({}, x, { done: true })) };
    if (!BANK_INDEX[it.id] && it.tags) e.tags = it.tags;
    return e;
  });
}
function freezeDay(date) {
  const st = S.data.settings || {}, plan = st.plan || {};
  if (plan[date]) return Promise.resolve();
  const d = dayPlan(date); if (!d) return Promise.resolve();
  return setPlanDay(date, d.types.slice());
}
function saveQuickDone() {
  const q = UI.qd, ss = q.types.map(t => findPlanned(q.date, t)).filter(Boolean);
  if (!ss.length) { closeSheet(); return; }
  const needPain = ss.some(s => s.field && (s.field.kind === 'golpeo' || s.field.kind === 'sprint') && !s.field.tec);
  if (needPain && num(q.pd) === null) { toast('Marca el dolor durante la sesión.', 'warn'); return; }
  freezeDay(q.date);
  const totEst = ss.reduce((a, s) => a + (s.est || 10), 0) || 1;
  let intense = false;
  for (const s of ss) {
    const log = { date: q.date, type: s.type, title: s.title, done: true, source: 'app', minutes: Math.round((num(q.minutes) || totEst) * (s.est || 10) / totEst), rpe: num(q.rpe), est: s.est || null, exercises: plannedToLogExercises(s, q.date) };
    if (s.field && s.field.kind === 'golpeo' && !s.field.tec) log.kick = { level: s.field.level, pd: num(q.pd), pn: null };
    if (s.field && s.field.kind === 'golpeo' && s.field.tec) log.tec = { level: s.field.level, count: s.field.target };
    if (s.field && s.field.kind === 'sprint') log.spr = { level: s.field.level, pd: num(q.pd), pn: null };
    if (s.field && s.field.kind === 'rt') log.rt = { level: s.field.level };
    if (s.field && s.field.kind === 'balon') log.ball = { drills: [], headersAlta: s.headersPlan || 0, asPlanned: true };
    if (isIntenseLog(log)) intense = true;
    put('sessions', 's-' + q.date + '-' + s.type, log);
  }
  toast(intense ? 'Guardado. Cuenta como día intenso.' : 'Guardado.');
  closeAllSheets();
}
function markNotDone(date, type) {
  const s = findPlanned(date, type);
  freezeDay(date);
  put('sessions', 's-' + date + '-' + type, { date, type, title: s ? s.title : (STYPES[type] || {}).n, done: false, source: 'app', exercises: [] }).then(() => toast('Marcada como no hecha.'));
  closeAllSheets();
}

/* ---------- Mover a otro día ---------- */
function openMove(date, type) { openSheet({ id: 'move', render: () => moveHtml(date, type) }); }
function moveHtml(date, type) {
  const s = findPlanned(date, type), today = todayStr();
  let h = sheetHead('Mover a otro día', esc(s ? s.title : '')) + '<div class="sheet-body"><div class="stack-sm">';
  for (let i = 0; i < 9; i++) {
    const d = addDays(today, i); if (d === date) continue;
    const dp = dayPlan(d);
    h += '<button class="blk" data-act="move-to" data-from="' + date + '" data-type="' + type + '" data-to="' + d + '"><span class="c' + (dp.intense ? ' load' : '') + '">' + ic('cal') + '</span><div class="grow"><div class="t">' + esc(capFirst(fmtDateLong(d))) + '</div><div class="s">' + esc(dayTitle(dp)) + (dp.intense ? ' · intenso' : '') + '</div></div>' + ic('chev') + '</button>';
  }
  h += '</div><button class="btn ghost block" data-act="remove-block" data-date="' + date + '" data-type="' + type + '">' + ic('trash') + 'Quitar de este día</button></div>';
  return h;
}
function setPlanDay(date, types) {
  const s = clone(S.data.settings || {}); delete s.id; s.plan = s.plan || {};
  if (types) s.plan[date] = { types: types.length ? types : ['descanso'] }; else delete s.plan[date];
  const today = todayStr();
  Object.keys(s.plan).forEach(k => { if (k < addDays(today, -60)) delete s.plan[k]; });
  return put('settings', 'main', s);
}
function moveBlock(from, type, to) {
  const s = clone(S.data.settings || {}); delete s.id; s.plan = s.plan || {};
  const fromTypes = dayPlan(from).types.filter(t => t !== type);
  const toTypes = dayPlan(to).types.filter(t => t !== 'descanso'); if (!toTypes.includes(type)) toTypes.push(type);
  s.plan[from] = { types: fromTypes.length ? fromTypes : ['descanso'] };
  s.plan[to] = { types: toTypes };
  put('settings', 'main', s).then(() => {
    const nd = dayPlan(to), prev = dayPlan(addDays(to, -1)), next = dayPlan(addDays(to, 1));
    const clash = nd && nd.intense && ((prev && prev.intense) || (next && next.intense));
    toast(clash ? 'Movida. Ojo: quedan dos días intensos seguidos.' : 'Sesión movida al ' + DOW_LONG[weekday(to)] + '.', clash ? 'warn' : 'ok');
  });
  closeAllSheets();
}

/* ---------- Tengo poco tiempo ---------- */
function openShort(date, key) {
  const it = agendaFor(date).items.find(x => x.key === key);
  const cands = it && it.block ? it.block.sessions.filter(s => s.items.length >= 3 && !findLog(date, s.type)) : [];
  const s = cands.sort((a, b) => b.est - a.est)[0];
  if (!s) { toast('No hay ejercicios para recortar en este bloque.', 'info'); return; }
  UI.short = { date, type: s.type, min: Math.min(45, s.est) };
  openSheet({ id: 'short', render: shortHtml });
}
function shortHtml() {
  const q = UI.short, s = findPlanned(q.date, q.type);
  const c = compressSession(s, q.min);
  return sheetHead('¿Cuánto tiempo tienes?', esc(s.title) + ' · completa ≈ ' + s.est + ' min') + '<div class="sheet-body">' +
    '<div class="pills">' + [30, 45, 60, 75].map(m => '<button class="pill' + (q.min === m ? ' on' : '') + '" data-act="short-min" data-v="' + m + '">' + m + ' min</button>').join('') + '</div>' +
    '<div class="card flat tight"><div class="stack-sm"><div class="row between"><span class="h3">Queda en ≈ ' + c.est + ' min</span>' + chip(plural(c.session.items.length, 'ejercicio', 'ejercicios'), c.est <= q.min ? 'lime' : 'warn') + '</div>' +
    (c.cut.length ? c.cut.map(x => '<div class="small fg2">· ' + esc(x) + '</div>').join('') : '<div class="small fg2">Entra completa.</div>') + '</div></div>' +
    note('info', 'Primero se mantiene el trabajo del recto femoral y los básicos.') +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="short-go">' + ic('play') + 'Empezar</button></div></div>';
}
