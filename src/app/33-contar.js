/* ============================================================
   CONTAR EL ENTRENO: relato libre → bloques (Gemini o lector sin IA) → editor «Lo que hice»
   La IA ordena y estima; el motor de reglas decide qué significa para el plan.
   ============================================================ */
const TT_INT = [['baja', 'Suave'], ['media', 'Media'], ['alta', 'Intensa'], ['max', 'Al máximo']];
const TT_PLACEHOLDER = 'Con un compañero, de 18:50 a 20:50: calentamiento 15 min, mucha definición con las dos piernas, tiros libres, 1 contra 1 y cambios de frente largos. Terminamos con estiramiento.';

/* o: { date } nueva · { logId } un registro guardado · { fromEd } el editor abierto */
function openTrainText(o) {
  o = o || {};
  const log = o.logId ? (S.data.sessions || []).find(s => s.id === o.logId) : null;
  const e = o.fromEd ? UI.ed : null;
  const c = (log && log.campo) || (e && e.campo) || null;
  UI.tt = {
    date: (log && log.date) || (e && e.date) || o.date || todayStr(), logId: log ? log.id : null, fromEd: !!e,
    text: (c && c.texto) || (log && log.notes) || (e && e.notes) || '', start: (c && c.start) || '', end: (c && c.end) || '',
    total: num(log ? log.minutes : e ? e.minutes : null), intensity: null, busy: false, error: '',
  };
  openSheet({ id: 'train-text', full: true, render: trainTextHtml });
}
function ttMinutes(T) {
  if (/^\d{1,2}:\d{2}$/.test(T.start || '') && /^\d{1,2}:\d{2}$/.test(T.end || '')) { let d = hm(T.end) - hm(T.start); if (d < 0) d += 1440; if (d > 0 && d <= 300) return d; }
  return T.total || null;
}
function ttMinText(T) { const m = ttMinutes(T); return m ? fmtDur(m) + ' de sesión' : 'Sin horas: la duración sale de lo que cuentes.'; }
function trainTextHtml() {
  const T = UI.tt; if (!T) return sheetHead('Contar el entreno');
  const dis = T.busy ? ' disabled' : '';
  let h = sheetHead(T.logId || T.fromEd ? 'Ordenar con IA' : 'Contar el entreno', esc(capFirst(fmtDateLong(T.date)))) + '<div class="sheet-body">';
  h += '<div class="field"><label for="tt-txt">Qué hiciste</label><textarea class="input" id="tt-txt" data-bind="tt-text" rows="6" placeholder="' + esc(TT_PLACEHOLDER) + '" autocapitalize="sentences" autocomplete="off"' + dis + '>' + esc(T.text) + '</textarea>' +
    '<span class="hint">Qué hicieron, cuánto duró y qué tan intensa fue. No hace falta contar remates ni pases.</span></div>';
  if (!T.logId && !T.fromEd) h += '<div class="field"><label for="tt-date">Fecha</label><input class="input" type="date" id="tt-date" data-bind="tt-date" value="' + esc(T.date) + '" max="' + todayStr() + '"' + dis + '></div>';
  h += '<div class="grid2"><div class="field"><label for="tt-start">Empezó</label><input class="input num" type="time" id="tt-start" data-bind="tt-start" value="' + esc(T.start) + '"' + dis + '></div>' +
    '<div class="field"><label for="tt-end">Terminó</label><input class="input num" type="time" id="tt-end" data-bind="tt-end" value="' + esc(T.end) + '"' + dis + '></div></div>' +
    '<div class="sub" id="tt-min" aria-live="polite">' + esc(ttMinText(T)) + '</div>';
  h += '<div class="field"><span class="lab" id="tt-int-l">¿Qué tan intensa fue?</span><div class="pills" role="radiogroup" aria-labelledby="tt-int-l">' +
    TT_INT.map(([k, l]) => '<button type="button" role="radio" aria-checked="' + (T.intensity === k) + '" class="pill' + (T.intensity === k ? ' on load' : '') + '" data-act="tt-int" data-v="' + k + '"' + dis + '>' + l + '</button>').join('') +
    '</div><span class="hint">Opcional. El check-in de mañana dirá cuánto te pesó.</span></div>';
  if (T.busy) h += '<div class="stack-sm" aria-live="polite"><div class="row"><span class="spinner c-blue"></span><span class="small fg2">Gemini está ordenando la sesión…</span></div><div class="skel sk-item"></div><div class="skel sk-item"></div><div class="skel sk-item"></div></div>';
  if (T.error) h += note('warn', esc(T.error));
  h += '<div class="sheet-foot"><button class="btn" data-act="tt-local"' + dis + '>Sin IA</button><button class="btn primary lg" data-act="tt-go"' + dis + '>' + (T.busy ? '<span class="spinner"></span>Ordenando' : ic('spark') + 'Ordenar') + '</button></div></div>';
  return h;
}
async function trainTextGo(local) {
  const T = UI.tt; if (!T || T.busy) return;
  const txt = (T.text || '').trim();
  if (txt.length < 4) { toast('Cuenta qué hiciste.', 'warn'); return; }
  const total = ttMinutes(T), opts = { total, intensity: T.intensity, text: txt };
  let draft, err = '';
  if (local || !AIX.available()) {
    draft = parseTrainText(txt, opts);
    if (!local) err = 'La IA necesita conexión: lo ordené sin IA.';
  } else {
    T.busy = true; T.error = ''; refreshSheet(true);
    try {
      const res = await AIX.parseTraining({ text: txt, date: T.date, total, start: T.start, end: T.end, intensity: T.intensity });
      draft = campoFromAi(res, opts);
      if (!draft.campo && !draft.ejercicios.length) { const loc = parseTrainText(txt, opts); if (loc.campo) { draft = loc; err = 'La IA no encontró bloques: lo ordené sin IA.'; } }
    } catch (e) { draft = parseTrainText(txt, opts); err = aiErrorText(e) + ' Lo ordené sin IA: revisa los bloques.'; }
    T.busy = false;
    /* Si cerraste la hoja mientras la IA pensaba, no se abre nada encima */
    const top = topSheet(); if (UI.tt !== T || !top || top.id !== 'train-text') return;
  }
  draft.ia = !local && !err;
  applyTrainDraft(draft, T, err);
}
function applyTrainDraft(d, T, err) {
  if (T.fromEd && UI.ed) { campoMerge(UI.ed, d, T, err); UI.tt = null; closeSheet(); return; }
  if (T.logId) openEditor({ logId: T.logId, noOpen: true }); else openEditor({ date: T.date, type: 'libre', noOpen: true });
  if (!UI.ed) return;
  campoMerge(UI.ed, d, T, err);
  UI.tt = null;
  replaceSheet({ id: 'editor', full: true, render: editorHtml });
}
function campoEmpty() { return { side: ST && ST.injury ? ST.side || 'd' : null, bloques: [], golpes: { der: 'no', izq: 'no' }, cabezazos: 'no', sprints: 'no', companeros: 0, pd: null, pn: null, auto: true }; }
/* Lo ordenado entra al editor sin pisar lo que ya escribiste a mano (título propio, minutos, esfuerzo, ejercicios) */
function campoMerge(e, d, T, err) {
  const txt = (T.text || '').trim();
  const generic = !e.title || e.title === 'Sesión libre' || Object.keys(STYPES).some(k => STYPES[k].n === e.title);
  if (generic || !e.id) e.title = d.titulo;
  if (d.campo) {
    const prev = e.campo || {};
    /* Lo que ya marcaste a mano (dolor, 100 %) se respeta */
    const max = Object.assign({}, d.campo.max, prev.max);
    e.campo = Object.assign(campoEmpty(), d.campo, { pd: prev.pd ?? d.campo.pd ?? null, pn: prev.pn ?? null, ia: !!d.ia, auto: !d.ia, texto: txt, start: d.inicio || T.start || '', end: d.fin || T.end || '' }, Object.keys(max).length ? { max } : {});
    if (e.type === 'libre') e.type = 'cancha';
  }
  if (d.minutos && (num(e.minutes) === null || !e.id)) e.minutes = d.minutos;
  if (T.intensity) { e.rpe = CAMPO_RPE[T.intensity]; e.rpeEst = false; }
  else if (d.rpe !== null && num(e.rpe) === null) { e.rpe = d.rpe; e.rpeEst = !!d.rpeEst; }
  if (!e.notes) e.notes = txt;
  const miss = [];
  if (!e.items.length) for (const x of d.ejercicios || []) { const it = trainExItem(x, e.date); if (it) e.items.push(it); else miss.push(x.n); }
  e.aiNote = [err, d.nota, miss.length ? 'No están en el banco: ' + miss.join(', ') + '. Agrégalos con «Añadir ejercicio».' : ''].filter(Boolean).join(' ');
  if (!e.id) e.source = d.ia ? 'ia' : 'texto';
}
/* Ejercicio de gimnasio contado → ítem del editor con sus series (solo los que están en el banco o son tuyos) */
function trainExItem(x, date) {
  if (!x.id || !(BANK_INDEX[x.id] || (S.data.custom || []).some(c => c.id === x.id))) return null;
  const p = pickItem(x.id); if (!p) return null;
  const it = itemWithSets(p, date, true), n = clamp(Math.round(num(x.series) || 3), 1, 12);
  const base = it.mode === 'time' ? { secs: num(x.seg) || 30 } : it.mode === 'dist' ? { m: 15 } : it.mode === 'contacts' ? { c: num(x.reps) || 10 } : { reps: num(x.reps) || 8, kg: num(x.kg) };
  const inj = (ST && ST.side) || 'd', hea = inj === 'd' ? 'i' : 'd';
  it.sets = [];
  for (let i = 0; i < n; i++) { if (it.side) it.sets.push(Object.assign({ side: inj, done: true }, base), Object.assign({ side: hea, done: true }, base)); else it.sets.push(Object.assign({ side: null, done: true }, base)); }
  return it;
}

/* ---------- Editor: sección Cancha ---------- */
function campoSum(c) { return (c.bloques || []).reduce((a, b) => a + (num(b.min) || 0), 0); }
function campoRefresh(e) {
  const c = e.campo; if (!c) return;
  if (c.auto) Object.assign(c, campoAutoBands(c.bloques));
  if (e.minAuto || num(e.minutes) === null) { e.minutes = campoSum(c) || null; e.minAuto = true; }
}
function campoAddBlock(e, id) {
  const a = CAMPO_ACT_INDEX[id], d = BALL_DRILL_INDEX[id]; if (!a && !d) return;
  const f = d ? ballSideFoot(d.foot, (ST && ST.side) || 'd') : null;
  const b = a ? { id, n: a.n, cat: a.cat, min: a.min, pies: a.pies, int: a.int } : { id, n: d.n, cat: ballDrillCat(d), min: d.min, pies: f === 'izq' ? 'izq' : f === 'der' ? 'der' : 'ambos', int: 'media' };
  if (!e.campo) e.campo = campoEmpty();
  e.campo.bloques.push(b);
  if (e.type === 'libre') e.type = 'cancha';
  campoRefresh(e);
}
function clBandHtml(k, label, v) {
  return '<div class="cl-band"><span class="micro" id="clb-' + k + '">' + esc(label) + '</span><div class="pills" role="radiogroup" aria-labelledby="clb-' + k + '">' +
    CAMPO_BANDS.map(b => '<button type="button" role="radio" aria-checked="' + (v === b) + '" class="pill' + (v === b ? ' on' + (b !== 'no' ? ' load' : '') : '') + '" data-act="cl-band" data-k="' + k + '" data-v="' + b + '">' + CAMPO_BAND_N[b] + '</button>').join('') + '</div></div>';
}
function clRowHtml(b, i) {
  const cat = CAMPO_CATS[b.cat] || CAMPO_CATS.otro;
  const meta = [cat.n !== b.n ? cat.n : '', b.pies && b.pies !== 'ninguno' ? CAMPO_PIES[b.pies] : '', CAMPO_INT[b.int] || ''].filter(Boolean).join(' · ');
  return '<div class="ai-item cl-item"><button type="button" class="nm" data-act="cl-blk" data-i="' + i + '"><span class="t">' + esc(b.n) + '</span><span class="s">' + esc(meta) + '</span></button>' +
    stepperHtml('cl-min-' + i, b.min, 'cl-min', 'data-i="' + i + '"', 'min') + '<button type="button" class="iconbtn sm plain" data-act="cl-del" data-i="' + i + '" aria-label="Quitar ' + esc(b.n) + '">' + ic('x') + '</button></div>';
}
function campoEditorHtml(e) {
  const c = e.campo; if (!c) return '';
  const sum = campoSum(c), injSide = ST.injury ? ST.side || 'd' : null;
  const lesK = injSide === 'i' ? 'izq' : 'der', lesBand = c.golpes[lesK] || 'no';
  const tag = (k) => (ST.injuryActive && injSide && k === lesK ? ' · ' + legSideTag() : '');
  let h = '<section class="stack" aria-labelledby="cl-h"><div class="ed-head"><span class="kicker" id="cl-h">Cancha</span><span class="meta">' + (sum ? fmtDur(sum) : '') + (c.ia ? ' · ordenado con IA' : '') + '</span></div>';
  h += c.bloques.length ? '<div class="ai-items cl-items">' + c.bloques.map(clRowHtml).join('') + '</div>' : '<div class="empty small">Sin bloques. Agrega lo que hiciste.</div>';
  if (sum && num(e.minutes) && Math.abs(sum - num(e.minutes)) > 5) h += '<div class="sub">Los bloques suman ' + fmtDur(sum) + ' y la sesión ' + fmtDur(num(e.minutes)) + '.</div>';
  h += '<button class="btn block dash" data-act="cl-add">' + ic('plus') + 'Agregar bloque con balón</button>';
  h += '<div class="stack-sm"><div class="field"><span class="lab">Golpes fuertes</span><span class="hint">Remates, tiros libres, pases largos, centros y cambios de frente. Pocos ≈ 1-10 · varios ≈ 10-30 · muchos ≈ 30 o más.</span></div>' +
    clBandHtml('der', 'Derecha' + tag('der'), c.golpes.der) + clBandHtml('izq', 'Izquierda' + tag('izq'), c.golpes.izq) +
    clBandHtml('cabezazos', 'Cabezazos con salto', c.cabezazos) + clBandHtml('sprints', 'Sprints, duelos y cambios de dirección', c.sprints) + '</div>';
  if (ST.injuryActive && lesBand !== 'no') h += toggleHtml('cl-maxt', !!(c.max && c.max[lesK] === true), 'Llegué al 100 % con la ' + (lesK === 'der' ? 'derecha' : 'izquierda'), 'Sin dolor al día siguiente, cuenta para tu nivel de golpeo.');
  const evL = ST.injuryActive && !ST.kick.top ? campoKickLevel({ campo: Object.assign({}, c, { side: injSide }), date: e.date, done: true }) : 0;
  if (evL > ST.kick.level) h += note('warn', 'Por encima de tu escalera (' + KICK[ST.kick.level].n + '): cuenta como día intenso y el día siguiente va sin golpeo. Si amaneces sin dolor, tu nivel sube a ' + KICK[evL].n + '.');
  else if (ST.injuryActive && !ST.kick.top && campoRank(lesBand) >= 2) h += note('warn', 'Golpes fuertes con la ' + (lesK === 'der' ? 'derecha' : 'izquierda') + ': cuenta como día intenso y el día siguiente va sin golpeo.');
  if (ST.injuryActive && lesBand !== 'no') {
    h += '<div class="field"><span class="lab">Dolor en el recto femoral durante</span>' + scaleHtml('pd', c.pd, { pain: true, act: 'cl-pain', l: '0 nada', r: '10 máximo' }) + '</div>';
    if (e.date < todayStr()) h += '<div class="field"><span class="lab">Al día siguiente</span>' + scaleHtml('pn', c.pn, { pain: true, act: 'cl-pain', l: '0 nada', r: '≥ 3: nada intenso' }) + '</div>';
  }
  return h + '</section>';
}
/* Hoja de un bloque: nombre, minutos, qué fue, pierna e intensidad */
function openClBlock(i) { UI.clCur = i; openSheet({ id: 'cl-blk', render: clBlkHtml }); }
function clPills(k, label, map, v) {
  return '<div class="field"><span class="lab" id="cls-' + k + '">' + label + '</span><div class="pills" role="radiogroup" aria-labelledby="cls-' + k + '">' +
    Object.keys(map).map(x => '<button type="button" role="radio" aria-checked="' + (v === x) + '" class="pill' + (v === x ? ' on' : '') + '" data-act="cl-set" data-k="' + k + '" data-v="' + x + '">' + esc(typeof map[x] === 'string' ? map[x] : map[x].n) + '</button>').join('') + '</div></div>';
}
function clBlkHtml() {
  const e = UI.ed, b = e && e.campo && e.campo.bloques[UI.clCur]; if (!b) return sheetHead('Bloque');
  return sheetHead(b.n, 'Bloque de cancha') + '<div class="sheet-body">' +
    '<div class="field"><label for="cl-n">Nombre</label><input class="input" id="cl-n" data-bind="cl-n" value="' + esc(b.n) + '" autocomplete="off" autocapitalize="sentences" enterkeyhint="done"></div>' +
    '<div class="field"><span class="lab">Minutos</span>' + stepperHtml('clb-min', b.min, 'cl-min', 'data-i="' + UI.clCur + '"', 'min') + '</div>' +
    clPills('cat', 'Qué fue', CAMPO_CATS, b.cat) + clPills('pies', 'Pierna', CAMPO_PIES, b.pies) + clPills('int', 'Intensidad', CAMPO_INT, b.int) +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="close">Listo</button></div></div>';
}

/* ---------- Revisión de un registro ---------- */
function campoLine(log) {
  const c = log.campo; if (!c || log.done === false) return '';
  const g = c.golpes || {}, d = g.der || 'no', i = g.izq || 'no';
  if (d === 'no' && i === 'no') return (c.bloques || []).length ? plural(c.bloques.length, 'bloque', 'bloques') : '';
  return 'golpes fuertes ' + (d === i ? CAMPO_BAND_N[d].toLowerCase() + ' con las dos' : 'der. ' + CAMPO_BAND_N[d].toLowerCase() + ', izq. ' + CAMPO_BAND_N[i].toLowerCase());
}
function campoReviewHtml(log) {
  const c = log.campo; if (!c) return '';
  const g = c.golpes || {};
  const bandChip = (l, b) => chip(l + ' · ' + CAMPO_BAND_N[b || 'no'].toLowerCase(), campoRank(b) >= 2 ? 'load' : '');
  let h = '<div class="card flat tight"><div class="stack-sm"><div class="row between nowrap"><span class="h3">' + ic('ball') + ' Cancha</span>' + (isIntenseLog(log) ? chip('Intensa para el RF', 'load', 'flame') : '') + '</div>';
  h += '<div>' + (c.bloques || []).map(b => '<div class="lrow"><span class="fg2">' + esc(b.n) + (b.pies === 'der' || b.pies === 'izq' ? ' <span class="fg4">· ' + esc(CAMPO_PIES[b.pies].toLowerCase()) + '</span>' : '') + '</span><b class="num">' + (num(b.min) || 0) + ' min</b></div>').join('') + '</div>';
  h += '<div class="micro">Golpes fuertes estimados</div><div class="row">' + bandChip('Derecha', g.der) + bandChip('Izquierda', g.izq) + (c.cabezazos && c.cabezazos !== 'no' ? bandChip('Cabezazos', c.cabezazos) : '') + (c.sprints && c.sprints !== 'no' ? bandChip('Sprints y duelos', c.sprints) : '') + (c.companeros ? chip(plural(c.companeros, 'compañero', 'compañeros'), '', 'users') : '') + (campoMaxLes(log) === true ? chip('Al 100 %', 'lime') : '') + '</div>';
  if (num(c.pd) !== null || num(c.pn) !== null) h += '<div class="grid2"><div class="stat ' + (painTone(c.pd) === 'pain' ? 'pain' : '') + '"><span class="v">' + (c.pd ?? '—') + '<small>/10</small></span><span class="k">Dolor durante</span></div><div class="stat ' + (painTone(c.pn) === 'pain' ? 'pain' : '') + '"><span class="v">' + (c.pn ?? '—') + '<small>/10</small></span><span class="k">Al día siguiente</span></div></div>';
  const evL = campoKickLevel(log), evO = evL ? outcome(c.pd, c.pn) : null;
  const evTxt = !evL ? 'no cuenta para el nivel de golpeo.' : evO === 'clean' ? 'cuenta como ' + KICK[evL].n + ' en tu escalera: sin dolor al día siguiente.' : evO === 'pending' ? 'si amaneces sin dolor, cuenta como ' + KICK[evL].n + ' en tu escalera.' : 'no sube tu nivel de golpeo: hubo dolor.';
  h += '<div class="sub">' + (c.ia ? ic('spark') + ' Ordenado con IA. ' : '') + 'Bandas estimadas, no conteos: ' + evTxt + ' Los sprints no suben el nivel S.</div>';
  return h + '</div></div>';
}
