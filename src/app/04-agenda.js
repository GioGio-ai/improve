/* ============================================================
   AGENDA DEL DÍA — horario recomendado y editable (minutos desde 00:00)
   ============================================================ */
const AGENDA_DEFAULTS = {
  wake: '07:30', sleep: '21:30', gym: '08:30',
  field: '17:30', fieldEnd: '19:00', fieldSat: '16:30', fieldSun: '16:30',
  nap: true, travel: 10,
};
function hm(s) { if (typeof s === 'number') return s; const p = String(s || '0:0').split(':').map(Number); return (p[0] || 0) * 60 + (p[1] || 0); }
function fmtHM(min) { min = ((Math.round(min) % 1440) + 1440) % 1440; return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
function fmtDur(min) { min = Math.round(min); if (min < 60) return min + ' min'; const h = Math.floor(min / 60), m = min % 60; return h + ' h' + (m ? ' ' + String(m).padStart(2, '0') : ''); }
function scheduleOf(prof) { return Object.assign({}, AGENDA_DEFAULTS, (prof && prof.schedule) || {}); }

/* Por qué cada bloque va a esa hora (se muestra al tocarlo) */
const AGENDA_WHY = {
  wake: 'Hora fija todos los días: estabiliza el reloj biológico y el sueño profundo.',
  desayuno: 'Si vas al gimnasio, 45-60 min antes: carbohidratos para rendir y proteína.',
  gym: 'Fuerza por la mañana: deja más de 6 h hasta la cancha para que el sprint y el golpeo salgan con calidad.',
  post: 'En los 30-60 min tras la fuerza: proteína y carbohidratos para reparar y recargar.',
  colacion: 'Media mañana en días de mucha carga: suma carbohidratos sin cargar el almuerzo.',
  almuerzo: 'Comida principal. El café después del almuerzo, nunca más tarde de las 14:00.',
  siesta: '20-30 min antes de las 15:00: mejora el rendimiento de la tarde sin afectar la noche.',
  merienda: '60-90 min antes de la cancha: carbohidratos de digestión fácil, poca grasa y fibra.',
  campo: 'La cancha está disponible de lunes a viernes de 17:30 a 19:00.',
  club: 'Sesión con el club.',
  cena: 'Después de la cancha: reponer glucógeno y proteína. Al menos 2 h antes de dormir.',
  nocturna: 'Proteína lenta antes de dormir (leche, queso, ricota): ayuda a la recuperación nocturna.',
  recup: 'Movilidad y respiración por la noche: baja revoluciones y prepara el sueño.',
  sleep: 'Más de 9 h de sueño: tu mayor ventaja de recuperación. Habitación oscura y fresca.',
};

function agendaDayKindHint(kind) { return { descanso: 'Día de descanso', bajo: 'Carga baja', moderado: 'Carga media', alto: 'Carga alta', prueba: 'Día clave' }[kind] || ''; }

/* Construye la agenda: entrenamiento primero, comidas ancladas a los bloques */
function buildAgenda(day, st, agendaDoc, opts) {
  opts = opts || {};
  const prof = st.profile || {}, sch = scheduleOf(prof), ov = (agendaDoc && agendaDoc.items) || {};
  const wd = weekday(day.date);
  const items = [], warnings = [];
  const kind = dayKind(day, prof);
  const O = (key, def) => (ov[key] && num(ov[key].start) !== null ? num(ov[key].start) : def);
  const hidden = (key) => !!(ov[key] && ov[key].hidden);
  const add = (it) => { if (!hidden(it.key)) { it.end = it.start + it.dur; it.moved = !!(ov[it.key] && num(ov[it.key].start) !== null); it.why = AGENDA_WHY[it.key] || AGENDA_WHY[it.kind] || ''; items.push(it); } return it; };

  const wake = O('wake', hm(sch.wake)), sleep = O('sleep', hm(sch.sleep));
  add({ key: 'wake', kind: 'wake', title: 'Despertar', start: wake, dur: 0, movable: true, marker: true });

  const blocks = dayBlocks(day);
  const B = {};
  for (const b of blocks) B[b.key] = b;
  for (const k of Object.keys(B)) { if (ov[k] && ov[k].place) B[k].place = ov[k].place; }
  const train = {};
  // ---- Gimnasio
  if (B.gym) {
    const start = O('gym', hm(sch.gym));
    train.gym = add({ key: 'gym', kind: 'train', block: B.gym, title: 'Gimnasio', sub: B.gym.short, start, dur: B.gym.est, movable: true, intense: B.gym.intense });
  }
  // ---- Cancha
  if (B.campo) {
    const def = wd === 5 ? hm(sch.fieldSat) : wd === 6 ? hm(sch.fieldSun) : hm(sch.field);
    const start = O('campo', def);
    train.campo = add({ key: 'campo', kind: 'train', block: B.campo, title: 'Cancha', sub: B.campo.short, start, dur: B.campo.est, movable: true, intense: B.campo.intense });
    if (wd <= 4) {
      const lo = hm(sch.field), hi = hm(sch.fieldEnd);
      if (start < lo || start + B.campo.est > hi + 5) warnings.push({ key: 'campo', level: 'warning', text: 'La cancha está disponible de ' + fmtHM(lo) + ' a ' + fmtHM(hi) + '.' });
      else if (B.campo.est > hi - lo) warnings.push({ key: 'campo', level: 'warning', text: 'El bloque de cancha dura ' + fmtDur(B.campo.est) + ': no entra completo en el horario.' });
    }
  }
  if (B.club) {
    const start = O('club', hm(sch.field));
    train.club = add({ key: 'club', kind: 'train', block: B.club, title: B.club.title, sub: B.club.short, start, dur: B.club.est, movable: true, intense: B.club.intense });
  }
  // ---- Comidas
  const trainList = Object.values(train).sort((a, b) => a.start - b.start);
  const morning = trainList.find(t => t.start < 12 * 60);
  const afternoon = trainList.find(t => t.start >= 14 * 60);
  const desStart = O('desayuno', wake + 15);
  add({ key: 'desayuno', kind: 'meal', slot: 'desayuno', title: 'Desayuno', start: desStart, dur: 25, movable: true });
  if (train.gym) add({ key: 'post', kind: 'meal', slot: 'post', title: 'Post entreno', start: O('post', train.gym.end + 5), dur: 15, movable: true, anchor: 'gym' });
  else if (kind === 'alto' || kind === 'prueba') add({ key: 'colacion', kind: 'meal', slot: 'colacion', title: 'Media mañana', start: O('colacion', 10 * 60 + 30), dur: 15, movable: true });
  const lunchDef = Math.max(12 * 60 + 30, train.gym && train.gym.start < 12 * 60 ? train.gym.end + 60 : 0);
  const lunch = add({ key: 'almuerzo', kind: 'meal', slot: 'almuerzo', title: 'Almuerzo', start: O('almuerzo', lunchDef), dur: 40, movable: true });
  if (sch.nap !== false && !(afternoon && afternoon.start < 15 * 60)) add({ key: 'siesta', kind: 'nap', title: 'Siesta', sub: '20-30 min', start: O('siesta', lunch.start + lunch.dur + 20), dur: 25, movable: true, optional: true });
  if (afternoon) add({ key: 'merienda', kind: 'meal', slot: 'merienda', title: 'Merienda', start: O('merienda', afternoon.start - 75), dur: 20, movable: true, anchor: afternoon.key });
  else add({ key: 'merienda', kind: 'meal', slot: 'merienda', title: 'Merienda', start: O('merienda', 16 * 60 + 30), dur: 20, movable: true });
  const cenaDef = afternoon ? Math.max(19 * 60 + 15, afternoon.end + 30) : 19 * 60 + 30;
  add({ key: 'cena', kind: 'meal', slot: 'cena', title: 'Cena', start: O('cena', Math.min(cenaDef, sleep - 90)), dur: 35, movable: true, anchor: afternoon ? afternoon.key : null });
  if (kind === 'alto' || kind === 'prueba') add({ key: 'nocturna', kind: 'meal', slot: 'nocturna', title: 'Antes de dormir', start: O('nocturna', sleep - 45), dur: 10, movable: true, optional: true });
  // ---- Recuperación nocturna
  if (B.recup) add({ key: 'recup', kind: 'recup', block: B.recup, title: B.recup.sessions.length === 1 ? B.recup.sessions[0].short : 'Recuperación', sub: B.recup.short, start: O('recup', sleep - 60), dur: Math.max(10, B.recup.est), movable: true });
  add({ key: 'sleep', kind: 'sleep', title: 'Dormir', start: sleep, dur: 0, movable: true, marker: true, sub: fmtDur(wake + 1440 - sleep) + ' de sueño' });

  items.sort((a, b) => a.start - b.start || (a.marker ? -1 : 1));
  // ---- Avisos
  const real = items.filter(x => !x.marker && !x.optional);
  for (let i = 1; i < real.length; i++) {
    const a = real[i - 1], b = real[i];
    if (b.start < a.end - 2 && !(a.kind === 'meal' && b.kind === 'meal' && b.start >= a.start + 10)) warnings.push({ key: b.key, level: 'warning', text: b.title + ' se superpone con ' + a.title.toLowerCase() + '.' });
  }
  for (const t of trainList) {
    const before = items.filter(m => m.kind === 'meal' && m.start <= t.start && m.end > t.start - 120);
    for (const m of before) {
      const gap = t.start - m.start;
      const big = m.slot === 'almuerzo' || m.slot === 'cena';
      const need = big ? 90 : m.slot === 'post' || m.slot === 'colacion' || m.slot === 'nocturna' ? 30 : 45;
      if (gap < need) warnings.push({ key: m.key, level: 'warning', text: m.title + ' a ' + gap + ' min de ' + t.title.toLowerCase() + ': ' + (big ? 'come al menos 1 h 30 antes.' : 'deja al menos ' + need + ' min.') });
    }
    if (sleep - t.end < 60) warnings.push({ key: t.key, level: 'warning', text: t.title + ' termina a menos de 1 h de dormir: cuesta conciliar el sueño.' });
  }
  if (train.gym && train.campo && train.gym.intense && train.campo.start - train.gym.end < 360 && train.campo.start > train.gym.start)
    warnings.push({ key: 'campo', level: 'warning', text: 'Menos de 6 h entre la fuerza y la cancha: el sprint y el golpeo salen con menos calidad.' });
  const sleepH = (wake + 1440 - sleep) / 60;
  if (sleepH < 8.5) warnings.push({ key: 'sleep', level: 'warning', text: 'Quedan ' + fmtDur(wake + 1440 - sleep) + ' de sueño: apunta a 9 h o más.' });

  const first = Math.min(wake, ...items.map(x => x.start));
  const last = Math.max(sleep, ...items.map(x => x.end));
  return { date: day.date, items, warnings, wake, sleep, kind, range: [Math.floor((first - 30) / 30) * 30, Math.ceil((last + 30) / 30) * 30], blocks };
}

/* Elemento de agenda en curso o el próximo */
function agendaNow(ag, nowMin) {
  const real = ag.items.filter(x => !x.marker);
  const cur = real.find(x => nowMin >= x.start && nowMin < x.end) || null;
  const next = real.find(x => x.start > nowMin) || null;
  return { cur, next };
}
