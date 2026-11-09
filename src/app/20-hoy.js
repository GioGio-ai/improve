/* ============================================================
   HOY: estado, semana, siguiente bloque y agenda del día (arrastrable)
   ============================================================ */
const PX_MIN = 1.25;
const MIN_BLK = 46;
/* Alto mínimo (px) para mostrar el bloque en dos líneas y en tres (hora, título y detalle) */
const TL_TWO_LINES = 50, TL_THREE_LINES = 68;
const DRAG = { active: false };

function viewHoy(st, today) {
  if (!S.data.profile) return onboarding();
  const date = UI.hoyDate && UI.hoyDate >= addDays(weekStartOf(today), -7) ? UI.hoyDate : today;
  const isToday = date === today;
  const day = dayPlan(date), ag = agendaFor(date);
  const ci = checkinFor(today), adv = readinessAdvice(ci);
  const d = parseYmd(today);
  const hero = isToday ? nextHero(day, ag, today) : dayHero(day, date, today);
  const tone = /class="hero k-rest/.test(hero) ? ' k-rest' : /class="hero k-done/.test(hero) ? ' k-done' : '';
  let h = '<div class="aura' + tone + '" aria-hidden="true"></div><div class="section hoy-head"><header class="topbar"><div class="grow"><h1 class="h1">' + capFirst(DOW_LONG[weekday(today)]) + ' ' + d.getDate() + '</h1></div>' +
    '<a class="iconbtn" href="#aprende" aria-label="Aprende: datos e investigación">' + ic('book') + '</a><a class="iconbtn glow" href="#coach" aria-label="Coach con IA">' + ic('spark') + '</a><a class="avatar-hit" href="#perfil" aria-label="Perfil"><span class="avatar">' + avatarImg() + '</span></a></header>';
  h += statusChips(st, today) + weekStrip(today, date) + '</div>';
  /* Entrenamiento abierto o sin enviar: siempre arriba */
  const live = trainingBanner();
  if (live) h += '<div class="section alerts">' + live + '</div>';
  /* 1 · Estado del día: check-in, molestias y lo que el plan necesita saber hoy */
  if (isToday) h += estadoHoy(st, today, day, ag, ci, adv);
  /* 2 · La sesión: qué toca, cuánto y por qué cambió */
  const notes = (day.notes || []).filter(n => n && !(isToday && /^Molestia en /.test(n)));
  h += '<div class="section lead">' + hero + dayNotesHtml(notes) + clavesHoy(st, date) + '</div>';
  /* 3 · Agenda de entreno y sueño */
  h += agendaCard(ag, day, date, today);
  return h;
}
/* Claves del 9 (v5.1): la víspera y el día de la prueba, si hay rol o puesta a punto de 9 */
function clavesHoy(st, date) {
  const p = st.profile || {}, trials = p.trials || [];
  if (!trials.includes(date) && !trials.includes(addDays(date, 1))) return '';
  if (!p.rol && !(p.block && p.block.enfoque === 'puesto')) return '';
  const R = rolOf(p);
  return '<section class="panel claves-panel"><span class="kicker">Tus claves de 9</span><ol class="claves">' + R.claves.map(c => '<li>' + esc(c) + '</li>').join('') + '</ol>' +
    '<span class="hint">' + (trials.includes(date) ? 'Haz tu trabajo excelente; lo demás lo hacen tus compañeros.' : 'Mañana, la prueba. Repásalas antes de dormir.') + '</span></section>';
}
/* Estado del día en una sección: check-in, molestias activas y preguntas que cambian el plan */
function estadoHoy(st, today, day, ag, ci, adv) {
  const asks = pendingPainPrompts(st, today) + molHoyHtml(day, today) + rsHoyCard(ag, today);
  return '<section class="section estado" aria-label="Estado de hoy">' + readinessCard(ci, adv) +
    '<div class="scroll-x mol-chips" role="group" aria-label="Molestias">' + molChips(today) + '</div>' + asks + '</section>';
}
/* Motivos de los ajustes del día: los dos primeros a la vista, el resto plegado (lo de dolor y estado primero) */
function dayNotesHtml(notes) {
  if (!notes.length) return '';
  const warn = (n) => /Dolor|dolor|Estado|Enfermo|enferm/.test(n);
  const sorted = notes.filter(warn).concat(notes.filter(n => !warn(n)));
  const row = (n) => note(warn(n) ? 'warn' : /Previsto/.test(n) ? 'blue' : 'info', esc(n));
  const rest = sorted.slice(2);
  return '<div class="stack-sm day-notes">' + sorted.slice(0, 2).map(row).join('') +
    (rest.length ? '<details class="more-notes"><summary>' + ic('info') + plural(rest.length, 'ajuste más', 'ajustes más') + '</summary><div class="in">' + rest.map(row).join('') + '</div></details>' : '') + '</div>';
}
function onboarding() {
  return '<header class="topbar"><div class="grow"><div class="brand"><span class="mk"><i></i></span>IMPROVE</div></div></header>' +
    '<section class="card t-blue"><div class="stack"><div class="h2">Completa tu perfil</div><p class="body">Con tus datos, tu lesión y tu objetivo el motor arma la semana y el horario.</p><button class="btn primary" data-act="edit-profile">Completar perfil</button></div></section>';
}
function statusChips(st, today) {
  const prof = st.profile, chips = [];
  if (st.injury && st.phase <= 5) chips.push('<a class="chip blue" href="#progreso">' + PHASES[st.phase].n + ' · ' + esc(PHASES[st.phase].t) + '</a>');
  const goal = prof.targetDate;
  if (goal) { const left = diffDays(goal, today); if (left >= 0) chips.push('<a class="chip ' + (left <= 7 ? 'lime' : '') + '" href="#progreso">' + ic('target') + (left === 0 ? 'Objetivo hoy' : 'Listo en ' + plural(left, 'día', 'días')) + '</a>'); }
  /* Pretemporada y enfermedad (v4.6) */
  const bi = blockInfo(st, today), sk = sickOn(st, today), rr = sk ? null : sickReturn(st, today);
  if (sk) chips.push('<a class="chip sleep" href="#perfil">' + ic('moon') + 'Enfermo · descanso</a>');
  else if (rr) chips.push('<a class="chip" href="#perfil">' + ic('leaf') + 'Vuelta gradual · día ' + rr.day + ' de ' + rr.n + '</a>');
  if (bi && st.phase >= 3) chips.push('<button class="chip load" data-act="guide" data-g="' + (bi.b.enfoque === 'puesto' ? 'puesto9' : 'pretemporada') + '">' + ic(bi.b.enfoque === 'puesto' ? 'target' : 'run') + (bi.b.enfoque === 'puesto' ? 'Puesta a punto · 9' : 'Pretemporada') + ' · día ' + bi.day + ' de ' + bi.total + ' · ' + esc((BLOCK_FASE_N[bi.fase] || '').toLowerCase()) + '</button>');
  if (!chips.length) return '';
  return '<div class="scroll-x">' + chips.join('') + '</div>';
}
function trainingBanner() {
  const dr = loadDraft();
  if (!dr || TR.open) return outboxBanner();
  return '<div class="banner live" role="group" aria-label="Entrenamiento abierto">' + ic('play') + '<div class="grow"><div class="h3">Entrenamiento abierto · todo guardado</div><div class="sub c-blue">' + esc(dr.title) + '</div><div class="sub">' + esc(draftProgressText(dr)) + '</div></div>' +
    '<div class="bacts"><button class="btn primary" data-act="tr-resume">' + ic('play') + 'Retomar</button><button class="btn" data-act="tr-save-draft">' + ic('check', 'ok') + 'Terminar</button></div></div>' + outboxBanner();
}
function pendingPainPrompts(st, today) {
  const list = st.sessions.filter(s => s.done !== false && s.date < today && s.date >= addDays(today, -3) && ((s.type === 'golpeo' && s.kick) || (s.type === 'sprint' && s.spr)))
    .filter(s => { const k = s.kick || s.spr; return k.pn === null || k.pn === undefined; }).sort(byDate).slice(-2);
  /* Cancha libre con golpes fuertes de la pierna lesionada: ¿cómo amaneció? */
  const free = st.injuryActive ? st.sessions.filter(s => s.campo && !s.kick && !s.spr && s.done !== false && !s.deleted && s.date < today && s.date >= addDays(today, -2) && campoShots(s).les > 0 && num(s.campo.pn) === null).sort(byDate).slice(-1) : [];
  /* ¿Llegó al 100 %? Una respuesta y la escalera y el camino se actualizan */
  const les = st.side === 'i' ? 'izquierda' : 'derecha';
  const maxQ = st.injuryActive && st.kick.level < 7 ? st.sessions.filter(s => campoLive(s) && s.campo.side && !s.kick && s.date >= addDays(today, -7) && s.date <= today && campoRank(campoShots(s).lesBand) >= 1 && campoMaxLes(s) === null && !((num(s.campo.pd) || 0) >= 3) && !((num(s.campo.pn) || 0) >= 3)).sort(byDate).slice(-1) : [];
  const maxCards = maxQ.map(s => { const top = campoKickLevel(Object.assign({}, s, { campo: Object.assign({}, s.campo, { max: { der: true, izq: true } }) })); return '<section class="card t-blue tight"><div class="stack-sm"><div class="micro">Golpeo</div><div class="h3">¿Llegaste a patear al 100 % con la ' + les + ' en la cancha del ' + DOW_LONG[weekday(s.date)] + '?</div>' +
    '<div class="grid2"><button class="btn lime" data-act="cl-max" data-id="' + esc(s.id) + '" data-v="1">Sí, al 100 %</button><button class="btn" data-act="cl-max" data-id="' + esc(s.id) + '" data-v="0">No, menos</button></div>' +
    '<p class="sub">Sin dolor al día siguiente, tu golpeo pasa a ' + KICK[top].n + ' y el camino se acorta.</p></div></section>'; }).join('');
  return maxCards + free.map(s => '<section class="card t-pain tight"><div class="stack-sm"><div class="micro">Dolor al día siguiente</div><div class="h3">¿Cómo amaneció el recto femoral tras la cancha del ' + DOW_LONG[weekday(s.date)] + '?</div>' +
    scaleHtml('pn', null, { pain: true, act: 'pn', data: ' data-id="' + esc(s.id) + '"', l: '0 nada', r: '≥ 3: nada intenso hoy' }) + '<p class="sub">Golpes fuertes ' + esc(campoLine(s).replace(/^golpes fuertes /, '')) + '. Marca dolor, no cansancio: una pierna cargada sin dolor es 0. Sin dolor, cuenta para tu nivel de golpeo; con 3 o más, hoy sin cancha para el recto femoral.</p></div></section>').join('') + list.map(s => {
    const k = s.kick || s.spr, lvl = s.kick ? KICK[k.level].n : SPRINT[k.level].n;
    return '<section class="card t-pain tight"><div class="stack-sm"><div class="micro">Dolor al día siguiente</div><div class="h3">¿Cómo amaneció el recto femoral tras ' + (s.kick ? 'el golpeo ' : 'el sprint ') + lvl + ' del ' + DOW_LONG[weekday(s.date)] + '?</div>' +
      scaleHtml('pn', null, { pain: true, act: 'pn', data: ' data-id="' + esc(s.id) + '"', l: '0 nada', r: '≥ 3 baja de nivel' }) + '<p class="sub">Esta respuesta decide si subes de nivel.</p></div></section>';
  }).join('');
}
/* ---------- Pendientes: lo que ya pasó y nadie registró ----------
   Entrenos y recuperación a los 30 min de su final. Lo de ayer se pide hasta el mediodía.
   Nada desaparece solo: queda en la figura de inicio hasta registrarlo o marcar «No la hice». */
const PEND_GRACE = { train: 30 };
const PEND_YESTERDAY_UNTIL = 12 * 60;
function blockSkipped(block, date) { return block.sessions.every(s => { const l = findLog(date, s.type); return !!l && l.done === false; }); }
function pendingFor(date, cutoff) {
  const ag = agendaFor(date), out = [];
  for (const it of ag.items) {
    if (it.marker || it.optional) continue;
    if (it.kind === 'train' || it.kind === 'recup') {
      if (it.end + PEND_GRACE.train > cutoff) continue;
      const pend = it.block.sessions.filter(s => !findLog(date, s.type));
      if (pend.length) out.push({ date, it, kind: 'train', pend });
    }
  }
  return out;
}
/* Primero lo de hoy; lo de ayer después (hasta el mediodía, salvo que se descarte) */
function pendingItems(today, now) {
  if (!S.data.profile || !ST) return [];
  now = now === undefined ? nowMin() : now;
  const yd = addDays(today, -1);
  const y = now < PEND_YESTERDAY_UNTIL && pendDismissed() !== yd ? pendingFor(yd, 1e9) : [];
  return pendingFor(today, now).concat(y);
}
function pendDismissed() { try { return localStorage.getItem('improve:pend-ayer') || ''; } catch (e) { return ''; } }
function pendDismissYesterday() { try { localStorage.setItem('improve:pend-ayer', addDays(todayStr(), -1)); } catch (e) { /* sin almacenamiento */ } closeAllSheets(); scheduleRender(); toast('Lo de ayer ya no se pide.', 'info'); }
function pendTitle(p) { return p.it.title + ' · ' + p.it.block.short; }
function pendQuestion(p) { return '¿Hiciste ' + p.it.title.toLowerCase() + ' · ' + p.it.block.short + '?'; }
function pendWhen(p, today, now) {
  if (p.date !== today) return 'Ayer · ' + fmtHM(p.it.start);
  const m = Math.max(0, now - p.it.start);
  return fmtHM(p.it.start) + (m < 60 ? ' · hace ' + m + ' min' : m < 10 * 60 ? ' · hace ' + Math.floor(m / 60) + ' h' : '');
}
/* Acción rápida de cada pendiente: hecha tal cual */
function pendQuickBtn(p, cls) {
  return '<button class="btn sm ' + cls + '" data-act="block-done" data-date="' + p.date + '" data-key="' + p.it.key + '">' + ic('check', 'ok') + 'Tal cual</button>';
}
function pendRowHtml(p, today, now) {
  return '<div class="pend-row"><button class="pend-main" data-act="pend-opts" data-date="' + p.date + '" data-key="' + p.it.key + '" aria-label="' + esc(pendTitle(p) + ', ' + pendWhen(p, today, now) + ', más opciones') + '">' +
    '<span class="grow"><span class="t">' + esc(pendTitle(p)) + '</span><span class="s">' + esc(pendWhen(p, today, now)) + '</span></span></button>' +
    pendQuickBtn(p, 'pend-ok') + '</div>';
}
const PEND_MAX_IN_HERO = 3;
function pendingPanel(pend, today, now, noHead) {
  if (!pend.length) return '';
  const shown = pend.slice(0, PEND_MAX_IN_HERO);
  return '<div class="pend" role="group" aria-label="Sin registrar">' + (noHead ? '' : '<div class="pend-h"><span class="dot"></span>Sin registrar · ' + pend.length + '</div>') +
    shown.map(p => pendRowHtml(p, today, now)).join('') +
    (pend.length > shown.length ? '<button class="linkbtn pend-more" data-act="pend-all">Ver los ' + pend.length + ' pendientes' + ic('chev') + '</button>' : '') + '</div>';
}
/* Figura de inicio cuando lo único que queda son pendientes */
function pendingHero(pend, today, now) {
  if (pend.length === 1) {
    const p = pend[0];
    return '<section class="hero k-pend"><span class="tag"><span class="d"></span>Sin registrar · ' + esc(pendWhen(p, today, now)) + '</span><div class="t">' + esc(pendQuestion(p)) + '</div>' +
      '<div class="cta">' + pendQuickBtn(p, 'lime lg').replace('btn sm', 'btn') + '<button class="btn lg" data-act="pend-opts" data-date="' + p.date + '" data-key="' + p.it.key + '">' + ic('dots') + 'Otras opciones</button></div></section>';
  }
  return '<section class="hero k-pend"><span class="tag"><span class="d"></span>Sin registrar</span><div class="t">Te faltan ' + pend.length + ' registros</div>' + pendingPanel(pend, today, now, true) + '</section>';
}
/* Número de pendientes en la pestaña Hoy */
function markNavBadge() {
  const a = $('#nav a[data-nav="hoy"]'); if (!a) return;
  const n = pendingItems(todayStr()).length;
  let b = a.querySelector('.badge');
  if (!n) { if (b) b.remove(); a.setAttribute('aria-label', 'Hoy'); return; }
  if (!b) { b = document.createElement('i'); b.className = 'badge'; b.setAttribute('aria-hidden', 'true'); a.appendChild(b); }
  b.textContent = n > 9 ? '9+' : String(n);
  a.setAttribute('aria-label', 'Hoy, ' + plural(n, 'registro pendiente', 'registros pendientes'));
}
function openPendAll() { openSheet({ id: 'pend-all', render: pendAllHtml }); }
function pendAllHtml() {
  const today = todayStr(), now = nowMin(), pend = pendingItems(today, now);
  let h = sheetHead('Sin registrar', pend.length ? plural(pend.length, 'pendiente', 'pendientes') : 'Todo al día') + '<div class="sheet-body">';
  if (!pend.length) return h + note('good', 'No queda nada por registrar.') + '<button class="btn block" data-act="close">Listo</button></div>';
  const yN = pend.filter(p => p.date !== today).length;
  return h + '<div class="pend in-sheet">' + pend.map(p => pendRowHtml(p, today, now)).join('') + '</div>' +
    (yN ? '<button class="btn sm ghost block" data-act="pend-dismiss">' + ic('x') + 'No registrar lo de ayer (' + yN + ')</button>' : '') + '</div>';
}
function readinessCard(ci, adv) {
  if (!ci) return '<button class="ready-cta" data-act="checkin">' + ic('sunrise') + '<span class="grow"><span class="t">¿Cómo amaneciste?</span></span>' + ic('chev') + '</button>';
  const sc = adv.score, tone = readinessTone(sc), grad = tone === 'lime' ? 'lg-lime' : tone === 'load' ? 'lg-load' : 'lg-blue';
  const pain = num(ci.rfPain), sleepH = num(ci.sleepH);
  const ds = dayStatus(ST, todayStr());
  const label = ds.baseline && ds.baseline.low && sc >= 50 ? 'Bajo para ti' : sc >= 70 ? 'Listo para cargar' : sc >= 50 ? 'Estado normal' : 'Estado bajo';
  return '<button class="ready-sum ed rule" data-act="checkin"><span class="ed-head"><span class="kicker">Estado de hoy</span>' + ic('chev') + '</span>' +
    '<span class="ready-big"><span class="n c-' + (tone || 'blue') + '">' + sc + '</span><span class="grow"><span class="t">' + label + '</span><span class="s">' +
    'Sueño <b class="c-sleep">' + (sleepH === null ? '—' : fmtNum(Math.round(sleepH * 10) / 10) + ' h') + '</b> · Energía <b>' + (num(ci.fatigue) === null ? '—' : ci.fatigue + '/5') + '</b> · Dolor RF <b class="' + (pain >= 3 ? 'c-pain' : pain >= 1 ? 'c-load' : 'c-lime') + '">' + (pain === null ? '—' : pain + '/10') + '</b></span></span></span>' +
    statusLine(ds) +
    (adv.items.length ? '<span class="stack-sm">' + adv.items.map(a => note(a.level === 'critical' ? 'pain' : 'warn', esc(a.text))).join('') + '</span>' : '') + '</button>';
}
/* Estado del día en una línea: verde (plan completo), ámbar (con ajustes) o rojo (nada intenso). Rojo solo si hay dolor. */
function statusLine(ds) {
  if (!ds) return '';
  const pain = ds.reasons.some(r => /dolor/.test(r) && !/muscular/.test(r));
  const tone = ds.level === 'verde' ? 'lime' : ds.level === 'rojo' && pain ? 'pain' : 'load';
  const head = ds.level === 'verde' ? 'Plan completo' : ds.level === 'rojo' ? 'Nada intenso' : 'Con ajustes';
  const base = ds.baseline ? ' · tu media ' + ds.baseline.mean : '';
  return '<span class="row nowrap">' + chip(head, tone) + '<span class="sub">' + esc(ds.reasons.length ? capFirst(ds.reasons.slice(0, 3).join(' · ')) : 'Sin alertas' + base) + '</span></span>';
}
function weekStrip(today, sel) {
  const days = weekPlan(weekStartOf(today));
  return '<div class="week" role="tablist" aria-label="Días de la semana">' + days.map(d => {
    const logs = logsFor(d.date), done = logs.some(l => l.done !== false);
    const planned = d.sessions.some(s => s.type !== 'descanso');
    const miss = d.past && !done && planned;
    const dots = (done ? '<i class="dot done"></i>' : planned && !d.past ? '<i class="dot plan"></i>' : '') + (d.intense ? '<i class="dot int"></i>' : '') + (miss ? '<i class="dot miss"></i>' : '');
    return '<button type="button" role="tab" aria-selected="' + (d.date === sel) + '" class="wd' + (d.date === today ? ' today' : d.past ? ' past' : '') + (d.date === sel && sel !== today ? ' sel' : '') + '" data-act="hoy-day" data-date="' + d.date + '" aria-label="' + esc(capFirst(fmtDateLong(d.date))) + '">' + DOW1[weekday(d.date)] + '<b>' + parseYmd(d.date).getDate() + '</b><span class="dots">' + dots + '</span></button>';
  }).join('') + '</div>';
}
function blockDone(block, date) {
  const logs = block.sessions.map(s => findLog(date, s.type));
  return { all: logs.every(Boolean), some: logs.some(Boolean), logs };
}
function nextHero(day, ag, today) {
  const now = nowMin(), pend = pendingItems(today, now), panel = pendingPanel(pend, today, now);
  const cand = ag.items.filter(x => !x.marker && x.kind !== 'nap' && x.end > now - 30);
  const nx = cand.find(it => (it.kind === 'train' || it.kind === 'recup') && !blockDone(it.block, today).all) || null;
  if (!nx) {
    if (pend.length) return pendingHero(pend, today, now);
    const trainings = ag.items.filter(x => x.kind === 'train' || x.kind === 'recup');
    const allDone = trainings.length && trainings.every(t => blockDone(t.block, today).all);
    if (!trainings.length) return '<section class="hero k-rest">' + photoImg('f4') + '<span class="tag"><span class="d rest"></span>Hoy · descanso</span><div class="t">Recupera</div><div class="meta"><span>' + ic('moon') + 'Sueño de 9 h o más</span><span>' + ic('leaf') + 'Paseo y movilidad suave</span></div><div class="cta"><button class="btn primary" data-act="guide" data-g="respiracion">' + ic('wind') + 'Respiración 5 min</button></div></section>';
    return '<section class="hero k-done"><span class="tag"><span class="d done"></span>Hoy</span><div class="t">' + (allDone ? 'Día completo' : 'Sin pendientes ahora') + '</div><div class="meta"><span>' + ic('check') + plural(logsFor(today).filter(l => l.done !== false).length, 'sesión registrada', 'sesiones registradas') + '</span></div><div class="cta"><button class="btn" data-act="day" data-date="' + today + '">Revisar el día' + ic('chev') + '</button></div></section>';
  }
  const when = now >= nx.start && now < nx.end ? 'Ahora' : now >= nx.end ? 'Pendiente' : 'Siguiente';
  const t = fmtHM(nx.start) + '–' + fmtHM(nx.end);
  const b = nx.block, main = b.sessions.find(s => STRENGTH_TYPES.includes(s.type)) || b.sessions.find(s => s.intense) || b.sessions[0];
  const dn = blockDone(b, today);
  const steps = b.sessions.reduce((a, s) => a + s.items.length + (s.field ? 1 : 0), 0);
  return '<section class="hero' + (b.key === 'campo' ? ' k-campo' : '') + '">' + photoImg(PHOTO_BY_TYPE[main.type] || 'f3') +
    '<span class="tag"><span class="d' + (b.intense ? ' load' : '') + '"></span>' + when + ' · ' + t + (b.intense ? ' · intenso' : '') + '</span>' +
    '<div class="t' + ((nx.title + b.short).length > 18 ? ' long' : '') + '">' + esc(nx.title) + ' · ' + esc(b.short) + '</div>' +
    '<div class="meta"><span>' + ic('clock') + '≈ ' + fmtDur(nx.dur) + '</span><span>' + ic('layers') + plural(steps, 'paso', 'pasos') + '</span>' + (dn.some ? '<span>' + ic('check') + 'En parte hecho</span>' : '') + '</div>' +
    '<div class="cta"><button class="btn primary lg" data-act="start-block" data-date="' + today + '" data-key="' + b.key + '">' + ic('play') + (dn.some ? 'Seguir' : 'Empezar') + '</button><button class="btn lg sq" data-act="ag-open" data-date="' + today + '" data-key="' + nx.key + '" aria-label="Ver detalle">' + ic('list') + '</button></div>' + panel + '</section>';
}
function dayHero(day, date, today) {
  const past = date < today, blocks = dayBlocks(day);
  const logs = logsFor(date).filter(l => l.done !== false);
  const main = day.sessions.find(s => STRENGTH_TYPES.includes(s.type)) || day.sessions.find(s => s.intense) || day.sessions[0];
  const label = capFirst(fmtDateLong(date));
  if (!blocks.length) return '<section class="hero k-rest">' + photoImg('f4') + '<span class="tag"><span class="d rest"></span>' + label + '</span><div class="t">Descanso</div><div class="cta"><button class="btn" data-act="day" data-date="' + date + '">Ver el día' + ic('chev') + '</button></div></section>';
  return '<section class="hero' + (past && logs.length ? ' k-done' : '') + '">' + (past && logs.length ? '' : photoImg(PHOTO_BY_TYPE[main && main.type] || 'f3')) +
    '<span class="tag"><span class="d' + (day.intense ? ' load' : past && logs.length ? ' done' : '') + '"></span>' + label + (day.projectedPhase ? ' · ' + PHASES[day.phase].n + ' previsto' : '') + '</span>' +
    '<div class="t' + (dayTitle(day).length > 18 ? ' long' : '') + '">' + esc(dayTitle(day)) + '</div><div class="meta"><span>' + ic('clock') + '≈ ' + fmtDur(blocks.reduce((a, b) => a + b.est, 0)) + '</span>' + (past ? '<span>' + ic('check') + plural(logs.length, 'registrada', 'registradas') + '</span>' : '') + '</div>' +
    '<div class="cta"><button class="btn ' + (past ? '' : 'primary') + '" data-act="day" data-date="' + date + '">' + (past ? 'Revisar el día' : 'Plan del día') + ic('chev') + '</button>' + (date === today ? '' : '<button class="btn auto" data-act="hoy-day" data-date="' + today + '">Hoy</button>') + '</div></section>';
}

/* ---------- Agenda ---------- */
function agendaCard(ag, day, date, today) {
  const moved = ag.items.some(x => x.moved);
  const trainMin = ag.items.filter(x => x.kind === 'train').reduce((a, x) => a + x.dur, 0);
  let h = '<section class="ed rule agenda" aria-label="Agenda del día"><div class="ed-head"><span class="kicker">' + (date === today ? 'Tu día' : esc(fmtDateLong(date))) + '</span>' +
    (moved ? '<button class="linkbtn" data-act="ag-reset" data-date="' + date + '">' + ic('undo') + 'Sugerido</button>' : trainMin ? '<span class="meta">' + fmtDur(trainMin) + ' de entreno</span>' : '') + '</div><div class="stack">';
  if (ag.warnings.length) h += '<div class="tl-warns">' + ag.warnings.slice(0, 3).map(w => note('warn', esc(w.text))).join('') + '</div>';
  h += timelineHtml(ag, date, today);
  return h + '</div></section>';
}
function layoutAgenda(ag) {
  const r0 = ag.range[0];
  const out = [];
  let bottom = -1e9;
  for (const it of ag.items) {
    if (it.marker) { out.push({ it, top: (it.start - r0) * PX_MIN }); continue; }
    let top = (it.start - r0) * PX_MIN;
    const hgt = Math.max(MIN_BLK, it.dur * PX_MIN);
    if (top < bottom + 4) top = bottom + 4;
    bottom = top + hgt;
    out.push({ it, top, hgt });
  }
  return out;
}
function timelineHtml(ag, date, today) {
  const [r0, r1] = ag.range;
  const lay = layoutAgenda(ag);
  const maxBottom = Math.max((r1 - r0) * PX_MIN, ...lay.map(l => l.top + (l.hgt || 0)));
  let h = '<div class="tl" id="tl" data-date="' + date + '" data-r0="' + r0 + '" style="height:' + Math.round(maxBottom + 16) + 'px">';
  for (let m = Math.ceil(r0 / 30) * 30; m <= r1; m += 30) {
    const y = (m - r0) * PX_MIN;
    h += '<div class="tl-h' + (m % 60 ? ' half' : '') + '" style="top:' + y + 'px">' + (m % 60 ? '' : '<span>' + fmtHM(m) + '</span>') + '</div>';
  }
  const warnKeys = new Set(ag.warnings.map(w => w.key));
  const now = date === today ? nowMin() : null;
  for (const l of lay) {
    const it = l.it;
    if (it.marker) {
      h += '<div class="tl-mark ' + it.kind + '" style="top:' + l.top + 'px"><span class="pill-m ' + it.kind + '">' + ic(it.kind === 'wake' ? 'sunrise' : 'moon') + '<span class="num">' + fmtHM(it.start) + '</span> ' + esc(it.title) +
        '<span class="grip" data-drag="' + it.key + '" data-date="' + date + '" role="button" aria-label="Mover ' + esc(it.title) + '">' + ic('grip') + '</span></span></div>';
      continue;
    }
    let done = false, skipped = false, sub = it.sub || '';
    if (it.kind === 'train' || it.kind === 'recup') { const d = blockDone(it.block, date); done = d.all; skipped = done && blockSkipped(it.block, date); sub = skipped ? 'No la hiciste' : it.block.short + (d.some && !d.all ? ' · en parte' : ''); if (skipped) done = false; }
    /* Tres alturas: una línea (< 50 px), dos líneas con la hora al lado del título (< 68 px) y la completa.
       Antes, entre 54 y 67 px (≈ 45-53 min) las tres líneas no entraban y el título quedaba cortado. */
    const compact = l.hgt < TL_TWO_LINES, mid = !compact && l.hgt < TL_THREE_LINES, short = compact || mid;
    const isNow = now !== null && now >= it.start && now < it.end;
    const late = now !== null && !done && !skipped && !it.optional && !it.marker && it.kind !== 'nap' && now > it.end + PEND_GRACE.train;
    if (late) sub = 'Sin registrar' + (sub ? ' · ' + sub : '');
    const cls = 'tl-blk k-' + it.kind + (it.intense ? ' int' : '') + (it.optional ? ' optional' : '') + (done ? ' done' : '') + (skipped ? ' skipped' : '') + (late ? ' late' : '') + (warnKeys.has(it.key) ? ' warn' : '') + (compact ? ' compact' : mid ? ' mid' : '') + (isNow ? ' now-on' : '');
    h += '<div class="' + cls + '" data-key="' + it.key + '" style="top:' + l.top + 'px;height:' + l.hgt + 'px">' +
      '<button class="main" data-act="ag-open" data-date="' + date + '" data-key="' + it.key + '" aria-label="' + esc(it.title + ', ' + fmtHM(it.start) + ' a ' + fmtHM(it.end) + (sub ? ', ' + sub : '') + (done ? ', hecho' : '')) + '"><span class="tm">' + fmtHM(it.start) + (short ? '' : '–' + fmtHM(it.end)) + '</span><span class="ti">' + esc(it.title) + (compact && sub ? '<span class="su-in"> · ' + esc(sub) + '</span>' : '') + '</span>' + (sub && !compact ? '<span class="su">' + esc(sub) + '</span>' : '') + '</button>' +
      '<div class="side">' + (done ? '<span class="ok" aria-label="Hecho">' + ic('check') + '</span>' : skipped ? '<span class="ok skip" aria-label="No hecho">' + ic('x') + '</span>' : '') + (it.movable ? '<span class="grip" data-drag="' + it.key + '" data-date="' + date + '" role="button" tabindex="0" aria-label="Mover ' + esc(it.title) + '">' + ic('grip') + '</span>' : '') + '</div></div>';
  }
  if (now !== null && now >= r0 && now <= r1) h += '<div class="tl-now" style="top:' + ((now - r0) * PX_MIN) + 'px"><span>' + fmtHM(now) + '</span></div>';
  return h + '</div>';
}

/* ---------- Arrastrar bloques de la agenda ---------- */
function dragStart(e, grip) {
  const key = grip.getAttribute('data-drag'), date = grip.getAttribute('data-date');
  const tl = $('#tl'); if (!tl) return;
  const ag = agendaFor(date), it = ag.items.find(x => x.key === key); if (!it) return;
  const el = grip.closest('.tl-blk') || grip.closest('.tl-mark');
  e.preventDefault();
  const r0 = Number(tl.getAttribute('data-r0'));
  const label = document.createElement('div'); label.className = 'tl-drag-time'; tl.appendChild(label);
  Object.assign(DRAG, { active: true, key, date, el, tl, it, r0, startY: e.clientY, scroll0: window.scrollY, startMin: it.start, cur: it.start, id: e.pointerId, label, lastY: e.clientY, moved: false, t0: Date.now() });
  try { grip.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
  el.classList.add('dragging');
  dragUpdate();
  DRAG.raf = requestAnimationFrame(dragAutoScroll);
}
function dragUpdate() {
  const dy = DRAG.lastY - DRAG.startY + (window.scrollY - DRAG.scroll0);
  const raw = DRAG.startMin + dy / PX_MIN;
  const bed = DRAG.it.key === 'sleep';
  const lo = bed ? BED_MIN : DRAG.r0 - 60, hi = bed ? BED_MAX : DRAG.r0 + 24 * 60;
  const v = clamp(Math.round(raw / 15) * 15, lo, hi - (DRAG.it.dur || 0));
  if (v !== DRAG.cur) { DRAG.cur = v; haptic(6); }
  if (Math.abs(dy) > 6) DRAG.moved = true;
  const top = (v - DRAG.r0) * PX_MIN;
  DRAG.el.style.top = top + 'px';
  DRAG.label.style.top = top + (DRAG.it.marker ? 0 : 16) + 'px';
  DRAG.label.textContent = fmtHM(v);
}
function dragAutoScroll() {
  if (!DRAG.active) return;
  const y = DRAG.lastY, edge = 90, bottomEdge = window.innerHeight - 120;
  let sp = 0;
  if (y < edge) sp = -Math.ceil((edge - y) / 6);
  else if (y > bottomEdge) sp = Math.ceil((y - bottomEdge) / 6);
  if (sp) { window.scrollBy(0, sp); dragUpdate(); }
  DRAG.raf = requestAnimationFrame(dragAutoScroll);
}
function dragEnd(cancel) {
  if (!DRAG.active) return;
  cancelAnimationFrame(DRAG.raf);
  const d = Object.assign({}, DRAG);
  DRAG.active = false;
  if (d.label && d.label.parentNode) d.label.parentNode.removeChild(d.label);
  d.el.classList.remove('dragging');
  if (cancel || !d.moved || d.cur === d.startMin) {
    d.el.style.top = '';
    if (!cancel && !d.moved && Date.now() - d.t0 < 400) openAgendaItem(d.date, d.key);
    scheduleRender(); return;
  }
  saveAgendaTime(d.date, d.key, d.cur, true);
}
function saveAgendaTime(date, key, start, fromDrag) {
  if (key === 'sleep') start = clampBed(start);
  const doc = clone(agendaDoc(date) || { date, items: {} });
  delete doc.id; doc.date = date; doc.items = doc.items || {};
  doc.items[key] = Object.assign({}, doc.items[key] || {}, { start });
  put('agenda', date, doc).then(() => {
    delete memo['ag:' + date];
    const ag = agendaFor(date);
    const w = ag.warnings.find(x => x.key === key) || ag.warnings.find(x => ag.items.find(i => i.key === key && x.text.includes(i.title)));
    const it = ag.items.find(x => x.key === key);
    toast(w ? w.text : (it ? it.title : 'Bloque') + ' a las ' + fmtHM(start) + '.', w ? 'warn' : 'ok', { label: 'Deshacer', act: 'ag-undo', data: { date, key } });
  });
  if (fromDrag) haptic(14);
}
document.addEventListener('pointerdown', (e) => { const g = e.target.closest && e.target.closest('[data-drag]'); if (g && e.button === 0) dragStart(e, g); });
document.addEventListener('pointermove', (e) => { if (DRAG.active && e.pointerId === DRAG.id) { DRAG.lastY = e.clientY; dragUpdate(); } }, { passive: true });
document.addEventListener('pointerup', (e) => { if (DRAG.active && e.pointerId === DRAG.id) dragEnd(false); });
document.addEventListener('pointercancel', (e) => { if (DRAG.active && e.pointerId === DRAG.id) dragEnd(true); });
document.addEventListener('keydown', (e) => {
  const g = document.activeElement && document.activeElement.closest && document.activeElement.closest('[data-drag]');
  if (!g || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
  e.preventDefault();
  const date = g.getAttribute('data-date'), key = g.getAttribute('data-drag'), it = agendaFor(date).items.find(x => x.key === key);
  if (it) saveAgendaTime(date, key, it.start + (e.key === 'ArrowUp' ? -15 : 15));
});
