/* ============================================================
   GUARDADO A PRUEBA DE CIERRES
   1. Borrador del entrenamiento en el teléfono en cada toque (30-train.js: saveDraft).
   2. Copia en la nube cada ≤ 4 s y al salir de la app: users/{uid}/live/{id}.
   3. Al terminar, las sesiones quedan en una bandeja del teléfono hasta que el servidor confirma.
   4. Al abrir la app: reenvía la bandeja, recupera borradores (del teléfono o de la nube),
      vuelve solo al entrenamiento si la app se cerró en medio, y guarda como sesión
      cualquier borrador de un día anterior. Nunca se descarta lo hecho.
   ============================================================ */
const OUTBOX_KEY = 'improve-outbox-v1';
const ARCHIVE_KEY = 'improve-entreno-archivo';
const DONE_KEY = 'improve-entreno-hechos';
const SAVE = { localOk: true, warnedAt: 0 };
const CLOUD = { timer: null, state: 'idle', seq: 0 };
const RECOVERY = { done: false };

function lsGet(k, def) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : def; } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

/* ---------- Bandeja de salida ---------- */
function outboxLoad() { const b = lsGet(OUTBOX_KEY, {}); return b && typeof b === 'object' ? b : {}; }
function outboxSave(b) { return lsSet(OUTBOX_KEY, b); }
function outboxCount() { return Object.keys(outboxLoad()).length; }
function outboxDrop(id, savedAt) {
  const b = outboxLoad(); if (!b[id]) return;
  if (savedAt && b[id].savedAt !== savedAt) return;
  delete b[id]; outboxSave(b);
}
function sendOutboxEntry(en) {
  let p;
  try { p = writeDoc(en.col, en.id, en.body); } catch (e) { p = Promise.reject(e); }
  Promise.resolve(p).then(() => { outboxDrop(en.id, en.savedAt); if (UI.view === 'hoy' && !TR.open) scheduleRender(); }, (e) => {
    const b = outboxLoad(); if (b[en.id]) { b[en.id].err = String((e && (e.code || e.message)) || 'error'); outboxSave(b); }
  });
}
/* Id del registro: nunca pisa otra sesión ya guardada de ese día y tipo */
function logIdFor(log, tr) {
  const suf = String(tr.id || '').slice(-6) || Math.random().toString(36).slice(2, 8);
  if (log.type === 'libre') return 's-' + log.date + '-libre-' + suf;
  const base = 's-' + log.date + '-' + log.type;
  const ex = (S.data.sessions || []).find(s => s.id === base);
  const inBox = outboxLoad()[base];
  const mine = (x) => x && (x.trId === tr.id || (tr.startedAt && x.startedAt === tr.startedAt));
  const taken = (ex && !ex.deleted && ex.done !== false && !mine(ex)) || (inBox && inBox.trId !== tr.id);
  return taken ? base + '-' + suf : base;
}
/* Primero al teléfono, después al servidor */
function commitLogs(tr, logs) {
  const box = outboxLoad(), now = Date.now(), ids = [];
  for (const log of logs) {
    const id = logIdFor(log, tr); ids.push(id);
    box[id] = { col: 'sessions', id, body: log, savedAt: now, trId: tr.id };
  }
  if (!outboxSave(box)) noteLocalSave(false);
  ids.forEach(id => sendOutboxEntry(box[id]));
  return ids;
}
function flushOutbox() {
  const b = outboxLoad();
  for (const id of Object.keys(b)) {
    const en = b[id], cur = (S.data.sessions || []).find(s => s.id === id);
    if (cur && (cur.updatedAt || 0) > en.savedAt + 60000) { outboxDrop(id); continue; } // editada después: manda lo nuevo
    sendOutboxEntry(en);
  }
}

/* ---------- Borradores cerrados: archivo local y lista de terminados ---------- */
function doneIds() { const a = lsGet(DONE_KEY, []); return Array.isArray(a) ? a : []; }
function markDone(id) { const a = doneIds().filter(x => x !== id); a.push(id); lsSet(DONE_KEY, a.slice(-40)); }
function archiveDraft(d) {
  let a = lsGet(ARCHIVE_KEY, []); if (!Array.isArray(a)) a = [];
  a = a.filter(x => x && x.d && x.d.id !== d.id); a.push({ at: Date.now(), d });
  while (a.length && !lsSet(ARCHIVE_KEY, a.slice(-6))) a.shift();
}
function closeDraft(tr) {
  markDone(tr.id);
  archiveDraft(draftSnapshot(tr));
  const cur = loadDraft(); if (cur && cur.id === tr.id) clearDraft();
  cloudDelete(tr.id);
}
/* Guarda un borrador como sesión sin pasar por «Terminar» */
function activeMinutes(d) { return Math.min(240, Math.max(1, Math.round(((d.lastActive || Date.now()) - (d.startedAt || Date.now())) / 60000))); }
function finalizeDraft(d) {
  if (!d || !d.id || (TR.open && TR.id === d.id)) return 0;
  let logs = [];
  try { logs = trToLogs(d, Object.assign({ minutes: activeMinutes(d), rpe: null, notes: '', pd: null }, d.fin || {}), true); } catch (e) { logs = []; console.warn('[improve] borrador', e); }
  if (logs.length) commitLogs(d, logs);
  closeDraft(d);
  return logs.length;
}
function draftProgressText(d) {
  let steps = 0, withData = 0, sets = 0;
  for (const s of d.steps || []) {
    if (s.warmup) continue;
    steps++; if (stepHasWork(s)) withData++;
    if (s.kind === 'ex') sets += s.sets.filter(x => x.done).length;
  }
  const ago = Math.max(1, Math.round((Date.now() - (d.startedAt || Date.now())) / 60000));
  return withData + ' de ' + steps + ' pasos con datos' + (sets ? ' · ' + plural(sets, 'serie', 'series') : '') + ' · empezó hace ' + fmtDur(ago);
}

/* ---------- Copia en la nube ---------- */
function liveBody(tr) {
  const d = draftSnapshot(tr);
  return { kind: 'entreno', trId: tr.id, date: tr.date, title: tr.title || '', startedAt: tr.startedAt || null, lastActive: tr.lastActive || Date.now(), wasOpen: !!tr.open, json: JSON.stringify(d) };
}
function cloudDraftSoon() { if (!CLOUD.timer) CLOUD.timer = setTimeout(cloudDraftNow, 4000); }
function cloudDraftNow() {
  clearTimeout(CLOUD.timer); CLOUD.timer = null;
  if (!FB || !TR || !TR.id) return;
  const seq = ++CLOUD.seq;
  CLOUD.state = 'pending'; updateSaveStatus();
  let p;
  try { p = FB.set('live', TR.id, Object.assign(liveBody(TR), { updatedAt: Date.now() })); } catch (e) { CLOUD.state = 'err'; updateSaveStatus(); return; }
  Promise.resolve(p).then(() => { if (seq === CLOUD.seq) { CLOUD.state = 'ok'; updateSaveStatus(); } }, () => { if (seq === CLOUD.seq) { CLOUD.state = 'err'; updateSaveStatus(); } });
}
function cloudDelete(id) { try { const p = FB && FB.del('live', id); if (p && p.catch) p.catch(() => {}); } catch (e) { /* se reintenta al abrir */ } }
function parseLive(doc) {
  if (!doc || doc.kind !== 'entreno' || !doc.json) return null;
  try { const d = JSON.parse(doc.json); return d && d.id && Array.isArray(d.steps) ? d : null; } catch (e) { return null; }
}

/* ---------- Estado de guardado (barra del entrenamiento) ---------- */
function noteLocalSave(ok) {
  const was = SAVE.localOk; SAVE.localOk = ok;
  if (!ok && Date.now() - SAVE.warnedAt > 30000) { SAVE.warnedAt = Date.now(); toast('El teléfono no deja guardar. Libera espacio: la copia en la nube sigue activa.', 'warn'); }
  if (was !== ok) updateSaveStatus();
}
function saveStatusHtml() {
  const off = typeof navigator !== 'undefined' && navigator.onLine === false;
  let cls = 'ok', txt = 'Guardado en el teléfono';
  if (!SAVE.localOk) { cls = 'bad'; txt = CLOUD.state === 'ok' ? 'Guardado solo en la nube' : 'No se pudo guardar'; }
  else if (CLOUD.state === 'ok') { cls = 'cloud'; txt = 'Guardado · nube al día'; }
  else if (off) txt = 'Sin conexión · guardado en el teléfono';
  return '<div class="svst ' + cls + '" id="tr-save" role="status" aria-live="polite"><i aria-hidden="true"></i>' + esc(txt) + '</div>';
}
function updateSaveStatus() { const el = document.getElementById('tr-save'); if (el) el.outerHTML = saveStatusHtml(); }
window.addEventListener('online', () => { updateSaveStatus(); if (TR && TR.id) cloudDraftNow(); if (RECOVERY.done) flushOutbox(); });
window.addEventListener('offline', updateSaveStatus);

/* ---------- Al abrir la app ---------- */
function isStaleDraft(d, today) { return d.date < today && Date.now() - (d.lastActive || d.startedAt || 0) > 3 * 3600000; }
function writeLocalDraft(d) { try { localStorage.setItem(TR_KEY, JSON.stringify(Object.assign({}, d, { open: false }))); return true; } catch (e) { return false; } }
function maybeRecover() {
  if (RECOVERY.done || !allLoaded() || !S.liveLoaded || !ST) return;
  RECOVERY.done = true;
  setTimeout(bootRecovery, 0);
}
function bootRecovery() {
  const today = todayStr(), saved = [];
  try { flushOutbox(); } catch (e) { console.warn('[improve] bandeja', e); }
  let local = loadDraft();
  const finished = new Set(doneIds());
  (S.data.sessions || []).forEach(s => { if (s.trId) finished.add(s.trId); });
  Object.values(outboxLoad()).forEach(en => { if (en.trId) finished.add(en.trId); });
  if (local && finished.has(local.id) && !TR.open) { clearDraft(); local = null; }
  for (const doc of S.live || []) {
    const c = parseLive(doc);
    if (!c) continue;
    if (finished.has(c.id)) { cloudDelete(c.id); continue; }
    if (TR.open && TR.id === c.id) continue;
    if (local && local.id === c.id) {
      if ((c.lastActive || 0) > (local.lastActive || 0) + 1000 && writeLocalDraft(c)) local = c;
      continue;
    }
    if (isStaleDraft(c, today)) { if (finalizeDraft(c)) saved.push(c); else cloudDelete(c.id); continue; }
    if (!local && writeLocalDraft(c)) { local = c; continue; }
    if (finalizeDraft(c)) saved.push(c);
  }
  if (local && !TR.open && isStaleDraft(local, today)) { if (finalizeDraft(local)) saved.push(local); local = null; }
  if (local && local.wasOpen && !TR.open) resumeTraining();
  if (saved.length) toast(saved.length === 1 ? 'Se guardó el entrenamiento del ' + fmtDate(saved[0].date) + ' que quedó abierto.' : 'Se guardaron ' + saved.length + ' entrenamientos que quedaron abiertos.');
  scheduleRender();
}
/* Si los datos tardan (sin señal), vuelve igual al entrenamiento que estaba abierto */
function earlyResume() {
  if (RECOVERY.done || (TR && TR.open)) return;
  const d = loadDraft(); if (!d || !d.wasOpen || d.date !== todayStr()) return;
  try { if (!ST) ST = deriveState(engineData(), todayStr()); } catch (e) { return; }
  resumeTraining();
}
function bootSafety() {
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* nada */ }
  setTimeout(earlyResume, 3500);
}

/* ---------- Avisos en Hoy ---------- */
function outboxBanner() {
  const b = outboxLoad(), list = Object.values(b).filter(en => Date.now() - en.savedAt > 8000);
  if (!list.length) return '';
  const err = list.find(en => en.err && !/unavailable|network|offline/i.test(en.err));
  return '<div class="banner' + (err ? ' load' : '') + '" role="status">' + ic(err ? 'warn' : 'cloud') + '<div class="grow"><div class="h3">' + plural(list.length, 'sesión guardada', 'sesiones guardadas') + ' en el teléfono</div><div class="sub">' +
    (err ? 'El servidor no la aceptó (' + esc(err.err) + '). Sigue guardada aquí y se reintenta sola.' : 'Se suben solas al volver la conexión. No cierres sesión.') + '</div></div></div>';
}
