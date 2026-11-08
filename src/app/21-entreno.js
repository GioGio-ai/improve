/* ============================================================
   ENTRENO: semana, historial y ejercicios
   ============================================================ */
function viewEntreno(st, today) {
  if (!S.data.profile) return onboarding();
  let h = '<div class="aura" aria-hidden="true"></div><div class="page-head"><h1 class="h1 grow">Entreno</h1><button class="btn sm primary" data-act="reg" data-date="' + today + '">' + ic('plus') + 'Registrar</button></div>';
  h += trainingBanner();
  h += '<div class="seg blue" role="tablist">' + [['semana', 'Semana'], ['historial', 'Historial'], ['ejercicios', 'Ejercicios']].map(([k, l]) => '<button type="button" role="tab" aria-selected="' + (UI.enTab === k) + '" class="' + (UI.enTab === k ? 'on' : '') + '" data-act="en-tab" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
  if (UI.enTab === 'historial') return h + historyPanel(st, today);
  if (UI.enTab === 'ejercicios') return h + exercisesPanel(st);
  return h + weekPanel(st, today);
}
function weekPanel(st, today) {
  const ws = addDays(weekStartOf(today), UI.weekOffset * 7), we = addDays(ws, 6), days = weekPlan(ws);
  const logsWeek = (S.data.sessions || []).filter(s => s.date >= ws && s.date <= we && !s.deleted);
  const done = logsWeek.filter(s => s.done !== false).length;
  const load = logsWeek.reduce((a, s) => a + sessionLoad(s), 0);
  const intense = days.filter(d => d.intense).length;
  let h = '<div class="weeknav"><button class="iconbtn sm" data-act="week" data-d="-1" aria-label="Semana anterior">' + ic('chevL') + '</button><div class="grow"><div class="kicker">' + (UI.weekOffset === 0 ? 'Esta semana' : UI.weekOffset < 0 ? (UI.weekOffset === -1 ? 'Semana pasada' : 'Hace ' + -UI.weekOffset + ' semanas') : (UI.weekOffset === 1 ? 'Próxima semana' : 'En ' + UI.weekOffset + ' semanas')) + '</div><div class="h2 tnum">' + fmtDate(ws) + ' – ' + fmtDate(we) + '</div></div><button class="iconbtn sm" data-act="week" data-d="1" aria-label="Semana siguiente">' + ic('chev') + '</button></div>';
  h += '<div class="stats panel"><div class="stat ' + (intense > 3 ? 'pain' : 'load') + '"><span class="v">' + intense + '<small>/3</small></span><span class="k">Intensos</span></div><div class="stat lime"><span class="v">' + done + '</span><span class="k">Hechas</span></div><div class="stat blue"><span class="v">' + (load || '—') + '</span><span class="k">Carga</span></div></div>';
  if (intense > 3) h += note('warn', 'Más de 3 días intensos para el recto femoral. Mueve una sesión.');
  h += '<div class="stack-sm">';
  for (const d of days) {
    const isToday = d.date === today;
    const blocks = dayBlocks(d);
    const extra = logsFor(d.date).filter(l => !d.sessions.some(s => s.type === l.type));
    h += '<section class="card tight day-sec' + (isToday ? ' is-today' : '') + '"><div class="stack-sm"><div class="row between nowrap"><button class="day-t" data-act="day" data-date="' + d.date + '">' + (isToday ? '<span class="dot-today"></span>' : '') + esc(capFirst(fmtDateLong(d.date))) + '</button><span class="row nowrap tight">' +
      (d.md ? chip(d.md, '') : '') + (d.projectedPhase ? chip(PHASES[d.phase].n + ' previsto', 'blue') : '') + (d.intense ? chip('Intenso', 'load', 'flame') : '') + '</span></div>';
    (d.notes || []).filter(n => !/^Golpeo K\d extra|^Sprint S\d extra/.test(n)).forEach(n => { h += note('', esc(n)); });
    if (!blocks.length && !extra.length) h += '<div class="sub">Descanso</div>';
    for (const b of blocks) for (const s of b.sessions) {
      const log = findLog(d.date, s.type);
      h += '<button class="blk' + (log && log.done !== false ? ' done' : '') + '" data-act="session" data-date="' + d.date + '" data-type="' + s.type + '"><span class="c' + (s.intense ? ' load' : log && log.done !== false ? ' lime' : '') + '">' + ic(s.icon || 'dumb') + '</span><div class="grow"><div class="t">' + esc(log && log.modified && log.title ? log.title : s.title) + '</div><div class="s">' + esc(log ? logLine(log) : d.past ? 'Sin registrar' : (b.key === 'gym' ? 'Gimnasio' : b.key === 'campo' ? 'Cancha' : b.key === 'recup' ? 'Noche' : '') + ' · ' + blockSub(s)) + '</div></div>' + statusMark(log) + '</button>';
    }
    h += extra.map(l => '<button class="blk done" data-act="edit-log" data-id="' + esc(l.id) + '"><span class="c lime">' + ic(sessIcon(l.type)) + '</span><div class="grow"><div class="t">' + esc(l.title || (STYPES[l.type] || STYPES.libre).n) + '</div><div class="s">' + esc(logLine(l)) + '</div></div>' + statusMark(l) + '</button>').join('');
    h += '</div></section>';
  }
  h += '</div>';
  if (st.injuryActive && UI.weekOffset >= 0) h += roadCard(st, today);
  return h;
}
/* Camino a las pruebas: cuándo llegas a cada hito si todo sale limpio */
function roadCard(st, today) {
  const proj = project(st, today);
  const goal = st.profile.targetDate;
  const rows = [{ pt: 'cur', t: PHASES[st.phase].n + ' · ' + PHASES[st.phase].t, w: 'Ahora', d: '0', cls: '' }];
  if (st.phase < 4 && proj.phases[4]) rows.push({ pt: '', t: 'F4 · ' + PHASES[4].t, w: fmtDate(proj.phases[4]), d: proj.phases[4], cls: '' });
  if (st.kick.demo) rows.push({ pt: '', t: 'Golpeo ' + KICK[st.kick.demo.level].n + ' hecho en cancha, sin dolor', w: fmtDate(st.kick.demo.date), d: '0a', cls: 'ok' });
  if (!st.sprint.top && proj.s6) rows.push({ pt: '', t: 'Sprint S6 completo', w: fmtDate(proj.s6), d: proj.s6, cls: '' });
  if (!st.kick.top && proj.k8) rows.push({ pt: '', t: 'Golpeo K8 completo', w: fmtDate(proj.k8), d: proj.k8, cls: '' });
  if (st.phase < 5) rows.push({ pt: 'goal', t: 'F5 · listo para pruebas', w: proj.phases[5] ? fmtDate(proj.phases[5]) : 'más de 10 semanas', d: proj.phases[5] || '9999', cls: proj.phases[5] && goal ? (proj.phases[5] <= goal ? 'ok' : 'late') : '' });
  if (goal) rows.push({ pt: 'goal', t: 'Tu objetivo', w: fmtDate(goal), d: goal + 'z', cls: '' });
  rows.sort((a, b) => (a.d < b.d ? -1 : a.d > b.d ? 1 : 0));
  /* Lo que hoy marca la fecha de F5 */
  const brake = !proj.phases[5] ? '' : (!st.sprint.top && (!proj.k8 || (proj.s6 && proj.s6 >= proj.k8))) ? 'Lo que marca la fecha es el sprint (vas en ' + SPRINT[st.sprint.level].n + ') y el test de F4, no el golpeo.' : (!st.kick.top && proj.k8) ? 'Lo que marca la fecha es el golpeo (vas en ' + KICK[st.kick.level].n + ') y el test de F4.' : '';
  return '<section class="panel k-lime"><div class="stack"><div class="ed-head"><span class="kicker">Camino a las pruebas</span>' + (proj.phases[5] && goal ? chip(proj.phases[5] <= goal ? 'A tiempo' : 'Ajustado', proj.phases[5] <= goal ? 'lime' : 'warn') : '') + '</div>' +
    '<ul class="road">' + rows.map(r => '<li><span class="pt ' + r.pt + '"></span><span class="small">' + esc(r.t) + '</span><span class="when ' + r.cls + '">' + esc(r.w) + '</span></li>').join('') + '</ul>' +
    '<p class="sub">Si cada sesión sale limpia y apruebas los tests.' + (brake ? ' ' + esc(brake) : '') + '</p></div></section>';
}
function historyPanel(st, today) {
  const sessions = (S.data.sessions || []).filter(s => !s.deleted);
  const dates = Array.from(new Set(sessions.map(s => s.date).concat((S.data.checkins || []).map(c => c.date)))).filter(d => d <= today).sort().reverse();
  const shown = dates.slice(0, UI.histLimit);
  if (!shown.length) return '<div class="empty"><b>Todavía no hay sesiones.</b><span class="small">Lo que entrenes queda acá, día por día.</span></div>';
  let h = '';
  const loads = weeklyLoads(st.sessions, today, 4);
  h += '<section class="panel"><div class="stack-sm"><div class="ed-head"><span class="kicker">Carga semanal</span><span class="meta">min × esfuerzo</span></div>' + barChart(loads.map(l => ({ label: fmtDate(l.start), value: l.load })), { cur: loads.length - 1, label: 'Carga semanal' }) + '</div></section>';
  let month = '';
  for (const date of shown) {
    const m = MONTHS[parseYmd(date).getMonth()];
    if (m !== month) { month = m; h += '<div class="kicker month">' + capFirst(['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][parseYmd(date).getMonth()]) + '</div>'; }
    const logs = sessions.filter(s => s.date === date).sort(byDate);
    const ci = checkinFor(date);
    const load = logs.reduce((a, s) => a + sessionLoad(s), 0);
    const intense = logs.some(isIntenseLog);
    const painMax = Math.max(0, ...logs.map(l => { const k = l.kick || l.spr; return k ? Math.max(num(k.pd) || 0, num(k.pn) || 0) : 0; }), ci ? num(ci.rfPain) || 0 : 0);
    h += '<section class="card tight day-sec"><div class="stack-sm"><button class="row between nowrap day-t" data-act="day" data-date="' + date + '"><span>' + esc(capFirst(fmtDateLong(date))) + '</span><span class="row nowrap tight">' +
      (ci && num(ci.sleepH) !== null ? chip(fmtNum(ci.sleepH) + ' h', sleepTone(ci.sleepH) === 'load' ? 'warn' : 'sleep', 'moon') : '') + (load ? chip(String(load), intense ? 'load' : '', 'flame') : '') + (painMax >= 3 ? chip('dolor ' + painMax, 'pain') : '') + ic('chev') + '</span></button>' +
      (logs.length ? logs.map(l => '<button class="blk' + (l.done !== false ? ' done' : '') + '" data-act="session" data-date="' + l.date + '" data-type="' + l.type + '"><span class="c' + (l.done === false ? ' mute' : isIntenseLog(l) ? ' load' : ' lime') + '">' + ic(sessIcon(l.type)) + '</span><div class="grow"><div class="t">' + esc(l.title || (STYPES[l.type] || STYPES.libre).n) + '</div><div class="s">' + esc(logLine(l)) + '</div>' + (l.ball && (l.ball.drills || []).length ? '<div class="s fg3 num">' + esc(l.ball.drills.slice(0, 4).map(d => (BALL_DRILL_INDEX[d.id] || d).n.split(' · ')[0].replace('Definición con zurda', 'Zurda') + ' ' + ballValTxt(d)).join(' · ')) + '</div>' : '') + (l.campo && (l.campo.bloques || []).length ? '<div class="s fg3">' + esc(l.campo.bloques.filter(b => !['calentamiento', 'movilidad'].includes(b.cat)).slice(0, 4).map(b => b.n).join(' · ')) + '</div>' : '') + '</div>' + statusMark(l) + '</button>').join('') : '<div class="sub">Sin entrenamiento registrado.</div>') +
      '</div></section>';
  }
  if (dates.length > UI.histLimit) h += '<button class="btn block ghost" data-act="hist-more">Ver más días</button>';
  return h;
}
function exercisesPanel(st) {
  let h = '<div class="seg" role="tablist">' + [['banco', 'Banco'], ['balon', 'Balón'], ['biblioteca', 'Biblioteca'], ['plantillas', 'Plantillas'], ['guias', 'Guías']].map(([k, l]) => '<button type="button" role="tab" aria-selected="' + (UI.exTab === k) + '" class="' + (UI.exTab === k ? 'on' : '') + '" data-act="ex-tab" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
  if (UI.exTab === 'biblioteca') return h + libraryPanel();
  if (UI.exTab === 'balon') return h + ballPanel(st);
  if (UI.exTab === 'plantillas') return h + templatesPanel();
  if (UI.exTab === 'guias') return h + guidesPanel(st);
  return h + bankPanel(st);
}
function bankPanel(st) {
  const B = UI.bank, q = normTxt(B.q);
  const src = BANK.concat((S.data.custom || []).map(customNorm));
  const list = src.filter(e => (!q || normTxt(e.n + ' ' + (e.m || '') + ' ' + (LABELS.pat[e.pat] || '')).includes(q)) && (!B.zone || (e.z || []).includes(B.zone)) && (!B.phaseOk || !st.injuryActive || exEligible(e, { phase: st.phase, injuryActive: true })));
  const zones = ['rf', 'isquio', 'aductor', 'gluteo', 'cuad', 'core', 'tobillo', 'hombro', 'espalda'];
  let h = '<div class="row nowrap"><div class="field grow"><label class="sr" for="bank-q">Buscar</label><input class="input" id="bank-q" type="search" inputmode="search" enterkeyhint="search" data-input="bank-q" placeholder="Buscar ejercicio o músculo" value="' + esc(B.q) + '" autocomplete="off"></div><button class="iconbtn" data-act="new-custom" aria-label="Crear ejercicio">' + ic('plus') + '</button></div>';
  h += '<div class="scroll-x">' + (st.injuryActive ? '<button class="pill' + (B.phaseOk ? ' on' : '') + '" data-act="bank-phase">Permitidos en ' + PHASES[st.phase].n + '</button>' : '') +
    zones.map(z => '<button class="pill' + (B.zone === z ? ' on' : '') + '" data-act="bank-zone" data-v="' + z + '">' + esc(LABELS.z[z]) + '</button>').join('') + '</div>';
  h += '<div class="sub">' + plural(list.length, 'ejercicio', 'ejercicios') + '</div>';
  h += '<div class="exlist">' + list.slice(0, B.limit).map(e => '<button class="exrow" data-act="ex" data-id="' + esc(e.id) + '">' + thumbHtml(e) + '<div class="mw0"><div class="t">' + esc(e.n) + '</div><div class="s">' + esc([LABELS.pat[e.pat], (e.z || []).slice(0, 2).map(z => LABELS.z[z]).filter(Boolean).join(', ')].filter(Boolean).join(' · ')) + '</div></div><span class="f">F' + (e.f || 1) + '+</span></button>').join('') + '</div>';
  if (list.length > B.limit) h += '<button class="btn block ghost" data-act="bank-more">Ver más</button>';
  return h;
}
/* Estaciones de balón: qué está habilitado hoy y tus récords */
function ballPanel(st) {
  const L = effLevels(st);
  const why = (d) => (d.minPhase || 1) > st.phase ? 'Se abre en ' + PHASES[d.minPhase].n : d.kRight && L.k < d.kRight ? 'Desde K' + d.kRight + ' (derecha)' : d.sMin && L.s < d.sMin ? 'Desde S' + d.sMin : '';
  let h = '<section class="stack-sm"><div class="sec"><span class="t">Con compañeros o por tu cuenta</span></div>' +
    '<button class="blk" data-act="train-text" data-date="' + todayStr() + '"><span class="c">' + ic('spark') + '</span><div class="grow"><div class="t">Contar una sesión con balón</div><div class="s">La describes y la IA la ordena en bloques</div></div>' + ic('chev') + '</button>' +
    '<div class="exlist">' + CAMPO_ACTS.map(a => '<div class="exrow ic44"><span class="ic-tile" aria-hidden="true">' + ic(CAMPO_CATS[a.cat].ic) + '</span><div class="mw0"><div class="t">' + esc(a.n) + '</div><div class="s">' + esc(a.d) + '</div></div><span class="f">' + a.min + '′</span></div>').join('') + '</div></section>';
  h += '<div class="sec"><span class="t">Estaciones del plan</span></div>';
  h += note('blue', 'Derecha: interior y control desde ya; empeine fuerte solo en el golpeo. Voleas y centros con la derecha desde K7. Cabeceo fuerte: máx. ' + BALL_HEADER_CAP + ' por semana.');
  h += '<div class="stack-sm">' + BALL_DRILLS.map(d => {
    const w = why(d), pies = d.perFoot ? ['der', 'izq'] : [null];
    const recs = pies.map(p => { const b = ballBest(st.sessions, d.id, p); return b ? (p ? (p === 'der' ? 'Der ' : 'Izq ') : '') + fmtNum(b.val) : null; }).filter(Boolean);
    return '<div class="card flat tight"><div class="stack-xs"><div class="row between nowrap"><span class="h3">' + esc(d.n) + '</span>' + (w ? chip(w, '') : chip('Habilitada', 'lime', 'check')) + '</div>' +
      '<div class="row">' + chip(ballFootLabel(ballSideFoot(d.foot, st.side)), d.foot === 'izq' ? 'blue' : '') + chip(d.unit, '') + (d.header === 'alta' ? chip('fuerza alta', 'load') : '') + (recs.length ? chip('Récord ' + recs.join(' · '), 'lime', 'star') : '') + '</div>' +
      '<div class="small fg2">' + esc(d.d) + '</div></div></div>';
  }).join('') + '</div>';
  return h;
}
function libraryPanel() {
  const L = UI.lib;
  if (!LIB.data) {
    loadLib().then(() => scheduleRender()).catch(() => { LIB.error = true; scheduleRender(); });
    return LIB.error ? '<div class="empty"><b>No se pudo cargar la biblioteca.</b><span class="small">Vuelve a abrir la app con conexión.</span></div>' : '<div class="stack-sm">' + [0, 1, 2, 3, 4].map(() => '<div class="skel sk-row"></div>').join('') + '</div>';
  }
  const tr = {}; (S.data.traducciones || []).forEach(t => { tr[t.id] = t; });
  const q = normTxt(L.q);
  const list = LIB.data.filter(x => (!q || normTxt(x.n + ' ' + (tr[x.id] ? tr[x.id].n : '') + ' ' + (x.pm || []).map(m => m + ' ' + (LIB_ES.muscles[m] || '')).join(' ')).includes(q)) && (!L.muscle || (x.pm || []).includes(L.muscle)));
  let h = '<div class="field"><label class="sr" for="lib-q">Buscar</label><input class="input" id="lib-q" type="search" inputmode="search" enterkeyhint="search" data-input="lib-q" placeholder="Nombre en inglés o músculo" value="' + esc(L.q) + '" autocomplete="off"></div>';
  h += '<div class="scroll-x">' + ['quadriceps', 'hamstrings', 'glutes', 'adductors', 'calves', 'abdominals', 'chest', 'lats', 'shoulders'].map(m => '<button class="pill' + (L.muscle === m ? ' on' : '') + '" data-act="lib-muscle" data-v="' + m + '">' + esc(LIB_ES.muscles[m]) + '</button>').join('') + '</div>';
  h += '<div class="sub">' + plural(list.length, 'ejercicio', 'ejercicios') + ' · Free Exercise DB (dominio público)</div>';
  h += '<div class="exlist">' + list.slice(0, L.limit).map(x => '<button class="exrow" data-act="lib-ex" data-id="' + esc(x.id) + '"><div class="thumb" data-thumb="' + esc(x.id) + '">' + esc(x.n.slice(0, 2).toUpperCase()) + '</div><div class="mw0"><div class="t">' + esc(tr[x.id] ? tr[x.id].n : x.n) + '</div><div class="s">' + esc([LIB_ES.category[x.c], (x.pm || []).map(m => LIB_ES.muscles[m]).join(', ')].filter(Boolean).join(' · ')) + '</div></div><span></span></button>').join('') + '</div>';
  if (list.length > L.limit) h += '<button class="btn block ghost" data-act="lib-more">Ver más</button>';
  return h;
}
function templatesPanel() {
  const list = (S.data.templates || []).slice().sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  let h = '<button class="btn block" data-act="tpl-new">' + ic('plus') + 'Nueva plantilla</button>';
  if (!list.length) return h + '<div class="empty"><b>Sin plantillas todavía.</b><span class="small">Crea una acá o guarda una sesión como plantilla al terminar de entrenar.</span></div>';
  return h + '<div class="stack-sm">' + list.map(t => {
    const items = t.exercises.map(tplToItem);
    const est = estimateSession({ items, warmup: null, field: null });
    return '<div class="card tight"><div class="row between nowrap"><div class="grow"><div class="h3">' + esc(t.name) + '</div><div class="sub">' + plural(t.exercises.length, 'ejercicio', 'ejercicios') + ' · ≈ ' + est + ' min</div></div><button class="iconbtn sm" data-act="tpl-edit" data-id="' + esc(t.id) + '" aria-label="Editar">' + ic('edit') + '</button><button class="btn sm primary" data-act="tpl-start" data-id="' + esc(t.id) + '">' + ic('play') + 'Empezar</button></div></div>';
  }).join('') + '</div>';
}
function guidesPanel(st) {
  const g = (id, icon, tone, t, s) => '<button class="blk" data-act="guide" data-g="' + id + '"><span class="c ' + tone + '">' + ic(icon) + '</span><div class="grow"><div class="t">' + t + '</div><div class="s">' + s + '</div></div>' + ic('chev') + '</button>';
  return '<div class="stack-sm">' + g('respiracion', 'wind', 'sleep', 'Respiración guiada', '5 minutos para pasar a modo recuperación') + g('prueba', 'trophy', 'lime', 'Día de prueba', 'Qué hacer antes, durante y después') + g('pretemporada', 'run', 'load', 'Pretemporada', 'Resistencia, velocidad y afinamiento hacia la prueba') +
    g('recuperacion', 'moon', 'sleep', 'Recuperación por evidencia', 'Qué funciona y qué evitar') + g('porque', 'book', '', 'Por qué este plan', 'El recto femoral se entrena largo') + g('fks', 'info', '', 'Qué significan F, K y S', 'Fases, golpeo y sprint en 1 minuto') + '</div>';
}
