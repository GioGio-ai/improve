/* ============================================================
   HOY: estado, semana, siguiente bloque y agenda del día (arrastrable)
   ============================================================ */
const PX_MIN = 1.25;
const MIN_BLK = 46;
const DRAG = { active: false };

function viewHoy(st, today) {
  if (!S.data.profile) return onboarding();
  const prof = st.profile, date = UI.hoyDate && UI.hoyDate >= addDays(weekStartOf(today), -7) ? UI.hoyDate : today;
  const isToday = date === today;
  const day = dayPlan(date), ag = agendaFor(date);
  const ci = checkinFor(today), adv = readinessAdvice(ci);
  const d = parseYmd(today);
  let h = '<header class="topbar"><div class="grow"><div class="eyebrow">' + capFirst(DOW_LONG[weekday(today)]) + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</div><h1 class="h1">Hola, ' + esc((prof.name || 'atleta').split(' ')[0]) + '</h1></div>' +
    '<a class="iconbtn glow" href="#coach" aria-label="Coach con IA">' + ic('spark') + '</a><a class="avatar" href="#perfil" aria-label="Perfil">' + avatarImg() + '</a></header>';
  h += statusChips(st, today);
  h += trainingBanner();
  h += pendingPainPrompts(st, today);
  h += readinessCard(ci, adv);
  h += weekStrip(today, date);
  h += isToday ? nextHero(day, ag, today) : dayHero(day, date, today);
  const notes = (day.notes || []).filter(Boolean);
  if (notes.length) h += '<div class="stack-sm">' + notes.map(n => note(/Dolor|Estado/.test(n) ? 'warn' : /Previsto/.test(n) ? 'blue' : 'info', esc(n))).join('') + '</div>';
  h += agendaCard(ag, day, date, today);
  h += nutritionStrip(date, ag);
  return h;
}
function onboarding() {
  return '<header class="topbar"><div class="grow"><div class="brand"><span class="mk"><i></i></span>IMPROVE</div></div></header>' +
    '<section class="card t-blue"><div class="stack"><div class="h2">Completa tu perfil</div><p class="body">Con tus datos, tu lesión y tu objetivo el motor arma la semana, el horario y la comida.</p><button class="btn primary" data-act="edit-profile">Completar perfil</button></div></section>';
}
function statusChips(st, today) {
  const prof = st.profile, chips = [];
  if (st.injury && st.phase <= 5) chips.push('<a class="chip blue" href="#progreso">' + PHASES[st.phase].n + ' · ' + esc(PHASES[st.phase].t) + '</a>');
  const goal = prof.targetDate;
  if (goal) { const left = diffDays(goal, today); if (left >= 0) chips.push('<a class="chip ' + (left <= 7 ? 'lime' : '') + '" href="#progreso">' + ic('target') + (left === 0 ? 'Objetivo hoy' : 'Listo en ' + plural(left, 'día', 'días')) + '</a>'); }
  const kind = agendaFor(today).kind;
  chips.push('<span class="chip ' + (kind === 'alto' || kind === 'prueba' ? 'load' : kind === 'descanso' ? 'sleep' : '') + '">' + ic(kind === 'descanso' ? 'moon' : 'flame') + esc(KIND_N[kind] || '') + '</span>');
  return '<div class="scroll-x">' + chips.join('') + '</div>';
}
function trainingBanner() {
  const dr = loadDraft();
  if (!dr || TR.open) return outboxBanner();
  return '<div class="banner live" role="group" aria-label="Entrenamiento abierto">' + ic('play') + '<div class="grow"><div class="h3">Entrenamiento abierto · todo guardado</div><div class="sub" style="color:var(--blue-ink)">' + esc(dr.title) + '</div><div class="sub">' + esc(draftProgressText(dr)) + '</div></div>' +
    '<div class="bacts"><button class="btn white" data-act="tr-resume">' + ic('play') + 'Retomar</button><button class="btn glass" data-act="tr-save-draft">' + ic('check') + 'Terminar</button></div></div>' + outboxBanner();
}
function pendingPainPrompts(st, today) {
  const list = st.sessions.filter(s => s.done !== false && s.date < today && s.date >= addDays(today, -3) && ((s.type === 'golpeo' && s.kick) || (s.type === 'sprint' && s.spr)))
    .filter(s => { const k = s.kick || s.spr; return k.pn === null || k.pn === undefined; }).sort(byDate).slice(-2);
  return list.map(s => {
    const k = s.kick || s.spr, lvl = s.kick ? KICK[k.level].n : SPRINT[k.level].n;
    return '<section class="card t-pain tight"><div class="stack-sm"><div class="micro" style="color:var(--red-ink)">Dolor al día siguiente</div><div class="h3">¿Cómo amaneció el recto femoral tras ' + (s.kick ? 'el golpeo ' : 'el sprint ') + lvl + ' del ' + DOW_LONG[weekday(s.date)] + '?</div>' +
      scaleHtml('pn', null, { pain: true, act: 'pn', data: ' data-id="' + esc(s.id) + '"', l: '0 nada', r: '≥ 3 baja de nivel' }) + '<p class="sub">Esta respuesta decide si subes de nivel.</p></div></section>';
  }).join('');
}
function readinessCard(ci, adv) {
  if (!ci) return '<button class="card t-blue tight" data-act="checkin" style="text-align:left;width:100%"><div class="row nowrap"><div class="tile c" style="width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--blue-soft);color:var(--blue-ink)">' + ic('sunrise') + '</div><div class="grow"><div class="h3">¿Cómo amaneciste?</div><div class="sub">Sueño, energía y dolor · 30 s. Ajusta el plan de hoy.</div></div>' + ic('chev') + '</div></button>';
  const sc = adv.score, tone = readinessTone(sc), grad = tone === 'lime' ? 'lg-lime' : tone === 'load' ? 'lg-load' : 'lg-blue';
  const pain = num(ci.rfPain), sleepH = num(ci.sleepH);
  const label = sc >= 70 ? 'Listo para cargar' : sc >= 50 ? 'Estado normal' : 'Estado bajo';
  return '<button class="card tight ' + (tone === 'lime' ? 't-lime' : tone === 'load' ? 't-load' : 't-blue') + '" data-act="checkin" style="text-align:left;width:100%"><div class="ready">' + ring(sc / 100, 76, 8, grad, sc, '') +
    '<div class="stack-sm"><div class="row between nowrap"><div class="h3">' + label + '</div><span class="sub">Editar</span></div><div class="vals">' +
    '<div class="s"><b class="c-sleep">' + (sleepH === null ? '—' : fmtNum(sleepH)) + '<small style="font-size:11px"> h</small></b><span>Sueño</span></div>' +
    '<div class="s"><b>' + (num(ci.fatigue) === null ? '—' : ci.fatigue + '/5') + '</b><span>Energía</span></div>' +
    '<div class="s"><b class="' + (pain >= 3 ? 'c-pain' : pain >= 1 ? 'c-load' : 'c-lime') + '">' + (pain === null ? '—' : pain) + '<small style="font-size:11px">/10</small></b><span>Dolor RF</span></div></div></div></div>' +
    (adv.items.length ? '<div style="margin-top:12px" class="stack-sm">' + adv.items.map(a => note(a.level === 'critical' ? 'pain' : 'warn', esc(a.text))).join('') + '</div>' : '') + '</button>';
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
function mealDone(slot, date) { return mealsFor(date).filter(m => m.slot === slot); }
function nextHero(day, ag, today) {
  const now = nowMin();
  const cand = ag.items.filter(x => !x.marker && x.kind !== 'nap' && x.end > now - 30);
  const nTrain = cand.find(it => (it.kind === 'train' || it.kind === 'recup') && !blockDone(it.block, today).all) || null;
  const nMeal = cand.find(it => it.kind === 'meal' && !it.optional && !mealDone(it.slot, today).length && it.end > now - 15) || null;
  let nx = null, side = null;
  if (nTrain && nMeal) {
    if (nTrain.start - now <= 90 || nTrain.start <= nMeal.start) { nx = nTrain; side = nMeal; } else { nx = nMeal; side = nTrain; }
  } else nx = nTrain || nMeal;
  if (!nx) {
    const trainings = ag.items.filter(x => x.kind === 'train' || x.kind === 'recup');
    const allDone = trainings.length && trainings.every(t => blockDone(t.block, today).all);
    if (!trainings.length) return '<section class="hero k-rest">' + photoImg('f4') + '<span class="tag"><span class="d rest"></span>Hoy · descanso</span><div class="t">Recupera</div><div class="meta"><span>' + ic('moon') + 'Sueño de 9 h o más</span><span>' + ic('leaf') + 'Paseo y movilidad suave</span></div><div class="cta"><button class="btn white" data-act="guide" data-g="respiracion">' + ic('wind') + 'Respiración 5 min</button></div></section>';
    return '<section class="hero k-done"><span class="tag"><span class="d done"></span>Hoy</span><div class="t">' + (allDone ? 'Día completo' : 'Sin pendientes ahora') + '</div><div class="meta"><span>' + ic('check') + plural(logsFor(today).filter(l => l.done !== false).length, 'sesión registrada', 'sesiones registradas') + '</span></div><div class="cta"><button class="btn white" data-act="day" data-date="' + today + '">Revisar el día' + ic('chev') + '</button></div></section>';
  }
  const when = now >= nx.start && now < nx.end ? 'Ahora' : now >= nx.end ? 'Pendiente' : 'Siguiente';
  const sideRow = side && side.kind === 'meal' ? '<button class="banner" style="background:linear-gradient(135deg,rgba(47,214,181,.24),rgba(47,214,181,.06));border-color:var(--teal-line)" data-act="ag-open" data-date="' + today + '" data-key="' + side.key + '">' + ic('fork') + '<div class="grow"><div class="h3">' + esc(side.title) + ' · ' + fmtHM(side.start) + '</div><div class="sub">' + (now >= side.end ? 'Pendiente de registrar' : esc(mealMenuFor(today, side).name)) + '</div></div>' + ic('chev') + '</button>' : '';
  const t = fmtHM(nx.start) + '–' + fmtHM(nx.end);
  if (nx.kind === 'meal') {
    const menu = mealMenuFor(today, nx);
    return '<section class="hero" style="background:linear-gradient(160deg,#159c84 0%,#0d5a52 50%,#062421 100%)"><span class="tag"><span class="d" style="background:var(--teal)"></span>' + when + ' · ' + t + '</span><div class="t">' + esc(nx.title) + '</div>' +
      '<div class="meta"><span>' + esc(menu.name) + '</span><span class="num">' + menu.totals.p + ' g prot · ' + menu.totals.c + ' g carb</span></div>' +
      '<div class="cta"><button class="btn white" data-act="ag-open" data-date="' + today + '" data-key="' + nx.key + '">' + ic('camera') + 'Registrar</button><button class="btn glass" data-act="meal-ate" data-date="' + today + '" data-key="' + nx.key + '">' + ic('check') + 'Comí esto</button></div></section>';
  }
  const b = nx.block, main = b.sessions.find(s => STRENGTH_TYPES.includes(s.type)) || b.sessions.find(s => s.intense) || b.sessions[0];
  const dn = blockDone(b, today);
  const steps = b.sessions.reduce((a, s) => a + s.items.length + (s.field ? 1 : 0), 0);
  return '<section class="hero' + (b.key === 'campo' ? ' k-campo' : '') + '">' + photoImg(PHOTO_BY_TYPE[main.type] || 'f3') +
    '<span class="tag"><span class="d' + (b.intense ? ' load' : '') + '"></span>' + when + ' · ' + t + (b.intense ? ' · intenso' : '') + '</span>' +
    '<div class="t">' + esc(nx.title) + ' · ' + esc(b.short) + '</div>' +
    '<div class="meta"><span>' + ic('clock') + '≈ ' + fmtDur(nx.dur) + '</span><span>' + ic('layers') + plural(steps, 'paso', 'pasos') + '</span>' + (dn.some ? '<span>' + ic('check') + 'En parte hecho</span>' : '') + '</div>' +
    '<div class="cta"><button class="btn white lg" data-act="start-block" data-date="' + today + '" data-key="' + b.key + '">' + ic('play') + (dn.some ? 'Seguir' : 'Empezar') + '</button><button class="btn glass lg" data-act="ag-open" data-date="' + today + '" data-key="' + nx.key + '" aria-label="Ver detalle">' + ic('list') + '</button></div></section>' + sideRow;
}
function dayHero(day, date, today) {
  const past = date < today, blocks = dayBlocks(day);
  const logs = logsFor(date).filter(l => l.done !== false);
  const main = day.sessions.find(s => STRENGTH_TYPES.includes(s.type)) || day.sessions.find(s => s.intense) || day.sessions[0];
  const label = capFirst(fmtDateLong(date));
  if (!blocks.length) return '<section class="hero k-rest">' + photoImg('f4') + '<span class="tag"><span class="d rest"></span>' + label + '</span><div class="t">Descanso</div><div class="cta"><button class="btn white" data-act="day" data-date="' + date + '">Ver el día' + ic('chev') + '</button></div></section>';
  return '<section class="hero' + (past && logs.length ? ' k-done' : '') + '">' + (past && logs.length ? '' : photoImg(PHOTO_BY_TYPE[main && main.type] || 'f3')) +
    '<span class="tag"><span class="d' + (day.intense ? ' load' : past && logs.length ? ' done' : '') + '"></span>' + label + (day.projectedPhase ? ' · ' + PHASES[day.phase].n + ' previsto' : '') + '</span>' +
    '<div class="t">' + esc(dayTitle(day)) + '</div><div class="meta"><span>' + ic('clock') + '≈ ' + fmtDur(blocks.reduce((a, b) => a + b.est, 0)) + '</span>' + (past ? '<span>' + ic('check') + plural(logs.length, 'registrada', 'registradas') + '</span>' : '') + '</div>' +
    '<div class="cta"><button class="btn white" data-act="day" data-date="' + date + '">' + (past ? 'Revisar el día' : 'Plan del día') + ic('chev') + '</button>' + (date === today ? '' : '<button class="btn glass" data-act="hoy-day" data-date="' + today + '">Hoy</button>') + '</div></section>';
}

/* ---------- Agenda ---------- */
function agendaCard(ag, day, date, today) {
  const moved = ag.items.some(x => x.moved);
  const trainMin = ag.items.filter(x => x.kind === 'train').reduce((a, x) => a + x.dur, 0);
  let h = '<section class="card" aria-label="Agenda del día"><div class="stack"><div class="agenda-head"><div><div class="h2">' + (date === today ? 'Tu día' : capFirst(fmtDateLong(date))) + '</div><div class="sub">' + (trainMin ? fmtDur(trainMin) + ' de entrenamiento · ' : '') + 'Arrastra ' + '<span style="display:inline-grid;vertical-align:-3px;width:14px;height:14px">' + ICONS.grip + '</span> para cambiar la hora</div></div>' +
    (moved ? '<button class="btn xs ghost" data-act="ag-reset" data-date="' + date + '">' + ic('undo') + 'Sugerido</button>' : '') + '</div>';
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
    let done = false, sub = it.sub || '';
    if (it.kind === 'train' || it.kind === 'recup') { const d = blockDone(it.block, date); done = d.all; sub = it.block.short + ' · ' + fmtDur(it.dur) + (d.some && !d.all ? ' · en parte' : ''); }
    else if (it.kind === 'meal') { const ms = mealDone(it.slot, date); done = ms.length > 0; if (done) { const t = sumItems([].concat(...ms.map(m => m.items || []))); sub = 'Registrado · ' + t.p + ' g prot · ' + t.kcal + ' kcal'; } else sub = mealMenuFor(date, it).name; }
    const compact = l.hgt < 54;
    const isNow = now !== null && now >= it.start && now < it.end;
    const cls = 'tl-blk k-' + it.kind + (it.intense ? ' int' : '') + (it.optional ? ' optional' : '') + (done ? ' done' : '') + (warnKeys.has(it.key) ? ' warn' : '') + (compact ? ' compact' : '') + (isNow ? ' now-on' : '');
    h += '<div class="' + cls + '" data-key="' + it.key + '" style="top:' + l.top + 'px;height:' + l.hgt + 'px">' +
      '<button class="main" data-act="ag-open" data-date="' + date + '" data-key="' + it.key + '" aria-label="' + esc(it.title + ', ' + fmtHM(it.start) + ' a ' + fmtHM(it.end) + (sub ? ', ' + sub : '') + (done ? ', hecho' : '')) + '"><span class="tm">' + fmtHM(it.start) + (compact ? '' : '–' + fmtHM(it.end)) + '</span><span class="ti">' + esc(it.title) + (compact && sub ? '<span class="su-in"> · ' + esc(sub) + '</span>' : '') + '</span>' + (sub && !compact ? '<span class="su">' + esc(sub) + '</span>' : '') + '</button>' +
      '<div class="side">' + (done ? '<span class="ok" aria-label="Hecho">' + ic('check') + '</span>' : '') + (it.movable ? '<span class="grip" data-drag="' + it.key + '" data-date="' + date + '" role="button" tabindex="0" aria-label="Mover ' + esc(it.title) + '">' + ic('grip') + '</span>' : '') + '</div></div>';
  }
  if (now !== null && now >= r0 && now <= r1) h += '<div class="tl-now" style="top:' + ((now - r0) * PX_MIN) + 'px"><span>' + fmtHM(now) + '</span></div>';
  return h + '</div>';
}
function mealMenuFor(date, it) {
  const ag = agendaFor(date);
  const T = nutritionTargets(ST.weight || 88, ag.kind, ag);
  const tg = slotTargets(ag, T)[it.key] || { p: 35, c: 80, f: 15 };
  return buildMenu(it.slot, tg, date, UI.menuVar[date + ':' + it.key] || 0);
}
function nutritionStrip(date, ag) {
  const T = nutritionTargets(ST.weight || 88, ag.kind, ag);
  const ms = mealsFor(date), tot = sumItems([].concat(...ms.map(m => m.items || [])));
  const water = (num((nutriDoc(date) || {}).water) || 0) / 1000;
  return '<a class="card tight" href="#comida" style="display:grid;gap:12px"><div class="row between"><span class="h3">Comida de ' + (date === todayStr() ? 'hoy' : 'este día') + '</span><span class="sub">' + esc(T.kindN) + ' · ' + T.kcal + ' kcal ' + ic('chev') + '</span></div>' +
    '<div class="grid3">' +
    '<div class="macro"><div class="top"><span>Proteína</span><b class="c-prot">' + tot.p + '<span style="color:var(--fg-4)">/' + T.p + '</span></b></div>' + meter(tot.p, T.p, 'prot') + '</div>' +
    '<div class="macro"><div class="top"><span>Carbos</span><b class="c-carb">' + tot.c + '<span style="color:var(--fg-4)">/' + T.c + '</span></b></div>' + meter(tot.c, T.c, 'carb') + '</div>' +
    '<div class="macro"><div class="top"><span>Agua</span><b class="c-water">' + fmtNum(Math.round(water * 10) / 10) + '<span style="color:var(--fg-4)">/' + fmtNum(T.water) + ' L</span></b></div>' + meter(water, T.water, 'water') + '</div>' +
    '</div></a>';
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
  const lo = DRAG.r0 - 60, hi = DRAG.r0 + 24 * 60;
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
