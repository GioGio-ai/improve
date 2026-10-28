/* ============================================================
   EVENTOS E INICIO
   ============================================================ */
const RENDERERS = { hoy: viewHoy, entreno: viewEntreno, comida: viewComida, progreso: viewProgreso, perfil: viewPerfil, coach: viewCoach };
function afterRender() {
  hydrateThumbs($('#view'));
  hydrateMealImgs($('#view'));
  hydrateMedia($('#view'));
  const imp = $('#import-file');
  if (imp && !imp.getAttribute('data-bound')) { imp.setAttribute('data-bound', '1'); imp.addEventListener('change', importData); }
  const t = LAYERS[LAYERS.length - 1];
  if (t && t.kind === 'sheet') refreshSheet();
}
function updateSession(id, fn) { const s = (S.data.sessions || []).find(x => x.id === id); if (!s) return Promise.resolve(); const d = clone(s); delete d.id; fn(d); return put('sessions', id, d); }
function agendaSet(date, key, patch) {
  const prev = agendaDoc(date);
  UI.agUndo = { date, key, prev: prev && prev.items && prev.items[key] ? clone(prev.items[key]) : null };
  const doc = clone(prev || { date, items: {} }); delete doc.id; doc.date = date; doc.items = doc.items || {};
  if (patch === null) delete doc.items[key]; else doc.items[key] = Object.assign({}, doc.items[key] || {}, patch);
  return put('agenda', date, doc);
}

document.addEventListener('click', (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const act = el.getAttribute('data-act'), g = (k) => el.getAttribute('data-' + k);
  const today = todayStr();
  switch (act) {
    /* ---- general ---- */
    case 'scrim': if (e.target === el) closeSheet(); return;
    case 'close': closeSheet(); return;
    case 'close-go': e.preventDefault(); closeAllSheets(); location.hash = g('href'); return;
    case 'hoy-day': UI.hoyDate = g('date'); if (UI.view !== 'hoy') { closeAllSheets(); location.hash = '#hoy'; } else scheduleRender(); return;
    case 'day': openDay(g('date')); return;
    case 'session': openSession(g('date'), g('type')); return;
    case 'start': { const s = findPlanned(g('date'), g('type')); if (s) startSessionTraining(s); return; }
    case 'start-block': startBlockTraining(g('date'), g('key')); return;
    case 'block-done': { const it = agendaFor(g('date')).items.find(x => x.key === g('key')); if (it && it.block) openQuickDone(g('date'), it.block.sessions.filter(s => !findLog(g('date'), s.type)).map(s => s.type), it.dur); return; }
    case 'block-short': openShort(g('date'), g('key')); return;
    case 'short-min': UI.short.min = Number(g('v')); refreshSheet(true); return;
    case 'short-go': { const q = UI.short, s = findPlanned(q.date, q.type); if (!s) return; const c = compressSession(s, q.min); startTraining({ date: q.date, key: 'gym', title: s.title + ' · ' + q.min + ' min', sessions: [Object.assign({}, c.session, { est: c.est })], warmup: c.session.warmup }, { compressed: q.min }); return; }
    case 'ag-open': openAgendaItem(g('date'), g('key')); return;
    case 'ag-shift': { const it = agendaFor(g('date')).items.find(x => x.key === g('key')); if (it) { agendaSet(g('date'), g('key'), { start: it.start + Number(g('d')) }).then(() => refreshSheet(true)); haptic(8); } return; }
    case 'ag-unmove': agendaSet(g('date'), g('key'), null).then(() => { refreshSheet(true); toast('Vuelve a la hora sugerida.'); }); return;
    case 'ag-reset': { const d = g('date'); remove('agenda', d).then(() => toast('Horario sugerido restaurado.')); return; }
    case 'ag-undo': { const u = UI.agUndo; if (!u) return; const doc = clone(agendaDoc(u.date) || { date: u.date, items: {} }); delete doc.id; doc.items = doc.items || {}; if (u.prev) doc.items[u.key] = u.prev; else delete doc.items[u.key]; put('agenda', u.date, doc); UI.agUndo = null; $('#toast').hidden = true; return; }
    case 'ag-hide': agendaSet(g('date'), g('key'), { hidden: true }).then(() => toast('Quitado de la agenda de hoy.')); closeSheet(); return;
    case 'checkin': openCheckin(); return;
    case 'ck-step': { const v = UI.checkinDraft; v.sleepH = clamp((num(v.sleepH) || 9) + Number(g('d')) * 0.25, 3, 13); refreshSheet(true); return; }
    case 'ck-scale': UI.checkinDraft[g('name')] = Number(g('v')); refreshSheet(true); return;
    case 'ck-save': saveCheckin(); return;
    case 'new-log': openEditor({ date: g('date') || today, type: 'libre' }); return;
    case 'edit-log': openEditor({ logId: g('id') }); return;
    case 'quick-done': { const s = findPlanned(g('date'), g('type')); openQuickDone(g('date'), [g('type')], s ? s.est : 45); return; }
    case 'qd-step': UI.qd.minutes = Math.max(0, (num(UI.qd.minutes) || 0) + Number(g('d')) * 5); refreshSheet(true); return;
    case 'qd-scale': UI.qd[g('name')] = Number(g('v')); refreshSheet(true); return;
    case 'qd-save': saveQuickDone(); return;
    case 'not-done': markNotDone(g('date'), g('type')); return;
    case 'did-other': openEditor({ date: g('date'), type: g('type'), modified: true }); return;
    case 'move': openMove(g('date'), g('type')); return;
    case 'move-to': moveBlock(g('from'), g('type'), g('to')); return;
    case 'remove-block': { const d = g('date'); setPlanDay(d, dayPlan(d).types.filter(t => t !== g('type'))).then(() => toast('Quitada de este día.')); closeAllSheets(); return; }
    case 'reset-day': setPlanDay(g('date'), null).then(() => toast('Plan del día restaurado.')); closeAllSheets(); return;
    case 'pn': { const v = Number(g('v')); updateSession(g('id'), d => { if (d.kick) d.kick.pn = v; if (d.spr) d.spr.pn = v; }); toast(v >= 3 ? 'Registrado. Con ' + v + '/10 bajas un nivel: hoy nada intenso para el RF.' : v > 0 ? 'Registrado. Repites el mismo nivel.' : 'Registrado: sesión limpia.', v >= 3 ? 'warn' : 'ok'); return; }
    case 'ex': openExercise(g('id')); return;
    case 'ex-ai': openExerciseAI(g('id')); return;
    case 'exai-retry': { const ex = exInfo(g('id')); if (ex) loadExerciseAI(ex, true); return; }
    case 'swap': openSwap(g('slot'), g('ex'), 'plan'); return;
    case 'choose': { setChoice(g('slot'), g('id')); const t = topSheet(); if (t && t.id === 'swap') closeSheet(); else refreshSheet(true); return; }
    case 'unchoose': setChoice(g('slot'), null); closeSheet(); return;
    case 'week': UI.weekOffset += Number(g('d')); scheduleRender(); return;
    case 'en-tab': UI.enTab = g('v'); scheduleRender(); return;
    case 'hist-more': UI.histLimit += 21; scheduleRender(); return;
    case 'guide': openGuide(g('g')); return;
    case 'breath': if (UI.breath && UI.breath.running) stopBreath(); else startBreath(); return;
    case 'breath-ex': UI.breath = Object.assign({}, UI.breath || {}, { ex: Number(g('v')) }); if (UI.breath.running) { stopBreath(true); startBreath(); } else refreshSheet(true); return;
    /* ---- perfil y lesión ---- */
    case 'edit-profile': openProfile(); return;
    case 'pf-save': saveProfile(); return;
    case 'edit-injury': openInjury(false); return;
    case 'new-injury': openInjury(true); return;
    case 'ij-side': UI.ij.side = g('v'); refreshSheet(true); return;
    case 'ij-save': saveInjury(); return;
    case 'injury-check': { const gk = g('g'), k = g('k'); updateInjury(d => { d[gk] = d[gk] || {}; d[gk][k] = !d[gk][k]; }); return; }
    case 'phase-up': { const nx = PHASES[ST.phase + 1]; openConfirm('Avanzar a ' + nx.n, 'Pasas a ' + nx.n + ' · ' + esc(nx.t) + '. El plan sube de exigencia desde hoy. Con dolor 3/10 o más vuelves a la fase anterior.', 'do-phase', { to: ST.phase + 1 }); return; }
    case 'phase-down': openConfirm('Volver a ' + PHASES[ST.phase - 1].n, 'El plan baja de exigencia desde hoy. Úsalo si hubo dolor o una recaída.', 'do-phase', { to: ST.phase - 1 }); return;
    case 'do-phase': { const to = Number(g('to')); updateInjury(d => { d.phase = to; d.phaseLog = (d.phaseLog || []).concat([{ phase: to, date: today, note: to > ST.phase ? 'Criterios cumplidos' : 'Retroceso' }]); }).then(() => toast('Fase actualizada: ' + PHASES[to].n + '.')); closeAllSheets(); return; }
    case 'resolve-injury': openConfirm('Cerrar lesión', 'La lesión pasa a resuelta y el plan trabaja en modo rendimiento.', 'do-resolve'); return;
    case 'do-resolve': updateInjury(d => { d.status = 'resuelta'; d.resolvedAt = today; }).then(() => toast('Lesión cerrada.')); closeAllSheets(); return;
    case 'add-weight': openWeight(); return;
    case 'wt-step': UI.wt.kg = Math.max(0, Math.round(((num(UI.wt.kg) || 88) + Number(g('d')) * 0.1) * 10) / 10); refreshSheet(true); return;
    case 'wt-save': { const kg = num(UI.wt.kg); if (!kg) { toast('Escribe el peso en kg.', 'warn'); return; } put('weights', 'w-' + (UI.wt.date || today), { date: UI.wt.date || today, kg }).then(() => toast('Peso guardado.')); closeSheet(); return; }
    case 'cal': { const key = g('key'), i = Number(g('i')); updateProfile(p => { if (key === 'restDay') p.restDay = i; else { const arr = (p[key] || []).slice(); const ix = arr.indexOf(i); if (ix >= 0) arr.splice(ix, 1); else arr.push(i); p[key] = arr.sort(); } }); return; }
    case 'equip': { const v = g('v'); updateProfile(p => { const off = (p.equipmentOff || []).slice(); const ix = off.indexOf(v); if (ix >= 0) off.splice(ix, 1); else off.push(v); p.equipmentOff = off; }); return; }
    case 'trial-add': { const v = ($('#trial-date') || {}).value; if (!v) { toast('Elige una fecha.', 'warn'); return; } updateProfile(p => { const t = (p.trials || []).slice(); if (!t.includes(v)) t.push(v); p.trials = t.sort(); }).then(() => toast('Prueba agregada: el plan se ajusta.')); return; }
    case 'trial-del': { const v = g('v'); updateProfile(p => { p.trials = (p.trials || []).filter(x => x !== v); }); return; }
    case 'sched-nap': setSchedule('nap', !(scheduleOf(S.data.profile).nap !== false)); return;
    case 'export': exportData(); return;
    case 'photo-set': pickMediaPhoto(el.dataset.k); return;
    case 'sign-out': openConfirm('Cerrar sesión', 'Tus datos quedan guardados en tu cuenta. Para volver a entrar necesitas tu contraseña.', 'do-sign-out'); return;
    case 'do-sign-out': closeAllSheets(); if (FB && FB.signOut) FB.signOut(); return;
    /* ---- tests ---- */
    case 'new-test': openTest(null, g('date') || today); return;
    case 'edit-test': openTest(g('id')); return;
    case 'test-rn': UI.test.rn = g('v'); refreshSheet(true); return;
    case 'test-scale': UI.test[g('name')] = Number(g('v')); refreshSheet(true); return;
    case 'test-save': saveTest(); return;
    case 'del-test': openConfirm('Borrar test', 'Los criterios se recalculan con los tests anteriores.', 'do-del-test', { id: g('id') }, true); return;
    case 'do-del-test': remove('tests', g('id')).then(() => toast('Test borrado.')); closeAllSheets(); return;
    /* ---- coach ---- */
    case 'coach-ask': coachAsk(g('q'), g('l') || g('q')); return;
    case 'coach-send': { const q = (UI.coach.draft || '').trim(); if (!q || UI.coach.busy) return; UI.coach.draft = ''; const ta = $('#coach-q'); if (ta) { ta.value = ''; ta.blur(); } coachAsk(q); return; }
    case 'coach-stop': if (UI.coach.ctl) UI.coach.ctl.abort(); return;
    case 'coach-clear': UI.coach.turns = []; scheduleRender(); return;
    /* ---- ejercicios ---- */
    case 'ex-tab': UI.exTab = g('v'); scheduleRender(); return;
    case 'bank-phase': UI.bank.phaseOk = !UI.bank.phaseOk; scheduleRender(); return;
    case 'bank-zone': UI.bank.zone = UI.bank.zone === g('v') ? '' : g('v'); UI.bank.limit = 30; scheduleRender(); return;
    case 'bank-more': UI.bank.limit += 30; scheduleRender(); return;
    case 'lib-muscle': UI.lib.muscle = UI.lib.muscle === g('v') ? '' : g('v'); UI.lib.limit = 40; scheduleRender(); return;
    case 'lib-more': UI.lib.limit += 40; scheduleRender(); return;
    case 'lib-ex': openLibExercise(g('id')); return;
    case 'translate': translateLib(g('id')); return;
    case 'lib-add': openCustom(g('id')); return;
    case 'new-custom': openCustom(null); return;
    case 'cx-multi': { const f = g('f'), v = g('v'), arr = UI.cx[f]; const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); refreshSheet(true); return; }
    case 'cx-save': saveCustom(); return;
    case 'del-custom': openConfirm('Borrar ejercicio', 'Se borra de tu banco.', 'do-del-custom', { id: g('id') }, true); return;
    case 'do-del-custom': remove('custom', g('id')).then(() => toast('Ejercicio borrado.')); closeAllSheets(); return;
    case 'tpl-new': openEditor({ template: null }); return;
    case 'tpl-edit': openEditor({ template: g('id') }); return;
    case 'tpl-start': { const t = (S.data.templates || []).find(x => x.id === g('id')); if (!t) return; const items = t.exercises.map(tplToItem); const legs = items.some(it => { const x = exInfo(it.id, it) || {}; return (x.z || []).some(z => ['rf', 'cuad', 'isquio', 'gluteo', 'aductor'].includes(z)); }); startTraining({ date: today, key: 'gym', libre: true, title: t.name, sessions: [{ type: 'libre', title: t.name, short: t.name, items, est: estimateSession({ items, warmup: null, field: null }), field: null, date: today }], warmup: warmupFor(legs ? 'fuerzaA' : 'superior', ST) }, { template: t.id }); return; }
    /* ---- editor ---- */
    case 'ed-status': UI.ed.done = g('v') === '1'; refreshSheet(true); return;
    case 'ed-blank': UI.ed.items = []; UI.ed.modified = true; refreshSheet(true); return;
    case 'ed-planned': { const p = findPlanned(UI.ed.date, UI.ed.type); if (p) { UI.ed.items = p.items.map(it => itemWithSets(it, UI.ed.date, true)); UI.ed.title = p.title; } refreshSheet(true); return; }
    case 'ed-copy': openCopyPicker(); return;
    case 'ed-copy-pick': { const s = (S.data.sessions || []).find(x => x.id === g('id')); if (s) { UI.ed.items = (s.exercises || []).filter(x => x && x.id).map(logExToItem); UI.ed.modified = true; if (UI.ed.type === 'libre' && !UI.ed.id) UI.ed.title = s.title || UI.ed.title; } closeSheet(); return; }
    case 'ed-tpl': openTplPicker(); return;
    case 'ed-tpl-pick': { const t = (S.data.templates || []).find(x => x.id === g('id')); if (t) { UI.ed.items = t.exercises.map(x => itemWithSets(tplToItem(x), UI.ed.date, true)); UI.ed.modified = true; if (UI.ed.type === 'libre' && !UI.ed.id) UI.ed.title = t.name; } closeSheet(); return; }
    case 'ed-add': openPicker('ed'); return;
    case 'ed-sets': openSetEditor(Number(g('i'))); return;
    case 'ed-move': { const i = Number(g('i')), j = i + Number(g('d')), a = UI.ed.items; if (j < 0 || j >= a.length) return; const t = a[i]; a[i] = a[j]; a[j] = t; UI.ed.modified = true; refreshSheet(true); return; }
    case 'ed-del-ex': UI.ed.items.splice(Number(g('i')), 1); UI.ed.modified = true; refreshSheet(true); return;
    case 'ed-kick': UI.ed.kick[g('name')] = Number(g('v')); refreshSheet(true); return;
    case 'ed-scale': UI.ed[g('name')] = Number(g('v')); refreshSheet(true); return;
    case 'ed-meta': UI.ed.minutes = Math.max(0, (num(UI.ed.minutes) || 0) + Number(g('d')) * 5); refreshSheet(true); return;
    case 'ed-save': saveEditor(); return;
    case 'ed-savetpl': saveEditorAsTemplate(); return;
    case 'ed-del': openConfirm('Borrar registro', 'Se borra este registro. Los niveles y la carga se recalculan.', 'do-ed-del', { id: UI.ed.id }, true); return;
    case 'do-ed-del': remove('sessions', g('id')).then(() => toast('Registro borrado.')); UI.ed = null; closeAllSheets(); return;
    case 'ed-deltpl': openConfirm('Borrar plantilla', 'La plantilla se borra. Tus registros no cambian.', 'do-ed-deltpl', { id: UI.ed.id }, true); return;
    case 'do-ed-deltpl': remove('templates', g('id')).then(() => toast('Plantilla borrada.')); UI.ed = null; closeAllSheets(); return;
    case 'se-mode': seSetMode(g('v')); refreshSheet(true); return;
    case 'se-side': seToggleSide(); refreshSheet(true); return;
    case 'se-add': seAddSet(); refreshSheet(true); return;
    case 'se-del': seDelSet(); refreshSheet(true); return;
    case 'se-pain': seItem().pain = Number(g('v')); refreshSheet(true); return;
    case 'se-fb': { const it = seItem(); it.fb = it.fb === g('v') ? null : g('v'); refreshSheet(true); return; }
    case 'se-group': { const e2 = UI.ed, it = e2.items[e2.cur], nx = e2.items[e2.cur + 1]; if (!nx) return; if (it.group && it.group === nx.group) { it.group = null; nx.group = null; } else { const gname = it.group || String.fromCharCode(65 + (new Set(e2.items.map(x => x.group).filter(Boolean)).size % 26)); it.group = gname; nx.group = gname; } refreshSheet(true); return; }
    case 'ed-step': edStep(Number(g('k')), g('f'), Number(g('d'))); refreshSheet(true); return;
    case 'ed-done': { const it = seItem(); if (it && it.sets[Number(g('k'))]) { const x = it.sets[Number(g('k'))]; x.done = x.done === false; } refreshSheet(true); return; }
    case 'pick-tab': UI.pick.tab = g('v'); refreshSheet(true); if (g('v') === 'biblioteca') loadLib().then(updatePickList).catch(() => {}); return;
    case 'pick': onPick(g('id')); return;
    /* ---- entrenamiento ---- */
    case 'tr-resume': resumeTraining(); return;
    case 'tr-force': { const p = UI.pendingStart; clearDraft(); closeAllSheets(); if (p) startTraining(p.spec, Object.assign({}, p.opts, { force: true })); return; }
    case 'tr-min': minimizeTraining(false); return;
    case 'tr-finish': openFinish(); return;
    case 'tr-ck': { const s = curStep(), x = s.items[Number(g('k'))]; x.done = !x.done; renderTrain(); saveDraft(); return; }
    case 'tr-skip': { const s = curStep(); s.skipped = true; if (s.kind === 'ex') TR.modified = true; closeAllSheets(); if (TR.cur < TR.steps.length - 1) trNav(1); else renderTrain(); return; }
    case 'tr-skipwarm': trSkipWarm(); return;
    case 'tr-count': { const s = curStep(); s.count = Math.max(0, s.count + Number(g('d'))); haptic(8); renderTrain(); saveDraft(); return; }
    case 'tr-pd': curStep().pd = Number(g('v')); if (Number(g('v')) >= 3) beep(1, 440); renderTrain(); saveDraft(); return;
    case 'tr-rep': { const s = curStep(), k = Number(g('k')); s.done[k] = !s.done[k]; if (s.done[k] && s.done.some(d => !d)) startRest(s.rest); else TR.rest = null; haptic(14); renderTrain(); saveDraft(); return; }
    case 'tr-step': trStep(Number(g('k')), g('f'), Number(g('d'))); return;
    case 'tr-edit': TR.edit = Number(g('k')); renderTrain(); return;
    case 'tr-done': { const s = curStep(), k = Number(g('k')); if (!s.sets[k]) return; if (s.sets[k].done) { s.sets[k].done = false; renderTrain(); saveDraft(); } else completeSet(TR.cur, k); return; }
    case 'tr-hold': { const s = curStep(), k = Number(g('k')), secs = num(s.sets[k].secs) || (s.spec && s.spec.t ? s.spec.t[0] : s.spec && s.spec.min ? s.spec.min * 60 : 30); ensureAudio(); TR.rest = null; TR.restMin = false; TR.hold = { step: TR.cur, k, until: Date.now() + secs * 1000, total: secs }; renderTrain(); return; }
    case 'tr-hold-stop': { const h = TR.hold; if (!h) return; const s = TR.steps[h.step]; const done = Math.round((Date.now() - (h.until - h.total * 1000)) / 1000); if (s.sets[h.k]) s.sets[h.k].secs = Math.max(1, done); TR.hold = null; completeSet(h.step, h.k); return; }
    case 'tr-hold-cancel': TR.hold = null; renderTrain(); return;
    case 'tr-hold-add': if (TR.hold) { TR.hold.until += Number(g('d')) * 1000; TR.hold.total += Number(g('d')); } renderTrain(); return;
    case 'tr-rest': if (TR.rest) { TR.rest.until += Number(g('d')) * 1000; TR.rest.total = Math.max(TR.rest.total, Math.round((TR.rest.until - Date.now()) / 1000)); if (TR.rest.until <= Date.now()) TR.rest = null; } haptic(8); renderTrain(); saveDraft(); return;
    case 'tr-rest-skip': e.stopPropagation(); TR.rest = null; renderTrain(); saveDraft(); return;
    case 'tr-rest-min': TR.restMin = true; renderTrain(); return;
    case 'tr-rest-max': TR.restMin = false; renderTrain(); return;
    case 'tr-prev': trNav(-1); return;
    case 'tr-next': trNav(1); return;
    case 'tr-add': openPicker('tr-add'); return;
    case 'tr-menu': trMenu(); return;
    case 'tr-copy': trCopy(); return;
    case 'tr-ai': { const s = curStep(); if (s && s.kind === 'ex') openExerciseAI(s.id, s.n); return; }
    case 'tr-busy': trBusy(); return;
    case 'tr-alt': trAlt(g('id'), g('mode')); return;
    case 'tr-noeq': { const eqs = String(g('eq') || '').split('|').filter(Boolean); updateProfile(p => { const off = (p.equipmentOff || []).slice(); eqs.forEach(q => { if (!off.includes(q)) off.push(q); }); p.equipmentOff = off; }).then(() => toast('Marcado como no disponible: el plan elige alternativas.')); const r = busyAlternatives(curStep()); if (r.list[0]) trAlt(r.list[0].id, 'hoy'); else closeAllSheets(); return; }
    case 'tr-swap': { const s = curStep(); openSwap(s.slot, s.id, 'tr'); return; }
    case 'tr-swap-pick': { const ex = exInfo(g('id')); const s = curStep(); if (!ex || !s) return; trReplaceCurrent(makeItem(ex, g('slot'), s.spec), { from: s.id, reason: 'variante' }); return; }
    case 'tr-pickswap': openPicker('tr-swapany'); return;
    case 'tr-superset': { const s = curStep(), nx = TR.steps[TR.cur + 1]; if (!nx || nx.kind !== 'ex') return; if (s.group && s.group === nx.group) { s.group = null; nx.group = null; } else { const gname = s.group || String.fromCharCode(65 + (new Set(TR.steps.map(x => x.group).filter(Boolean)).size % 26)); s.group = gname; nx.group = gname; } closeAllSheets(); renderTrain(); saveDraft(); return; }
    case 'tr-move': { const i = TR.cur, j = i + Number(g('d')); if (j < 0 || j >= TR.steps.length) return; const t = TR.steps[i]; TR.steps[i] = TR.steps[j]; TR.steps[j] = t; TR.cur = j; TR.modified = true; closeAllSheets(); renderTrain(true); saveDraft(); return; }
    case 'tr-remove': { TR.steps.splice(TR.cur, 1); TR.modified = true; if (!TR.steps.length) TR.steps.push({ kind: 'list', items: [{ n: 'Sesión vacía', d: 'Añade ejercicios', done: false }] }); TR.cur = Math.min(TR.cur, TR.steps.length - 1); closeAllSheets(); renderTrain(true); saveDraft(); return; }
    case 'tr-pain': { const s = curStep(); s.pain = Number(g('v')); renderTrain(); saveDraft(); if (s.pain >= 3) beep(1, 440); return; }
    case 'tr-fb': { const s = curStep(); s.fb = s.fb === g('v') ? null : g('v'); haptic(8); renderTrain(); saveDraft(); return; }
    case 'tr-addset': { const s = curStep(); const last = s.sets[s.sets.length - 1] || {}; if (s.side) { const a = s.sets[s.sets.length - 2] || last; s.sets.push(Object.assign({}, a, { done: false }), Object.assign({}, last, { done: false })); } else s.sets.push(Object.assign({}, last, { done: false })); renderTrain(); saveDraft(); return; }
    case 'tr-delset': { const s = curStep(); const n = s.side ? 2 : 1; if (s.sets.length > n) s.sets.splice(s.sets.length - n, n); renderTrain(); saveDraft(); return; }
    case 'tr-test-rn': { const s = curStep(); s.val = g('v'); renderTrain(); trTestSave(s); return; }
    case 'tr-test-scale': { const s = curStep(), v = Number(g('v')); if (g('name') === 'rnPain') s.rnPain = v; else s.val = v; renderTrain(); trTestSave(s); return; }
    case 'fin-step': UI.fin.minutes = Math.max(1, (num(UI.fin.minutes) || 0) + Number(g('d')) * 5); refreshSheet(true); return;
    case 'fin-scale': UI.fin[g('name')] = Number(g('v')); refreshSheet(true); return;
    case 'fin-tpl': UI.fin.tpl = !UI.fin.tpl; refreshSheet(true); return;
    case 'fin-save': saveFinish(); return;
    case 'post-apply': applyPostSuggestion(Number(g('i'))); return;
    /* ---- comida ---- */
    case 'food-day': UI.foodDate = addDays(UI.foodDate || today, Number(g('d'))); scheduleRender(); return;
    case 'food-today': UI.foodDate = null; scheduleRender(); return;
    case 'meal-photo': pickPhoto(g('date') || today, g('slot') || null, false); return;
    case 'meal-gallery': pickPhoto(g('date') || today, g('slot') || null, true); return;
    case 'meal-text': openMealText(g('date') || today, g('slot') || null); return;
    case 'meal-text-go': mealTextGo(false); return;
    case 'meal-text-local': mealTextGo(true); return;
    case 'meal-search': openFoodSearch(g('date') || today, false); return;
    case 'meal-add-food': openFoodSearch(UI.meal ? UI.meal.date : today, true); return;
    case 'food-pick': foodPick(g('id')); return;
    case 'meal-ate': eatSuggested(g('date'), g('key')); return;
    case 'meal-undo': remove('meals', g('id')).then(() => toast('Registro deshecho.', 'info')); return;
    case 'meal-edit': editMeal(g('id')); return;
    case 'meal-del': { const id = g('id'); remove('meals', id); remove('mealimg', id).catch(() => {}); UI.meal = null; closeAllSheets(); toast('Comida borrada.', 'info'); return; }
    case 'meal-save': saveMeal(); return;
    case 'meal-item-del': UI.meal.items.splice(Number(g('i')), 1); refreshSheet(true); return;
    case 'meal-g': { const i = Number(g('i')), it = UI.meal.items[i]; if (!it) return; const fd = it.id && FOOD_INDEX[it.id]; const step = fd && fd.ug && ['unidad', 'vaso', 'cda', 'feta', 'pote', 'lata', 'media'].includes(fd.unit) ? fd.ug : it.g >= 200 ? 25 : 10; mealSetGrams(i, Math.max(0, it.g + Number(g('d')) * step)); refreshSheet(true); return; }
    case 'menu-var': { const k = g('date') + ':' + g('key'); UI.menuVar[k] = (UI.menuVar[k] || 0) + 1; scheduleRender(); refreshSheet(true); return; }
    case 'water-add': addWater(g('date') || today, Number(g('ml'))); return;
    case 'supp': toggleSupp(g('date') || today, g('key')); return;
    default: return;
  }
});

/* ---------- Entradas de texto ---------- */
function handleBind(el, isChange) {
  const b = el.getAttribute('data-bind'), v = el.value, name = el.getAttribute('data-name');
  switch (b) {
    case 'ck-step': UI.checkinDraft.sleepH = parseNum(v); return;
    case 'qd-step': UI.qd.minutes = parseNum(v); return;
    case 'tr-step': trSetField(Number(el.getAttribute('data-k')), el.getAttribute('data-f'), v); return;
    case 'tr-notes': { const s = curStep(); if (s) { s.notes = v; saveDraft(); } return; }
    case 'tr-test': trTestInput(el.getAttribute('data-s'), v); return;
    case 'ed-step': edSetField(Number(el.getAttribute('data-k')), el.getAttribute('data-f'), v); return;
    case 'ed-title': UI.ed.title = v; return;
    case 'ed-date': if (v) UI.ed.date = v; return;
    case 'ed-level': UI.ed.kick.level = Number(v); return;
    case 'ed-rt': UI.ed.rt.level = v; return;
    case 'ed-notes': UI.ed.notes = v; return;
    case 'ed-meta': UI.ed.minutes = parseNum(v); return;
    case 'se-notes': { const it = seItem(); if (it) it.notes = v; return; }
    case 'fin-step': UI.fin.minutes = parseNum(v); return;
    case 'fin-notes': UI.fin.notes = v; return;
    case 'fin-tplname': UI.fin.tplName = v; return;
    case 'test': { const key = el.getAttribute('data-key'), s = el.getAttribute('data-s'); UI.test[key] = Object.assign({}, UI.test[key] || {}); UI.test[key][s] = parseNum(v); return; }
    case 'test-date': if (v) UI.test.date = v; return;
    case 'test-n': UI.test[el.getAttribute('data-key')] = parseNum(v); return;
    case 'pf': UI.pf[name] = v; return;
    case 'ij': UI.ij[name] = v; return;
    case 'wt': UI.wt[name] = v; return;
    case 'wt-step': UI.wt.kg = parseNum(v); return;
    case 'cx': UI.cx[name] = v; return;
    case 'coach-q': UI.coach.draft = v; return;
    case 'ag-time': if (isChange && /^\d{1,2}:\d{2}$/.test(v)) { agendaSet(el.getAttribute('data-date'), el.getAttribute('data-key'), { start: hm(v) }).then(() => toast('Hora cambiada a ' + v + '.')); } return;
    case 'sched': if (isChange && /^\d{1,2}:\d{2}$/.test(v)) setSchedule(name, v); return;
    case 'meal-text': UI.meal.text = v; return;
    case 'meal-item-n': { const it = UI.meal.items[Number(el.getAttribute('data-i'))]; if (it) it.n = v; return; }
    case 'meal-g': { const i = Number(el.getAttribute('data-i')); mealSetGrams(i, parseNum(v)); if (isChange) refreshSheet(true); return; }
    case 'meal-time': if (/^\d{1,2}:\d{2}$/.test(v)) { UI.meal.time = v; if (!UI.meal.slotFixed && isChange) { UI.meal.slot = slotForTime(UI.meal.date, v); refreshSheet(true); } } return;
    case 'meal-slot': UI.meal.slot = v; UI.meal.slotFixed = true; return;
    case 'meal-note': UI.meal.note = v; return;
    default: return;
  }
}
document.addEventListener('input', (e) => {
  const el = e.target;
  if (!el.getAttribute) return;
  if (el.hasAttribute('data-bind')) { handleBind(el, false); return; }
  if (el.getAttribute('data-pick')) { UI.pick.q = el.value; clearTimeout(UI.pickTimer); UI.pickTimer = setTimeout(updatePickList, 150); return; }
  if (el.getAttribute('data-food-q')) { UI.foodQ = el.value; const l = $('#food-list'); if (l) l.innerHTML = foodListHtml(); return; }
  const k = el.getAttribute('data-input');
  if (k) { if (k === 'bank-q') { UI.bank.q = el.value; UI.bank.limit = 30; } if (k === 'lib-q') { UI.lib.q = el.value; UI.lib.limit = 40; } clearTimeout(UI.inputTimer); UI.inputTimer = setTimeout(scheduleRender, 200); }
});
document.addEventListener('change', (e) => { const el = e.target; if (el.getAttribute && el.hasAttribute('data-bind')) handleBind(el, true); });
document.addEventListener('focusin', (e) => { const el = e.target; if (el && el.tagName === 'INPUT' && el.closest && (el.closest('.stepper') || el.classList.contains('num'))) { try { el.select(); } catch (err) { /* nada */ } } });
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target && e.target.tagName === 'INPUT' && e.target.closest && e.target.closest('.stepper')) e.target.blur(); });
/* Sin zoom por gesto ni doble toque */
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('dblclick', (e) => { if (!(e.target.closest && e.target.closest('input,textarea'))) e.preventDefault(); }, { passive: false });

function bootApp(fb) {
  document.body.insertAdjacentHTML('afterbegin', GRAD_DEFS);
  buildNav();
  UI.view = currentView(); markNav();
  initStore(fb);
  window.IMPROVE = {
    version: VERSION, importObject, exportData,
    putMedia(id, data) { return setMedia(id, data); },
    counts() { const o = {}; Object.keys(COLS).forEach(c => { o[c] = COLS[c] === 'single' ? (S.data[c] ? 1 : 0) : (S.data[c] || []).length; }); return o; },
  };
  setInterval(() => { if (!TR.open && UI.view === 'hoy' && !DRAG.active && !LAYERS.length) scheduleRender(); }, 60000);
  setTimeout(() => { if (!allLoaded()) $('#view').innerHTML = '<section class="card"><div class="stack-sm"><div class="h2">No se pudieron cargar tus datos</div><p class="sub">Revisa la conexión y vuelve a abrir la app.</p><button class="btn" onclick="location.reload()">Reintentar</button></div></section>'; }, 20000);
  if (loadDraft() && currentView() === 'hoy') scheduleRender();
}
