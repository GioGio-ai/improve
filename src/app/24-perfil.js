/* ============================================================
   PERFIL: datos, lesión, horario, calendario, equipo, colores, datos y cuenta
   ============================================================ */
function viewPerfil(st, today) {
  const p = S.data.profile || {};
  const age = ageFrom(p.birth, today);
  const sch = scheduleOf(p);
  const who = [p.position, p.club].filter(Boolean).join(' · ');
  let h = '<div class="aura" aria-hidden="true"></div><section class="cover">' + photoImg('f5') + '<button class="iconbtn glass cover-edit" data-act="edit-profile" aria-label="Editar perfil">' + ic('edit') + '</button>' +
    '<span class="avatar lg">' + avatarImg() + '</span><div class="cover-t"><h1 class="h1">' + esc(p.name || 'Tu perfil') + '</h1>' + (who ? '<div class="cover-s">' + esc(who) + '</div>' : '') + '</div></section>';
  h += '<div class="stats"><div class="stat"><span class="v">' + (age ?? '—') + '</span><span class="k">años</span></div><div class="stat"><span class="v">' + (p.heightCm ?? '—') + '</span><span class="k">cm</span></div><div class="stat"><span class="v">' + (st.weight ? fmtNum(st.weight) : '—') + '</span><span class="k">kg</span></div></div>';
  if (p.targetDate || p.goalText) {
    const left = p.targetDate ? diffDays(p.targetDate, today) : null;
    h += '<section class="panel k-lime goal"><span class="kicker"><span class="d lime"></span>Objetivo</span>' +
      (left !== null && left > 0 ? '<div class="goal-n"><span class="n tnum">' + left + '</span><span class="u">' + (left === 1 ? 'día' : 'días') + '</span></div>' : '') +
      (p.targetDate ? '<div class="h3">' + capFirst(fmtDateLong(p.targetDate)) + '</div>' : '') + ((p.targetText || p.goalText) ? '<p class="sub">' + esc(p.targetText || p.goalText) + '</p>' : '') + '</section>';
  }
  const inj = st.injury;
  h += '<section class="card"><div class="stack"><div class="ed-head"><span class="kicker">Lesión</span><button class="btn xs" data-act="' + (inj ? 'edit-injury' : 'new-injury') + '">' + (inj ? 'Editar' : 'Registrar') + '</button></div>';
  if (inj) {
    const img = (inj.imaging || []).slice().sort(byDate).pop();
    h += '<dl class="kv"><dt>Zona</dt><dd>' + esc(inj.zone) + ' ' + (inj.side === 'i' ? 'izquierdo' : 'derecho') + '</dd><dt>Fecha</dt><dd>' + fmtDate(inj.date) + ' · ' + diffDays(today, inj.date) + ' días</dd><dt>Fase</dt><dd>' + PHASES[st.phase].n + ' · ' + esc(PHASES[st.phase].t) + '</dd><dt>Lugar</dt><dd>' + esc(inj.location || '—') + '</dd>' + (img ? '<dt>' + esc(img.type || 'Imagen') + '</dt><dd>' + esc(img.text) + '</dd>' : '') + '</dl>';
  } else h += '<p class="sub">Sin lesión activa.</p>';
  h += '</div></section>';
  // Horario
  const t = (k, label) => '<div class="field"><label for="sc-' + k + '">' + label + '</label><input class="input num" type="time" step="900" id="sc-' + k + '" data-bind="sched" data-name="' + k + '" value="' + esc(sch[k]) + '"></div>';
  h += '<section class="card"><div class="stack"><div class="stack-sm"><span class="kicker">Rutina diaria</span><p class="sub">La agenda del día parte de estos horarios.</p></div>' +
    '<div class="timegrid">' + t('wake', 'Despertar') + t('sleep', 'Dormir') + t('gym', 'Gimnasio') + t('field', 'Cancha (lun-vie)') + t('fieldEnd', 'Cancha cierra') + t('fieldSat', 'Cancha sábado') + '</div>' +
    toggleHtml('sched-nap', sch.nap !== false, 'Siesta corta', '20-30 min después del almuerzo, antes de las 15:00', '', 'sleep') + '</div></section>';
  // Calendario
  const dayBtns = (key, multi) => '<div class="pills">' + DOW.map((d, i) => { const on = multi ? (p[key] || []).includes(i) : Number(p[key] ?? 6) === i; return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-act="cal" data-key="' + key + '" data-i="' + i + '" aria-pressed="' + on + '">' + d + '</button>'; }).join('') + '</div>';
  const trials = (p.trials || []).slice().sort();
  h += '<section class="card"><div class="stack"><span class="kicker">Calendario</span>' +
    '<div class="field"><span class="lab">Pruebas en clubes</span>' + (trials.length ? '<div class="pills">' + trials.map(tr => '<button class="pill on lime" data-act="trial-del" data-v="' + tr + '" aria-label="Quitar prueba del ' + fmtDate(tr) + '">' + fmtDate(tr) + ' ' + ic('x') + '</button>').join('') + '</div>' : '') +
    '<div class="row nowrap"><input class="input grow" type="date" id="trial-date" aria-label="Fecha de prueba"><button class="btn sm" data-act="trial-add">' + ic('plus') + 'Añadir</button></div><span class="hint">El plan prepara los 2 días anteriores y recupera el siguiente.</span></div>' +
    '<div class="field"><span class="lab">Día de descanso</span>' + dayBtns('restDay', false) + '</div>' +
    '<div class="field"><span class="lab">Entrenamientos con un club</span>' + dayBtns('teamDays', true) + '</div>' +
    '<div class="field"><span class="lab">Días de partido</span>' + dayBtns('matchDays', true) + '<span class="hint">Desde F5, el plan se organiza por día de partido.</span></div></div></section>';
  const places = placesOf(p);
  h += '<section class="card"><div class="stack"><div class="stack-sm"><span class="kicker">Lugares</span><p class="sub">Desmarca lo que no tengas: el plan elige alternativas.</p></div>' +
    PLACES.map(pl => '<div class="field"><span class="lab">' + PLACE_NAMES[pl] + '</span><div class="pills">' + PLACES_DEFAULT[pl].eq.map(e => { const on = places[pl].eq.includes(e); return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-act="place-eq" data-place="' + pl + '" data-v="' + esc(e) + '" aria-pressed="' + on + '">' + esc(e) + '</button>'; }).join('') + '</div></div>').join('') +
    '</div></section>';
  // Fotos
  h += '<section class="card"><div class="stack"><div class="stack-sm"><span class="kicker">Fotos de la app</span><p class="sub">Toca una para cambiarla. Se guardan en tu cuenta.</p></div><div class="ph-grid">' +
    PHOTO_SLOTS.map(([k, n]) => '<button type="button" class="ph-slot' + (k === 'avatar' ? ' av' : '') + '" data-act="photo-set" data-k="' + k + '" aria-label="Cambiar foto: ' + n + '">' + photoImg(k) + '<span class="lb">' + n + '</span><span class="ed">' + ic('camera') + '</span></button>').join('') + '</div></div></section>';
  // Leyenda de colores
  const L = [['blue', 'Azul', 'Plan y acción'], ['lime', 'Lima', 'Hecho y logros'], ['load', 'Ámbar', 'Carga e intensidad'], ['pain', 'Rojo', 'Solo dolor'], ['sleep', 'Violeta', 'Sueño y recuperación'], ['prot', 'Verde agua', 'Proteína'], ['carb', 'Dorado', 'Carbohidratos'], ['fat', 'Rosa', 'Grasas'], ['water', 'Cian', 'Agua']];
  h += '<section class="card"><div class="stack"><span class="kicker">Colores</span><ul class="legend-list">' + L.map(([k, n, d]) => '<li><span class="sw ' + k + '"></span><div class="mw0"><b>' + n + '</b><div class="sub">' + d + '</div></div></li>').join('') + '</ul></div></section>';
  // Datos y cuenta
  h += '<section class="card"><div class="stack"><div class="stack-sm"><span class="kicker">Tus datos</span><p class="sub">' + (S.mode === 'cloud' ? 'En tu cuenta, cifrados en tránsito. Solo tú los ves. Funcionan sin conexión.' : 'Modo local de prueba: solo en este navegador.') + '</p></div>' +
    '<div class="grid2"><button class="btn sm" data-act="export">' + ic('down') + 'Exportar copia</button><label class="btn sm" for="import-file">' + ic('up') + 'Importar copia</label></div><input type="file" id="import-file" accept="application/json,.json" hidden></div></section>';
  h += '<section class="card"><div class="stack"><div class="row between nowrap"><div class="grow stack-xs"><span class="kicker">Cuenta</span><div class="body ellipsis">' + esc((S.user && S.user.email) || 'Sin sesión') + '</div></div>' + (S.mode === 'cloud' ? '<button class="btn sm" data-act="sign-out">' + ic('logout') + 'Salir</button>' : '') + '</div>' +
    '<div class="row between"><span class="brand"><span class="mk"><i></i></span>IMPROVE</span><span class="sub num">v' + VERSION + '</span></div></div></section>';
  return h;
}
function openProfile() {
  const p = S.data.profile || {};
  UI.pf = Object.assign({ name: '', birth: '', heightCm: null, position: '', foot: 'Derecha', club: '', goalText: '', targetDate: '', targetText: '', weightTarget: '' }, clone(p));
  openSheet({ id: 'profile', full: true, render: profileHtml });
}
function profileHtml() {
  const p = UI.pf;
  const f = (k, label, type, extra) => '<div class="field"><label for="pf-' + k + '">' + label + '</label><input class="input" id="pf-' + k + '" type="' + (type || 'text') + '" data-bind="pf" data-name="' + k + '" value="' + esc(p[k] ?? '') + '"' + (extra || '') + '></div>';
  return sheetHead('Perfil', 'Ajusta el plan') + '<div class="sheet-body">' + f('name', 'Nombre', 'text', ' autocomplete="given-name"') + '<div class="grid2">' + f('birth', 'Nacimiento', 'date') + f('heightCm', 'Altura (cm)', 'text', ' inputmode="numeric"') + '</div>' +
    '<div class="grid2">' + f('position', 'Posición') + '<div class="field"><label for="pf-foot">Pierna hábil</label><select class="input" id="pf-foot" data-bind="pf" data-name="foot">' + ['Derecha', 'Izquierda', 'Ambas'].map(o => '<option' + (p.foot === o ? ' selected' : '') + '>' + o + '</option>').join('') + '</select></div></div>' +
    f('club', 'Club') + '<div class="field"><label for="pf-goal">Objetivo</label><textarea class="input" id="pf-goal" data-bind="pf" data-name="goalText" rows="2">' + esc(p.goalText || '') + '</textarea></div>' +
    '<div class="grid2">' + f('targetDate', 'Fecha objetivo', 'date') + f('weightTarget', 'Objetivo de peso') + '</div>' + f('targetText', 'Qué tiene que pasar ese día') +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="pf-save">Guardar</button></div></div>';
}
function saveProfile() {
  const p = clone(UI.pf); delete p.id;
  p.heightCm = num(p.heightCm);
  ['restDay', 'teamDays', 'matchDays', 'equipmentOff', 'places', 'trials', 'schedule'].forEach(k => { if (p[k] === undefined && S.data.profile && S.data.profile[k] !== undefined) p[k] = S.data.profile[k]; });
  if (p.restDay === undefined) p.restDay = 6;
  put('profile', 'main', p).then(() => toast('Perfil guardado.'));
  closeSheet();
}
function updateProfile(fn) { const p = clone(S.data.profile || { restDay: 6, teamDays: [], matchDays: [], equipmentOff: [] }); delete p.id; fn(p); return put('profile', 'main', p); }
function setSchedule(k, v) { updateProfile(p => { p.schedule = Object.assign({}, scheduleOf(p), p.schedule || {}); p.schedule[k] = v; }); }
function openInjury(isNew) {
  const inj = isNew ? null : ST.injury;
  const img = inj ? (inj.imaging || [])[0] || {} : {};
  UI.ij = { isNew, zone: inj ? inj.zone : '', side: inj ? inj.side : 'd', date: inj ? inj.date : todayStr(), recurrences: inj ? inj.recurrences || 1 : 1, location: inj ? inj.location || '' : '', mechanism: inj ? inj.mechanism || '' : '', imgDate: img.date || '', imgType: img.type || 'Ecografía', imgText: img.text || '' };
  openSheet({ id: 'injury', full: true, render: injuryHtml });
}
function injuryHtml() {
  const v = UI.ij;
  const f = (k, label, type) => '<div class="field"><label for="ij-' + k + '">' + label + '</label><input class="input" id="ij-' + k + '" type="' + (type || 'text') + '" data-bind="ij" data-name="' + k + '" value="' + esc(v[k] ?? '') + '"></div>';
  return sheetHead(v.isNew ? 'Registrar lesión' : 'Editar lesión', v.isNew ? 'La app pasa a modo rehabilitación desde F1' : '') + '<div class="sheet-body">' +
    '<div class="grid2">' + f('zone', 'Zona') + '<div class="field"><span class="lab">Lado</span><div class="seg"><button type="button" data-act="ij-side" data-v="d" class="' + (v.side !== 'i' ? 'on' : '') + '">Derecho</button><button type="button" data-act="ij-side" data-v="i" class="' + (v.side === 'i' ? 'on' : '') + '">Izquierdo</button></div></div></div>' +
    '<div class="grid2">' + f('date', 'Fecha', 'date') + f('recurrences', 'Lesiones en la zona', 'text') + '</div>' + f('location', 'Localización') +
    '<div class="field"><label for="ij-mech">Mecanismo</label><textarea class="input" id="ij-mech" data-bind="ij" data-name="mechanism" rows="2">' + esc(v.mechanism) + '</textarea></div>' +
    '<div class="grid2">' + f('imgDate', 'Fecha de la imagen', 'date') + f('imgType', 'Tipo') + '</div>' +
    '<div class="field"><label for="ij-img">Informe</label><textarea class="input" id="ij-img" data-bind="ij" data-name="imgText" rows="3">' + esc(v.imgText) + '</textarea></div>' +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="ij-save">Guardar</button></div></div>';
}
function saveInjury() {
  const v = UI.ij;
  const inj = v.isNew ? { status: 'activa', phase: 1, kickStart: 1, sprintStart: 1, phaseLog: [{ phase: 1, date: v.date || todayStr(), note: 'Lesión' }] } : clone(ST.injury);
  delete inj.id;
  inj.zone = (v.zone || 'Lesión').trim(); inj.side = v.side; inj.date = v.date || todayStr(); inj.recurrences = num(v.recurrences) || 1; inj.location = v.location; inj.mechanism = v.mechanism;
  const rest = (inj.imaging || []).slice(1);
  inj.imaging = v.imgText ? [{ date: v.imgDate || inj.date, type: v.imgType || 'Imagen', text: v.imgText }].concat(rest) : rest;
  put('injuries', v.isNew ? uid('les') : ST.injury.id, inj).then(() => toast('Lesión guardada.'));
  closeSheet();
}
function updateInjury(fn) { const inj = ST && ST.injury; if (!inj) return Promise.resolve(); const d = clone(inj); delete d.id; fn(d); return put('injuries', inj.id, d); }
function openWeight() {
  UI.wt = { date: todayStr(), kg: ST.weight };
  openSheet({ id: 'weight', render: () => sheetHead('Registrar peso', 'En el gimnasio, a la misma hora') + '<div class="sheet-body"><div class="field"><label for="wt-date">Fecha</label><input class="input" type="date" id="wt-date" data-bind="wt" data-name="date" value="' + UI.wt.date + '"></div>' +
    '<div class="field"><span class="lab">Peso</span>' + stepperHtml('wt-kg', UI.wt.kg, 'wt-step', 'data-name="kg"', 'kg') + '</div><div class="sheet-foot"><button class="btn primary lg" data-act="wt-save">Guardar</button></div></div>' });
}
function openConfirm(title, body, act, data, danger) {
  openSheet({ id: 'confirm', render: () => sheetHead(title) + '<div class="sheet-body"><p class="body">' + body + '</p><div class="sheet-foot"><button class="btn" data-act="close">Cancelar</button><button class="btn ' + (danger ? 'danger' : 'primary') + '" data-act="' + act + '" ' + Object.entries(data || {}).map(([k, v]) => 'data-' + k + '="' + esc(v) + '"').join(' ') + '>Confirmar</button></div></div>' });
}

/* ---------- Exportar / importar ---------- */
function exportData() {
  const payload = JSON.stringify({ app: 'improve', version: VERSION, exportedAt: new Date().toISOString(), data: S.data }, null, 1);
  try {
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'improve-datos-' + todayStr() + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    toast('Copia exportada.');
  } catch (e) { toast('No se pudo exportar.', 'warn'); }
}
async function importObject(j) {
  const d = j.data || j; let n = 0;
  for (const col of Object.keys(COLS)) {
    if (!d[col]) continue;
    if (COLS[col] === 'single') { await put(col, 'main', d[col]); n++; }
    else for (const doc of d[col]) if (doc && doc.id) { await put(col, doc.id, doc); n++; }
  }
  for (const m of (d.media || [])) if (m && m.id && m.data) { await FB.set('media', m.id, { data: m.data, updatedAt: Date.now() }); MEDIA[m.id] = m.data; n++; }
  return n;
}
function importData(ev) {
  const file = ev.target.files && ev.target.files[0]; if (!file) return;
  const r = new FileReader();
  r.onload = async () => {
    try { const n = await importObject(JSON.parse(String(r.result))); toast('Importados ' + n + ' registros.'); }
    catch (e) { toast('El archivo no es una copia válida.', 'warn'); }
    ev.target.value = '';
  };
  r.readAsText(file);
}
