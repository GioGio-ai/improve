/* ============================================================
   EDITOR DE REGISTROS ("Lo que hice"), SELECTOR DE EJERCICIOS Y PLANTILLAS
   ============================================================ */
function inferMode(sets, spec) {
  if (spec) return specMode(spec);
  const s = (sets || []).find(x => x);
  if (!s) return 'reps';
  if (num(s.secs) !== null) return 'time';
  if (num(s.m) !== null) return 'dist';
  if (num(s.c) !== null) return 'contacts';
  return 'reps';
}
function logExToItem(e) {
  const ex = exInfo(e.id, e) || {};
  return { id: e.id, n: e.n || ex.n || e.id, slot: e.slot || null, spec: e.spec || null, side: e.side !== undefined ? !!e.side : (e.sets || []).some(x => x && x.side), mode: e.mode || inferMode(e.sets, e.spec), sets: clone(e.sets || []).map(x => Object.assign({ done: true }, x)), pain: e.pain ?? null, notes: e.notes || '', fb: e.fb || null, tags: e.tags || null, img: e.img || ex.img || null, group: e.group || null, inc: incFor(ex), warmup: !!e.warmup, doneAs: e.doneAs || null };
}
function itemWithSets(it, date, done) {
  const ex = exInfo(it.id, it) || {};
  const sg = suggestSets(it, ex, ST.sessions, date, ST.side);
  return Object.assign({}, it, { mode: it.mode || specMode(it.spec), sets: sg.sets.map(x => Object.assign({}, x, { done: !!done })), pain: null, notes: '', inc: incFor(ex), img: it.img || ex.img || null });
}
function tplToItem(x) {
  const ex = exInfo(x.id, x) || {};
  return { id: x.id, n: x.n || ex.n, slot: x.slot || null, spec: x.spec || { s: 3, r: [8, 10] }, side: !!x.side, mode: x.mode || specMode(x.spec), tags: x.tags || null, img: x.img || ex.img || null, group: x.group || null, rest: restFor(ex, x.spec, x.slot), prio: 2 };
}
function itemToLogEx(it) {
  const e = { id: it.id, n: it.n, slot: it.slot || null, spec: it.spec || null, side: !!it.side, mode: it.mode, sets: (it.sets || []).map(x => ({ side: x.side || null, kg: num(x.kg), reps: num(x.reps), secs: num(x.secs), m: num(x.m), c: num(x.c), done: x.done !== false })), pain: num(it.pain), notes: it.notes || '' };
  if (it.fb) e.fb = it.fb;
  if (it.group) e.group = it.group;
  if (it.warmup) e.warmup = true;
  if (it.doneAs) e.doneAs = it.doneAs;
  if (!BANK_INDEX[it.id] && it.tags) e.tags = it.tags;
  if (!BANK_INDEX[it.id] && it.img) e.img = it.img;
  return e;
}
function itemToTpl(it) { return { id: it.id, n: it.n, slot: it.slot || null, spec: it.spec || specFromSets(it), side: !!it.side, mode: it.mode, tags: it.tags || null, img: it.img || null, group: it.group || null }; }
function specFromSets(it) {
  const sets = (it.sets || []), sides = it.side ? 2 : 1, n = Math.max(1, Math.round(sets.length / sides));
  const f = sets[0] || {};
  if (it.mode === 'time') return { s: n, t: [num(f.secs) || 30, num(f.secs) || 30] };
  if (it.mode === 'dist') return { s: n, m: num(f.m) || 15 };
  if (it.mode === 'contacts') return { s: n, c: num(f.c) || 10 };
  return { s: n, r: [num(f.reps) || 8, num(f.reps) || 8] };
}

function openEditor(o) {
  o = o || {};
  let e;
  if (o.logId) {
    const log = (S.data.sessions || []).find(s => s.id === o.logId); if (!log) return;
    e = { mode: 'log', id: log.id, date: log.date, type: log.type, title: log.title || (STYPES[log.type] || STYPES.libre).n, items: (log.exercises || []).filter(x => x && x.id).map(logExToItem), done: log.done !== false, minutes: log.minutes ?? null, rpe: log.rpe ?? null, notes: log.notes || '', kick: log.kick ? clone(log.kick) : log.spr ? clone(log.spr) : null, rt: log.rt ? clone(log.rt) : null, modified: !!log.modified, source: log.source || 'manual' };
  } else if (o.template !== undefined) {
    const t = o.template ? (S.data.templates || []).find(x => x.id === o.template) : null;
    e = { mode: 'template', id: t ? t.id : null, title: t ? t.name : '', items: t ? t.exercises.map(x => itemWithSets(tplToItem(x), todayStr(), false)) : [] };
  } else {
    const date = o.date || todayStr(), type = o.type || 'libre';
    const planned = type !== 'libre' ? findPlanned(date, type) : null;
    const fk = planned && planned.field;
    e = { mode: 'log', id: null, date, type, title: planned ? planned.title : 'Sesión libre', items: planned && !o.blank ? planned.items.map(it => itemWithSets(it, date, true)) : [], done: true, minutes: planned ? planned.est : null, rpe: null, notes: '',
      kick: fk && (fk.kind === 'golpeo' || fk.kind === 'sprint') && !fk.tec ? { level: fk.level, pd: null, pn: null } : null, rt: fk && fk.kind === 'rt' ? { level: fk.level } : null, modified: !!o.modified, source: 'manual' };
  }
  UI.ed = e;
  openSheet({ id: 'editor', full: true, render: editorHtml });
}
function editorHtml() {
  const e = UI.ed; if (!e) return '';
  const isTpl = e.mode === 'template';
  const planned = !isTpl && e.type !== 'libre' ? findPlanned(e.date, e.type) : null;
  const sub = isTpl ? 'Rutina para repetir' : esc(capFirst(fmtDateLong(e.date))) + (planned ? ' · plan: ' + esc(planned.short) : '');
  let h = sheetHead(isTpl ? (e.id ? 'Editar plantilla' : 'Nueva plantilla') : (e.id ? 'Editar registro' : 'Lo que hice'), sub) + '<div class="sheet-body">';
  h += '<div class="field"><label for="ed-title">' + (isTpl ? 'Nombre' : 'Título') + '</label><input class="input" id="ed-title" data-bind="ed-title" value="' + esc(e.title) + '" autocomplete="off"></div>';
  if (!isTpl) h += '<div class="grid2"><div class="field"><label for="ed-date">Fecha</label><input class="input" type="date" id="ed-date" data-bind="ed-date" value="' + e.date + '"></div><div class="field"><span class="lab">Estado</span><div class="seg"><button type="button" data-act="ed-status" data-v="1" class="' + (e.done ? 'on' : '') + '">Hecha</button><button type="button" data-act="ed-status" data-v="0" class="' + (!e.done ? 'on' : '') + '">No</button></div></div></div>';
  h += '<div class="scroll-x"><button class="pill" data-act="ed-blank">' + ic('trash') + 'Desde cero</button><button class="pill" data-act="ed-copy">' + ic('copy') + 'Copiar sesión</button>' +
    ((S.data.templates || []).length && !isTpl ? '<button class="pill" data-act="ed-tpl">' + ic('star') + 'Plantillas</button>' : '') + (planned ? '<button class="pill" data-act="ed-planned">' + ic('cal') + 'La planificada</button>' : '') + '</div>';
  h += '<div class="stack-sm">' + (e.items.length ? e.items.map((it, i) => edRow(it, i, e.items.length)).join('') : '<div class="empty small">Añade los ejercicios que hiciste.</div>') + '</div>';
  h += '<button class="btn block dash" data-act="ed-add">' + ic('plus') + 'Añadir ejercicio</button>';
  if (!isTpl && e.kick) {
    const isK = e.type === 'golpeo', defs = isK ? KICK : SPRINT, max = isK ? 8 : 6;
    h += '<div class="field"><label for="ed-level">' + (isK ? 'Nivel de golpeo' : 'Nivel de sprint') + '</label><select class="input" id="ed-level" data-bind="ed-level">' + Array.from({ length: max }, (_, i) => i + 1).map(i => '<option value="' + i + '"' + (i === Number(e.kick.level) ? ' selected' : '') + '>' + defs[i].n + ' · ' + esc(defs[i].t) + '</option>').join('') + '</select></div>' +
      '<div class="field"><span class="lab">Dolor durante</span>' + scaleHtml('pd', e.kick.pd, { pain: true, act: 'ed-kick', l: '0 nada', r: '10 máximo' }) + '</div>' +
      '<div class="field"><span class="lab">Dolor al día siguiente</span>' + scaleHtml('pn', e.kick.pn, { pain: true, act: 'ed-kick', l: 'vacío si fue hoy', r: '10 máximo' }) + '</div>';
  }
  if (!isTpl && e.rt) h += '<div class="field"><label for="ed-rt">Repeticiones × series</label><select class="input" id="ed-rt" data-bind="ed-rt">' + RT_LEVELS.map(l => '<option value="' + l + '"' + (l === e.rt.level ? ' selected' : '') + '>' + l.replace('x', ' × ') + '</option>').join('') + '</select></div>';
  if (!isTpl) h += '<div class="field"><span class="lab">Minutos</span>' + stepperHtml('ed-min', e.minutes, 'ed-meta', 'data-name="minutes"', 'min') + '</div>' +
    '<div class="field"><span class="lab">Esfuerzo de la sesión (RPE)</span>' + scaleHtml('rpe', e.rpe, { act: 'ed-scale', tone: 'load', l: '0 reposo', r: '10 máximo' }) + '</div>' +
    '<div class="field"><label for="ed-notes">Notas</label><textarea class="input" id="ed-notes" data-bind="ed-notes" rows="2">' + esc(e.notes) + '</textarea></div>';
  if (e.id) h += '<button class="btn sm ghost danger" data-act="' + (isTpl ? 'ed-deltpl' : 'ed-del') + '">' + ic('trash') + (isTpl ? 'Borrar plantilla' : 'Borrar registro') + '</button>';
  h += '<div class="sheet-foot">' + (!isTpl ? '<button class="btn" data-act="ed-savetpl">' + ic('star') + 'Plantilla</button>' : '') + '<button class="btn primary lg" data-act="ed-save">Guardar</button></div>';
  return h + '</div>';
}
function edRow(it, i, n) {
  const ex = exInfo(it.id, it);
  const done = (it.sets || []).filter(x => x.done !== false);
  const sum = done.length ? fmtSetsShort(done) : (it.sets || []).length ? 'Sin marcar como hechas' : (fmtSpec(it.spec, it.side) || 'Sin series');
  return '<div class="exrow" style="grid-template-columns:52px minmax(0,1fr) auto">' + thumbHtml(Object.assign({}, ex || {}, { n: it.n, img: it.img || (ex && ex.img) })) + '<button data-act="ed-sets" data-i="' + i + '" style="text-align:left;min-width:0"><div class="t">' + esc(it.n) + (it.warmup ? ' · <span class="c-load">calentamiento</span>' : '') + (it.group ? ' · <span class="c-blue">S' + esc(it.group) + '</span>' : '') + '</div><div class="s">' + esc(sum) + '</div></button>' +
    '<div class="row nowrap" style="gap:2px"><button class="iconbtn sm plain" data-act="ed-move" data-i="' + i + '" data-d="-1" aria-label="Subir"' + (i === 0 ? ' disabled' : '') + '>' + ic('up') + '</button><button class="iconbtn sm plain" data-act="ed-move" data-i="' + i + '" data-d="1" aria-label="Bajar"' + (i === n - 1 ? ' disabled' : '') + '>' + ic('down') + '</button><button class="iconbtn sm plain" data-act="ed-del-ex" data-i="' + i + '" aria-label="Quitar">' + ic('x') + '</button></div></div>';
}
function openSetEditor(i) { UI.ed.cur = i; openSheet({ id: 'setedit', render: setEditHtml }); }
function setEditHtml() {
  const e = UI.ed, it = e && e.items[e.cur]; if (!it) return sheetHead('Series');
  const ex = exInfo(it.id, it) || {};
  let h = sheetHead(it.n, esc(fmtSpec(it.spec, it.side) || 'Series')) + '<div class="sheet-body">';
  h += '<div class="seg">' + [['reps', 'Reps'], ['time', 'Tiempo'], ['dist', 'Metros'], ['contacts', 'Contactos']].map(([m, l]) => '<button type="button" data-act="se-mode" data-v="' + m + '" class="' + (it.mode === m ? 'on' : '') + '">' + l + '</button>').join('') + '</div>';
  h += toggleHtml('se-side', it.side, 'Por lado', 'Derecha e izquierda por separado');
  h += '<div class="sets">' + (it.sets || []).map((x, k) => setRowHtml(it, x, k, 'ed', -1)).join('') + '</div>';
  h += '<div class="row"><button class="btn sm" data-act="se-add">' + ic('plus') + 'Serie</button>' + ((it.sets || []).length ? '<button class="btn sm ghost" data-act="se-del">' + ic('minus') + 'Quitar serie</button>' : '') + '</div>';
  if ((ex.z || []).includes('rf')) h += '<div class="field"><span class="lab">Dolor en el recto femoral</span>' + scaleHtml('pain', it.pain, { pain: true, act: 'se-pain', l: '0 nada', r: '10 máximo' }) + '</div>';
  h += '<div class="field"><span class="lab">¿Cómo te fue?</span><div class="fbrow">' + Object.entries(FEEDBACK).map(([k, v]) => '<button type="button" class="' + (it.fb === k ? 'on' : '') + '" data-act="se-fb" data-v="' + k + '">' + v.n + '<small>' + v.d + '</small></button>').join('') + '</div></div>';
  const next = e.items[e.cur + 1];
  if (next) h += toggleHtml('se-group', it.group && it.group === next.group, 'Superserie con el siguiente', next.n);
  h += '<div class="field"><label for="se-notes">Notas</label><textarea class="input" id="se-notes" data-bind="se-notes" rows="2">' + esc(it.notes || '') + '</textarea></div>';
  h += '<div class="sheet-foot"><button class="btn primary lg" data-act="close">Listo</button></div>';
  return h + '</div>';
}
function seItem() { return UI.ed && UI.ed.items[UI.ed.cur]; }
function seAddSet() {
  const it = seItem(); if (!it) return;
  it.sets = it.sets || [];
  const last = it.sets[it.sets.length - 1] || { kg: null, reps: it.mode === 'reps' ? 8 : null, secs: it.mode === 'time' ? 30 : null, m: it.mode === 'dist' ? 15 : null, c: it.mode === 'contacts' ? 10 : null };
  const base = { kg: last.kg, reps: last.reps, secs: last.secs, m: last.m, c: last.c, done: true };
  if (it.side) { const inj = ST.side || 'd'; it.sets.push(Object.assign({}, base, { side: inj }), Object.assign({}, base, { side: inj === 'd' ? 'i' : 'd' })); }
  else it.sets.push(Object.assign({}, base, { side: null }));
}
function seDelSet() { const it = seItem(); if (!it || !it.sets.length) return; it.sets.splice(it.sets.length - (it.side ? 2 : 1), it.side ? 2 : 1); }
function seToggleSide() {
  const it = seItem(); if (!it) return;
  const inj = ST.side || 'd', hea = inj === 'd' ? 'i' : 'd';
  if (!it.side) { const out = []; (it.sets || []).forEach(x => { out.push(Object.assign({}, x, { side: inj }), Object.assign({}, x, { side: hea })); }); it.sets = out; it.side = true; }
  else { it.sets = (it.sets || []).filter(x => x.side !== hea).map(x => Object.assign({}, x, { side: null })); it.side = false; }
}
function seSetMode(m) {
  const it = seItem(); if (!it) return;
  it.mode = m;
  (it.sets || []).forEach(x => { if (m === 'time' && num(x.secs) === null) x.secs = 30; if (m === 'dist' && num(x.m) === null) x.m = 15; if (m === 'contacts' && num(x.c) === null) x.c = 10; if (m === 'reps' && num(x.reps) === null) x.reps = 8; });
}
function edSetField(k, f, raw) {
  const it = seItem(); if (!it || !it.sets[k]) return;
  let v = parseNum(raw); if (f === 'min') { f = 'secs'; v = v === null ? null : Math.round(v * 60); }
  it.sets[k][f] = v;
}
function edStep(k, f, d) {
  const it = seItem(); if (!it || !it.sets[k]) return;
  if (f === 'min') { const cur = (num(it.sets[k].secs) || 0) / 60; it.sets[k].secs = Math.max(0, Math.round((cur + d) * 60)); return; }
  const inc = f === 'kg' ? (it.inc || 2.5) : f === 'secs' ? 5 : f === 'm' ? 5 : 1;
  const cur = num(it.sets[k][f]) || 0;
  it.sets[k][f] = Math.max(0, Math.round((cur + d * inc) * 100) / 100);
}

/* ---------- Guardar ---------- */
function saveEditor() {
  const e = UI.ed; if (!e) return;
  if (e.mode === 'template') {
    if (!e.items.length) { toast('Añade al menos un ejercicio.', 'warn'); return; }
    put('templates', e.id || uid('tpl'), { name: (e.title || 'Mi rutina').trim(), exercises: e.items.map(itemToTpl) }).then(() => toast('Plantilla guardada.'));
    UI.ed = null; closeSheet(); return;
  }
  const prev = e.id ? (S.data.sessions || []).find(s => s.id === e.id) : null;
  const log = prev ? clone(prev) : { source: 'manual' };
  delete log.id;
  const planned = e.type !== 'libre' ? findPlanned(e.date, e.type) : null;
  log.date = e.date; log.type = e.type; log.title = (e.title || (STYPES[e.type] || STYPES.libre).n).trim(); log.done = e.done;
  log.minutes = num(e.minutes); log.rpe = num(e.rpe); log.notes = e.notes || '';
  log.exercises = e.items.map(itemToLogEx);
  if (planned && e.type !== 'libre') {
    const pIds = planned.items.map(i => i.id).join(','), lIds = e.items.filter(i => !i.warmup).map(i => i.id).join(',');
    log.modified = e.modified || pIds !== lIds || log.title !== planned.title;
    if (!log.est) log.est = planned.est || null;
    if (!log.plan) log.plan = planSnapshot(planned);
  }
  if (e.kick) { const k = { level: Number(e.kick.level) || 1, pd: num(e.kick.pd), pn: num(e.kick.pn) }; if (e.kick.count) k.count = e.kick.count; if (e.type === 'golpeo') log.kick = k; else log.spr = k; }
  if (e.rt) log.rt = Object.assign({}, log.rt || {}, { level: e.rt.level });
  const id = e.id || (e.type === 'libre' ? uid('s') : 's-' + e.date + '-' + e.type);
  const intense = isIntenseLog(log);
  if (!e.id && e.date <= todayStr() && e.type !== 'libre') freezeDay(e.date);
  put('sessions', id, log).then(() => toast(log.done === false ? 'Guardada como no hecha.' : intense ? 'Guardada. Cuenta como día intenso: el plan se ajusta.' : 'Guardada.'));
  UI.ed = null;
  closeAllSheets();
}
function saveEditorAsTemplate() {
  const e = UI.ed; if (!e || !e.items.length) { toast('Añade al menos un ejercicio.', 'warn'); return; }
  put('templates', uid('tpl'), { name: (e.title || 'Mi rutina').trim(), exercises: e.items.filter(i => !i.warmup).map(itemToTpl) }).then(() => toast('Plantilla guardada.'));
}

/* ---------- Copiar sesión / plantillas ---------- */
function openCopyPicker() {
  const list = (S.data.sessions || []).filter(s => s.done !== false && (s.exercises || []).some(x => x && x.id && x.sets && x.sets.length) && (!UI.ed || s.id !== UI.ed.id)).sort(byDate).reverse().slice(0, 20);
  openSheet({ id: 'copy', render: () => sheetHead('Copiar sesión', 'Se copian ejercicios, series y pesos') + '<div class="sheet-body"><div class="stack-sm">' +
    (list.length ? list.map(s => '<button class="blk" data-act="ed-copy-pick" data-id="' + esc(s.id) + '"><span class="c">' + ic(sessIcon(s.type)) + '</span><div class="grow"><div class="t">' + esc(s.title || (STYPES[s.type] || STYPES.libre).n) + '</div><div class="s">' + fmtDate(s.date) + ' · ' + plural(s.exercises.length, 'ejercicio', 'ejercicios') + '</div></div>' + ic('chev') + '</button>').join('') : '<div class="empty small">Todavía no hay sesiones con ejercicios registrados.</div>') + '</div></div>' });
}
function openTplPicker() {
  const list = S.data.templates || [];
  openSheet({ id: 'tplpick', render: () => sheetHead('Mis plantillas') + '<div class="sheet-body"><div class="stack-sm">' +
    list.map(t => '<button class="blk" data-act="ed-tpl-pick" data-id="' + esc(t.id) + '"><span class="c">' + ic('star') + '</span><div class="grow"><div class="t">' + esc(t.name) + '</div><div class="s">' + plural(t.exercises.length, 'ejercicio', 'ejercicios') + '</div></div>' + ic('chev') + '</button>').join('') + '</div></div>' });
}

/* ---------- Selector de ejercicios ---------- */
function openPicker(target) {
  UI.pick = Object.assign({ q: '', tab: 'recientes' }, UI.pick || {}, { target, q: '' });
  loadLib().then(() => { const t = topSheet(); if (t && t.id === 'picker') updatePickList(); }).catch(() => {});
  openSheet({ id: 'picker', full: true, render: pickerHtml });
}
function pickerHtml() {
  const P = UI.pick;
  return sheetHead('Añadir ejercicio', 'Banco, biblioteca y tus ejercicios') + '<div class="sheet-body">' +
    '<div class="field"><label class="sr" for="pick-q">Buscar</label><input class="input" id="pick-q" type="search" inputmode="search" enterkeyhint="search" data-pick="q" placeholder="Buscar: búlgara, nordic, squat…" value="' + esc(P.q) + '" autocomplete="off"></div>' +
    '<div class="seg">' + [['recientes', 'Recientes'], ['banco', 'Banco'], ['biblioteca', 'Biblioteca'], ['mios', 'Míos']].map(([k, l]) => '<button type="button" data-act="pick-tab" data-v="' + k + '" class="' + (P.tab === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div>' +
    '<div class="exlist" id="pick-list">' + pickListHtml() + '</div></div>';
}
function recentIds() {
  const seen = new Set(), out = [];
  (S.data.sessions || []).slice().sort(byDate).reverse().forEach(s => (s.exercises || []).forEach(e => { if (e && e.id && !e.warmup && !seen.has(e.id) && exInfo(e.id, e)) { seen.add(e.id); out.push(e); } }));
  return out.slice(0, 40);
}
function pickListHtml() {
  const P = UI.pick, q = normTxt(P.q || '');
  const match = (txt) => !q || normTxt(txt).includes(q);
  let rows = [];
  if (P.tab === 'recientes') rows = recentIds().map(e => exInfo(e.id, e)).filter(x => x && match(x.n));
  else if (P.tab === 'banco') rows = BANK.filter(e => match(e.n + ' ' + (e.m || '') + ' ' + (LABELS.pat[e.pat] || '')));
  else if (P.tab === 'mios') rows = (S.data.custom || []).map(customNorm).filter(e => match(e.n));
  else if (P.tab === 'biblioteca') {
    if (!LIB.data) return '<div class="skel" style="height:68px"></div><div class="skel" style="height:68px"></div><div class="skel" style="height:68px"></div>';
    const tr = {}; (S.data.traducciones || []).forEach(t => { tr[t.id] = t.n; });
    rows = LIB.data.filter(x => match(x.n + ' ' + (tr[x.id] || '') + ' ' + (x.pm || []).map(m => (LIB_ES.muscles[m] || '') + ' ' + m).join(' '))).slice(0, 60).map(x => exInfo(x.id));
  }
  if (!rows.length) return '<div class="empty small">' + (P.tab === 'recientes' ? 'Todavía no hay ejercicios recientes. Busca en Banco o Biblioteca.' : 'Sin resultados.') + '</div>';
  return rows.slice(0, 60).map(ex => '<button class="exrow" data-act="pick" data-id="' + esc(ex.id) + '">' + thumbHtml(ex) + '<div style="min-width:0"><div class="t">' + esc(ex.n) + '</div><div class="s">' + esc([LABELS.pat[ex.pat], (ex.z || []).slice(0, 2).map(z => LABELS.z[z]).filter(Boolean).join(', ')].filter(Boolean).join(' · ')) + '</div></div><span class="f">' + (ST.injuryActive && (ex.f || 1) > ST.phase ? 'F' + ex.f + '+' : '') + '</span></button>').join('');
}
function updatePickList() { const el = $('#pick-list'); if (el) { el.innerHTML = pickListHtml(); hydrateThumbs(el); } }
function pickItem(id) {
  const ex = exInfo(id); if (!ex) return null;
  const slot = (ex.s || []).find(sl => PRESC[sl]) || null;
  let spec = slot ? specFor(slot, ST.phase) : null;
  if (!spec || (spec.min && ex.pat !== 'movilidad')) spec = ex.c === 'iso' ? { s: 3, t: [30, 30] } : (ex.pat === 'movilidad' || ex.pat === 'respiracion') ? { min: 5 } : { s: 3, r: [8, 10] };
  const it = makeItem(ex, slot, spec);
  if (!BANK_INDEX[id]) { it.tags = { pat: ex.pat, z: ex.z || [], k: ex.k, c: ex.c, lat: ex.lat, fv: ex.fv }; it.img = ex.img || null; }
  return it;
}
function onPick(id) {
  const it = pickItem(id); if (!it) return;
  const target = UI.pick.target;
  if (target === 'ed') { UI.ed.items.push(itemWithSets(it, UI.ed.mode === 'template' ? todayStr() : UI.ed.date, UI.ed.mode !== 'template')); UI.ed.modified = true; closeSheet(); }
  else if (target === 'tr-add') trAddItem(it);
  else if (target === 'tr-swapany') trReplaceCurrent(Object.assign(it, { spec: curStep().spec || it.spec }), { from: curStep().id, reason: 'variante' });
}

/* ---------- Cambiar ejercicio de un hueco del plan ---------- */
function openSwap(slot, currentId, target) {
  const alts = slotAlternatives(slot, { bank: ST.bank, phase: ST.phase, injuryActive: ST.injuryActive, equipmentOff: ST.equipmentOff });
  const choices = (S.data.settings && S.data.settings.choices) || {};
  openSheet({ id: 'swap', render: () => sheetHead('Cambiar ejercicio', esc(SLOT_NAMES[slot] || slot) + (ST.injuryActive ? ' · permitidos en ' + PHASES[ST.phase].n : '')) + '<div class="sheet-body"><div class="exlist">' +
    alts.map(e => '<button class="exrow" data-act="' + (target === 'tr' ? 'tr-swap-pick' : 'choose') + '" data-slot="' + esc(slot) + '" data-id="' + esc(e.id) + '">' + thumbHtml(e) + '<div style="min-width:0"><div class="t">' + esc(e.n) + (e.id === currentId ? ' · <span class="c-blue">actual</span>' : '') + '</div><div class="s">' + esc((e.cue || '').slice(0, 80)) + ((e.cue || '').length > 80 ? '…' : '') + '</div></div><span class="f">F' + (e.f || 1) + '+</span></button>').join('') + '</div>' +
    (target !== 'tr' && choices[slot] ? '<button class="btn sm ghost block" data-act="unchoose" data-slot="' + esc(slot) + '">Volver a la elección automática</button>' : '') +
    (target !== 'tr' ? '<p class="sub">Tu elección se usa en todas las sesiones con este hueco.</p>' : '') + '</div>' });
}
function setChoice(slot, id) {
  const s = clone(S.data.settings || {}); delete s.id; s.choices = s.choices || {};
  if (id) s.choices[slot] = id; else delete s.choices[slot];
  put('settings', 'main', s).then(() => toast(id ? 'Cambio guardado en tu plan.' : 'Vuelve la elección automática.'));
}
