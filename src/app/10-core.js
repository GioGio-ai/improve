/* ============================================================
   NÚCLEO: datos, render, capas (hojas y entrenamiento), avisos
   ============================================================ */
const VERSION = '3.1.0';
const COLS = {
  profile: 'single', settings: 'single', weights: 'list', injuries: 'list', tests: 'list', checkins: 'list', sessions: 'list',
  custom: 'list', traducciones: 'list', templates: 'list', agenda: 'list', meals: 'list', nutri: 'list', foods: 'list',
};
const S = { mode: 'loading', user: null, data: {}, loaded: {}, canWrite: true, live: [], liveLoaded: false };
Object.keys(COLS).forEach(c => { S.data[c] = COLS[c] === 'single' ? null : []; });
let FB = null;

function initStore(fb) {
  FB = fb; S.mode = fb.mode; S.user = fb.user || null;
  Object.keys(COLS).forEach(col => {
    fb.subscribe(col, (docs) => {
      if (COLS[col] === 'single') S.data[col] = docs.find(d => d.id === 'main') || null; else S.data[col] = docs;
      S.loaded[col] = true; scheduleRender();
    }, (err) => { S.loaded[col] = true; console.warn('[improve] ' + col, err && err.code); if (err && err.code === 'permission-denied') S.canWrite = false; scheduleRender(); });
  });
  // Copias en la nube de entrenamientos abiertos (no forman parte de los datos exportables)
  fb.subscribe('live', (docs) => { const first = !S.liveLoaded; S.live = docs; S.liveLoaded = true; if (first) scheduleRender(); }, () => { S.live = []; S.liveLoaded = true; scheduleRender(); });
  setTimeout(() => { if (!S.liveLoaded) { S.liveLoaded = true; scheduleRender(); } }, 4000);
}
function allLoaded() { return Object.keys(COLS).every(c => S.loaded[c]); }
function applyLocal(col, id, body) {
  if (COLS[col] === 'single') S.data[col] = Object.assign({ id }, body);
  else { const list = (S.data[col] || []).slice(); const i = list.findIndex(d => d.id === id); const doc = Object.assign({ id }, body); if (i >= 0) list[i] = doc; else list.push(doc); S.data[col] = list; }
  scheduleRender();
}
function removeLocal(col, id) { if (COLS[col] === 'single') S.data[col] = null; else S.data[col] = (S.data[col] || []).filter(d => d.id !== id); scheduleRender(); }
function writeError(e) {
  const code = e && e.code;
  if (code === 'permission-denied') toast('Sin permiso para guardar. Vuelve a iniciar sesión.', 'warn');
  else if (code === 'resource-exhausted') toast('Se alcanzó el límite gratuito de hoy. Se guardará más tarde.', 'warn');
  else toast('No se pudo guardar. Se reintenta al volver la conexión.', 'warn');
}
function stripUndef(o) {
  if (Array.isArray(o)) return o.map(stripUndef);
  if (o && typeof o === 'object') { const r = {}; for (const k in o) if (o[k] !== undefined) r[k] = stripUndef(o[k]); return r; }
  return o;
}
/* Escribe primero en pantalla; Firestore guarda en el dispositivo y sincroniza al haber conexión.
   put() responde al instante; writeDoc() devuelve la confirmación del servidor (o el error). */
function writeDoc(col, id, data) {
  const body = stripUndef(clone(data)); delete body.id;
  body.updatedAt = Date.now(); if (!body.createdAt) body.createdAt = body.updatedAt;
  if (COLS[col]) applyLocal(col, id, body);
  let p;
  try { p = FB.set(col, id, body); } catch (e) { writeError(e); return Promise.reject(e); }
  if (p && p.catch) { p.catch(writeError); return p; }
  return Promise.resolve();
}
function put(col, id, data) { writeDoc(col, id, data).catch(() => {}); return Promise.resolve(); }
function remove(col, id) {
  if (col === 'sessions') outboxDrop(id);
  if (COLS[col]) removeLocal(col, id);
  try { const p = FB.del(col, id); if (p && p.catch) p.catch(writeError); } catch (e) { writeError(e); }
  return Promise.resolve();
}
function customNorm(c) { return Object.assign({ z: [], s: [], eq: [], f: 1, k: 2, lat: 'B', c: 'mixta', fv: 'FM', pat: 'movilidad', custom: true }, c); }
function engineData() {
  return { profile: S.data.profile, settings: S.data.settings, weights: S.data.weights, injuries: S.data.injuries, tests: S.data.tests, checkins: S.data.checkins, sessions: S.data.sessions, customExercises: (S.data.custom || []).map(customNorm) };
}

/* ---------- Estado de interfaz ---------- */
const TABS = [{ id: 'hoy', n: 'Hoy', icon: 'home' }, { id: 'entreno', n: 'Entreno', icon: 'dumb' }, { id: 'comida', n: 'Comida', icon: 'fork' }, { id: 'progreso', n: 'Progreso', icon: 'chart' }, { id: 'perfil', n: 'Perfil', icon: 'user' }];
const PAGES = ['coach'];
const UI = {
  view: 'hoy', hoyDate: null, weekOffset: 0, enTab: 'semana', exTab: 'banco', histLimit: 21,
  bank: { q: '', zone: '', phaseOk: true, limit: 30 }, lib: { q: '', muscle: '', limit: 40 }, pick: { q: '', tab: 'recientes' },
  coach: { turns: [], busy: false, draft: '' }, breath: null, ed: null, menuVar: {},
};
function currentView() { const h = (location.hash || '').replace('#', ''); return TABS.some(t => t.id === h) || PAGES.includes(h) ? h : 'hoy'; }
function buildNav() { $('#nav').innerHTML = TABS.map(t => '<a href="#' + t.id + '" data-nav="' + t.id + '" aria-label="' + t.n + '">' + ic(t.icon) + '<span>' + t.n + '</span></a>').join(''); }
function markNav() {
  const v = UI.view === 'coach' ? 'hoy' : UI.view;
  $$('#nav a').forEach(a => { const on = a.getAttribute('data-nav') === v; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
}

/* ---------- Render ---------- */
let renderQueued = false, deferRender = false, ST = null, lastView = null;
let TR = { open: false };
const memo = {};
function scheduleRender() { if (renderQueued) return; renderQueued = true; const go = () => { if (!renderQueued) return; renderQueued = false; render(); }; requestAnimationFrame(go); setTimeout(go, 60); }
function render() {
  const ae = document.activeElement;
  const inView = ae && $('#view').contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName);
  const keep = inView && ae.id && ae.hasAttribute('data-input') ? { id: ae.id, a: ae.selectionStart, b: ae.selectionEnd } : null;
  if (inView && !keep) { deferRender = true; return; }
  if (DRAG.active) { deferRender = true; return; }
  UI.view = currentView(); markNav();
  if (!allLoaded()) { $('#view').innerHTML = skeletonView(); return; }
  for (const k in memo) delete memo[k];
  syncUserFoods();
  ST = deriveState(engineData(), todayStr());
  const fn = RENDERERS[UI.view] || RENDERERS.hoy;
  const view = $('#view');
  const y = window.scrollY, changed = lastView !== UI.view;
  view.innerHTML = fn(ST, todayStr());
  view.classList.toggle('enter', changed);
  if (changed) { lastView = UI.view; window.scrollTo(0, 0); } else window.scrollTo(0, y);
  if (keep) { const el = document.getElementById(keep.id); if (el) { el.focus({ preventScroll: true }); try { el.setSelectionRange(keep.a, keep.b); } catch (e) { /* nada */ } } }
  afterRender();
  maybeRecover();
}
document.addEventListener('focusout', () => { if (deferRender) { deferRender = false; setTimeout(scheduleRender, 60); } });
function skeletonView() {
  return '<div class="topbar"><div class="grow"><div class="skel line" style="width:110px"></div><div class="skel line" style="width:180px;height:24px;margin-top:8px"></div></div><div class="skel" style="width:44px;height:44px;border-radius:50%"></div></div>' +
    '<div class="skel" style="height:62px"></div><div class="skel" style="height:200px;border-radius:30px"></div><div class="skel" style="height:110px"></div><div class="skel" style="height:420px"></div>';
}
function weekPlan(ws) { return buildWeek(ST, ws, todayStr()); }
function dayPlan(date) { return weekPlan(weekStartOf(date)).find(d => d.date === date); }
function agendaDoc(date) { return (S.data.agenda || []).find(a => a.id === date) || null; }
function agendaFor(date) {
  const k = 'ag:' + date;
  if (!memo[k]) memo[k] = buildAgenda(dayPlan(date), ST, agendaDoc(date));
  return memo[k];
}
function logsFor(date) { return (S.data.sessions || []).filter(s => s.date === date && !s.deleted).sort(byDate); }
function findLog(date, type) { return (S.data.sessions || []).find(s => s.date === date && s.type === type && !s.deleted) || null; }
function findPlanned(date, type) { const d = dayPlan(date); return d ? d.sessions.find(s => s.type === type) || null : null; }
function mealsFor(date) { return (S.data.meals || []).filter(m => m.date === date).sort((a, b) => (a.time || '') < (b.time || '') ? -1 : 1); }
function nutriDoc(date) { return (S.data.nutri || []).find(n => n.id === date) || null; }
function checkinFor(date) { return (S.data.checkins || []).find(c => c.date === date) || null; }

/* ---------- Capas: hojas y entrenamiento, con el botón atrás de Android ---------- */
const LAYERS = [];
let ignorePop = 0;
function pushLayer(layer) { LAYERS.push(layer); try { history.pushState({ improve: LAYERS.length }, ''); layer.hist = true; } catch (e) { layer.hist = false; } }
/* Cuántas entradas del historial son nuestras: nunca se retrocede más allá (eso cerraría la app) */
function ownDepth() { const st = history.state; return st && st.improve ? Number(st.improve) || 0 : 0; }
function popLayer(fromPop) {
  const l = LAYERS.pop(); if (!l) return null;
  if (!fromPop && l.hist && ownDepth() > 0) { ignorePop++; try { history.back(); } catch (e) { ignorePop--; } }
  return l;
}
function topSheet() { for (let i = LAYERS.length - 1; i >= 0; i--) if (LAYERS[i].kind === 'sheet') return LAYERS[i]; return null; }
function openSheet(sheet) { sheet.kind = 'sheet'; pushLayer(sheet); renderSheet(true); }
function replaceSheet(sheet) { const t = LAYERS[LAYERS.length - 1]; if (t && t.kind === 'sheet') { sheet.kind = 'sheet'; sheet.hist = t.hist; LAYERS[LAYERS.length - 1] = sheet; renderSheet(true); } else openSheet(sheet); }
function closeSheet(fromPop) {
  const t = LAYERS[LAYERS.length - 1];
  if (!t || t.kind !== 'sheet') return;
  popLayer(fromPop);
  if (t.onClose) t.onClose();
  renderSheet(true);
}
function closeAllSheets() {
  let n = 0;
  while (LAYERS.length && LAYERS[LAYERS.length - 1].kind === 'sheet') { const l = LAYERS.pop(); if (l.onClose) l.onClose(); if (l.hist) n++; }
  n = Math.min(n, ownDepth());
  if (n) { ignorePop++; try { history.go(-n); } catch (e) { ignorePop--; } }
  renderSheet(true);
}
function resetLayers(newLayer) {
  let n = 0;
  while (LAYERS.length) { const l = LAYERS.pop(); if (l.kind === 'sheet' && l.onClose) l.onClose(); if (l.hist) n++; }
  if (newLayer) { if (n >= 1) { newLayer.hist = true; LAYERS.push(newLayer); n -= 1; } else pushLayer(newLayer); }
  n = Math.min(n, Math.max(0, ownDepth() - (newLayer && newLayer.hist ? 1 : 0)));
  if (n > 0) { ignorePop++; try { history.go(-n); } catch (e) { ignorePop--; } }
  renderSheet(true);
}
function clearLayers() { while (LAYERS.length) { const l = LAYERS.pop(); if (l.kind === 'train' && typeof minimizeTraining === 'function') minimizeTraining(true, true); } renderSheet(true); }
function renderSheet(resetScroll) {
  const root = $('#sheet-root');
  const t = LAYERS.length && LAYERS[LAYERS.length - 1].kind === 'sheet' ? LAYERS[LAYERS.length - 1] : null;
  if (!t) { root.innerHTML = ''; document.body.style.overflow = TR && TR.open ? 'hidden' : ''; return; }
  const old = root.querySelector('.sheet');
  const y = old && !resetScroll ? old.scrollTop : 0;
  const sameSheet = old && old.getAttribute('data-sid') === String(t.id);
  root.innerHTML = '<div class="scrim" data-act="scrim"' + (sameSheet ? ' style="animation:none"' : '') + '><div class="sheet' + (t.full ? ' full' : '') + '" data-sid="' + esc(t.id) + '" role="dialog" aria-modal="true" aria-labelledby="sheet-title"' + (sameSheet ? ' style="animation:none"' : '') + '>' +
    '<div class="grab-zone" data-grab="1"><div class="grab"></div></div>' + t.render() + '</div></div>';
  document.body.style.overflow = 'hidden';
  const sh = root.querySelector('.sheet'); if (sh) sh.scrollTop = y;
  hydrateThumbs(root); hydrateMedia(root);
  if (t.after) t.after(root);
}
function refreshSheet(force) {
  const ae = document.activeElement;
  if (!force && ae && $('#sheet-root').contains(ae) && /^(INPUT|TEXTAREA)$/.test(ae.tagName) && ae.type !== 'date' && ae.type !== 'time') return;
  renderSheet(false);
}
function sheetHead(title, sub, extra) {
  return '<div class="sheet-head"><div class="grow">' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '<h2 class="h2" id="sheet-title">' + esc(title) + '</h2></div>' + (extra || '') +
    '<button type="button" class="iconbtn sm" data-act="close" aria-label="Cerrar">' + ic('x') + '</button></div>';
}
/* Arrastrar la hoja hacia abajo para cerrarla */
(function sheetDrag() {
  let st = null;
  document.addEventListener('pointerdown', (e) => {
    const z = e.target.closest && e.target.closest('[data-grab]'); if (!z) return;
    const sh = z.closest('.sheet'); if (!sh) return;
    st = { sh, y0: e.clientY, dy: 0, id: e.pointerId };
    try { z.setPointerCapture(e.pointerId); } catch (err) { /* nada */ }
    sh.classList.add('dragging');
  });
  document.addEventListener('pointermove', (e) => { if (!st || e.pointerId !== st.id) return; st.dy = Math.max(0, e.clientY - st.y0); st.sh.style.transform = 'translateY(' + st.dy + 'px)'; });
  const end = (e) => {
    if (!st || (e && e.pointerId !== st.id)) return;
    const s = st; st = null; s.sh.classList.remove('dragging'); s.sh.classList.add('closing');
    if (s.dy > 110) { s.sh.style.transform = 'translateY(100%)'; setTimeout(() => closeSheet(), 180); }
    else { s.sh.style.transform = ''; setTimeout(() => s.sh.classList.remove('closing'), 260); }
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
})();
window.addEventListener('popstate', () => {
  if (ignorePop > 0) { ignorePop--; return; }
  const t = LAYERS[LAYERS.length - 1];
  if (!t) return;
  if (t.kind === 'sheet') closeSheet(true);
  else if (t.kind === 'train') { LAYERS.pop(); minimizeTraining(true); }
});
window.addEventListener('hashchange', () => { clearLayers(); const ae = document.activeElement; if (ae && ae !== document.body && $('#view').contains(ae) && ae.blur) ae.blur(); deferRender = false; scheduleRender(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && LAYERS.length) { const t = LAYERS[LAYERS.length - 1]; if (t.kind === 'sheet') closeSheet(); } });

let toastTimer = null;
function toast(msg, kind, action) {
  const t = $('#toast');
  t.innerHTML = ic(kind === 'warn' ? 'warn' : kind === 'info' ? 'info' : 'check') + '<span>' + esc(msg) + '</span>' + (action ? '<button data-act="' + esc(action.act) + '"' + Object.entries(action.data || {}).map(([k, v]) => ' data-' + k + '="' + esc(v) + '"').join('') + '>' + esc(action.label) + '</button>' : '');
  t.querySelector('.ic').style.color = kind === 'warn' ? 'var(--amber)' : kind === 'info' ? 'var(--blue-ink)' : 'var(--lime)';
  t.hidden = false; t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, action ? 5200 : 3200);
}

/* ---------- Biblioteca de imágenes ---------- */
const LIB = { data: null, loading: null, chunks: {}, chunkLoading: {}, index: {} };
function loadLib() {
  if (LIB.data) return Promise.resolve(LIB.data);
  if (!LIB.loading) LIB.loading = fetch('lib/fedb.json').then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(d => { LIB.data = d; d.forEach((x, i) => { x.ch = Math.floor(i / 100); LIB.index[x.id] = x; }); return d; });
  return LIB.loading;
}
function loadChunk(ch) {
  if (LIB.chunks[ch]) return Promise.resolve(LIB.chunks[ch]);
  if (!LIB.chunkLoading[ch]) LIB.chunkLoading[ch] = fetch('lib/img_' + String(ch).padStart(2, '0') + '.json').then(r => r.json()).then(d => { LIB.chunks[ch] = d; return d; });
  return LIB.chunkLoading[ch];
}
function loadCur() { if (!LIB.curLoading) LIB.curLoading = fetch('lib/cur.json').then(r => r.json()).catch(() => ({})); return LIB.curLoading; }
async function imagesFor(libId) {
  if (!libId) return null;
  try { const cur = await loadCur(); if (cur[libId]) return cur[libId]; await loadLib(); const x = LIB.index[libId]; if (!x) return null; const c = await loadChunk(x.ch); return c[libId] || null; } catch (e) { return null; }
}
let thumbObserver = null;
function hydrateThumb(el) {
  const id = el.getAttribute('data-thumb'); if (!id || el.getAttribute('data-done')) return;
  el.setAttribute('data-done', '1');
  imagesFor(id).then(fr => { if (fr && fr[0]) el.innerHTML = '<img alt="" src="data:image/jpeg;base64,' + fr[0] + '">'; });
}
function hydrateThumbs(root) {
  const els = $$('[data-thumb]', root || document).filter(el => el.getAttribute('data-thumb') && !el.getAttribute('data-done'));
  if (!els.length) return;
  if (!('IntersectionObserver' in window)) { els.forEach(hydrateThumb); return; }
  if (!thumbObserver) thumbObserver = new IntersectionObserver((entries) => { entries.forEach(en => { if (en.isIntersecting) { thumbObserver.unobserve(en.target); hydrateThumb(en.target); } }); }, { rootMargin: '200px' });
  els.forEach(el => thumbObserver.observe(el));
}
/* Ejercicio por id: banco, propios o biblioteca (clasificada) */
function exInfo(id, fallback) {
  if (!id) return fallback || null;
  if (BANK_INDEX[id]) return BANK_INDEX[id];
  const c = (S.data.custom || []).find(x => x.id === id); if (c) return customNorm(c);
  const L = LIB.index[id]; if (L) { const t = classifyLib(L); const tr = (S.data.traducciones || []).find(x => x.id === id); return Object.assign({ id, n: tr ? tr.n : L.n, img: id, lib: true, m: (L.pm || []).map(m => LIB_ES.muscles[m] || m).join(', '), cue: '' }, t); }
  if (fallback) return Object.assign({ id }, fallback.tags || {}, { n: fallback.n || id, img: fallback.img || null });
  return null;
}
function thumbHtml(ex, cls) { return '<div class="thumb' + (cls ? ' ' + cls : '') + '"' + (ex && ex.img ? ' data-thumb="' + esc(ex.img) + '"' : '') + '>' + esc(((ex && ex.n) || '?').slice(0, 2).toUpperCase()) + '</div>'; }
const LIB_ES = {
  muscles: { abdominals: 'Abdominales', abductors: 'Abductores', adductors: 'Aductores', biceps: 'Bíceps', calves: 'Pantorrillas', chest: 'Pecho', forearms: 'Antebrazos', glutes: 'Glúteos', hamstrings: 'Isquiotibiales', lats: 'Dorsales', 'lower back': 'Zona lumbar', 'middle back': 'Espalda media', neck: 'Cuello', quadriceps: 'Cuádriceps', shoulders: 'Hombros', traps: 'Trapecio', triceps: 'Tríceps' },
  equipment: { barbell: 'Barra', dumbbell: 'Mancuernas', other: 'Otro', 'body only': 'Peso corporal', cable: 'Polea', machine: 'Máquina', kettlebells: 'Kettlebell', bands: 'Banda', 'medicine ball': 'Balón medicinal', 'exercise ball': 'Fitball', 'foam roll': 'Rodillo', 'e-z curl bar': 'Barra Z' },
  category: { strength: 'Fuerza', stretching: 'Estiramiento', plyometrics: 'Pliometría', powerlifting: 'Powerlifting', 'olympic weightlifting': 'Halterofilia', strongman: 'Strongman', cardio: 'Cardio' },
  level: { beginner: 'Principiante', intermediate: 'Intermedio', expert: 'Avanzado' },
};
/* Fotos personales: viven en tu cuenta (privadas), no en el código público */
const PHOTOS = {
  f1: { pos: '50% 22%' }, f2: { pos: '42% 40%' }, f3: { pos: '45% 26%' },
  f4: { pos: '50% 30%' }, f5: { pos: '40% 38%' }, f6: { pos: '50% 62%' }, avatar: { pos: '50% 30%' },
};
const MEDIA = {};
const mediaLoading = {};
function loadMedia(id) {
  if (MEDIA[id] !== undefined) return Promise.resolve(MEDIA[id]);
  if (!mediaLoading[id]) mediaLoading[id] = FB.get('media', id).then(d => { MEDIA[id] = d && d.data ? d.data : null; return MEDIA[id]; }).catch(() => { delete mediaLoading[id]; return null; });
  return mediaLoading[id];
}
function hydrateMedia(root) {
  $$('img[data-media]', root || document).forEach(el => {
    const id = el.getAttribute('data-media'); if (el.getAttribute('src')) return;
    const set = (src) => { if (src) { el.src = src; el.classList.add('in'); } };
    if (MEDIA[id]) set(MEDIA[id]); else loadMedia(id).then(set);
  });
}
const PHOTO_BY_TYPE = { fuerzaA: 'f1', fuerzaMax: 'f1', fuerzaCorta: 'f1', superior: 'f1', prevencion: 'f1', libre: 'f1', test: 'f4', golpeo: 'f6', golpeoTec: 'f6', sprint: 'f3', rt: 'f3', potenciaB: 'f5', potencia: 'f5', activacion: 'f3', juego: 'f5', equipo: 'f3', partido: 'f2', prueba: 'f2', movilidad: 'f4', recuperacion: 'f4', descanso: 'f4' };
function photoImg(key) { const p = PHOTOS[key] || PHOTOS.f3; const src = MEDIA[key] || ''; return '<img data-media="' + (PHOTOS[key] ? key : 'f3') + '"' + (src ? ' src="' + src + '" class="in"' : '') + ' alt="" decoding="async" style="object-position:' + p.pos + '">'; }
function avatarImg() { return photoImg('avatar'); }
const PHOTO_SLOTS = [['avatar', 'Perfil'], ['f5', 'Portada'], ['f1', 'Fuerza'], ['f3', 'Velocidad'], ['f6', 'Golpeo'], ['f4', 'Test y descanso'], ['f2', 'Progreso']];
async function setMedia(id, data) {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(data))) throw new Error('imagen no válida');
  await FB.set('media', id, { data, updatedAt: Date.now() });
  MEDIA[id] = data; delete mediaLoading[id]; scheduleRender(); return true;
}
let mediaPickKey = null;
function pickMediaPhoto(k) {
  mediaPickKey = k;
  let inp = document.getElementById('media-x');
  if (!inp) {
    inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'media-x'; inp.hidden = true;
    document.body.appendChild(inp);
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0]; inp.value = ''; const key = mediaPickKey; if (!f || !key) return;
      try { toast('Guardando foto…', 'info'); const data = await resizeImage(f, key === 'avatar' ? 360 : 1080, 0.8); await setMedia(key, data); toast('Foto actualizada.', 'ok'); }
      catch (e) { toast('No se pudo guardar la foto.', 'warn'); }
    });
  }
  inp.click();
}
