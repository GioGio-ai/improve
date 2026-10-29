/* ============================================================
   MOLESTIAS: marcar en el mapa del cuerpo, seguimiento «¿Sigue?»
   y ajuste automático del plan de hoy y mañana.
   ============================================================ */
const MOL_TIPOS = [['cargado', 'Cargado', 'Pesado, fatigado'], ['tirante', 'Tirante', 'Tenso, corto'], ['dolor', 'Dolor', 'Pincha o duele']];
function molList() { return (S.data.molestias || []).filter(m => m && !m.deleted); }
function molActiveToday() { return ST ? activeMolestias(ST, todayStr()) : []; }
function openMolestia(opts) {
  opts = opts || {};
  const z = opts.zona || null;
  UI.mol = { view: z ? (ZONE_VIEW[z] || 'front') : 'front', zona: z, lado: opts.lado || null, tipo: 'cargado', nivel: 4, nota: '', from: opts.from || 'hoy', during: opts.during || null };
  openSheet({ id: 'molestia', full: true, render: molestiaHtml });
}
function molLevelHtml(v, tipo) {
  let h = '<div class="scale mol' + (tipo === 'dolor' ? ' pain' : ' load') + '" role="radiogroup" aria-label="Intensidad">';
  for (let i = 1; i <= 10; i++) h += '<button type="button" role="radio" aria-checked="' + (v === i) + '" class="' + (v === i ? 'on' : '') + '" data-act="mol-lvl" data-v="' + i + '">' + i + '</button>';
  return h + '</div><div class="legend"><span>1 apenas</span><span>10 máximo</span></div>';
}
function molestiaHtml() {
  const M = UI.mol, sel = M.zona && M.lado ? M.zona + ':' + M.lado : '';
  const vals = {}; if (sel) vals[sel] = painColor(M.tipo, M.nivel);
  molActiveToday().forEach(m => { const k = m.zona + ':' + m.lado; if (k !== sel) vals[k] = painColor(m.tipo, m.nivelAct); });
  let h = sheetHead('Molestia', M.from === 'checkin' ? 'Paso opcional del check-in' : M.from === 'train' ? 'Durante el entrenamiento' : 'Toca la zona donde la sientes') + '<div class="sheet-body">';
  h += '<div class="seg" role="tablist"><button type="button" role="tab" aria-selected="' + (M.view === 'front') + '" class="' + (M.view === 'front' ? 'on' : '') + '" data-act="mol-view" data-v="front">Frente</button><button type="button" role="tab" aria-selected="' + (M.view === 'back') + '" class="' + (M.view === 'back' ? 'on' : '') + '" data-act="mol-view" data-v="back">Espalda</button></div>';
  h += '<div class="bmap-one">' + bodyMapSvg({ view: M.view, mode: 'select', values: vals, selected: sel, act: 'mol-zone' }) + '<span class="bm-side l">' + (M.view === 'front' ? 'Derecha' : 'Izquierda') + '</span><span class="bm-side r">' + (M.view === 'front' ? 'Izquierda' : 'Derecha') + '</span></div>';
  h += '<div class="grid2"><div class="field"><label for="mol-z">Zona</label><select class="input" id="mol-z" data-bind="mol-z"><option value="">Elegir…</option>' + ZONE_ORDER.map(z => '<option value="' + z + '"' + (M.zona === z ? ' selected' : '') + '>' + esc(BODY_ZONES[z].n) + '</option>').join('') + '</select></div>' +
    '<div class="field"><span class="lab">Lado</span><div class="seg"><button type="button" data-act="mol-side" data-v="d" class="' + (M.lado === 'd' ? 'on' : '') + '">Derecho</button><button type="button" data-act="mol-side" data-v="i" class="' + (M.lado === 'i' ? 'on' : '') + '">Izquierdo</button></div></div></div>';
  h += '<div class="field"><span class="lab">Tipo</span><div class="seg tri">' + MOL_TIPOS.map(([k, l, d]) => '<button type="button" data-act="mol-tipo" data-v="' + k + '" class="' + (M.tipo === k ? 'on' + (k === 'dolor' ? ' red' : ' amber') : '') + '">' + l + '<small>' + d + '</small></button>').join('') + '</div></div>';
  h += '<div class="field"><span class="lab">Intensidad</span>' + molLevelHtml(M.nivel, M.tipo) + '</div>';
  if (M.zona && M.lado) h += molPreview(M);
  h += '<div class="field"><label for="mol-nota">Nota (opcional)</label><textarea class="input" id="mol-nota" data-bind="mol-nota" rows="2" placeholder="Cuándo apareció, con qué gesto">' + esc(M.nota) + '</textarea></div>';
  h += '<div class="sheet-foot"><button class="btn" data-act="close">Cancelar</button><button class="btn primary lg" data-act="mol-save"' + (M.zona && M.lado ? '' : ' disabled') + '>Guardar</button></div>';
  h += molActiveListHtml();
  return h + '</div>';
}
/* Qué hará el plan con esta molestia, antes de guardarla */
function molPreview(M) {
  const sev = molSeverity({ tipo: M.tipo, nivelAct: M.nivel });
  const sprint = MOL_SPRINT_ZONES.includes(M.zona), kick = MOL_KICK_ZONES.includes(M.zona);
  const items = [];
  if (sev === 'ninguna') items.push('Sin cambios en el plan. Mañana te pregunto si sigue.');
  else if (sev === 'moderada') { items.push('Una serie menos en lo que trabaja la zona; excéntricos y saltos pasan a isométricos.'); if (sprint) items.push('Sprint hasta S2.'); if (kick) items.push('Golpeo hasta K3.'); }
  else { items.push(sev === 'alta' ? 'Hoy nada que cargue la zona; lo intenso pasa al próximo día suave.' : 'Nada intenso en la zona.'); if (sprint) items.push('Sin sprint.'); if (kick) items.push('Sin golpeo.'); }
  if (M.tipo === 'dolor' && M.nivel >= 3 && (M.zona === 'isquio' || M.during === 'sprint' || M.during === 'golpeo')) items.push('Si apareció de golpe al esprintar o rematar: para hoy y consulta.');
  return '<div class="note ' + (M.tipo === 'dolor' && M.nivel >= 3 ? 'pain' : sev === 'ninguna' ? 'info' : 'warn') + '">' + ic(sev === 'ninguna' ? 'info' : 'warn') + '<div><b>Hoy y mañana:</b> ' + esc(items.join(' ')) + '</div></div>';
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
function saveMolestia() {
  const M = UI.mol; if (!M || !M.zona || !M.lado) { toast('Toca la zona en el mapa.', 'warn'); return; }
  const now = new Date(), id = uid('mol');
  const doc = { fecha: todayStr(), hora: fmtHM(now.getHours() * 60 + now.getMinutes()), zona: M.zona, lado: M.lado, tipo: M.tipo, nivel: M.nivel, nota: (M.nota || '').trim(), resuelta: false, updates: [], origen: M.from };
  if (M.during) doc.durante = M.during;
  put('molestias', id, doc).then(() => {
    const sev = molSeverity({ tipo: doc.tipo, nivelAct: doc.nivel });
    toast(sev === 'ninguna' ? 'Molestia guardada. Mañana te pregunto.' : 'Molestia guardada: el plan de hoy y mañana se ajusta.', sev === 'ninguna' ? 'ok' : 'warn', sev === 'ninguna' ? null : { label: 'Deshacer ajuste', act: 'mol-undo', data: { id, date: todayStr() } });
  });
  const from = M.from; UI.mol = null;
  closeSheet();
  if (from === 'train' && TR.open) setTimeout(() => { patchStep(); }, 80);
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
function molFollow(id, estado) {
  const m = molList().find(x => x.id === id); if (!m) return;
  const today = todayStr(), act = activeMolestias(ST, today).find(x => x.id === id);
  const cur = act ? act.nivelAct : num(m.nivel) || 1;
  const d = clone(m); delete d.id;
  d.updates = (d.updates || []).filter(u => u.fecha !== today);
  const nivel = estado === 'mejor' ? Math.max(1, cur - 2) : estado === 'peor' ? Math.min(10, cur + 2) : cur;
  d.updates.push({ fecha: today, estado, nivel });
  if (estado === 'ya_no') { d.resuelta = true; d.resueltaEn = today; }
  put('molestias', id, d).then(() => toast(estado === 'ya_no' ? 'Molestia resuelta.' : estado === 'peor' ? 'Anotado: el plan se ajusta más. Si sigue empeorando, consulta.' : 'Anotado.', estado === 'peor' ? 'warn' : 'ok'));
  refreshSheet(true);
}
function molSetNoAdjust(id, date, on) {
  const m = molList().find(x => x.id === id); if (!m) return;
  const d = clone(m); delete d.id;
  const arr = (d.noAdjust || []).filter(x => x !== date); if (on) arr.push(date);
  d.noAdjust = arr;
  put('molestias', id, d).then(() => toast(on ? 'Ajuste deshecho: hoy el plan sigue igual.' : 'El plan vuelve a ajustarse.', 'info'));
}
/* ---------- Hoy: botón, activas, «¿Sigue?» y ajustes con deshacer ---------- */
function molHoyHtml(day, today) {
  const act = molActiveToday();
  const ask = act.filter(m => m.fecha < today && !(m.last && m.last.fecha === today));
  let h = '';
  h += ask.map(m => '<section class="card t-load tight"><div class="stack-sm"><div class="micro" style="color:var(--amber)">Molestia · ' + fmtDate(m.fecha) + '</div><div class="h3">¿Sigue la molestia en ' + esc(zoneName(m.zona, m.lado).toLowerCase()) + '?</div>' + molFollowBtns(m.id) + '</div></section>').join('');
  const adj = (day && day.molAdj) || [];
  if (adj.length) h += '<section class="card tight"><div class="stack-sm"><div class="row between"><span class="h3">' + ic('warn') + ' Ajustes por molestias</span></div>' + adj.map(a => '<div class="note ' + (a.tipo === 'dolor' ? 'pain' : 'warn') + '">' + ic('warn') + '<div>' + esc(a.text) + '<div><button class="linkbtn" data-act="mol-undo" data-id="' + esc(a.id) + '" data-date="' + today + '">' + ic('undo') + 'Deshacer ajuste</button></div></div></div>').join('') + '</div></section>';
  const ins = ST ? molestiaInsights(ST, today) : [];
  if (ins.length) h += ins.map(x => note('blue', '<b>' + esc(zoneName(x.zona, x.lado)) + ': ' + x.n + ' veces en 14 días.</b> ' + esc(x.tip) + (x.causes.length ? ' En las 48 h previas: ' + esc(x.causes.join(', ')) + '.' : ''))).join('');
  return h;
}
function molChips(today) {
  const act = molActiveToday();
  return '<button class="chip" data-act="mol-new">' + ic('plus') + 'Molestia</button>' + act.map(m => '<button class="chip ' + (m.tipo === 'dolor' ? 'pain' : 'load') + '" data-act="mol-open" data-id="' + esc(m.id) + '">' + esc(zoneName(m.zona, m.lado)) + ' ' + m.nivelAct + '</button>').join('');
}
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
  molestiaInsights(st, today).forEach(x => { h += note('blue', '<b>' + esc(zoneName(x.zona, x.lado)) + ': ' + x.n + ' veces.</b> ' + esc(x.tip) + (x.causes.length ? ' Antes: ' + esc(x.causes.join(', ')) + '.' : '')); });
  h += '<div class="stack-sm">' + list.slice().reverse().slice(0, 8).map(m => '<button class="blk" data-act="mol-open" data-id="' + esc(m.id) + '"><span class="c ' + (m.tipo === 'dolor' ? 'pain' : 'load') + '">' + ic(m.tipo === 'dolor' ? 'warn' : 'flame') + '</span><div class="grow"><div class="t">' + esc(zoneName(m.zona, m.lado)) + '</div><div class="s">' + esc(fmtDate(m.fecha) + ' · ' + m.tipo + ' ' + m.nivel + '/10' + (m.resuelta ? ' · resuelta' : '')) + '</div></div>' + ic('chev') + '</button>').join('') + '</div>';
  return h + '</div></section>';
}
