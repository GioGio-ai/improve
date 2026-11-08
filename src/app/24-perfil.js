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
    toggleHtml('sched-nap', sch.nap !== false, 'Siesta corta', '20-30 min después del almuerzo, antes de las 15:00', '', 'sleep') +
    toggleHtml('geo', !!p.geo, 'Clima para el agua', p.geo ? 'Con tu ubicación aproximada: más agua los días de calor.' : 'Usa tu ubicación aproximada para sumar agua los días de calor.', '', 'water') + '</div></section>';
  // Calendario
  const dayBtns = (key, multi) => '<div class="pills">' + DOW.map((d, i) => { const on = multi ? (p[key] || []).includes(i) : Number(p[key] ?? 6) === i; return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-act="cal" data-key="' + key + '" data-i="' + i + '" aria-pressed="' + on + '">' + d + '</button>'; }).join('') + '</div>';
  const trials = (p.trials || []).slice().sort();
  h += '<section class="card"><div class="stack"><span class="kicker">Calendario</span>' +
    '<div class="field"><span class="lab">Pruebas en clubes</span>' + (trials.length ? '<div class="pills">' + trials.map(tr => '<button class="pill on lime" data-act="trial-del" data-v="' + tr + '" aria-label="Quitar prueba del ' + fmtDate(tr) + '">' + fmtDate(tr) + ' ' + ic('x') + '</button>').join('') + '</div>' : '') +
    '<div class="row nowrap"><input class="input grow" type="date" id="trial-date" aria-label="Fecha de prueba"><button class="btn sm" data-act="trial-add">' + ic('plus') + 'Añadir</button></div><span class="hint">El plan prepara los 2 días anteriores y recupera el siguiente.</span></div>' +
    '<div class="field"><span class="lab">Día de descanso</span>' + dayBtns('restDay', false) + '</div>' +
    '<div class="field"><span class="lab">Entrenamientos con un club</span>' + dayBtns('teamDays', true) + '</div>' +
    '<div class="field"><span class="lab">Días de partido</span>' + dayBtns('matchDays', true) + '<span class="hint">Desde F5, el plan se organiza por día de partido.</span></div>' +
    toggleHtml('partners', p.partners === true, 'Tengo con quién jugar', 'Para el juego reducido. Si no, el plan pone una simulación de partido individual.') +
    '<div class="field"><span class="lab">Énfasis al volver a jugar (F5-F6)</span><div class="pills">' + [['', 'Equilibrado'], ['velocidad', 'Velocidad'], ['fuerza', 'Fuerza'], ['potencia', 'Potencia']].map(([k, n]) => { const on = (p.emphasis || '') === k; return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-act="emphasis" data-v="' + k + '" aria-pressed="' + on + '">' + n + '</button>'; }).join('') + '</div><span class="hint">Cambia qué fuerza y qué trabajo de cancha lleva cada día intenso.</span></div></div></section>';
  h += blockCardHtml(st, today) + sickCardHtml(st, today);
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
  ['restDay', 'teamDays', 'matchDays', 'equipmentOff', 'places', 'trials', 'schedule', 'partners', 'emphasis', 'geo', 'sick', 'block'].forEach(k => { if (p[k] === undefined && S.data.profile && S.data.profile[k] !== undefined) p[k] = S.data.profile[k]; });
  if (p.restDay === undefined) p.restDay = 6;
  put('profile', 'main', p).then(() => toast('Perfil guardado.'));
  closeSheet();
}
/* Clima para el agua: ubicación aproximada (2 decimales, ~1 km) y pronóstico de Open-Meteo (gratis, sin clave) */
const WX_KEY = 'improve-wx-v1';
let wxAt = 0;
function toggleGeo() {
  const p = S.data.profile || {};
  if (p.geo) { updateProfile(x => { delete x.geo; }); for (const k in WX) delete WX[k]; try { localStorage.removeItem(WX_KEY); } catch (e) { /* nada */ } return; }
  if (!navigator.geolocation) { toast('Este teléfono no da la ubicación.', 'warn'); return; }
  navigator.geolocation.getCurrentPosition((pos) => {
    const r = (v) => Math.round(v * 100) / 100;
    updateProfile(x => { x.geo = { lat: r(pos.coords.latitude), lon: r(pos.coords.longitude) }; }).then(() => { wxAt = 0; refreshWeather(); toast('Listo: el agua sigue el calor del día.'); });
  }, () => toast('No se pudo obtener la ubicación.', 'warn'), { timeout: 10000, maximumAge: 3600e3 });
}
function refreshWeather() {
  const g = S.data.profile && S.data.profile.geo;
  if (!g || Date.now() - wxAt < 3 * 3600e3) return;
  wxAt = Date.now();
  try { const c = JSON.parse(localStorage.getItem(WX_KEY) || 'null'); if (c && c.lat === g.lat && c.lon === g.lon && Date.now() - c.at < 3 * 3600e3) { Object.assign(WX, c.days); scheduleRender(); return; } } catch (e) { /* nada */ }
  if (S.mode !== 'cloud') { const t = todayStr(); for (let i = 0; i < 7; i++) WX[addDays(t, i)] = { tmax: 33 }; scheduleRender(); return; }
  fetch('https://api.open-meteo.com/v1/forecast?latitude=' + g.lat + '&longitude=' + g.lon + '&daily=temperature_2m_max&timezone=auto&forecast_days=7')
    .then(r => r.json()).then(j => {
      const days = {}; ((j.daily && j.daily.time) || []).forEach((d, i) => { const v = num(j.daily.temperature_2m_max[i]); if (v !== null) days[d] = { tmax: v }; });
      Object.assign(WX, days);
      try { localStorage.setItem(WX_KEY, JSON.stringify({ at: Date.now(), lat: g.lat, lon: g.lon, days })); } catch (e) { /* nada */ }
      scheduleRender();
    }).catch(() => { wxAt = Date.now() - 2.5 * 3600e3; });
}
function updateProfile(fn) { const p = clone(S.data.profile || { restDay: 6, teamDays: [], matchDays: [], equipmentOff: [] }); delete p.id; fn(p); return put('profile', 'main', p); }
function setSchedule(k, v) {
  /* Dormir siempre de noche: 10:30 (a. m. por error) se guarda como 22:30 */
  if (k === 'sleep' && /^\d{1,2}:\d{2}$/.test(v)) {
    const fixed = fmtHM(normBed(hm(v)));
    if (fixed !== fmtHM(hm(v))) toast('Dormir a las ' + fmtHM(hm(v)) + ' es de día: queda a las ' + fixed + '.', 'info');
    v = fixed;
  }
  updateProfile(p => { p.schedule = scheduleOf(p); p.schedule[k] = v; });
}
function openInjury(isNew) {
  const inj = isNew ? null : ST.injury;
  const img = inj ? (inj.imaging || [])[0] || {} : {};
  const fl = (inj && inj.floors) || {};
  UI.ij = { isNew, zone: inj ? inj.zone : '', side: inj ? inj.side : 'd', date: inj ? inj.date : todayStr(), recurrences: inj ? inj.recurrences || 1 : 1, location: inj ? inj.location || '' : '', mechanism: inj ? inj.mechanism || '' : '', imgDate: img.date || '', imgType: img.type || 'Ecografía', imgText: img.text || '',
    floor3: fl[3] ?? '', floor4: fl[4] ?? '', floor5: fl[5] ?? '' };
  openSheet({ id: 'injury', full: true, render: injuryHtml });
}
function injuryHtml() {
  const v = UI.ij;
  const f = (k, label, type) => '<div class="field"><label for="ij-' + k + '">' + label + '</label><input class="input" id="ij-' + k + '" type="' + (type || 'text') + '" data-bind="ij" data-name="' + k + '" value="' + esc(v[k] ?? '') + '"></div>';
  return sheetHead(v.isNew ? 'Registrar lesión' : 'Editar lesión', v.isNew ? 'La app pasa a modo rehabilitación desde F1' : '') + '<div class="sheet-body">' +
    '<div class="grid2">' + f('zone', 'Zona') + '<div class="field"><span class="lab">Lado</span><div class="seg"><button type="button" data-act="ij-side" data-v="d" class="' + (v.side !== 'i' ? 'on' : '') + '">Derecho</button><button type="button" data-act="ij-side" data-v="i" class="' + (v.side === 'i' ? 'on' : '') + '">Izquierdo</button></div></div></div>' +
    '<div class="grid2">' + f('date', 'Fecha', 'date') + f('recurrences', 'Lesiones en la zona', 'text') + '</div>' + f('location', 'Localización') +
    '<div class="field"><label for="ij-mech">Mecanismo</label><textarea class="input" id="ij-mech" data-bind="ij" data-name="mechanism" rows="2">' + esc(v.mechanism) + '</textarea></div>' +
    '<div class="field"><span class="lab">Días mínimos desde la lesión para empezar</span><div class="grid3">' + [3, 4, 5].map(k => '<div class="field"><label for="ij-floor' + k + '">' + PHASES[k].n + '</label><input class="input num" id="ij-floor' + k + '" type="text" inputmode="numeric" data-bind="ij" data-name="floor' + k + '" value="' + esc(v['floor' + k] ?? '') + '" placeholder="' + PHASE_FLOOR[k] + '"></div>').join('') + '</div>' +
    '<span class="hint">Además de los criterios de cada fase. Vacío: ' + PHASE_FLOOR[3] + ', ' + PHASE_FLOOR[4] + ' y ' + PHASE_FLOOR[5] + ' días.</span></div>' +
    '<div class="grid2">' + f('imgDate', 'Fecha de la imagen', 'date') + f('imgType', 'Tipo') + '</div>' +
    '<div class="field"><label for="ij-img">Informe</label><textarea class="input" id="ij-img" data-bind="ij" data-name="imgText" rows="3">' + esc(v.imgText) + '</textarea></div>' +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="ij-save">Guardar</button></div></div>';
}
function saveInjury() {
  const v = UI.ij;
  const inj = v.isNew ? { status: 'activa', phase: 1, kickStart: 1, sprintStart: 1, phaseLog: [{ phase: 1, date: v.date || todayStr(), note: 'Lesión' }] } : clone(ST.injury);
  delete inj.id;
  inj.zone = (v.zone || 'Lesión').trim(); inj.side = v.side; inj.date = v.date || todayStr(); inj.recurrences = num(v.recurrences) || 1; inj.location = v.location; inj.mechanism = v.mechanism;
  /* Piso de días por fase: solo lo que se escribió (vacío = valor por defecto) */
  const floors = {};
  [3, 4, 5].forEach(k => { const n = num(v['floor' + k]); if (n !== null && n >= 0) floors[k] = Math.round(n); });
  if (Object.keys(floors).length) inj.floors = floors; else delete inj.floors;
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

/* ---------- Pretemporada (v4.6) ---------- */
const BLOCK_FASE_N = { carga: 'Carga', afinamiento: 'Afinamiento', previa: 'Previa a la prueba', prueba: 'Día de la prueba' };
function blockCardHtml(st, today) {
  const b = (S.data.profile || {}).block;
  const active = !!(b && b.tipo === 'pretemporada' && (!b.hasta || b.hasta >= today));
  let h = '<section class="card"><div class="stack"><div class="ed-head"><span class="kicker">Pretemporada</span>' + (active ? '<button class="btn xs" data-act="block-edit">Editar</button>' : '') + '</div>';
  if (active) {
    const bi = blockInfo(st, today);
    h += '<div class="h3">' + capFirst(fmtDate(b.desde)) + (b.hasta ? ' → ' + fmtDate(b.hasta) : '') + '</div>' +
      '<p class="sub">' + (bi ? 'Día ' + bi.day + ' de ' + bi.total + ' · ' + BLOCK_FASE_N[bi.fase] : 'Empieza el ' + fmtDateLong(b.desde)) + '. Intervalos de resistencia, sprint, agilidad, potencia y balón; afinamiento desde 6 días antes de la prueba.</p>';
    if (st.phase < 3) h += note('warn', 'Se aplica desde F3: en ' + PHASES[st.phase].n + ' manda la rehabilitación.');
    h += '<div class="grid2"><button class="btn sm ghost" data-act="guide" data-g="pretemporada">' + ic('info') + 'Cómo funciona</button><button class="btn sm ghost" data-act="block-end">' + ic('x') + 'Terminar</button></div>';
  } else {
    h += '<p class="sub">Un bloque corto hacia una prueba: días altos y medios alternados, intervalos de resistencia, sprints repetidos y afinamiento al final.</p>' +
      '<button class="btn sm" data-act="block-edit">' + ic('plus') + 'Empezar una pretemporada</button>';
  }
  return h + '</div></section>';
}
function openPreBlock() {
  const p = S.data.profile || {}, b = p.block && p.block.tipo === 'pretemporada' ? p.block : null, today = todayStr();
  const trial = ((p.trials || []).filter(t => t > today).sort()[0]) || '';
  UI.blk = { desde: b ? b.desde : addDays(today, 1), hasta: b ? (b.hasta || '') : trial, trial: true };
  openSheet({ id: 'block', render: preBlockSheetHtml });
}
function preBlockSheetHtml() {
  const q = UI.blk;
  return sheetHead('Pretemporada', 'Hacia la prueba') + '<div class="sheet-body">' +
    '<div class="grid2"><div class="field"><label for="blk-desde">Desde</label><input class="input" type="date" id="blk-desde" value="' + esc(q.desde || '') + '" data-bind="blk" data-name="desde"></div>' +
    '<div class="field"><label for="blk-hasta">Hasta</label><input class="input" type="date" id="blk-hasta" value="' + esc(q.hasta || '') + '" data-bind="blk" data-name="hasta"></div></div>' +
    toggleHtml('blk-trial', q.trial, 'Ese día tengo una prueba', 'Se suma a tus pruebas: el plan afina desde 6 días antes, descansa en P-2 y activa en P-1.') +
    '<p class="sub">Días altos (mar, jue, sáb): fuerza o potencia, golpeo, sprint y sprints repetidos, agilidad o juego. Días medios (lun, mié, vie): intervalos de resistencia, balón y tren superior o prevención. Las escaleras K y S y las reglas de dolor no cambian.</p>' +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="block-save">Guardar</button></div></div>';
}
function saveBlock() {
  const q = UI.blk;
  const desde = ($('#blk-desde') || {}).value || q.desde, hasta = ($('#blk-hasta') || {}).value || q.hasta;
  if (!desde) { toast('Elige desde cuándo.', 'warn'); return; }
  if (hasta && hasta < desde) { toast('La fecha final va después del inicio.', 'warn'); return; }
  updateProfile(p => {
    p.block = { tipo: 'pretemporada', desde, hasta: hasta || null };
    if (hasta && q.trial) { const t = (p.trials || []).slice(); if (!t.includes(hasta)) t.push(hasta); p.trials = t.sort(); }
  }).then(() => toast('Pretemporada guardada: el plan ya cambió.'));
  closeSheet();
}
function endBlock() { updateProfile(p => { delete p.block; }).then(() => toast('Pretemporada terminada: vuelve la semana normal.')); }

/* ---------- Enfermedad (v4.6) ---------- */
function sickCardHtml(st, today) {
  const list = ((S.data.profile || {}).sick || []).slice().sort((a, b) => (a.from < b.from ? 1 : -1)).slice(0, 3);
  let h = '<section class="card"><div class="stack"><span class="kicker">Enfermedad</span>';
  if (list.length) h += '<div class="stack-sm">' + list.map(r => '<div class="lrow"><span class="fg2">' + capFirst(fmtDate(r.from)) + (r.to && r.to !== r.from ? ' → ' + fmtDate(r.to) : '') + '<br><span class="sub">' + esc((SICK_KINDS[r.kind] || SICK_KINDS.leve).n) + '</span></span>' +
    '<button class="iconbtn sm plain" data-act="sick-del" data-v="' + esc(r.from) + '" aria-label="Quitar la enfermedad del ' + fmtDate(r.from) + '">' + ic('x') + '</button></div>').join('') + '</div>';
  const rr = sickReturn(st, today);
  if (rr) h += note('info', 'Vuelta gradual: día ' + rr.day + ' de ' + rr.n + (rr.hard ? ', hoy nada intenso.' : ', hoy sin estrenar nivel.'));
  h += '<p class="sub">Lo planificado esos días queda como no hecho y no se recupera; al volver, el plan arranca de a poco.</p><button class="btn sm" data-act="sick-new">' + ic('plus') + 'Estuve enfermo</button>';
  return h + '</div></section>';
}
function openSick() {
  const today = todayStr();
  UI.sick = { from: addDays(today, -1), to: today, kind: 'leve', mark: true };
  openSheet({ id: 'sick', render: sickSheetHtml });
}
function sickSheetHtml() {
  const q = UI.sick;
  return sheetHead('Estuve enfermo', 'El plan vuelve de a poco') + '<div class="sheet-body">' +
    '<div class="grid2"><div class="field"><label for="sick-from">Desde</label><input class="input" type="date" id="sick-from" value="' + esc(q.from) + '" data-bind="sick" data-name="from"></div>' +
    '<div class="field"><label for="sick-to">Hasta</label><input class="input" type="date" id="sick-to" value="' + esc(q.to) + '" data-bind="sick" data-name="to"></div></div>' +
    '<div class="field"><span class="lab">¿Cómo fue?</span><div class="pills">' + Object.keys(SICK_KINDS).map(k => '<button type="button" class="pill' + (q.kind === k ? ' on' : '') + '" data-act="sick-kind" data-v="' + k + '" aria-pressed="' + (q.kind === k) + '">' + esc(SICK_KINDS[k].n) + '</button>').join('') + '</div>' +
    '<span class="hint">Vuelta gradual: ' + plural(SICK_KINDS[q.kind].ramp, 'día', 'días') + (SICK_KINDS[q.kind].hard ? ', el primero sin nada intenso' : ' sin estrenar nivel') + '.</span></div>' +
    (SICK_KINDS[q.kind].doctor ? note('warn', 'Con dolor de pecho o falta de aire, consulta al médico antes de volver a entrenar fuerte.') : '') +
    toggleHtml('sick-mark', q.mark, 'Marcar lo planificado como no hecho', 'Lo que ya registraste como hecho se mantiene.') +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="sick-save">Guardar</button></div></div>';
}
function saveSick() {
  const q = UI.sick, today = todayStr();
  const from = ($('#sick-from') || {}).value || q.from, to0 = ($('#sick-to') || {}).value || q.to;
  if (!from) { toast('Elige desde cuándo.', 'warn'); return; }
  const to = to0 && to0 >= from ? to0 : from;
  /* Primero lo planificado (antes de que el perfil cambie el plan), después el perfil */
  const marks = [], freeze = {}, plan = ((S.data.settings || {}).plan) || {};
  if (q.mark) for (let d = from; d <= to && d <= today; d = addDays(d, 1)) {
    const day = dayPlan(d);
    if (!day) continue;
    if (!plan[d]) freeze[d] = { types: day.sessions.map(s => s.type) };
    for (const s of day.sessions) {
      if (s.type === 'descanso' || FIXED_TYPES.includes(s.type) || findLog(d, s.type)) continue;
      marks.push({ id: 's-' + d + '-' + s.type, doc: { date: d, type: s.type, title: s.title, done: false, source: 'app', sick: true, notes: 'Enfermo', exercises: [] } });
    }
  }
  if (Object.keys(freeze).length) setPlanDays(freeze);
  marks.forEach(m => put('sessions', m.id, m.doc));
  updateProfile(p => {
    const list = (p.sick || []).filter(r => !(r.from <= to && (r.to || r.from) >= from));
    list.push({ from, to, kind: q.kind || 'leve' });
    p.sick = list.sort((a, b) => (a.from < b.from ? -1 : 1));
  }).then(() => toast(marks.length ? plural(marks.length, 'sesión marcada', 'sesiones marcadas') + ' como no hechas. El plan vuelve de a poco.' : 'Guardado. El plan vuelve de a poco.'));
  closeSheet();
}
function deleteSick(from) { updateProfile(p => { p.sick = (p.sick || []).filter(r => r.from !== from); }).then(() => toast('Enfermedad quitada.')); }
