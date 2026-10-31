/* ============================================================
   MOLESTIAS: marcar en el mapa del cuerpo, seguimiento «¿Sigue?»
   y ajuste automático del plan de hoy y mañana.
   ============================================================ */
const MOL_TIPOS = [['cargado', 'Cargado', 'Pesado, fatigado'], ['tirante', 'Tirante', 'Tenso, corto'], ['dolor', 'Dolor', 'Pincha o duele']];
function molList() { return (S.data.molestias || []).filter(m => m && !m.deleted); }
function molActiveToday() { return ST ? activeMolestias(ST, todayStr()) : []; }
/* Varias zonas a la vez: cada zona tocada se suma con el tipo y la intensidad elegidos;
   tocar de nuevo la zona activa la quita. «Ambos lados» marca derecha e izquierda con un toque. */
const molKey = (z, s) => z + ':' + s;
const molOther = (s) => (s === 'd' ? 'i' : 'd');
function openMolestia(opts) {
  opts = opts || {};
  const M = { view: 'front', sel: {}, order: [], active: null, ambos: false, last: { tipo: 'cargado', nivel: 4 }, nota: '', from: opts.from || 'hoy', during: opts.during || null, prompt: opts.prompt || '' };
  UI.mol = M;
  if (opts.zona) { M.view = ZONE_VIEW[opts.zona] || 'front'; molAdd(M, opts.zona, opts.lado || (ST && ST.side) || 'd'); }
  openSheet({ id: 'molestia', full: true, render: molestiaHtml });
}
function molExisting(k) { const [z, s] = k.split(':'); return molActiveToday().find(m => m.zona === z && m.lado === s) || null; }
function molAdd(M, z, s) {
  const keys = M.ambos ? [molKey(z, s), molKey(z, molOther(s))] : [molKey(z, s)];
  for (const k of keys) {
    if (M.sel[k]) continue;
    const ex = molExisting(k);
    M.sel[k] = ex ? { tipo: ex.tipo, nivel: ex.nivelAct, exist: ex.id } : { tipo: M.last.tipo, nivel: M.last.nivel };
    M.order.push(k);
  }
  M.active = keys[0];
}
function molRemove(M, k) {
  delete M.sel[k]; M.order = M.order.filter(x => x !== k);
  if (M.active === k) M.active = M.order[M.order.length - 1] || null;
}
function molTapZone(z, s) {
  const M = UI.mol; if (!M) return;
  const k = molKey(z, s), pair = molKey(z, molOther(s));
  if (!M.sel[k]) molAdd(M, z, s);
  else if (M.active !== k) M.active = k;
  else { molRemove(M, k); if (M.ambos && M.sel[pair]) molRemove(M, pair); }
  haptic(10); refreshSheet(true);
}
/* Tipo e intensidad: a la zona activa (y su par si «Ambos lados»); también para las próximas zonas */
function molSetActive(patch) {
  const M = UI.mol; if (!M) return;
  if (M.active && M.sel[M.active]) {
    Object.assign(M.sel[M.active], patch);
    const [z, s] = M.active.split(':'), pair = molKey(z, molOther(s));
    if (M.ambos && M.sel[pair]) Object.assign(M.sel[pair], patch);
  }
  Object.assign(M.last, patch);
  refreshSheet(true);
}
function molApplyAll() {
  const M = UI.mol; if (!M || !M.active) return;
  const v = M.sel[M.active];
  M.order.forEach(k => { M.sel[k].tipo = v.tipo; M.sel[k].nivel = v.nivel; });
  haptic(8); refreshSheet(true);
}
/* Lado de la zona activa: derecho, izquierdo o ambos */
function molSetSide(v) {
  const M = UI.mol; if (!M || !M.active) return;
  const [z, s] = M.active.split(':'), cur = Object.assign({}, M.sel[M.active]);
  const put1 = (k) => { if (!M.sel[k]) { const ex = molExisting(k); M.sel[k] = Object.assign({}, cur, { exist: ex ? ex.id : undefined }); M.order.push(k); } };
  if (v === 'ambos') { put1(molKey(z, molOther(s))); }
  else { put1(molKey(z, v)); const o = molKey(z, molOther(v)); if (M.sel[o]) molRemove(M, o); M.active = molKey(z, v); }
  refreshSheet(true);
}
/* Atajo: isquios y gemelos cargados en las dos piernas (lo típico tras sprint o partido) */
function molPresetLegs() {
  const M = UI.mol; if (!M) return;
  const prev = M.ambos; M.ambos = true;
  const keep = { tipo: M.last.tipo, nivel: M.last.nivel };
  M.last = { tipo: 'cargado', nivel: keep.tipo === 'cargado' ? keep.nivel : 4 };
  molAdd(M, 'pantorrilla', 'd'); molAdd(M, 'isquio', 'd');
  M.ambos = prev; M.view = 'back';
  haptic(10); refreshSheet(true);
}
function molLevelHtml(v, tipo) {
  let h = '<div class="scale mol' + (tipo === 'dolor' ? ' pain' : ' load') + '" role="radiogroup" aria-label="Intensidad">';
  for (let i = 1; i <= 10; i++) h += '<button type="button" role="radio" aria-checked="' + (v === i) + '" class="' + (v === i ? 'on' : '') + '" data-act="mol-lvl" data-v="' + i + '">' + i + '</button>';
  return h + '</div><div class="legend"><span>1 apenas</span><span>10 máximo</span></div>';
}
function molestiaHtml() {
  const M = UI.mol; if (!M) return sheetHead('Molestia');
  const keys = M.order.filter(k => M.sel[k]), n = keys.length;
  const vals = {};
  molActiveToday().forEach(m => { const k = molKey(m.zona, m.lado); if (!M.sel[k]) vals[k] = painColor(m.tipo, m.nivelAct); });
  keys.forEach(k => { vals[k] = painColor(M.sel[k].tipo, M.sel[k].nivel); });
  const perView = { front: 0, back: 0 }; keys.forEach(k => { const v = ZONE_VIEW[k.split(':')[0]]; if (v) perView[v]++; });
  const sub = M.prompt || (M.from === 'checkin' ? 'Paso opcional del check-in' : M.from === 'train' ? 'Durante el entrenamiento' : 'Toca una o varias zonas');
  let h = sheetHead(n > 1 ? 'Molestias · ' + n : 'Molestia', esc(sub)) + '<div class="sheet-body">';
  h += '<div class="seg" role="tablist">' + [['front', 'Frente'], ['back', 'Espalda']].map(([v, l]) => '<button type="button" role="tab" aria-selected="' + (M.view === v) + '" class="' + (M.view === v ? 'on' : '') + '" data-act="mol-view" data-v="' + v + '">' + l + (perView[v] ? ' · ' + perView[v] : '') + '</button>').join('') + '</div>';
  h += '<div class="mol-tools">' + '<button type="button" class="pill' + (M.ambos ? ' on' : '') + '" data-act="mol-ambos" aria-pressed="' + M.ambos + '">' + ic(M.ambos ? 'check' : 'swap') + 'Ambos lados</button>' +
    '<button type="button" class="pill" data-act="mol-preset">' + ic('plus') + 'Isquios + gemelos</button></div>';
  h += '<div class="bmap-one">' + bodyMapSvg({ view: M.view, mode: 'select', values: vals, selected: keys, active: M.active, act: 'mol-zone' }) + '<span class="bm-side l">' + (M.view === 'front' ? 'Derecha' : 'Izquierda') + '</span><span class="bm-side r">' + (M.view === 'front' ? 'Izquierda' : 'Derecha') + '</span></div>';
  h += molSelListHtml(M, keys);
  h += molEditorHtml(M, keys);
  h += '<div class="field"><label for="mol-z">Agregar por nombre</label><select class="input" id="mol-z" data-bind="mol-z"><option value="">Elegir zona…</option>' + ZONE_ORDER.map(z => '<option value="' + z + '">' + esc(BODY_ZONES[z].n) + '</option>').join('') + '</select></div>';
  if (n) h += molPreviewMulti(M, keys);
  h += '<div class="field"><label for="mol-nota">Nota (opcional)</label><textarea class="input" id="mol-nota" data-bind="mol-nota" rows="2" placeholder="Cuándo apareció, con qué gesto">' + esc(M.nota) + '</textarea></div>';
  h += '<div class="sheet-foot"><button class="btn" data-act="close">Cancelar</button><button class="btn primary lg" data-act="mol-save"' + (n ? '' : ' disabled') + '>' + (n > 1 ? 'Guardar ' + n : 'Guardar') + '</button></div>';
  h += molActiveListHtml();
  return h + '</div>';
}
function molSelListHtml(M, keys) {
  if (!keys.length) return '<p class="sub mol-hint">Toca las zonas en el mapa: puedes marcar varias. Si eliges antes el tipo y la intensidad, cada zona nueva los toma.</p>';
  return '<div class="mol-list" role="list" aria-label="Zonas marcadas">' + keys.map(k => {
    const v = M.sel[k], [z, s] = k.split(':'), on = M.active === k;
    return '<div class="mol-row' + (on ? ' on' : '') + '" role="listitem"><button type="button" class="mol-pick" data-act="mol-pick" data-k="' + k + '" aria-pressed="' + on + '"><i class="sw" style="background:' + painColor(v.tipo, v.nivel) + '"></i><span class="grow"><span class="t">' + esc(zoneName(z, s)) + '</span><span class="s">' + esc(capFirst(v.tipo) + ' ' + v.nivel + '/10' + (v.exist ? ' · ya activa: se actualiza' : '')) + '</span></span></button>' +
      '<button type="button" class="mol-x" data-act="mol-rm" data-k="' + k + '" aria-label="Quitar ' + esc(zoneName(z, s)) + '">' + ic('x') + '</button></div>';
  }).join('') + '</div>';
}
function molEditorHtml(M, keys) {
  const v = M.active && M.sel[M.active] ? M.sel[M.active] : M.last, has = !!(M.active && M.sel[M.active]);
  let h = '<div class="mol-edit">';
  if (has) {
    const [z, s] = M.active.split(':'), both = !!(M.sel[molKey(z, 'd')] && M.sel[molKey(z, 'i')]);
    h += '<div class="micro">Editando · ' + esc(zoneName(z)) + '</div>';
    h += '<div class="seg" role="radiogroup" aria-label="Lado">' + [['d', 'Derecho'], ['i', 'Izquierdo'], ['ambos', 'Ambos']].map(([k, l]) => { const on = k === 'ambos' ? both : !both && s === k; return '<button type="button" role="radio" aria-checked="' + on + '" data-act="mol-side" data-v="' + k + '" class="' + (on ? 'on' : '') + '">' + l + '</button>'; }).join('') + '</div>';
  } else h += '<div class="micro">Para las zonas que toques</div>';
  h += '<div class="seg tri" role="radiogroup" aria-label="Tipo">' + MOL_TIPOS.map(([k, l, d]) => '<button type="button" role="radio" aria-checked="' + (v.tipo === k) + '" data-act="mol-tipo" data-v="' + k + '" class="' + (v.tipo === k ? 'on' + (k === 'dolor' ? ' red' : ' amber') : '') + '">' + l + '<small>' + d + '</small></button>').join('') + '</div>';
  h += '<div class="field"><span class="lab">Intensidad</span>' + molLevelHtml(v.nivel, v.tipo) + '</div>';
  const differ = keys.length > 1 && keys.some(k => M.sel[k].tipo !== v.tipo || M.sel[k].nivel !== v.nivel);
  if (has && differ) h += '<button type="button" class="linkbtn" data-act="mol-all">' + ic('copy') + 'Aplicar ' + esc(v.tipo) + ' ' + v.nivel + ' a todas (' + keys.length + ')</button>';
  return h + '</div>';
}
/* Qué hará el plan con lo marcado, antes de guardarlo (todas las zonas juntas) */
function molPreviewMulti(M, keys) {
  const list = keys.map(k => { const [z, s] = k.split(':'); return { zona: z, lado: s, tipo: M.sel[k].tipo, nivel: M.sel[k].nivel, sev: molSeverity({ tipo: M.sel[k].tipo, nivelAct: M.sel[k].nivel }) }; });
  const names = (arr) => { const by = {}; arr.forEach(x => { (by[x.zona] = by[x.zona] || []).push(x.lado); }); return Object.keys(by).map(z => by[z].length > 1 ? zoneName(z) + ' (ambos)' : zoneName(z, by[z][0]).toLowerCase()).join(', '); };
  const mod = list.filter(x => x.sev === 'moderada'), alta = list.filter(x => x.sev === 'alta'), dol = list.filter(x => x.sev === 'dolor');
  const items = [];
  if (!mod.length && !alta.length && !dol.length) items.push('Sin cambios en el plan. Mañana te pregunto si ' + (list.length > 1 ? 'siguen.' : 'sigue.'));
  if (mod.length) items.push('Una serie menos e isométricos en ' + names(mod) + '.');
  if (alta.length) items.push('Nada que cargue ' + names(alta) + '; lo intenso pasa al próximo día suave.');
  if (dol.length) items.push('Nada intenso en ' + names(dol) + '.');
  const hard = alta.concat(dol), any = mod.concat(hard);
  if (hard.some(x => MOL_SPRINT_ZONES.includes(x.zona))) items.push('Sin sprint.');
  else if (any.some(x => MOL_SPRINT_ZONES.includes(x.zona))) items.push('Sprint hasta S2.');
  if (hard.some(x => MOL_KICK_ZONES.includes(x.zona))) items.push('Sin golpeo.');
  else if (any.some(x => MOL_KICK_ZONES.includes(x.zona))) items.push('Golpeo hasta K3.');
  const legs = any.filter(x => MOL_LEG_ZONES.includes(x.zona)), lk = new Set(legs.map(x => x.zona + ':' + x.lado));
  const bil = new Set(legs.map(x => x.zona).filter(z => lk.has(z + ':d') && lk.has(z + ':i')));
  if (lk.size >= 3 || bil.size >= 2) items.push('Fatiga en varias zonas de las piernas: una serie menos en accesorios.');
  if (dol.some(x => x.nivel >= 3 && (x.zona === 'isquio' || M.during === 'sprint' || M.during === 'golpeo'))) items.push('Si apareció de golpe al esprintar o rematar: para hoy y consulta.');
  const tone = dol.some(x => x.nivel >= 3) ? 'pain' : items.length === 1 && !any.length ? 'info' : 'warn';
  return '<div class="note ' + tone + '">' + ic(tone === 'info' ? 'info' : 'warn') + '<div><b>Hoy y mañana:</b> ' + esc(items.join(' ')) + '</div></div>';
}
function molActiveListHtml() {
  const list = molActiveToday();
  if (!list.length) return '';
  return '<div class="stack-sm"><div class="micro">Activas</div>' + list.map(m => molRowHtml(m)).join('') + '</div>';
}
function molRowHtml(m) {
  return '<button class="blk" data-act="mol-open" data-id="' + esc(m.id) + '"><span class="c ' + (m.tipo === 'dolor' ? 'pain' : 'load') + '">' + ic(m.tipo === 'dolor' ? 'warn' : 'flame') + '</span><div class="grow"><div class="t">' + esc(zoneName(m.zona, m.lado)) + '</div><div class="s">' + esc(capFirst(m.tipo) + ' ' + m.nivelAct + '/10 · desde el ' + fmtDate(m.fecha) + (m.last ? ' · ' + MOL_ESTADOS[m.last.estado] : '')) + '</div></div>' + ic('chev') + '</button>';
}
const MOL_ESTADOS = { mejor: 'mejor', igual: 'igual', peor: 'peor', ya_no: 'ya no' };
/* Guardar: un documento por zona y lado (las ya activas se actualizan, no se duplican), con un grupo común */
function saveMolestia() {
  const M = UI.mol; if (!M) return;
  const keys = M.order.filter(k => M.sel[k]);
  if (!keys.length) { toast('Toca la zona en el mapa.', 'warn'); return; }
  const now = new Date(), today = todayStr(), grupo = uid('mg'), hora = fmtHM(now.getHours() * 60 + now.getMinutes());
  const nota = (M.nota || '').trim(), undo = { created: [], prev: {} };
  let worst = 'ninguna';
  const rank = { ninguna: 0, moderada: 1, alta: 2, dolor: 3 };
  for (const k of keys) {
    const [zona, lado] = k.split(':'), v = M.sel[k], sev = molSeverity({ tipo: v.tipo, nivelAct: v.nivel });
    if (rank[sev] > rank[worst]) worst = sev;
    const ex = v.exist ? molList().find(x => x.id === v.exist) : null;
    if (ex) {
      const act = molActiveToday().find(x => x.id === ex.id), cur = act ? act.nivelAct : num(ex.nivel) || 1;
      undo.prev[ex.id] = clone(ex);
      const d = clone(ex); delete d.id;
      d.updates = (d.updates || []).filter(u => u.fecha !== today);
      const upd = { fecha: today, estado: v.nivel > cur ? 'peor' : v.nivel < cur ? 'mejor' : 'igual', nivel: v.nivel };
      if (v.tipo !== d.tipo) { upd.tipo = v.tipo; d.tipo = v.tipo; }
      d.updates.push(upd);
      if (nota) d.nota = d.nota ? d.nota + ' · ' + nota : nota;
      put('molestias', ex.id, d);
    } else {
      const id = uid('mol');
      const doc = { fecha: today, hora, zona, lado, tipo: v.tipo, nivel: v.nivel, nota, resuelta: false, updates: [], origen: M.from, grupo };
      if (M.during) doc.durante = M.during;
      put('molestias', id, doc); undo.created.push(id);
    }
  }
  UI.molUndo = undo;
  const n = keys.length, what = n > 1 ? n + ' molestias guardadas' : 'Molestia guardada';
  toast(worst === 'ninguna' ? what + '. Mañana te pregunto.' : what + ': el plan de hoy y mañana se ajusta.', worst === 'ninguna' ? 'ok' : 'warn', { label: 'Deshacer', act: 'mol-undo-save' });
  const from = M.from; UI.mol = null;
  closeSheet();
  if (from === 'train' && TR.open) setTimeout(() => { patchStep(); }, 80);
}
function molUndoSave() {
  const u = UI.molUndo; if (!u) return;
  u.created.forEach(id => remove('molestias', id));
  Object.keys(u.prev).forEach(id => { const d = clone(u.prev[id]); delete d.id; put('molestias', id, d); });
  UI.molUndo = null; $('#toast').hidden = true; toast('Molestias deshechas.', 'info');
}
/* Detalle de una molestia: «¿Sigue?» y borrar */
function openMolDetail(id) { openSheet({ id: 'mol-' + id, render: () => molDetailHtml(id) }); }
function molDetailHtml(id) {
  const m = molList().find(x => x.id === id);
  if (!m) return sheetHead('Molestia') + '<div class="sheet-body"><p class="sub">Ya no existe.</p></div>';
  const act = activeMolestias(ST, todayStr()).find(x => x.id === id);
  const lvl = act ? act.nivelAct : m.nivel;
  let h = sheetHead(zoneName(m.zona, m.lado), capFirst(m.tipo) + ' ' + lvl + '/10 · ' + fmtDate(m.fecha) + (m.hora ? ' · ' + m.hora : '')) + '<div class="sheet-body">';
  h += '<div class="bmap-one sm">' + bodyMapSvg({ view: ZONE_VIEW[m.zona] || 'front', mode: 'pain', values: { [m.zona + ':' + m.lado]: painColor(m.tipo, lvl) } }) + '</div>';
  if (m.nota) h += note('info', esc(m.nota));
  const adjT = act ? ((dayPlan(todayStr()) || {}).molAdj || []).find(a => !a.fatiga && (a.ids || [a.id]).includes(m.id)) : null;
  if (adjT) h += note(adjT.tipo === 'dolor' ? 'pain' : 'warn', '<b>Hoy en el plan:</b> ' + esc(adjT.text));
  if ((m.updates || []).length) h += '<div class="stack-xs">' + m.updates.map(u => '<div class="lrow"><span class="fg2">' + fmtDate(u.fecha) + '</span><span class="sub">' + esc(MOL_ESTADOS[u.estado] || u.estado) + (u.nivel ? ' · ' + u.nivel + '/10' : '') + '</span></div>').join('') + '</div>';
  if (!m.resuelta) h += '<div class="field"><span class="lab">¿Sigue?</span>' + molFollowBtns(m.id) + '</div>';
  else h += note('good', 'Resuelta el ' + fmtDate(m.resueltaEn || m.fecha) + '.');
  if (act && (m.noAdjust || []).includes(todayStr())) h += note('blue', 'Hoy el plan no se ajusta por esta molestia.') + '<button class="btn sm" data-act="mol-redo" data-id="' + esc(m.id) + '" data-date="' + todayStr() + '">' + ic('refresh') + 'Volver a ajustar</button>';
  else if (act && molSeverity(act) !== 'ninguna') h += '<button class="btn sm ghost" data-act="mol-undo" data-id="' + esc(m.id) + '" data-date="' + todayStr() + '">' + ic('undo') + 'Hoy no ajustar el plan</button>';
  h += '<button class="btn sm ghost danger" data-act="mol-del" data-id="' + esc(m.id) + '">' + ic('trash') + 'Borrar</button>';
  return h + '</div>';
}
function molFollowBtns(id) {
  return '<div class="grid4 follow">' + [['mejor', 'Mejor', 'lime'], ['igual', 'Igual', ''], ['peor', 'Peor', 'load'], ['ya_no', 'Ya no', 'lime']].map(([k, l, t]) => '<button type="button" class="btn sm ' + t + '" data-act="mol-follow" data-id="' + esc(id) + '" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
}
function molFollowDoc(id, estado, today) {
  const m = molList().find(x => x.id === id); if (!m) return null;
  const act = activeMolestias(ST, today).find(x => x.id === id);
  const cur = act ? act.nivelAct : num(m.nivel) || 1;
  const d = clone(m); delete d.id;
  d.updates = (d.updates || []).filter(u => u.fecha !== today);
  const nivel = estado === 'mejor' ? Math.max(1, cur - 2) : estado === 'peor' ? Math.min(10, cur + 2) : cur;
  d.updates.push({ fecha: today, estado, nivel });
  if (estado === 'ya_no') { d.resuelta = true; d.resueltaEn = today; }
  return d;
}
function molFollow(id, estado) {
  const d = molFollowDoc(id, estado, todayStr()); if (!d) return;
  put('molestias', id, d).then(() => toast(estado === 'ya_no' ? 'Molestia resuelta.' : estado === 'peor' ? 'Anotado: el plan se ajusta más. Si sigue empeorando, consulta.' : 'Anotado.', estado === 'peor' ? 'warn' : 'ok'));
  refreshSheet(true);
}
/* «¿Siguen?» para todas a la vez */
function molFollowMany(ids, estado) {
  const today = todayStr(); let n = 0;
  ids.forEach(id => { const d = molFollowDoc(id, estado, today); if (d) { put('molestias', id, d); n++; } });
  if (n) toast(estado === 'ya_no' ? plural(n, 'molestia resuelta', 'molestias resueltas') + '.' : estado === 'peor' ? 'Anotado: el plan se ajusta más. Si siguen empeorando, consulta.' : 'Anotado para ' + plural(n, 'molestia', 'molestias') + '.', estado === 'peor' ? 'warn' : 'ok');
  haptic(10);
}
function molSetNoAdjust(ids, date, on) {
  const list = String(ids || '').split(',').filter(Boolean);
  list.forEach(id => {
    const m = molList().find(x => x.id === id); if (!m) return;
    const d = clone(m); delete d.id;
    const arr = (d.noAdjust || []).filter(x => x !== date); if (on) arr.push(date);
    d.noAdjust = arr;
    put('molestias', id, d);
  });
  if (list.length) toast(on ? 'Ajuste deshecho: hoy el plan sigue igual.' : 'El plan vuelve a ajustarse.', 'info');
}
/* ---------- Hoy: botón, activas, «¿Sigue?» y ajustes con deshacer ---------- */
function molHoyHtml(day, today) {
  const act = molActiveToday();
  const ask = act.filter(m => m.fecha < today && !(m.last && m.last.fecha === today));
  let h = '';
  if (ask.length === 1) { const m = ask[0]; h += '<section class="card t-load tight"><div class="stack-sm"><div class="micro" style="color:var(--amber)">Molestia · ' + fmtDate(m.fecha) + '</div><div class="h3">¿Sigue la molestia en ' + esc(zoneName(m.zona, m.lado).toLowerCase()) + '?</div>' + molFollowBtns(m.id) + '</div></section>'; }
  else if (ask.length > 1) {
    const ids = esc(ask.map(m => m.id).join(','));
    h += '<section class="card t-load tight"><div class="stack-sm"><div class="micro" style="color:var(--amber)">' + plural(ask.length, 'molestia', 'molestias') + '</div><div class="h3">¿Siguen las molestias?</div>' +
      '<div class="grid3 follow">' + [['igual', 'Todas igual', ''], ['mejor', 'Todas mejor', 'lime'], ['ya_no', 'Ya no', 'lime']].map(([k, l, t]) => '<button type="button" class="btn sm ' + t + '" data-act="mol-follow-all" data-ids="' + ids + '" data-v="' + k + '">' + l + '</button>').join('') + '</div>' +
      '<details class="mol-each"><summary>Una por una</summary><div class="in">' + ask.map(m => '<div class="stack-xs"><div class="small fg2">' + esc(zoneName(m.zona, m.lado) + ' · ' + m.tipo + ' ' + m.nivelAct + '/10') + '</div>' + molFollowBtns(m.id) + '</div>').join('') + '</div></details></div></section>';
  }
  h += molAdjLine(day, today);
  return h;
}
/* Ajustes por molestias: una línea compacta que se ve una vez.
   Se oculta al tocarla o al cerrarla, o sola 1 h después de verla; el detalle sigue en el chip de la molestia. */
const MOL_SEEN_TTL = 60 * 60 * 1000;
function molAdjKey(day, today) {
  const adj = (day && day.molAdj) || [], ins = ST ? molestiaInsights(ST, today) : [];
  return adj.map(a => a.id + ':' + a.sev).concat(ins.map(x => 'p:' + x.zona + x.lado + x.n)).sort().join('|');
}
function molAdjSeen(today) { try { return JSON.parse(localStorage.getItem('improve:moladj') || 'null'); } catch (e) { return null; } }
function molAdjMark(today, key, hide) {
  try {
    const cur = molAdjSeen(today);
    const same = cur && cur.date === today && cur.key === key;
    localStorage.setItem('improve:moladj', JSON.stringify({ date: today, key, at: same ? cur.at : Date.now(), hidden: !!(hide || (same && cur.hidden)) }));
  } catch (e) { /* sin almacenamiento: se muestra igual */ }
}
function molAdjLine(day, today) {
  const adj = (day && day.molAdj) || [], ins = ST ? molestiaInsights(ST, today) : [];
  if (!adj.length && !ins.length) return '';
  const key = molAdjKey(day, today), seen = molAdjSeen(today);
  if (seen && seen.date === today && seen.key === key && (seen.hidden || Date.now() - seen.at > MOL_SEEN_TTL)) return '';
  if (!seen || seen.date !== today || seen.key !== key) molAdjMark(today, key, false);
  const pain = adj.some(a => a.tipo === 'dolor');
  const zones = Array.from(new Set(adj.map(a => { if (a.label) return a.label; const m = molList().find(x => x.id === a.id); return m ? zoneName(m.zona, m.lado) : ''; }).filter(Boolean)));
  const title = adj.length ? 'Plan ajustado por molestia' : 'Patrón de molestias';
  const sub = adj.length ? zones.join(' · ') || plural(adj.length, 'ajuste', 'ajustes') : ins.map(x => zoneName(x.zona, x.lado)).join(' · ');
  return '<div class="mini-alert' + (pain ? ' pain' : '') + '" role="status">' +
    '<button class="mini-main" data-act="mol-adj" data-date="' + today + '">' + ic('warn') + '<span class="grow"><span class="t">' + esc(title) + '</span><span class="s">' + esc(sub) + ' · ver qué cambió</span></span>' + ic('chev') + '</button>' +
    '<button class="mini-x" data-act="mol-adj-hide" data-date="' + today + '" aria-label="Ocultar aviso">' + ic('x') + '</button></div>';
}
function openMolAdj(date) {
  const day = dayPlan(date); molAdjMark(date, molAdjKey(day, date), true);
  openSheet({ id: 'mol-adj', render: () => molAdjHtml(date) });
  scheduleRender();
}
function molAdjHtml(date) {
  const day = dayPlan(date), adj = (day && day.molAdj) || [], ins = ST ? molestiaInsights(ST, date) : [];
  let h = sheetHead('Ajustes por molestias', capFirst(fmtDateLong(date))) + '<div class="sheet-body">';
  if (!adj.length && !ins.length) h += '<p class="sub">Hoy el plan no tiene ajustes por molestias.</p>';
  h += adj.map(a => '<div class="note ' + (a.tipo === 'dolor' ? 'pain' : 'warn') + '">' + ic('warn') + '<div>' + esc(a.text) + '<div><button class="linkbtn" data-act="mol-undo" data-ids="' + esc((a.ids || [a.id]).join(',')) + '" data-date="' + date + '">' + ic('undo') + (a.fatiga ? 'Hoy no ajustar por estas molestias' : 'Hoy no ajustar el plan') + '</button></div></div></div>').join('');
  h += ins.map(x => note('blue', '<b>' + esc(zoneName(x.zona, x.lado)) + ': ' + x.n + ' días con molestia en 2 semanas.</b> ' + esc(x.tip) + (x.causes.length ? ' En las 48 h previas: ' + esc(x.causes.join(', ')) + '.' : ''))).join('');
  return h + '<p class="sub">Cada molestia sigue disponible en su chip, arriba en Hoy.</p></div>';
}
function molChips(today) {
  const act = molActiveToday(), by = {};
  act.forEach(m => { const k = m.zona + '|' + (m.tipo === 'dolor' ? 'd' : 'c'); (by[k] = by[k] || []).push(m); });
  return '<button class="chip" data-act="mol-new">' + ic('plus') + 'Molestia</button>' + Object.values(by).map(g => {
    const m = g[0], pain = m.tipo === 'dolor', lvl = Math.max(...g.map(x => x.nivelAct));
    const both = g.length > 1 && g.some(x => x.lado === 'd') && g.some(x => x.lado === 'i');
    return both ? '<button class="chip ' + (pain ? 'pain' : 'load') + '" data-act="mol-list">' + esc(zoneName(m.zona)) + ' ×2 · ' + lvl + '</button>'
      : g.map(x => '<button class="chip ' + (pain ? 'pain' : 'load') + '" data-act="mol-open" data-id="' + esc(x.id) + '">' + esc(zoneName(x.zona, x.lado)) + ' ' + x.nivelAct + '</button>').join('');
  }).join('');
}
/* Lista de molestias activas (desde un chip que agrupa los dos lados) */
function openMolList() { openSheet({ id: 'mol-list', render: () => sheetHead('Molestias activas', capFirst(fmtDateLong(todayStr()))) + '<div class="sheet-body">' + (molActiveListHtml() || '<p class="sub">Sin molestias activas.</p>') + '<button class="btn block" data-act="mol-new">' + ic('plus') + 'Marcar otra</button></div>' }); }
/* Entrenamiento: dolor ≥ 3 activo en la zona que trabaja el ejercicio actual */
function molForStep(s) {
  if (!s || s.kind !== 'ex' || !ST) return null;
  const mg = itemMg({ id: s.id, tags: s.tags });
  return molActiveToday().find(m => m.tipo === 'dolor' && m.nivelAct >= 3 && (BODY_ZONES[m.zona] || { g: [] }).g.some(g => (mg[g] || 0) >= 0.5)) || null;
}
/* Progreso: mapa de las últimas dos semanas */
function molestiasCard(st, today) {
  const from = addDays(today, -13), list = molList().filter(m => m.fecha >= from && m.fecha <= today);
  const vals = {}, best = {};
  for (const m of list) { const k = m.zona + ':' + m.lado, lvl = Math.max(num(m.nivel) || 1, ...((m.updates || []).map(u => num(u.nivel) || 0))); if (!best[k] || lvl > best[k].lvl || (m.tipo === 'dolor' && best[k].tipo !== 'dolor')) best[k] = { lvl, tipo: m.tipo }; }
  for (const k of Object.keys(best)) vals[k] = painColor(best[k].tipo, best[k].lvl);
  let h = '<section class="card"><div class="stack-sm"><div class="row between"><span class="h3">Molestias · 14 días</span><button class="btn sm" data-act="mol-new">' + ic('plus') + 'Marcar</button></div>';
  if (!list.length) return h + '<p class="sub">Sin molestias registradas en dos semanas.</p></div></section>';
  h += '<div class="bmap-duo">' + bodyMapSvg({ view: 'front', mode: 'pain', values: vals }) + bodyMapSvg({ view: 'back', mode: 'pain', values: vals }) + '</div>';
  h += '<div class="bmap-legend"><span><i style="background:' + painColor('cargado', 6) + '"></i>Carga o tirantez</span><span><i style="background:' + painColor('dolor', 6) + '"></i>Dolor</span></div>';
  molestiaInsights(st, today).forEach(x => { h += note('blue', '<b>' + esc(zoneName(x.zona, x.lado)) + ': ' + x.n + ' días con molestia.</b> ' + esc(x.tip) + (x.causes.length ? ' Antes: ' + esc(x.causes.join(', ')) + '.' : '')); });
  h += '<div class="stack-sm">' + list.slice().reverse().slice(0, 8).map(m => '<button class="blk" data-act="mol-open" data-id="' + esc(m.id) + '"><span class="c ' + (m.tipo === 'dolor' ? 'pain' : 'load') + '">' + ic(m.tipo === 'dolor' ? 'warn' : 'flame') + '</span><div class="grow"><div class="t">' + esc(zoneName(m.zona, m.lado)) + '</div><div class="s">' + esc(fmtDate(m.fecha) + ' · ' + m.tipo + ' ' + m.nivel + '/10' + (m.resuelta ? ' · resuelta' : '')) + '</div></div>' + ic('chev') + '</button>').join('') + '</div>';
  return h + '</div></section>';
}
