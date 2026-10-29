/* ============================================================
   MODO ENTRENAMIENTO v3
   Calentamiento, gimnasio, cancha y tests como tarjetas de ejercicio.
   Descanso grande, sin descanso entre piernas, alternativas y ayuda con IA.
   ============================================================ */
const TR_KEY = 'improve-entreno-v3';
function loadDraft() { try { const r = localStorage.getItem(TR_KEY); const d = r ? JSON.parse(r) : null; return d && d.id ? d : null; } catch (e) { return null; } }
function draftSnapshot(tr) { const d = Object.assign({}, tr || TR, { open: false, wasOpen: !!(tr || TR).open }); delete d._lastCur; return d; }
/* Cada toque se escribe al instante en el teléfono (síncrono, sobrevive a que se cierre la app)
   y, cada pocos segundos, en la nube (sobrevive a perder el teléfono o a borrar sus datos). */
function saveDraft() {
  if (!TR || !TR.id) return;
  TR.lastActive = Date.now();
  let ok = true;
  try { localStorage.setItem(TR_KEY, JSON.stringify(draftSnapshot())); } catch (e) { ok = false; }
  noteLocalSave(ok);
  cloudDraftSoon();
}
function clearDraft() { try { localStorage.removeItem(TR_KEY); } catch (e) { /* nada */ } }
function flushTraining() { if (TR && TR.id) { flushTestSave(); saveDraft(); cloudDraftNow(); } }

/* ---------- Audio y pantalla encendida ---------- */
let audioCtx = null, wakeLock = null;
function ensureAudio() { try { if (!audioCtx) { const A = window.AudioContext || window.webkitAudioContext; if (A) audioCtx = new A(); } if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { audioCtx = null; } }
function beep(n, freq, vib) {
  try {
    if (audioCtx) for (let i = 0; i < (n || 1); i++) {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime + i * 0.26;
      o.type = 'sine'; o.frequency.value = freq || 880; g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.45, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + 0.22);
    }
  } catch (e) { /* sin audio */ }
  try { if (navigator.vibrate && vib !== false) navigator.vibrate(n > 1 ? [200, 90, 200, 90, 200].slice(0, n * 2 - 1) : 140); } catch (e) { /* sin vibración */ }
}
async function requestWake() { try { if ('wakeLock' in navigator && !wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener && wakeLock.addEventListener('release', () => { wakeLock = null; }); } } catch (e) { wakeLock = null; } }
function releaseWake() { try { if (wakeLock) wakeLock.release(); } catch (e) { /* nada */ } wakeLock = null; }
/* Salir de la app, bloquear la pantalla, cambiar de app o que el sistema la cierre: se guarda todo antes */
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && TR.open) { requestWake(); updateTimers(); renderTrain(); }
  if (document.visibilityState === 'hidden') flushTraining();
});
window.addEventListener('pagehide', flushTraining);
window.addEventListener('beforeunload', flushTraining);
document.addEventListener('freeze', flushTraining);

/* ---------- Construcción de pasos ---------- */
function setsFromSpec(sp, side, injSide) {
  const mode = specMode(sp), n = sp.min ? 1 : (sp.s || 1);
  const inj = injSide || 'd', hea = inj === 'd' ? 'i' : 'd';
  const sides = side ? [inj, hea] : [null];
  const out = [];
  for (let k = 0; k < n; k++) for (const sd of sides) out.push({ side: sd, kg: null, reps: mode === 'reps' && sp.r ? sp.r[0] : null, secs: mode === 'min' ? sp.min * 60 : mode === 'time' && sp.t ? sp.t[0] : null, m: mode === 'dist' ? sp.m : null, c: mode === 'contacts' ? sp.c : null, done: false });
  return out;
}
function exStepFromItem(it, date, sess) {
  const ex = exInfo(it.id, it) || { n: it.n, z: [], eq: [] };
  const sg = suggestSets(it, ex, ST.sessions, date, ST.side);
  const lp = sg.last;
  return {
    kind: 'ex', sess: sess || null, id: it.id, n: it.n || ex.n, slot: it.slot || null, spec: it.spec || { s: 3, r: [8, 10] }, side: !!it.side,
    rest: it.rest !== undefined ? it.rest : restFor(ex, it.spec, it.slot), mode: specMode(it.spec), sets: sg.sets, note: sg.note,
    lastDate: lp ? fmtDate(lp.date) : '', lastTxt: lp ? fmtSetsShort(lp.sets) : '', lastNote: lp && lp.notes ? lp.notes : '', lastFb: lp ? lp.fb : null,
    pain: null, notes: '', fb: null, group: it.group || null, tags: it.tags || null, img: ex.img || it.img || null, rf: (ex.z || []).includes('rf'), inc: incFor(ex), eq: ex.eq || [], doms: !!it.doms,
  };
}
function warmStep(w) {
  const ex = exInfo(w.id) || { n: w.n, eq: [] };
  return { kind: 'ex', warmup: true, sess: null, id: w.id, n: w.n, slot: null, spec: w.spec, side: !!w.side, rest: 0, mode: specMode(w.spec), sets: setsFromSpec(w.spec, w.side, ST.side), note: w.d || '', lastTxt: '', pain: null, notes: '', fb: null, img: ex.img || w.img || null, rf: false, inc: 1, eq: ex.eq || [] };
}
function fieldSteps(s) {
  const f = s.field, out = [];
  if (!f) return out;
  if (f.kind === 'golpeo') out.push({ kind: 'golpeo', sess: s.type, level: f.level, target: f.target, count: 0, pd: null, tec: !!f.tec, notes: '' });
  else if (f.kind === 'sprint') out.push({ kind: 'sprint', sess: s.type, level: f.level, done: Array(f.reps).fill(false), pd: null, rest: f.rest || 90, notes: '' });
  else if (f.kind === 'rt') out.push({ kind: 'rt', sess: s.type, level: f.level, reps: f.reps, done: Array(f.series).fill(false), rest: f.rest || 150, notes: '' });
  else if (f.kind === 'test') {
    const doc = (S.data.tests || []).find(t => t.id === 't-' + s.date) || {};
    f.steps.forEach(t => out.push({ kind: 'test', sess: s.type, key: t.key, tkind: t.kind, unit: t.unit || '', n: t.n, d: t.d, img: t.img || null, val: clone(doc[t.key] !== undefined ? doc[t.key] : (t.kind === 'pair' ? {} : null)), rnPain: t.key === 'rn' ? (doc.rnPain ?? null) : undefined, saved: doc[t.key] !== undefined }));
  } else if (f.kind === 'balon') f.drills.forEach((d, i) => out.push({ kind: 'balon', sess: s.type, idx: i, id: d.id, n: d.n, d: d.d, foot: d.foot, metric: d.metric, unit: d.unit, lowerBetter: !!d.lowerBetter, headerStrong: !!d.headerStrong, target: d.target, count: 0, hits: 0, attempts: 0 }));
  else if (f.kind === 'list') out.push({ kind: 'list', sess: s.type, items: f.steps.map(x => ({ n: x.n, d: x.d, min: x.min, done: false })) });
  else if (f.kind === 'club') out.push({ kind: 'list', sess: s.type, items: [{ n: s.title, d: 'Registra minutos y esfuerzo al terminar.', done: false }] });
  return out;
}
function buildTrainSteps(spec) {
  const steps = [];
  if (spec.warmup && spec.warmup.items) spec.warmup.items.forEach(w => steps.push(warmStep(w)));
  for (const s of spec.sessions) {
    fieldSteps(s).forEach(x => steps.push(x));
    (s.items || []).forEach(it => steps.push(exStepFromItem(it, spec.date, s.type)));
  }
  return steps;
}
function planSnapshot(s) { return { items: (s.items || []).map(it => ({ id: it.id, n: it.n, slot: it.slot || null, spec: it.spec || null, side: !!it.side })), field: s.field ? clone(s.field) : null, est: s.est || null }; }
function startBlockTraining(date, key) {
  const it = agendaFor(date).items.find(x => x.key === key);
  if (!it || !it.block) return;
  const sessions = it.block.sessions.filter(s => { const l = findLog(date, s.type); return !l || l.done === false; });
  if (!sessions.length) { toast('Este bloque ya está registrado.', 'info'); return; }
  const place = it.block.place || placeOf(key, ST.profile);
  startTraining({ date, key, title: it.title + ' · ' + sessions.map(s => s.short).join(' + '), sessions, place, warmup: mergeWarmups(sessions.map(s => warmupFor(s.type, ST, place))) });
}
function startSessionTraining(sess, opts) {
  const place = sess.place || placeOf(blockKind(sess.type), ST.profile);
  startTraining({ date: sess.date, key: blockKind(sess.type), title: sess.title, sessions: [sess], place, warmup: warmupFor(sess.type, ST, place) }, opts);
}
function startTraining(spec, opts) {
  opts = opts || {};
  const dr = loadDraft();
  if (dr && !opts.force) {
    // El mismo entrenamiento que quedó abierto: se retoma donde quedó, sin preguntar
    const same = dr.date === spec.date && sameTypes(dr.sessions.map(s => s.type), spec.sessions.map(s => s.type));
    if (same || (TR.open && TR.id === dr.id)) { resumeTraining(); toast('Retomado donde quedaste.', 'info'); return; }
    UI.pendingStart = { spec, opts };
    openSheet({ id: 'tr-conflict', render: () => sheetHead('Tienes un entrenamiento abierto', esc(dr.title)) + '<div class="sheet-body"><p class="body">' + esc(draftProgressText(dr)) + '. No se borra nada: si empiezas otro, lo que hiciste se guarda como sesión.</p>' +
      '<div class="sheet-foot"><button class="btn" data-act="tr-force">Guardar y empezar otro</button><button class="btn primary" data-act="tr-resume">Retomar</button></div></div>' });
    return;
  }
  ensureAudio();
  if (spec.date === todayStr() && !spec.libre) freezeDay(spec.date);
  TR = { open: false, id: uid('tr'), date: spec.date, key: spec.key || 'gym', title: spec.title, startedAt: Date.now(), libre: !!spec.libre, place: spec.place || null,
    sessions: spec.sessions.map(s => ({ type: s.type, title: s.title, short: s.short, est: s.est || null, plan: planSnapshot(s) })),
    steps: buildTrainSteps(spec), cur: 0, rest: null, hold: null, modified: !!opts.modified, compressed: opts.compressed || null, fromTemplate: opts.template || null };
  if (!TR.steps.length) { toast('Esta sesión no tiene pasos para entrenar.', 'info'); TR = { open: false }; return; }
  openTraining();
}
function openTraining() {
  TR.open = true;
  if (LAYERS.length) resetLayers({ kind: 'train' }); else pushLayer({ kind: 'train' });
  document.body.classList.add('training'); document.body.style.overflow = 'hidden';
  requestWake(); renderTrain(true); startTick(); saveDraft(true);
}
function resumeTraining() { const d = loadDraft(); if (!d) return; TR = d; if (TR.cur >= TR.steps.length) TR.cur = Math.max(0, TR.steps.length - 1); ensureAudio(); openTraining(); }
function sameTypes(a, b) { return a.slice().sort().join(',') === b.slice().sort().join(','); }
function minimizeTraining(fromPop, silent) {
  if (!TR.open) return;
  TR.open = false;
  if (!fromPop && !silent) { const i = LAYERS.map(l => l.kind).lastIndexOf('train'); if (i === LAYERS.length - 1) popLayer(false); else if (i >= 0) LAYERS.splice(i, 1); }
  document.body.classList.remove('training'); document.body.style.overflow = '';
  $('#train-root').innerHTML = ''; releaseWake(); stopTick(); flushTestSave(); saveDraft(); cloudDraftNow();
  if (!silent) { toast('En pausa y guardado. Retómalo desde Hoy.', 'info'); scheduleRender(); }
}

/* ---------- Reloj ---------- */
let tickTimer = null, lastBeepSec = null;
function startTick() { stopTick(); tickTimer = setInterval(updateTimers, 250); }
function stopTick() { if (tickTimer) clearInterval(tickTimer); tickTimer = null; }
const mmss = (s) => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
function updateTimers() {
  if (!TR.open) return;
  const now = Date.now();
  const clk = $('#tr-clock'); if (clk) clk.textContent = mmss((now - TR.startedAt) / 1000);
  const t = TR.hold || TR.rest;
  if (!t) return;
  const rem = (t.until - now) / 1000, sec = Math.ceil(rem);
  $$('[data-timer-v]').forEach(el => { el.textContent = mmss(sec); });
  const ring = $('#tr-ring'); if (ring) { const c = Number(ring.getAttribute('data-c')); ring.setAttribute('stroke-dasharray', (c * clamp(rem / t.total, 0, 1)).toFixed(1) + ' ' + c.toFixed(1)); }
  const ov = $('#tr-rest'); if (ov && TR.rest) ov.classList.toggle('last', sec <= 10);
  if (sec <= 3 && sec > 0 && lastBeepSec !== sec) { lastBeepSec = sec; beep(1, TR.hold ? 660 : 740, false); }
  if (rem <= 0) {
    lastBeepSec = null;
    if (TR.hold) { const h = TR.hold; TR.hold = null; beep(2, 990); completeSet(h.step, h.k); }
    else { TR.rest = null; beep(3, 880); renderTrain(); saveDraft(); }
  }
}

/* ---------- Render ---------- */
function stepComplete(s) {
  if (s.skipped) return true;
  if (s.kind === 'list') return s.items.every(x => x.done);
  if (s.kind === 'ex') return s.sets.length > 0 && s.sets.every(x => x.done);
  if (s.kind === 'golpeo') return s.count >= Math.ceil(s.target * 0.6) && (s.tec || num(s.pd) !== null);
  if (s.kind === 'sprint' || s.kind === 'rt') return s.done.every(Boolean);
  if (s.kind === 'test') return !!s.saved;
  if (s.kind === 'balon') return (s.metric === 'hits' ? s.attempts : s.count) >= Math.ceil(s.target * 0.6);
  return false;
}
function stepLabel(s) {
  if (s.kind === 'ex') return s.n;
  if (s.kind === 'golpeo') return (s.tec ? 'Técnica ' : 'Golpeo ') + KICK[s.level].n;
  if (s.kind === 'sprint') return 'Sprint ' + SPRINT[s.level].n;
  if (s.kind === 'rt') return 'Circuito RT ' + String(s.level).replace('x', '×');
  if (s.kind === 'test') return s.n;
  if (s.kind === 'list') return s.items[0] ? s.items[0].n : 'Lista';
  if (s.kind === 'balon') return s.n;
  return '';
}
function renderTrain(reset) {
  const root = $('#train-root');
  if (!TR.open) { root.innerHTML = ''; return; }
  const old = root.querySelector('.train');
  const y = old && !reset && TR._lastCur === TR.cur ? old.scrollTop : 0;
  TR._lastCur = TR.cur;
  const step = TR.steps[TR.cur];
  const warmIdx = TR.steps.map((s, i) => s.warmup ? i : -1).filter(i => i >= 0);
  const group = step.warmup ? TR.steps.filter(s => s.warmup) : TR.steps.filter(s => !s.warmup && s.sess === step.sess && s.kind === step.kind);
  const pos = group.indexOf(step) + 1;
  const sessT = step.sess ? (STYPES[step.sess] || {}).short || step.sess : '';
  const stage = step.warmup ? 'Calentamiento · ' + pos + ' de ' + group.length : step.kind === 'test' ? 'Test · ' + pos + ' de ' + group.length : step.kind === 'ex' ? sessT + ' · ejercicio ' + pos + ' de ' + group.length : sessT;
  let body = '';
  if (step.kind === 'ex') body = trExHtml(step);
  else if (step.kind === 'golpeo') body = trGolpeoHtml(step);
  else if (step.kind === 'sprint') body = trRepsHtml(step, 'sprint');
  else if (step.kind === 'rt') body = trRepsHtml(step, 'rt');
  else if (step.kind === 'test') body = trTestHtml(step);
  else if (step.kind === 'list') body = trListHtml(step);
  else if (step.kind === 'balon') body = trBalonHtml(step);
  root.innerHTML = '<div class="train enter' + (step.warmup ? ' warm' : '') + '" role="dialog" aria-label="Modo entrenamiento"><div class="train-in">' +
    '<div class="tbar"><button class="iconbtn" data-act="tr-min" aria-label="Pausar y salir">' + ic('chevL') + '</button><div class="mid"><div class="t">' + esc(TR.title) + '</div><div class="clk" id="tr-clock">0:00</div>' + saveStatusHtml() + '</div><button class="btn sm primary" data-act="tr-finish">Terminar</button></div>' +
    '<div class="tprog" aria-hidden="true">' + TR.steps.map((s, i) => '<i class="' + (s.warmup ? 'w ' : '') + (i === TR.cur ? 'c' : stepComplete(s) ? 'd' : '') + '"></i>').join('') + '</div>' +
    '<div class="tstage"><span>' + esc(stage) + '</span>' + (step.warmup && warmIdx.length ? '<button class="chip warn" data-act="tr-skipwarm">Ya calenté · saltar</button>' : '<span class="num">' + (TR.cur + 1) + '/' + TR.steps.length + '</span>') + '</div>' +
    '<div class="excard">' + body + '</div></div></div>' + trFooter(step) + restOverlay();
  const tr = root.querySelector('.train'); if (tr) tr.scrollTop = y;
  hydrateThumbs(root);
  updateTimers();
}
/* ---------- Parches (sin remontar #train-root, sin repetir la animación de entrada) ---------- */
function patchExcard() {
  if (!TR.open) return;
  const s = curStep(); if (!s) return;
  const card = $('.excard'); if (!card) { renderTrain(); return; }
  let body = '';
  if (s.kind === 'ex') body = trExHtml(s);
  else if (s.kind === 'golpeo') body = trGolpeoHtml(s);
  else if (s.kind === 'sprint') body = trRepsHtml(s, 'sprint');
  else if (s.kind === 'rt') body = trRepsHtml(s, 'rt');
  else if (s.kind === 'test') body = trTestHtml(s);
  else if (s.kind === 'list') body = trListHtml(s);
  else if (s.kind === 'balon') body = trBalonHtml(s);
  card.innerHTML = body;
  hydrateThumbs(card);
}
function patchProg() {
  const prog = $('.tprog'); if (!prog) return;
  prog.innerHTML = TR.steps.map((s, i) => '<i class="' + (s.warmup ? 'w ' : '') + (i === TR.cur ? 'c' : stepComplete(s) ? 'd' : '') + '"></i>').join('');
}
/* Un toque que no cambia de paso (sensación, dolor, kg/reps, series): solo repinta la tarjeta y los puntitos */
function patchStep() {
  if (!TR.open) return;
  patchExcard(); patchProg();
}
/* Contador de golpeo (+1/+5/−1): solo el número, con rebote */
function patchCounter() {
  if (!TR.open) return;
  const big = $('.counter .big');
  if (!big) { patchExcard(); patchProg(); return; }
  const s = curStep();
  if (s.kind === 'balon' && s.metric === 'hits') big.innerHTML = s.hits + '<small>/' + s.attempts + '</small>';
  else if (s.kind === 'balon') big.innerHTML = s.count + '<small> ' + esc(s.unit) + '</small>';
  else big.innerHTML = s.count + '<small>/' + s.target + '</small>';
  big.classList.remove('bump'); void big.offsetWidth; big.classList.add('bump');
  patchProg();
}
function patchFooter() {
  const step = curStep(); if (!step) return;
  const foot = $('.tfoot'); if (!foot) return;
  foot.outerHTML = trFooter(step);
}
/* Descanso/aguante: monta, actualiza o desmonta el overlay sin reconstruir el resto de .train */
function patchRest() {
  if (!TR.open) return;
  const root = $('#train-root'); if (!root) return;
  const existing = root.querySelector('#tr-rest');
  const show = !!(TR.hold || TR.rest) && !TR.restMin;
  if (!show) { if (existing) existing.remove(); patchFooter(); return; }
  if (existing) {
    const tmp = document.createElement('div'); tmp.innerHTML = restOverlay(false);
    const fresh = tmp.firstElementChild;
    existing.className = fresh.className;
    existing.innerHTML = fresh.innerHTML;
  } else {
    root.insertAdjacentHTML('beforeend', restOverlay(true));
  }
  patchFooter();
  updateTimers();
}
function quickRow(s) {
  const busy = s.eq && s.eq.some(e => BUSY_EQ.includes(e));
  return '<div class="quick">' +
    '<button class="pill ai" data-act="tr-ai">' + ic('spark') + 'Cómo se hace</button>' +
    (busy && !s.warmup && TR.place !== 'cancha' ? '<button class="pill busy" data-act="tr-busy">' + ic('swap') + 'Máquina ocupada</button>' : '') +
    (s.warmup && busy ? '<button class="pill busy" data-act="tr-busy">' + ic('swap') + 'Alternativa</button>' : '') +
    '<a class="pill" href="' + googleLink(s.n + ' ejercicio') + '" target="_blank" rel="noopener">' + ic('google') + 'Google</a>' +
    (!s.warmup ? '<button class="pill" data-act="tr-menu">' + ic('dots') + 'Más</button>' : '') + '</div>';
}
function setValText(stp, x) {
  const mode = stp.mode, kg = num(x.kg);
  const v = mode === 'min' ? (num(x.secs) !== null ? fmtNum(Math.round(x.secs / 6) / 10) + ' min' : '—') : mode === 'time' ? (num(x.secs) !== null ? fmtNum(x.secs) + ' s' : '—') : mode === 'dist' ? (num(x.m) !== null ? fmtNum(x.m) + ' m' : '—') : mode === 'contacts' ? (num(x.c) !== null ? fmtNum(x.c) + ' cont.' : '—') : (num(x.reps) !== null ? fmtNum(x.reps) + ' rep' : '— rep');
  return (kg ? fmtNum(kg) + ' kg × ' : '') + v;
}
function setRowHtml(stp, x, k, P, curK) {
  const mode = stp.mode, attrs = (f) => 'data-k="' + k + '" data-f="' + f + '"';
  const sides = stp.side ? 2 : 1, setNo = Math.floor(k / sides) + 1;
  const injured = x.side && x.side === ST.side && ST.injuryActive;
  const showKg = !(mode === 'contacts' || mode === 'min' || (stp.warmup && mode !== 'reps'));
  const editK = P === 'tr' && TR.edit !== undefined && TR.edit !== null ? TR.edit : curK;
  const open = P !== 'tr' || k === editK;
  const label = '<span class="i">' + setNo + (x.side ? '<small class="' + (injured ? 'inj' : '') + '">' + fmtSide(x.side) + '</small>' : '') + '</span>';
  const timed = (mode === 'time' || mode === 'min') && P === 'tr' && !x.done;
  const go = timed ? '<button class="go play" data-act="tr-hold" data-k="' + k + '" aria-label="Iniciar ' + esc(setValText(stp, x)) + '">' + ic('play') + '</button>'
    : '<button class="go" data-act="' + P + '-done" data-k="' + k + '" aria-label="' + (x.done ? 'Desmarcar serie ' + setNo : 'Serie ' + setNo + ' hecha') + '">' + ic('check') + '</button>';
  if (!open) return '<div class="set compact' + (x.done ? ' done' : '') + '">' + label + '<button class="sv num" data-act="tr-edit" data-k="' + k + '" aria-label="Editar serie ' + setNo + '">' + esc(setValText(stp, x)) + '</button>' + go + '</div>';
  let val;
  if (mode === 'min') val = stepperHtml(P + '-' + k + '-secs', num(x.secs) !== null ? Math.round(x.secs / 60 * 10) / 10 : null, P + '-step', attrs('min'), 'min');
  else if (mode === 'time') val = stepperHtml(P + '-' + k + '-secs', x.secs, P + '-step', attrs('secs'), 's');
  else if (mode === 'dist') val = stepperHtml(P + '-' + k + '-m', x.m, P + '-step', attrs('m'), 'm');
  else if (mode === 'contacts') val = stepperHtml(P + '-' + k + '-c', x.c, P + '-step', attrs('c'), 'cont');
  else val = stepperHtml(P + '-' + k + '-reps', x.reps, P + '-step', attrs('reps'), 'rep');
  const title = x.side ? sideLong(x.side) + (injured ? ' · lesionada' : '') : 'Serie ' + setNo;
  return '<div class="set open' + (x.done ? ' done' : ' cur') + '"><div class="sh">' + label + '<span class="st-t">' + esc(title) + (stp.side ? '<small> · serie ' + setNo + '</small>' : '') + '</span>' + go + '</div>' +
    '<div class="sg' + (showKg ? '' : ' one') + '">' + (showKg ? stepperHtml(P + '-' + k + '-kg', x.kg, P + '-step', attrs('kg'), 'kg') : '') + val + '</div></div>';
}
function trExHtml(s) {
  const ex = exInfo(s.id, s) || { n: s.n };
  const curK = s.sets.findIndex(x => !x.done);
  const presc = fmtSpec(s.spec, s.side);
  let h = '<div class="exhead">' + thumbHtml(Object.assign({}, ex, { n: s.n, img: s.img || ex.img }), 'lg') + '<div class="stack-xs"><div class="kicker">' + (s.warmup ? 'Calentamiento' : esc(s.slot && SLOT_NAMES[s.slot] ? SLOT_NAMES[s.slot] : (ex.m || ''))) + '</div>' +
    '<button class="exname" data-act="tr-copy" aria-label="Copiar el nombre: ' + esc(s.n) + '">' + esc(s.n) + '<span class="cp">' + ICONS.copy + '</span></button>' +
    '<div class="presc">' + esc(presc || s.note || '') + '</div></div></div>';
  h += quickRow(s);
  if (s.warmup && s.note && s.note !== presc) h += '<div class="excue">' + esc(s.note) + '</div>';
  else if (ex.cue) h += '<div class="excue">' + esc(ex.cue.length > 170 ? ex.cue.slice(0, 167).trim() + '…' : ex.cue) + '</div>';
  if (s.doms) h += note('warn', 'Hoy va en isométrica por el dolor muscular del check-in.');
  if (s.doneAs) h += note('blue', 'Variante de hoy en lugar de ' + esc((exInfo(s.doneAs.from) || {}).n || s.doneAs.from) + '.');
  if (!s.warmup) {
    h += '<div class="target">' + (s.lastTxt ? '<span>Última vez · ' + esc(s.lastDate) + (s.lastFb && FEEDBACK[s.lastFb] ? ' · ' + FEEDBACK[s.lastFb].n.toLowerCase() : '') + '</span><b>' + esc(s.lastTxt) + '</b>' : '<span>Primera vez con este ejercicio</span><b>Anota el peso</b>') + '</div>';
    if (s.note) h += note('blue', esc(s.note));
    if (s.lastNote) h += '<div class="lastnote">' + ic('pen') + ' Tu nota: “' + esc(s.lastNote) + '”</div>';
  }
  h += '<div class="sets">' + s.sets.map((x, k) => setRowHtml(s, x, k, 'tr', curK)).join('') + '</div>';
  if (s.side) h += '<div class="sub">' + ic('info') + ' Por lado: pasas a la otra pierna sin descanso; el descanso va después de las dos.</div>';
  h += '<div class="row"><button class="btn sm" data-act="tr-addset">' + ic('plus') + 'Serie</button>' + (s.sets.length > (s.side ? 2 : 1) ? '<button class="btn sm ghost" data-act="tr-delset">' + ic('minus') + 'Quitar serie</button>' : '') + '</div>';
  if (!s.warmup) {
    if (s.rf) h += '<div class="field"><span class="lab">Dolor en el recto femoral</span>' + scaleHtml('pain', s.pain, { pain: true, act: 'tr-pain', l: '0 nada', r: '≥ 3 para y baja' }) + '</div>';
    if (num(s.pain) !== null && s.pain >= 3) h += note('pain', 'Dolor ' + s.pain + '/10: para este ejercicio y pasa al siguiente. La próxima vez baja carga o rango.');
    h += '<div class="field"><span class="lab">¿Cómo te fue?</span><div class="fbrow" role="radiogroup" aria-label="Sensación">' + Object.entries(FEEDBACK).map(([k, v]) => '<button type="button" role="radio" aria-checked="' + (s.fb === k) + '" class="' + (s.fb === k ? 'on' : '') + '" data-act="tr-fb" data-v="' + k + '">' + v.n + '<small>' + v.d + '</small></button>').join('') + '</div><span class="hint">El plan usa esta respuesta para la próxima vez.</span></div>';
    h += '<div class="field"><label for="tr-notes">Nota (opcional)</label><textarea class="input" id="tr-notes" data-bind="tr-notes" rows="2" placeholder="Ajuste de máquina, asiento, sensaciones">' + esc(s.notes || '') + '</textarea></div>';
  }
  return h;
}
function trGolpeoHtml(s) {
  const K = KICK[s.level];
  let h = '<div class="exhead"><div class="badgek k">' + K.n + '</div><div class="stack-xs"><div class="kicker">' + (s.tec ? 'Técnica con balón' : 'Golpeo · nivel ' + s.level + ' de 8') + '</div><button class="exname" data-act="tr-copy">' + esc(K.t) + '</button></div></div><div class="excue">' + esc(K.d) + '</div>';
  h += '<div class="counter"><div class="big num" aria-live="polite">' + s.count + '<small>/' + s.target + '</small></div><div class="ctl"><button data-act="tr-count" data-d="-1" aria-label="Restar un golpe">−1</button><button class="plus" data-act="tr-count" data-d="1" aria-label="Sumar un golpe">+1</button><button data-act="tr-count" data-d="5" aria-label="Sumar cinco">+5</button></div><div class="sub">golpes</div></div>';
  h += '<div class="field"><span class="lab">Dolor en el recto femoral durante el golpeo</span>' + scaleHtml('pd', s.pd, { pain: true, act: 'tr-pd', l: '0 nada', r: '≥ 3 para' }) + '</div>';
  if (num(s.pd) !== null && s.pd >= 3) h += note('pain', 'Dolor ' + s.pd + '/10: para el golpeo. Mañana el plan baja un nivel.');
  h += s.tec ? note('info', 'Técnica: no cuenta para subir de nivel.') : note('blue', 'Para subir: dolor ≤ 2 hoy y 0 mañana. Golpes de calidad, no cantidad.');
  return h;
}
function trRepsHtml(s, kind) {
  const isS = kind === 'sprint';
  const cur = s.done.findIndex(d => !d);
  let h = isS ? '<div class="exhead"><div class="badgek s">' + SPRINT[s.level].n + '</div><div class="stack-xs"><div class="kicker">Sprint · nivel ' + s.level + ' de 6</div><button class="exname" data-act="tr-copy">' + esc(SPRINT[s.level].t) + '</button></div></div><div class="excue">' + esc(SPRINT[s.level].d) + '</div>'
    : '<div class="exhead"><div class="badgek r">RT</div><div class="stack-xs"><div class="kicker">Esfuerzos repetidos</div><button class="exname" data-act="tr-copy">' + s.reps + ' repeticiones × ' + s.done.length + ' series</button></div></div><div class="excue">Conducción intensa y vuelta trotando. ' + fmtNum(Math.round(s.rest / 60 * 10) / 10) + ' min entre series.</div>';
  h += '<div class="reps">' + s.done.map((d, k) => '<button class="' + (d ? 'done' : k === cur ? 'cur' : '') + '" data-act="tr-rep" data-k="' + k + '" aria-label="' + (isS ? 'Repetición ' : 'Serie ') + (k + 1) + (d ? ' hecha' : '') + '">' + (k + 1) + '<small>' + (d ? 'hecha' : isS ? 'rep' : 'serie') + '</small></button>').join('') + '</div>';
  h += '<div class="sub">' + (isS ? 'Toca cada repetición al terminarla: el descanso de ' + s.rest + ' s arranca solo.' : 'Toca cada serie al terminarla: arranca el descanso.') + '</div>';
  if (isS) {
    h += '<div class="field"><span class="lab">Dolor en el recto femoral durante el sprint</span>' + scaleHtml('pd', s.pd, { pain: true, act: 'tr-pd', l: '0 nada', r: '≥ 3 para' }) + '</div>';
    if (num(s.pd) !== null && s.pd >= 3) h += note('pain', 'Dolor ' + s.pd + '/10: para el sprint.');
  }
  return h;
}
function trListHtml(s) {
  return '<div class="stack-sm">' + s.items.map((x, k) => '<button class="blk' + (x.done ? ' done' : '') + '" data-act="tr-ck" data-k="' + k + '"><div class="grow"><div class="t">' + esc(x.n) + '</div>' + (x.d || x.min ? '<div class="s">' + esc([x.min ? x.min + ' min' : '', x.d || ''].filter(Boolean).join(' · ')) + '</div>' : '') + '</div><span class="st0' + (x.done ? ' done' : '') + '">' + (x.done ? ic('check') : '') + '</span></button>').join('') + '</div>';
}
function trBalonHtml(s) {
  const footTxt = s.foot === 'izq' ? 'Pie izquierdo' : s.foot === 'der-suave' ? 'Pie menos hábil' : 'Ambos pies';
  let h = '<div class="exhead"><div class="badgek b">' + ic('ball') + '</div><div class="stack-xs"><div class="kicker">Balón · ' + esc(footTxt) + (s.headerStrong ? ' · fuerza alta' : '') + '</div><button class="exname" data-act="tr-copy">' + esc(s.n) + '</button></div></div><div class="excue">' + esc(s.d) + '</div>';
  if (s.metric === 'hits') {
    h += '<div class="counter"><div class="big num" aria-live="polite">' + s.hits + '<small>/' + s.attempts + '</small></div>' +
      '<div class="ctl"><button class="plus" data-act="tr-ball" data-k="hit" aria-label="Acierto">' + ic('check') + ' Acierto</button><button data-act="tr-ball" data-k="miss" aria-label="Fallo">Fallo</button></div>' +
      '<div class="sub">' + esc(s.unit) + ' · meta ' + s.target + '</div></div>';
  } else {
    h += '<div class="counter"><div class="big num" aria-live="polite">' + s.count + '<small> ' + esc(s.unit) + '</small></div>' +
      '<div class="ctl"><button data-act="tr-count" data-d="-1" aria-label="Restar">−1</button><button class="plus" data-act="tr-count" data-d="1" aria-label="Sumar">+1</button><button data-act="tr-count" data-d="5" aria-label="Sumar cinco">+5</button></div>' +
      '<div class="sub">meta ' + s.target + ' ' + esc(s.unit) + (s.lowerBetter ? ' · menos es mejor' : '') + '</div></div>';
  }
  return h;
}
function trTestHtml(s) {
  const inj = ST.side || 'd', hea = inj === 'd' ? 'i' : 'd';
  let h = '<div class="exhead"><div class="badgek t">' + ic('flask') + '</div><div class="stack-xs"><div class="kicker">Test de control</div><button class="exname" data-act="tr-copy">' + esc(s.n) + '</button>' + (s.saved ? '<span class="saved">' + ic('check') + 'Guardado</span>' : '<span class="sub">Se guarda al escribir</span>') + '</div></div>';
  h += '<div class="excue">' + esc(s.d) + '</div>';
  if (s.tkind === 'pair') {
    const v = s.val || {};
    const box = (sd) => '<div class="side' + (sd === inj && ST.injuryActive ? ' inj' : '') + '"><span class="lab">' + sideLong(sd) + (sd === inj && ST.injuryActive ? ' · lesionada' : ' · sana') + '</span><input class="input num" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-bind="tr-test" data-s="' + sd + '" value="' + esc(fmtNumRaw(v[sd])) + '" placeholder="' + esc(s.unit) + '" aria-label="' + esc(s.n + ' ' + sideLong(sd)) + '"></div>';
    h += '<div class="tpair">' + box(hea) + box(inj) + '</div>';
    if (s.key !== 'stretch') {
      const L = lsi(v, inj);
      h += '<div class="lsi-live' + (L === null ? '' : L >= 90 ? ' pass' : ' low') + '" id="tr-lsi"><div><div class="h3">Lesionada vs sana</div><div class="sub">Meta ≥ 90 %</div></div><b>' + (L === null ? '—' : fmtNum(L) + ' %') + '</b></div>';
    } else {
      const a = num(v.d), b = num(v.i);
      h += '<div class="lsi-live' + (a === null || b === null ? '' : Math.abs(a - b) <= 2 ? ' pass' : ' low') + '" id="tr-lsi"><div><div class="h3">Diferencia</div><div class="sub">Meta ≤ 2 cm</div></div><b>' + (a === null || b === null ? '—' : fmtNum(Math.abs(a - b)) + ' cm') + '</b></div>';
    }
  } else if (s.tkind === 'rn') {
    h += '<div class="field"><span class="lab">Resultado</span><div class="seg blue">' + [['no', 'No pude'], ['parcial', 'Parcial'], ['completo', 'Completo']].map(([k, l]) => '<button type="button" data-act="tr-test-rn" data-v="' + k + '" class="' + (s.val === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div><span class="hint">Completo = espalda casi al suelo, controlado.</span></div>';
    h += '<div class="field"><span class="lab">Dolor durante el Reverse Nordic</span>' + scaleHtml('rnPain', s.rnPain, { pain: true, act: 'tr-test-scale', l: '0 nada', r: '10 máximo' }) + '<span class="hint">Dolor, no esfuerzo ni tirantez muscular.</span></div>';
  } else if (s.tkind === 'scale') {
    h += '<div class="field"><span class="lab">Dolor al presionar</span>' + scaleHtml('palp', s.val, { pain: true, act: 'tr-test-scale', l: '0 nada', r: '10 máximo' }) + '</div>';
  }
  h += '<button class="btn sm ghost" data-act="tr-skip">' + ic('chev') + 'Hoy no lo mido</button>';
  return h;
}
function nextSetInfo() {
  const s = TR.steps[TR.cur];
  if (s && s.kind === 'ex') { const k = s.sets.findIndex(x => !x.done); if (k >= 0) { const x = s.sets[k]; return { n: s.n, d: setDesc(s, x, k) }; } }
  if (s && (s.kind === 'sprint' || s.kind === 'rt')) { const k = s.done.findIndex(d => !d); if (k >= 0) return { n: stepLabel(s), d: (s.kind === 'sprint' ? 'Repetición ' : 'Serie ') + (k + 1) + ' de ' + s.done.length }; }
  for (let i = TR.cur + (s && s.kind === 'ex' && s.sets.every(x => x.done) ? 1 : 0); i < TR.steps.length; i++) { const st = TR.steps[i]; if (!stepComplete(st)) return { n: stepLabel(st), d: st.kind === 'ex' && st.sets[0] ? setDesc(st, st.sets[0], 0) : '' }; }
  return null;
}
function setDesc(s, x, k) {
  const sides = s.side ? 2 : 1;
  const v = s.mode === 'time' ? fmtNum(x.secs) + ' s' : s.mode === 'min' ? Math.round((num(x.secs) || 0) / 60) + ' min' : s.mode === 'dist' ? fmtNum(x.m) + ' m' : s.mode === 'contacts' ? fmtNum(x.c) + ' contactos' : (num(x.reps) !== null ? fmtNum(x.reps) + ' rep' : '');
  return 'Serie ' + (Math.floor(k / sides) + 1) + (x.side ? ' · ' + sideLong(x.side).toLowerCase() : '') + ' · ' + v + (num(x.kg) ? ' · ' + fmtKg(x.kg) : '');
}
function restOverlay(enter) {
  enter = enter === undefined ? true : enter;
  const t = TR.hold || TR.rest;
  if (!t || TR.restMin) return '';
  const size = 420, sw = 14, r = (size - sw) / 2, c = 2 * Math.PI * r;
  const nx = TR.rest ? nextSetInfo() : null;
  const hs = TR.hold ? TR.steps[TR.hold.step] : null;
  return '<div class="rest' + (TR.hold ? ' hold' : '') + (enter ? ' enter' : '') + '" id="tr-rest" role="timer" aria-live="off">' +
    '<div class="top"><span class="lbl">' + (TR.hold ? 'Aguanta' : 'Descanso') + '</span><button class="btn sm glass" data-act="tr-rest-min">' + ic('min') + 'Ver ejercicio</button></div>' +
    '<div class="dial"><svg viewBox="0 0 ' + size + ' ' + size + '"><circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="' + sw + '"/><circle id="tr-ring" data-c="' + c.toFixed(1) + '" cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#' + (TR.hold ? 'lg-lime' : 'lg-white') + ')" stroke-width="' + sw + '" stroke-linecap="round" stroke-dasharray="' + c.toFixed(1) + ' ' + c.toFixed(1) + '"/></svg><span class="digits" data-timer-v>' + mmss(Math.ceil((t.until - Date.now()) / 1000)) + '</span></div>' +
    (nx ? '<div class="next"><span class="k">Siguiente</span><span class="n">' + esc(nx.n) + '</span>' + (nx.d ? '<span class="d">' + esc(nx.d) + '</span>' : '') + '</div>' : hs ? '<div class="next"><span class="k">En curso</span><span class="n">' + esc(hs.n) + '</span><span class="d">' + esc(setDesc(hs, hs.sets[TR.hold.k], TR.hold.k)) + '</span></div>' : '<span></span>') +
    '<div class="ctl">' + (TR.hold ? '<button class="w" data-act="tr-hold-cancel">Cancelar</button><button data-act="tr-hold-add" data-d="' + (TR.hold.total > 90 ? 30 : 5) + '" aria-label="Sumar tiempo">+' + (TR.hold.total > 90 ? 30 : 5) + '</button><button class="skip w" data-act="tr-hold-stop">Terminé</button>'
      : '<button data-act="tr-rest" data-d="-15" aria-label="15 segundos menos">−15</button><button data-act="tr-rest" data-d="15" aria-label="15 segundos más">+15</button><button class="skip w" data-act="tr-rest-skip">Saltar</button>') + '</div></div>';
}
function trFooter(step) {
  const last = TR.cur === TR.steps.length - 1;
  const t = TR.hold || TR.rest;
  let bar = '';
  if (t && TR.restMin) bar = '<button class="restbar' + (TR.hold ? ' hold' : '') + '" data-act="tr-rest-max"><span class="v num" data-timer-v>' + mmss(Math.ceil((t.until - Date.now()) / 1000)) + '</span><div class="grow"><div class="h3">' + (TR.hold ? 'Aguanta' : 'Descanso') + '</div><div class="sub" style="color:var(--fg-2)">Toca para ver en grande</div></div>' + (TR.rest ? '<span class="btn xs white" data-act="tr-rest-skip">Saltar</span>' : '') + '</button>';
  const acts = '<div class="acts"><button class="iconbtn" data-act="tr-prev" aria-label="Paso anterior"' + (TR.cur === 0 ? ' disabled' : '') + '>' + ic('chevL') + '</button>' +
    '<button class="btn" data-act="tr-add">' + ic('plus') + 'Añadir</button>' +
    (last ? '<button class="btn lime" data-act="tr-finish">' + ic('check') + 'Terminar</button>' : '<button class="btn primary" data-act="tr-next">Siguiente' + ic('chev') + '</button>') + '</div>';
  return '<div class="tfoot"><div class="tfoot-in">' + bar + acts + '</div></div>';
}

/* ---------- Acciones ---------- */
function curStep() { return TR.steps[TR.cur]; }
function startRest(secs) { TR.restMin = false; if (!secs || secs < 5) { TR.rest = null; return; } TR.rest = { until: Date.now() + secs * 1000, total: secs }; }
function groupNext(idx) {
  const s = TR.steps[idx]; if (!s.group) return null;
  const members = TR.steps.map((x, i) => (x.kind === 'ex' && x.group === s.group ? i : -1)).filter(i => i >= 0);
  const pos = members.indexOf(idx);
  for (let j = 1; j <= members.length; j++) { const m = members[(pos + j) % members.length]; if (TR.steps[m].sets.some(x => !x.done)) return { idx: m, wrap: (pos + j) >= members.length }; }
  return null;
}
function completeSet(stepIdx, k) {
  const s = TR.steps[stepIdx]; if (!s || !s.sets[k]) return;
  s.sets[k].done = true; TR.edit = null;
  haptic(18);
  // Unilateral: sin descanso entre piernas, el descanso va tras las dos
  if (s.side) {
    const pair = k % 2 === 0 ? k + 1 : k - 1;
    if (s.sets[pair] && !s.sets[pair].done) { TR.rest = null; TR.cur = stepIdx; renderTrain(); saveDraft(); toast('Ahora la ' + sideLong(s.sets[pair].side).toLowerCase() + ', sin descanso.', 'info'); return; }
  }
  let rest = Math.round(s.rest || 0);
  const g = groupNext(stepIdx);
  if (g && g.idx !== stepIdx) { TR.cur = g.idx; rest = g.wrap ? Math.max(rest, 60) : 15; }
  const allDone = s.sets.every(x => x.done);
  if (allDone && !g && stepIdx === TR.steps.length - 1) rest = 0;
  if (allDone && !g && TR.cur === stepIdx && stepIdx < TR.steps.length - 1) {
    if (s.warmup) { rest = 0; setTimeout(() => { if (TR.open && TR.cur === stepIdx) trNav(1); }, 380); }
    else TR.cur = stepIdx + 1;
  }
  startRest(rest);
  renderTrain(TR.cur !== stepIdx); saveDraft();
}
function trSetField(k, f, raw) {
  const s = curStep(); if (!s || !s.sets[k]) return;
  let v = parseNum(raw);
  let field = f;
  if (f === 'min') { field = 'secs'; v = v === null ? null : Math.round(v * 60); }
  s.sets[k][field] = v;
  if (['kg', 'reps', 'secs'].includes(field)) for (let j = k + 1; j < s.sets.length; j++) if (!s.sets[j].done && (!s.side || s.sets[j].side === s.sets[k].side)) s.sets[j][field] = v;
  saveDraft();
}
function trStep(k, f, d) {
  const s = curStep(); if (!s || !s.sets[k]) return;
  if (f === 'min') { const cur = (num(s.sets[k].secs) || 0) / 60; trSetField(k, 'min', Math.max(0, Math.round((cur + d) * 10) / 10)); patchStep(); return; }
  const inc = f === 'kg' ? (s.inc || 2.5) : f === 'secs' ? 5 : f === 'm' ? 5 : 1;
  const cur = num(s.sets[k][f]);
  const nv = Math.max(0, Math.round(((cur === null ? 0 : cur) + d * inc) * 100) / 100);
  trSetField(k, f, nv);
  patchStep();
}
function trNav(d) { TR.cur = clamp(TR.cur + d, 0, TR.steps.length - 1); TR.hold = null; TR.edit = null; renderTrain(true); saveDraft(); }
function trSkipWarm() {
  TR.steps.forEach(s => { if (s.warmup && !stepComplete(s)) s.skipped = true; });
  const i = TR.steps.findIndex(s => !s.warmup);
  TR.cur = i >= 0 ? i : TR.cur; TR.rest = null; renderTrain(true); saveDraft();
}
function trMenu() {
  const s = curStep(); if (!s || s.kind !== 'ex') return;
  const i = TR.cur, next = TR.steps[i + 1];
  openSheet({ id: 'tr-menu', render: () => sheetHead(s.n, 'Opciones del ejercicio') + '<div class="sheet-body"><div class="stack-sm">' +
    (s.slot ? '<button class="btn block" data-act="tr-swap">' + ic('swap') + 'Cambiar por otro del mismo hueco</button>' : '') +
    '<button class="btn block" data-act="tr-pickswap">' + ic('search') + 'Cambiar por cualquier ejercicio</button>' +
    (next && next.kind === 'ex' && !next.warmup ? '<button class="btn block" data-act="tr-superset">' + ic('layers') + (s.group && s.group === next.group ? 'Quitar superserie' : 'Superserie con ' + esc(next.n)) + '</button>' : '') +
    '<div class="grid2"><button class="btn sm" data-act="tr-move" data-d="-1"' + (i <= 0 ? ' disabled' : '') + '>' + ic('up') + 'Antes</button><button class="btn sm" data-act="tr-move" data-d="1"' + (i >= TR.steps.length - 1 ? ' disabled' : '') + '>' + ic('down') + 'Después</button></div>' +
    '<button class="btn block" data-act="ex" data-id="' + esc(s.id) + '">' + ic('book') + 'Ficha del ejercicio</button>' +
    '<button class="btn block" data-act="tr-skip">' + ic('chev') + 'Saltar este ejercicio</button>' +
    '<button class="btn block danger" data-act="tr-remove">' + ic('trash') + 'Quitar del entrenamiento</button>' +
    '<a class="btn block ghost" href="' + ytLink(s.n) + '" target="_blank" rel="noopener">' + ic('ext') + 'Ver técnica en YouTube</a></div></div>' });
}
function trReplaceCurrent(item, doneAs) {
  const old = curStep();
  const st = exStepFromItem(item, TR.date, old.sess);
  st.group = old.group; st.warmup = !!old.warmup;
  if (old.warmup) { st.rest = 0; st.sets = setsFromSpec(old.spec, st.side, ST.side); st.spec = old.spec; st.mode = specMode(old.spec); }
  else st.sets = st.sets.slice(0, Math.max(st.side ? 2 : 1, old.sets.length));
  if (doneAs) st.doneAs = doneAs;
  TR.steps[TR.cur] = st; TR.modified = true;
  closeAllSheets(); openTrainingIfClosed(); renderTrain(true); saveDraft();
}
function openTrainingIfClosed() { if (!TR.open && TR.id) openTraining(); }
function trAddItem(item) {
  const st = exStepFromItem(item, TR.date, (curStep() && curStep().sess) || (TR.sessions[0] && TR.sessions[0].type) || 'libre');
  const at = Math.min(TR.cur + 1, TR.steps.length);
  TR.steps.splice(at, 0, st); TR.cur = at; TR.modified = true;
  closeAllSheets(); openTrainingIfClosed(); renderTrain(true); saveDraft();
}
/* Copiar el nombre y ofrecer búsquedas sin salir del entrenamiento */
async function trCopy() {
  const s = curStep(); if (!s) return;
  const name = stepLabel(s);
  const ok = await copyText(name);
  haptic(10);
  openSheet({ id: 'tr-copy', render: () => sheetHead(name, ok ? '<span class="c-lime">Copiado al portapapeles</span>' : 'No se pudo copiar') + '<div class="sheet-body"><div class="stack-sm">' +
    (s.kind === 'ex' ? '<button class="btn primary block" data-act="tr-ai">' + ic('spark') + 'Cómo se hace (IA)</button>' : '') +
    '<a class="btn block" href="' + googleLink(name + (s.kind === 'ex' ? ' ejercicio' : ' fútbol')) + '" target="_blank" rel="noopener">' + ic('google') + 'Buscar en Google</a>' +
    '<a class="btn block" href="' + ytLink(name) + '" target="_blank" rel="noopener">' + ic('play') + 'Ver en YouTube</a>' +
    (s.kind === 'ex' && s.id ? '<button class="btn block ghost" data-act="ex" data-id="' + esc(s.id) + '">' + ic('book') + 'Ficha del ejercicio</button>' : '') + '</div></div>' });
}
/* Máquina ocupada o sin equipo: 1-3 alternativas */
function busyAlternatives(s) {
  const ctx = { phase: ST.phase, injuryActive: ST.injuryActive, equipmentOff: ST.equipmentOff, bank: ST.bank, place: TR.place, profile: ST.profile };
  const ex = exInfo(s.id) || {}, busyEq = (ex.eq || []).filter(e => BUSY_EQ.includes(e));
  const ok = (e) => e && e.id !== s.id && exEligible(e, ctx) && !(e.eq || []).some(q => busyEq.includes(q));
  const out = [];
  (ALT[s.id] || []).forEach(id => { const e = BANK_INDEX[id]; if (ok(e) && !out.includes(e)) out.push(e); });
  if (out.length < 3 && s.slot) slotAlternatives(s.slot, ctx).forEach(e => { if (out.length < 3 && ok(e) && !out.includes(e)) out.push(e); });
  if (out.length < 2 && ex.pat) ST.bank.forEach(e => { if (out.length < 2 && ok(e) && e.pat === ex.pat && (e.z || []).some(z => (ex.z || []).includes(z)) && !out.includes(e)) out.push(e); });
  return { list: out.slice(0, 3), busyEq };
}
function trBusy() {
  const s = curStep(); if (!s || s.kind !== 'ex') return;
  const r = busyAlternatives(s);
  openSheet({ id: 'tr-busy', render: () => sheetHead('Alternativas', esc(s.n) + (r.busyEq.length ? ' · usa ' + esc(r.busyEq.join(', ')) : '')) + '<div class="sheet-body">' +
    (r.list.length ? '<div class="stack-sm">' + r.list.map(e => '<div class="card flat tight"><div class="stack-sm"><div class="row nowrap">' + thumbHtml(e) + '<div class="grow"><div class="h3">' + esc(e.n) + '</div><div class="sub">' + esc((e.eq || []).join(', ') || 'Sin equipo') + '</div></div></div>' +
      (e.cue ? '<div class="small fg2">' + esc(e.cue.length > 140 ? e.cue.slice(0, 137) + '…' : e.cue) + '</div>' : '') +
      '<div class="grid2"><button class="btn sm primary" data-act="tr-alt" data-id="' + esc(e.id) + '" data-mode="hoy">Solo hoy</button>' + (s.slot && (e.s || []).includes(s.slot) ? '<button class="btn sm" data-act="tr-alt" data-id="' + esc(e.id) + '" data-mode="siempre">Usar siempre</button>' : '<span></span>') + '</div></div></div>').join('') + '</div>'
      : '<div class="empty"><b>Sin alternativas permitidas en ' + PHASES[ST.phase].n + '.</b><span class="small">Espera a que se libere o salta el ejercicio.</span></div>') +
    (r.busyEq.length ? '<button class="btn block ghost" data-act="tr-noeq" data-eq="' + esc(r.busyEq.join('|')) + '">' + ic('x') + 'No tengo ' + esc(r.busyEq.join(' ni ')) + '</button><p class="sub">Si no la tienes, el plan deja de usarla y elige alternativas solo.</p>' : '') + '</div>' });
}
function trAlt(id, mode) {
  const s = curStep(), ex = BANK_INDEX[id] || exInfo(id); if (!s || !ex) return;
  const busyEq = ((exInfo(s.id) || {}).eq || []).filter(e => BUSY_EQ.includes(e));
  const it = makeItem(ex, (ex.s || []).includes(s.slot) ? s.slot : null, s.spec);
  if (mode === 'siempre' && s.slot) setChoice(s.slot, id);
  trReplaceCurrent(it, { from: s.id, reason: mode === 'siempre' ? 'cambio' : 'ocupada', eq: busyEq[0] || null });
  toast(mode === 'siempre' ? 'Cambiado en tu plan.' : 'Hoy haces ' + ex.n + '.');
}

/* ---------- Tests en vivo: se guardan al escribir ---------- */
let testTimer = null, testPending = null;
function flushTestSave() { if (testPending) { const f = testPending; testPending = null; clearTimeout(testTimer); f(); } }
function trTestSave(s) {
  clearTimeout(testTimer);
  saveDraft();
  testPending = () => {
    const id = 't-' + TR.date, prev = clone((S.data.tests || []).find(t => t.id === id) || { date: TR.date });
    delete prev.id; prev.date = TR.date;
    if (s.key === 'rn') { prev.rn = s.val || null; prev.rnPain = num(s.rnPain); }
    else if (s.tkind === 'pair') prev[s.key] = { d: num((s.val || {}).d), i: num((s.val || {}).i) };
    else prev[s.key] = num(s.val);
    put('tests', id, prev);
    s.saved = true; saveDraft();
    const el = $('.tstage'); if (el && TR.open) { const sv = $('.saved') || null; if (!sv) renderTrainSoft(); }
  };
  testTimer = setTimeout(flushTestSave, 500);
}
function renderTrainSoft() { const ae = document.activeElement; if (ae && ae.tagName === 'INPUT' && $('#train-root').contains(ae)) return; renderTrain(); }
function trTestInput(sd, raw) {
  const s = curStep(); if (!s || s.kind !== 'test') return;
  s.val = Object.assign({}, s.val || {}); s.val[sd] = parseNum(raw);
  const box = $('#tr-lsi');
  if (box) {
    const inj = ST.side || 'd';
    if (s.key !== 'stretch') { const L = lsi(s.val, inj); box.className = 'lsi-live' + (L === null ? '' : L >= 90 ? ' pass' : ' low'); box.querySelector('b').textContent = L === null ? '—' : fmtNum(L) + ' %'; }
    else { const a = num(s.val.d), b = num(s.val.i); box.className = 'lsi-live' + (a === null || b === null ? '' : Math.abs(a - b) <= 2 ? ' pass' : ' low'); box.querySelector('b').textContent = a === null || b === null ? '—' : fmtNum(Math.abs(a - b)) + ' cm'; }
  }
  if (num(s.val.d) !== null && num(s.val.i) !== null) trTestSave(s); else saveDraft();
}

/* ---------- Terminar ---------- */
function trSummary() {
  let sets = 0, vol = 0; const recs = [];
  for (const s of TR.steps) if (s.kind === 'ex' && !s.warmup) {
    const done = s.sets.filter(x => x.done); sets += done.length;
    let best = 0;
    done.forEach(x => { const kg = num(x.kg), r = num(x.reps); if (kg && r) { vol += kg * r; best = Math.max(best, kg * (1 + Math.min(12, r) / 30)); } });
    const prev = bestE1RM(s.id, ST.sessions.filter(l => l.date < TR.date));
    if (best > 0 && prev > 0 && best > prev * 1.005) recs.push(s.n);
  }
  const pending = TR.steps.filter(s => !s.warmup && !stepComplete(s)).length;
  return { sets, vol: Math.round(vol), recs, pending };
}
function openFinish() {
  const needPain = TR.steps.some(s => (s.kind === 'golpeo' && !s.tec || s.kind === 'sprint') && num(s.pd) === null && (s.kind === 'golpeo' ? s.count > 0 : s.done.some(Boolean)));
  const prev = TR.fin || {};
  UI.fin = { minutes: prev.minTouched ? prev.minutes : Math.max(1, Math.round((Date.now() - TR.startedAt) / 60000)), minTouched: !!prev.minTouched, rpe: prev.rpe ?? null, notes: prev.notes || '', tpl: !!prev.tpl, tplName: prev.tplName || TR.title, needPain, pd: prev.pd ?? null };
  TR.fin = UI.fin; saveDraft();
  openSheet({ id: 'finish', render: finishHtml });
}
function finishHtml() {
  const f = UI.fin, sm = trSummary();
  let h = sheetHead('Terminar', esc(TR.title)) + '<div class="sheet-body">' +
    '<div class="stats"><div class="stat lime"><span class="v">' + sm.sets + '</span><span class="k">Series</span></div><div class="stat"><span class="v">' + sm.vol + '<small>kg</small></span><span class="k">Volumen</span></div><div class="stat ' + (sm.recs.length ? 'lime' : '') + '"><span class="v">' + sm.recs.length + '</span><span class="k">Récords</span></div></div>';
  if (sm.recs.length) h += note('good', 'Mejor marca estimada en: ' + esc(sm.recs.join(', ')) + '.');
  if (sm.pending) h += note('info', plural(sm.pending, 'paso quedó', 'pasos quedaron') + ' sin completar. Se guarda lo hecho y lo pendiente queda marcado.');
  h += '<div class="field"><span class="lab">Minutos</span>' + stepperHtml('fin-min', f.minutes, 'fin-step', 'data-name="minutes"', 'min') + '</div>' +
    '<div class="field"><span class="lab">Esfuerzo de la sesión (RPE)</span>' + scaleHtml('rpe', f.rpe, { act: 'fin-scale', tone: 'load', l: '0 reposo', r: '10 máximo' }) + '</div>';
  if (f.needPain) h += '<div class="field"><span class="lab">Dolor en el recto femoral durante la sesión</span>' + scaleHtml('pd', f.pd, { pain: true, act: 'fin-scale', l: '0 nada', r: '10 máximo' }) + '</div>';
  h += '<div class="field"><label for="fin-notes">Notas de la sesión</label><textarea class="input" id="fin-notes" data-bind="fin-notes" rows="2">' + esc(f.notes) + '</textarea></div>' +
    toggleHtml('fin-tpl', f.tpl, 'Guardar como plantilla', 'Para repetir esta rutina en un toque') +
    (f.tpl ? '<div class="field"><label for="fin-tpl">Nombre de la plantilla</label><input class="input" id="fin-tpl" data-bind="fin-tplname" value="' + esc(f.tplName) + '" autocomplete="off"></div>' : '') +
    '<div class="sheet-foot"><button class="btn" data-act="close">Seguir</button><button class="btn lime lg" data-act="fin-save">' + ic('check') + 'Guardar</button></div></div>';
  return h;
}
function stepToLogEx(s) {
  const e = { id: s.id, n: s.n, slot: s.slot || null, spec: s.spec || null, side: !!s.side, mode: s.mode, sets: s.sets.map(x => ({ side: x.side || null, kg: num(x.kg), reps: num(x.reps), secs: num(x.secs), m: num(x.m), c: num(x.c), done: !!x.done })), pain: num(s.pain), notes: s.notes || '' };
  if (s.fb) e.fb = s.fb;
  if (s.group) e.group = s.group;
  if (s.skipped) e.skipped = true;
  if (s.warmup) e.warmup = true;
  if (s.doneAs) e.doneAs = s.doneAs;
  if (!BANK_INDEX[s.id] && s.tags) e.tags = s.tags;
  if (!BANK_INDEX[s.id] && s.img) e.img = s.img;
  return e;
}
/* Convierte cualquier entrenamiento (el abierto o un borrador guardado) en registros de sesión.
   auto = guardado sin pasar por «Terminar»: solo las sesiones con algo hecho. */
function stepHasWork(s) {
  if (s.kind === 'ex') return s.sets.some(x => x.done);
  if (s.kind === 'golpeo') return s.count > 0;
  if (s.kind === 'sprint' || s.kind === 'rt') return s.done.some(Boolean);
  if (s.kind === 'test') return !!s.saved;
  if (s.kind === 'list') return s.items.some(x => x.done);
  if (s.kind === 'balon') return s.metric === 'hits' ? s.attempts > 0 : s.count > 0;
  return false;
}
function trToLogs(tr, f, auto) {
  tr = tr || TR; f = f || UI.fin || {};
  const logs = [], end = auto ? (tr.lastActive || Date.now()) : Date.now();
  const sessions = tr.sessions.length ? tr.sessions : [{ type: 'libre', title: tr.title }];
  const totEst = sessions.reduce((a, s) => a + (s.est || 10), 0) || 1;
  let warmDone = false;
  sessions.forEach((ss, idx) => {
    const own = tr.steps.filter(s => s.sess === ss.type || (idx === 0 && !s.sess && !s.warmup));
    if (auto && !own.some(stepHasWork)) return;
    const log = { date: tr.date, type: ss.type, title: ss.title, done: true, source: 'entreno', trId: tr.id, startedAt: tr.startedAt, endedAt: end, minutes: Math.max(1, Math.round((num(f.minutes) || 0) * (ss.est || 10) / totEst)), rpe: num(f.rpe), est: ss.est || null, notes: f.notes || '', modified: !!tr.modified, exercises: [], plan: ss.plan || null };
    if (auto) log.auto = true;
    if (!warmDone) { log.exercises = tr.steps.filter(s => s.warmup && s.kind === 'ex').map(stepToLogEx); warmDone = true; }
    if (tr.compressed) log.compressed = tr.compressed;
    for (const s of own) {
      if (s.kind === 'ex' && !s.warmup) log.exercises.push(stepToLogEx(s));
      else if (s.kind === 'golpeo') {
        const pd = num(s.pd) !== null ? num(s.pd) : num(f.pd);
        if (s.tec) log.tec = { level: s.level, count: s.count };
        else { log.kick = { level: s.level, pd, pn: null, count: s.count }; if (s.count < Math.ceil(s.target * 0.6)) log.kick.partial = true; }
      } else if (s.kind === 'sprint') {
        log.spr = { level: s.level, pd: num(s.pd) !== null ? num(s.pd) : num(f.pd), pn: null, reps: s.done.filter(Boolean).length };
        if (log.spr.reps < Math.ceil(s.done.length * 0.6)) log.spr.partial = true;
      } else if (s.kind === 'rt') log.rt = { level: s.level, series: s.done.filter(Boolean).length };
      else if (s.kind === 'test') { log.tests = log.tests || []; if (s.saved) log.tests.push(s.key); }
      else if (s.kind === 'balon') {
        log.ball = log.ball || { drills: [] };
        log.ball.drills.push({ id: s.id, n: s.n, metric: s.metric, unit: s.unit, count: s.count, hits: s.hits, attempts: s.attempts, target: s.target, headerStrong: s.headerStrong, lowerBetter: s.lowerBetter });
      }
    }
    const planIds = ((ss.plan && ss.plan.items) || []).map(i => i.id).join(',');
    const doneIds = log.exercises.filter(e => !e.warmup).map(e => e.id).join(',');
    if (planIds && planIds !== doneIds) log.modified = true;
    logs.push(log);
  });
  return logs;
}
function saveFinish() {
  flushTestSave();
  const f = UI.fin;
  if (f.needPain && num(f.pd) === null) { toast('Marca el dolor durante la sesión.', 'warn'); return; }
  const logs = trToLogs(TR, f);
  const ids = commitLogs(TR, logs);
  if (f.tpl) put('templates', uid('tpl'), { name: (f.tplName || TR.title).trim(), exercises: TR.steps.filter(s => s.kind === 'ex' && !s.warmup).map(s => ({ id: s.id, n: s.n, slot: s.slot, spec: s.spec, side: s.side, mode: s.mode, tags: s.tags || null, img: s.img || null, group: s.group || null })) });
  const hadField = logs.some(l => l.kick || l.spr);
  const strength = logs.some(l => STRENGTH_TYPES.includes(l.type));
  const intense = logs.some(isIntenseLog);
  let sugg = [];
  try { sugg = [].concat(...logs.map((l, i) => postSuggestions(Object.assign({ id: ids[i] }, l), ST.sessions, ST))); } catch (e) { sugg = []; }
  const date = TR.date, place = TR.place;
  closeDraft(TR);
  TR = { open: false };
  document.body.classList.remove('training'); $('#train-root').innerHTML = ''; releaseWake(); stopTick();
  UI.post = { sugg, applied: {}, place };
  resetLayers({ kind: 'sheet', id: 'post', render: () => postHtml(date, hadField, intense, strength) });
  renderSheet(true);
  scheduleRender();
  haptic(30);
}
function postHtml(date, hadField, intense, strength) {
  const ag = agendaFor(date), now = nowMin();
  const next = ag.items.find(x => x.kind === 'meal' && x.start >= now - 20 && !mealDone(x.slot, date).length);
  const P = UI.post || { sugg: [], applied: {} };
  let h = sheetHead('Sesión guardada', intense ? '<span class="c-load">Cuenta como día intenso para el RF</span>' : '<span class="c-lime">Buen trabajo</span>') + '<div class="sheet-body">';
  if (P.sugg.length) {
    h += '<div class="stack-sm"><div class="micro">Ajustes sugeridos</div>' + P.sugg.map((s, i) => '<div class="card flat tight"><div class="stack-sm"><div class="h3">' + esc(s.title) + '</div><div class="small fg2">' + esc(s.text) + '</div>' +
      (P.applied[i] ? '<span class="saved">' + ic('check') + 'Aplicado</span>' : s.kind === 'choice' ? '<button class="btn sm ' + (s.warn ? '' : 'primary') + '" data-act="post-apply" data-i="' + i + '">Aplicar al plan</button>' : s.kind === 'equip' && s.eq ? '<button class="btn sm" data-act="post-apply" data-i="' + i + '">Marcar sin ' + esc(s.eq) + '</button>' : '') + '</div></div>').join('') + '</div>';
  }
  h += '<div class="stack-sm"><div class="micro">Ahora</div>';
  if (next) { const menu = mealMenuFor(date, next); h += '<button class="blk" data-act="ag-open" data-date="' + date + '" data-key="' + next.key + '"><span class="c food">' + ic('fork') + '</span><div class="grow"><div class="t">' + esc(next.title) + ' · ' + fmtHM(next.start) + '</div><div class="s">' + esc(menu.name) + ' · ' + menu.totals.p + ' g de proteína</div></div>' + ic('chev') + '</button>'; }
  h += '<div class="blk"><span class="c" style="color:var(--cyan);background:var(--cyan-soft);border-color:rgba(60,203,242,.32)">' + ic('drop') + '</span><div class="grow"><div class="t">Repón líquido</div><div class="s">Agua o tereré con una pizca de sal. Orina clara antes de la próxima sesión.</div></div><button class="btn xs" data-act="water-add" data-date="' + date + '" data-ml="500">+500 ml</button></div>';
  if (strength) h += '<div class="blk"><span class="c sleep">' + ic('moon') + '</span><div class="grow"><div class="t">Sin baños de hielo en las próximas horas</div><div class="s">Frenan la ganancia de fuerza. Beber agua fría no tiene problema.</div></div></div>';
  h += '<button class="blk" data-act="guide" data-g="respiracion"><span class="c sleep">' + ic('wind') + '</span><div class="grow"><div class="t">Respiración 5 min</div><div class="s">Exhala largo: pasa a modo recuperación.</div></div>' + ic('chev') + '</button>';
  if (hadField) h += '<div class="blk"><span class="c pain">' + ic('cal') + '</span><div class="grow"><div class="t">Mañana te pregunto por el recto femoral</div><div class="s">Esa respuesta decide si subes de nivel.</div></div></div>';
  h += '</div><div class="sheet-foot"><button class="btn primary lg" data-act="close">Listo</button></div></div>';
  return h;
}
function applyPostSuggestion(i) {
  const P = UI.post; if (!P || !P.sugg[i]) return;
  const s = P.sugg[i];
  if (s.kind === 'choice' && s.slot && s.to) setChoice(s.slot, s.to);
  if (s.kind === 'equip' && s.eq) { const pl = P.place || 'gimnasio'; updateProfile(p => { p.places = p.places || {}; p.places[pl] = p.places[pl] || { off: [] }; const off = (p.places[pl].off || []).slice(); if (!off.includes(s.eq)) off.push(s.eq); p.places[pl].off = off; if (pl === 'gimnasio') delete p.equipmentOff; }); }
  P.applied[i] = true; refreshSheet(true);
}
