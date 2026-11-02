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
/* Hora de dormir: siempre de noche (17:00 a 06:00 del día siguiente), en minutos del día que puede pasar de 24:00.
   Antes de las 06:00 → después de medianoche (00:30 → 24:30).
   De 06:00 a 17:00 → error de a. m./p. m. (10:30 → 22:30): nadie se acuesta a media mañana. */
const BED_MIN = 17 * 60, BED_MAX = 30 * 60;
function normBed(v) {
  v = Math.round(num(v) ?? hm(AGENDA_DEFAULTS.sleep));
  if (v >= 24 * 60) return Math.min(v, BED_MAX);
  if (v < 6 * 60) return v + 24 * 60;
  if (v < BED_MIN) return v + 12 * 60;
  return v;
}
/* Arrastre o ±15 min del marcador «Dormir»: se queda dentro de la noche */
const clampBed = (v) => clamp(Math.round(v), BED_MIN, BED_MAX);
function scheduleOf(prof) {
  const s = Object.assign({}, AGENDA_DEFAULTS, (prof && prof.schedule) || {});
  if (/^\d{1,2}:\d{2}$/.test(String(s.sleep))) s.sleep = fmtHM(normBed(hm(s.sleep)));
  else s.sleep = AGENDA_DEFAULTS.sleep;
  return s;
}
const ceil15 = (m) => Math.ceil(m / 15) * 15;
/* Minutos entre acostarse y levantarse (cruza la medianoche) */
function sleepSpan(bed, wake) { if (!bed || !wake) return null; const d = (hm(wake) - hm(bed) + 1440) % 1440; return d || null; }
/* Sueño real de la noche anterior a `date`, desde el check-in */
function sleepOf(st, date) {
  const ci = ((st && st.checkins) || []).find(c => c.date === date);
  if (!ci) return null;
  const span = sleepSpan(ci.bedTime, ci.wakeTime);
  const h = span !== null ? span / 60 : num(ci.sleepH);
  return { h, wake: ci.wakeTime ? hm(ci.wakeTime) : null, bed: ci.bedTime ? hm(ci.bedTime) : null };
}
/* Deuda de sueño de las últimas 7 noches contra el objetivo (9 h). Neta: las noches largas descuentan.
   Solo cuentan las noches registradas en el check-in. */
const SLEEP_TARGET_H = 9, SLEEP_DEBT_LIMIT = 5;
function sleepTargetOf(st) { const t = num(st && st.profile && st.profile.sleepTarget); return t !== null && t >= 6 && t <= 12 ? t : SLEEP_TARGET_H; }
function sleepDebt(st, date) {
  const target = sleepTargetOf(st);
  let sum = 0, nights = 0;
  for (let k = 0; k < 7; k++) { const s = sleepOf(st, addDays(date, -k)); if (s && s.h !== null && s.h > 0) { nights++; sum += target - s.h; } }
  return { debt: Math.max(0, Math.round(sum * 10) / 10), nights, target };
}
/* Sueño del día: menos de 6 h anoche o una deuda de 5 h o más → sin golpeo fuerte ni sprint rápido (y sin test) */
function sleepDayRule(st, date) {
  const sl = sleepOf(st, date);
  if (sl && sl.h !== null && sl.h < 6) return { why: 'dormiste ' + fmtDur(sl.h * 60), text: 'Dormiste ' + fmtDur(sl.h * 60) + ': hoy golpeo hasta K3 y sprint hasta S2.' };
  const d = sleepDebt(st, date);
  if (d.debt >= SLEEP_DEBT_LIMIT) return { why: 'te faltan ' + fmtDur(d.debt * 60) + ' de sueño', text: 'Te faltan ' + fmtDur(d.debt * 60) + ' de sueño en 7 días: mientras las recuperas, golpeo hasta K3 y sprint hasta S2. Acuéstate 30 min antes.' };
  return null;
}
/* Margen mínimo desde que te levantas hasta empezar el gimnasio: desayuno + traslado (como 07:30 → 08:30) */
const WAKE_TO_GYM = 60;

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
  const kind = dayKind(day, prof, st.sessions);
  const O = (key, def) => (ov[key] && num(ov[key].start) !== null ? num(ov[key].start) : def);
  const hidden = (key) => !!(ov[key] && ov[key].hidden);
  const add = (it) => { if (!hidden(it.key)) { it.end = it.start + it.dur; it.moved = !!(ov[it.key] && num(ov[it.key].start) !== null); it.why = AGENDA_WHY[it.key] || AGENDA_WHY[it.kind] || ''; items.push(it); } return it; };

  const slept = sleepOf(st, day.date);
  /* Dormir 30 min antes mientras haya deuda de sueño y desde 5 días antes de una prueba (hasta 1 h antes) */
  const sDebt = sleepDebt(st, day.date).debt, preTrial = (prof.trials || []).some(t => { const x = diffDays(t, day.date); return x >= 1 && x <= 5; });
  const earlier = Math.min(60, (sDebt >= 1 ? 30 : 0) + (preTrial ? 30 : 0));
  const blocks = dayBlocks(day);
  const B = {};
  for (const b of blocks) B[b.key] = b;
  for (const k of Object.keys(B)) { if (ov[k] && ov[k].place) B[k].place = ov[k].place; }
  /* Día de prueba o de partido: despertar 3 h antes o más, comida previa 3-4 h antes y snack 1 h antes */
  const match = !!(B.club && B.club.sessions.some(x => x.type === 'prueba' || x.type === 'partido'));
  const clubStart = B.club ? O('club', hm(sch.field)) : null;
  const wakeDef = slept && slept.wake !== null ? slept.wake : match ? Math.min(hm(sch.wake), clubStart - 180) : hm(sch.wake);
  /* Dormir siempre de noche, también si quedó guardado en la mañana (perfil o cambio del día) */
  const wake = O('wake', wakeDef), sleep = normBed(O('sleep', Math.max(BED_MIN, normBed(hm(sch.sleep)) - earlier)));
  const lateWake = !!(slept && slept.wake !== null && !(ov.wake && num(ov.wake.start) !== null) && slept.wake > hm(sch.wake) + 20);
  add({ key: 'wake', kind: 'wake', title: slept && slept.wake !== null ? 'Te levantaste' : 'Despertar', start: wake, dur: 0, movable: true, marker: true });
  const train = {};
  // ---- Gimnasio
  if (B.gym) {
    const def = slept && slept.wake !== null ? Math.max(hm(sch.gym), ceil15(wake + WAKE_TO_GYM)) : hm(sch.gym);
    const start = O('gym', def);
    train.gym = add({ key: 'gym', kind: 'train', block: B.gym, title: 'Gimnasio', sub: B.gym.short, start, dur: B.gym.est, movable: true, intense: B.gym.intense });
    if (def > hm(sch.gym) && !train.gym.moved) { train.gym.lateShift = true; train.gym.why = 'Corrido por la hora en que te levantaste: ' + fmtHM(wake) + ' + desayuno y traslado.'; }
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
    train.club = add({ key: 'club', kind: 'train', block: B.club, title: B.club.title, sub: B.club.short, start: clubStart, dur: B.club.est, movable: true, intense: B.club.intense });
  }
  const amMatch = match && clubStart < 12 * 60, pmMatch = match && clubStart >= 14 * 60;
  // ---- Comidas
  const trainList = Object.values(train).sort((a, b) => a.start - b.start);
  const morning = trainList.find(t => t.start < 12 * 60);
  const afternoon = trainList.find(t => t.start >= 14 * 60);
  const desStart = O('desayuno', wake + 15);
  const des = add({ key: 'desayuno', kind: 'meal', slot: 'desayuno', title: 'Desayuno', start: desStart, dur: 25, movable: true });
  if (amMatch) des.why = 'Comida previa ' + (B.club.sessions.some(x => x.type === 'prueba') ? 'a la prueba' : 'al partido') + ' (2-3 h antes): carbohidratos de fácil digestión, poca grasa y poca fibra.';
  if (train.gym) add({ key: 'post', kind: 'meal', slot: 'post', title: 'Post entreno', start: O('post', train.gym.end + 5), dur: 15, movable: true, anchor: 'gym' });
  else if (amMatch) add({ key: 'post', kind: 'meal', slot: 'post', title: 'Después de jugar', start: O('post', train.club.end + 15), dur: 15, movable: true, anchor: 'club' });
  else if (kind === 'alto' || kind === 'prueba') add({ key: 'colacion', kind: 'meal', slot: 'colacion', title: 'Media mañana', start: O('colacion', 10 * 60 + 30), dur: 15, movable: true });
  const lunchDef = Math.max(12 * 60 + 30, train.gym && train.gym.start < 12 * 60 ? train.gym.end + 60 : 0, pmMatch ? clubStart - 240 : 0);
  const lunch = add({ key: 'almuerzo', kind: 'meal', slot: 'almuerzo', title: 'Almuerzo', start: O('almuerzo', Math.min(lunchDef, pmMatch ? clubStart - 180 : lunchDef)), dur: 40, movable: true });
  if (pmMatch) lunch.why = 'Comida previa (3-4 h antes): la principal del día, con 1-3 g/kg de carbohidratos (arroz, mandioca, papa), poca grasa y poca fibra.';
  const debt = slept && slept.h !== null && slept.h < 7.5;
  if ((sch.nap !== false || debt) && !(afternoon && afternoon.start < 15 * 60)) {
    const nap = add({ key: 'siesta', kind: 'nap', title: 'Siesta', sub: debt ? '30 min · recupera sueño' : '20-30 min', start: O('siesta', lunch.start + lunch.dur + 20), dur: debt ? 30 : 25, movable: true, optional: !debt });
    if (debt) nap.why = 'Dormiste ' + fmtDur(slept.h * 60) + ': una siesta de 30 min antes de las 15:00 recupera parte del sueño perdido sin quitarte el de la noche.';
  }
  if (afternoon) { const mer = add({ key: 'merienda', kind: 'meal', slot: 'merienda', title: 'Merienda', start: O('merienda', afternoon.start - 75), dur: 20, movable: true, anchor: afternoon.key }); if (pmMatch) mer.why = 'Snack 1 h antes: banana, mandioca o miel. Poco volumen y nada nuevo el día de la prueba.'; }
  else add({ key: 'merienda', kind: 'meal', slot: 'merienda', title: 'Merienda', start: O('merienda', 16 * 60 + 30), dur: 20, movable: true });
  const cenaDef = afternoon ? Math.max(19 * 60 + 15, afternoon.end + 30) : 19 * 60 + 30;
  add({ key: 'cena', kind: 'meal', slot: 'cena', title: 'Cena', start: O('cena', Math.min(cenaDef, sleep - 90)), dur: 35, movable: true, anchor: afternoon ? afternoon.key : null });
  if (kind === 'alto' || kind === 'prueba') add({ key: 'nocturna', kind: 'meal', slot: 'nocturna', title: 'Antes de dormir', start: O('nocturna', sleep - 45), dur: 10, movable: true, optional: true });
  // ---- Recuperación nocturna
  if (B.recup) add({ key: 'recup', kind: 'recup', block: B.recup, title: B.recup.sessions.length === 1 ? B.recup.sessions[0].short : 'Recuperación', sub: B.recup.short, start: O('recup', sleep - 60), dur: Math.max(10, B.recup.est), movable: true });
  const nextWake = slept && slept.wake !== null ? hm(sch.wake) : wake;
  add({ key: 'sleep', kind: 'sleep', title: 'Dormir', start: sleep, dur: 0, movable: true, marker: true, sub: fmtDur(nextWake + 1440 - sleep) + ' de sueño' });

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
  const sleepH = (nextWake + 1440 - sleep) / 60;
  if (sleepH < 8.5) warnings.push({ key: 'sleep', level: 'warning', text: 'Quedan ' + fmtDur(nextWake + 1440 - sleep) + ' de sueño: apunta a 9 h o más.' });
  const slItem = items.find(x => x.key === 'sleep');
  if (slItem && earlier && !(ov.sleep && num(ov.sleep.start) !== null)) {
    slItem.why = (sDebt >= 1 ? 'Te faltan ' + fmtDur(sDebt * 60) + ' de sueño en los últimos 7 días' : '') + (sDebt >= 1 && preTrial ? ' y ' : '') + (preTrial ? 'la prueba es en menos de una semana' : '') +
      ': acuéstate ' + (earlier >= 60 ? '1 h' : earlier + ' min') + ' antes, con la hora de levantarte fija' + (preTrial ? '. En deportistas, dormir más mejoró la velocidad y la precisión.' : ', hasta recuperarlas.');
  } else if (slItem && debt) slItem.why = 'Anoche dormiste ' + fmtDur(slept.h * 60) + '. Acuéstate a tu hora de siempre y levántate a la hora fija: así se recupera el ritmo sin arrastrar el desfase.';

  const first = Math.min(wake, ...items.map(x => x.start));
  const last = Math.max(sleep, ...items.map(x => x.end));
  return { date: day.date, items, warnings, wake, sleep, kind, range: [Math.floor((first - 30) / 30) * 30, Math.ceil((last + 30) / 30) * 30], blocks, slept, lateWake };
}

/* Elemento de agenda en curso o el próximo */
function agendaNow(ag, nowMin) {
  const real = ag.items.filter(x => !x.marker);
  const cur = real.find(x => nowMin >= x.start && nowMin < x.end) || null;
  const next = real.find(x => x.start > nowMin) || null;
  return { cur, next };
}
