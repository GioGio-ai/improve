/* ============================================================
   MOTOR v3 — funciones puras (sin DOM). Fechas 'YYYY-MM-DD' locales.
   ============================================================ */
const DAYMS = 86400000;
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const DOW1 = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DOW_LONG = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function ymd(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function parseYmd(s) { const p = String(s).split('-').map(Number); return new Date(p[0], p[1] - 1, p[2], 12); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function diffDays(a, b) { return Math.round((parseYmd(a) - parseYmd(b)) / DAYMS); }
function weekday(s) { return (parseYmd(s).getDay() + 6) % 7; }
function weekStartOf(s) { return addDays(s, -weekday(s)); }
function fmtDate(s) { const d = parseYmd(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
function fmtDateLong(s) { return DOW_LONG[weekday(s)] + ' ' + fmtDate(s); }
function capFirst(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
function ageFrom(birth, today) {
  if (!birth) return null;
  const b = parseYmd(birth), t = parseYmd(today);
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
}
const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.createdAt || 0) - (b.createdAt || 0));
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const num = (v) => (v === '' || v === null || v === undefined || isNaN(Number(v)) ? null : Number(v));
function fmtNum(v) { const n = num(v); return n === null ? '—' : String(Math.round(n * 100) / 100).replace('.', ','); }
function fmtKg(v) { return num(v) === null ? '—' : fmtNum(v) + ' kg'; }

/* ---------- Tipos de sesión ---------- */
const STYPES = {
  test: { n: 'Test de control', short: 'Test', cat: 'test', icon: 'flask' },
  golpeo: { n: 'Golpeo', short: 'Golpeo', cat: 'campo', icon: 'ball' },
  golpeoTec: { n: 'Técnica con balón', short: 'Técnica', cat: 'campo', icon: 'ball' },
  balon: { n: 'Balón', short: 'Balón', cat: 'campo', icon: 'ball' },
  sprint: { n: 'Sprint', short: 'Sprint', cat: 'campo', icon: 'run' },
  rt: { n: 'Circuito RT', short: 'RT', cat: 'campo', icon: 'cones' },
  juego: { n: 'Juego reducido', short: 'Juego', cat: 'campo', icon: 'ball' },
  equipo: { n: 'Entrenamiento con el equipo', short: 'Equipo', cat: 'campo', icon: 'users' },
  partido: { n: 'Partido', short: 'Partido', cat: 'campo', icon: 'trophy' },
  prueba: { n: 'Prueba en club', short: 'Prueba', cat: 'campo', icon: 'trophy' },
  fuerzaA: { n: 'Fuerza A · rango largo', short: 'Fuerza A', cat: 'gym', icon: 'dumb' },
  potenciaB: { n: 'Potencia B', short: 'Potencia B', cat: 'gym', icon: 'bolt' },
  fuerzaMax: { n: 'Fuerza máxima', short: 'Fuerza', cat: 'gym', icon: 'dumb' },
  fuerzaCorta: { n: 'Fuerza corta', short: 'Fuerza corta', cat: 'gym', icon: 'dumb' },
  potencia: { n: 'Potencia', short: 'Potencia', cat: 'gym', icon: 'bolt' },
  superior: { n: 'Tren superior + core', short: 'Superior', cat: 'gym', icon: 'dumb' },
  superiorA: { n: 'Superior A · fuerza', short: 'Superior A', cat: 'gym', icon: 'dumb' },
  superiorB: { n: 'Superior B · volumen', short: 'Superior B', cat: 'gym', icon: 'dumb' },
  prevencion: { n: 'Prevención', short: 'Prevención', cat: 'gym', icon: 'shield' },
  activacion: { n: 'Activación', short: 'Activación', cat: 'gym', icon: 'bolt' },
  movilidad: { n: 'Movilidad y recuperación', short: 'Movilidad', cat: 'recup', icon: 'leaf' },
  recuperacion: { n: 'Recuperación activa', short: 'Recuperación', cat: 'recup', icon: 'leaf' },
  descanso: { n: 'Descanso', short: 'Descanso', cat: 'recup', icon: 'moon' },
  libre: { n: 'Sesión libre', short: 'Libre', cat: 'gym', icon: 'dumb' },
};
const GYM_TYPES = ['fuerzaA', 'potenciaB', 'superior', 'superiorA', 'superiorB', 'prevencion', 'movilidad', 'recuperacion', 'fuerzaMax', 'fuerzaCorta', 'potencia', 'activacion'];
const STRENGTH_TYPES = ['fuerzaA', 'potenciaB', 'fuerzaMax', 'potencia'];
const UPPER_TYPES = ['superior', 'superiorA', 'superiorB'];
const FIXED_TYPES = ['partido', 'prueba', 'equipo'];

const PHASES = [
  null,
  { n: 'F1', t: 'Protección', d: 'Isometrías sin dolor. Caminar y trotar sin molestias.' },
  { n: 'F2', t: 'Fuerza en rango largo', d: 'Carga progresiva del recto femoral con cadera extendida y rodilla flexionada.' },
  { n: 'F3', t: 'Velocidad y energía', d: 'Pliometría, sprint progresivo y golpeo submáximo.' },
  { n: 'F4', t: 'Gesto máximo', d: 'Remate al 100 %, sprint máximo y cambios de dirección.' },
  { n: 'F5', t: 'Vuelta al equipo', d: 'Entrenamiento parcial y luego completo. Pruebas en clubes.' },
  { n: 'F6', t: 'Rendimiento', d: 'Periodización normal y prevención del recto femoral 2 veces por semana.' },
];
const KCAP = [0, 0, 4, 5, 8, 8, 8];
const SCAP = [0, 0, 2, 4, 6, 6, 6];

/* Semana tipo (desde el día después del descanso): gimnasio por la mañana | cancha por la tarde.
   F3-F4: 3 días intensos, nunca seguidos; el balón no suma intensidad. */
const TEMPLATES = {
  1: [['fuerzaA', 'superiorA'], ['movilidad'], ['fuerzaA', 'prevencion'], ['movilidad', 'superiorB'], ['fuerzaA', 'prevencion'], ['movilidad'], ['descanso']],
  2: [['superiorA', 'balon', 'rt'], ['golpeo', 'fuerzaA'], ['sprint', 'rt', 'movilidad'], ['golpeo', 'fuerzaA'], ['sprint', 'rt', 'movilidad'], ['golpeo', 'prevencion', 'superiorB'], ['descanso']],
  3: [['superiorA', 'balon', 'rt'], ['fuerzaA', 'sprint', 'golpeo', 'balon'], ['prevencion', 'balon', 'movilidad'], ['potenciaB', 'sprint', 'golpeo', 'balon'], ['superiorB', 'rt', 'balon'], ['fuerzaA', 'sprint', 'golpeo', 'balon'], ['descanso']],
  4: [['superiorA', 'balon', 'rt'], ['fuerzaA', 'sprint', 'golpeo', 'balon'], ['prevencion', 'balon', 'movilidad'], ['potenciaB', 'sprint', 'golpeo', 'balon'], ['superiorB', 'rt', 'balon'], ['fuerzaA', 'sprint', 'golpeo', 'balon'], ['descanso']],
  off: [['fuerzaMax'], ['sprint', 'golpeo', 'prevencion'], ['superiorA', 'movilidad'], ['potencia', 'rt'], ['juego', 'prevencion'], ['fuerzaMax', 'superiorB'], ['descanso']],
};

function sessionSlots(type, phase, injuryActive) {
  switch (type) {
    case 'fuerzaA':
      return phase <= 1 ? ['iso_cuad', 'rf_iso_largo', 'isquio', 'aductor', 'gluteo_med', 'core_antiext', 'gemelo']
        : ['rf_iso_largo', 'rf_exc', 'ext_uni', 'flex_cadera', 'uni_sent', 'isquio_exc', 'aductor', 'core_antirot'];
    case 'potenciaB':
      return phase >= 4 ? ['salto_v', 'salto_h', 'salto_lat', 'trineo', 'patada_rapida', 'olimpico', 'lanz_mb', 'core_rot']
        : ['salto_v', 'salto_h', 'trineo', 'patada_rapida', 'lanz_mb', 'reactivo', 'core_rot'];
    case 'superior': case 'superiorA': return ['empuje_h', 'traccion_v', 'empuje_v', 'traccion_h', 'triceps', 'biceps', 'cuello', 'delt_lat'];
    case 'superiorB': return ['empuje_incl', 'traccion_h', 'delt_lat', 'delt_post', 'biceps', 'triceps', 'cuello', 'trapecio', 'antebrazo'];
    case 'prevencion': return (injuryActive && phase >= 2) ? ['rf_exc', 'aductor', 'isquio_exc', 'gemelo', 'tibial', 'lumbar', 'gluteo_med', 'core_lat', 'tobillo'] : ['aductor', 'isquio_exc', 'rf_exc', 'gemelo', 'tibial', 'lumbar', 'gluteo_med', 'core_lat', 'tobillo'];
    case 'movilidad': return ['mov_cadera', 'mov_tobillo', 'mov_toracica', 'foam', 'respiracion'];
    case 'recuperacion': return ['cardio_suave', 'mov_cadera', 'foam', 'respiracion'];
    case 'fuerzaMax': return ['sent_princ', 'bisagra', 'uni_sent', 'empuje_cadera', 'rf_exc', 'isquio_exc', 'aductor', 'empuje_h', 'traccion_v'];
    case 'fuerzaCorta': return ['sent_princ', 'bisagra', 'rf_exc', 'isquio_exc'];
    case 'potencia': return ['olimpico', 'salto_v', 'salto_h', 'lanz_mb', 'trineo', 'reactivo', 'core_rot', 'rf_exc'];
    case 'activacion': return ['mov_din', 'activacion', 'reactivo'];
    default: return [];
  }
}
const SLOT_NAMES = {
  iso_cuad: 'Isometría de cuádriceps', rf_iso_largo: 'Recto femoral largo (iso)', rf_exc: 'Recto femoral excéntrico', ext_uni: 'Extensión de rodilla',
  flex_cadera: 'Flexión de cadera', patada_rapida: 'Gesto de golpeo', uni_sent: 'Unilateral', spanish: 'Spanish squat', isquio_exc: 'Isquios excéntrico',
  isquio: 'Isquiotibiales', aductor: 'Aductores', gluteo_med: 'Glúteo medio', core_antirot: 'Core antirrotación', core_antiext: 'Core antiextensión',
  core_lat: 'Core lateral', core_rot: 'Core rotacional', sent_princ: 'Sentadilla principal', bisagra: 'Bisagra', empuje_cadera: 'Extensión de cadera',
  trineo: 'Trineo', salto_v: 'Salto vertical', salto_h: 'Salto horizontal', salto_lat: 'Salto lateral', aterrizaje: 'Aterrizaje', reactivo: 'Reactivo',
  olimpico: 'Potencia olímpica', lanz_mb: 'Lanzamiento', tobillo: 'Tobillo', gemelo: 'Pantorrilla', empuje_h: 'Empuje horizontal',
  traccion_h: 'Tracción horizontal', empuje_v: 'Empuje vertical', traccion_v: 'Tracción vertical', cuello: 'Cuello', acarreo: 'Acarreo', hombro: 'Hombro',
  mov_cadera: 'Movilidad de cadera', mov_tobillo: 'Movilidad de tobillo', mov_toracica: 'Movilidad torácica', foam: 'Rodillo', respiracion: 'Respiración',
  mov_din: 'Movilidad dinámica', activacion: 'Activación', cardio_suave: 'Aeróbico suave', acel: 'Aceleración', cod: 'Cambio de dirección',
  empuje_incl: 'Empuje inclinado', delt_lat: 'Deltoides lateral', delt_post: 'Deltoides posterior', biceps: 'Bíceps', triceps: 'Tríceps', trapecio: 'Trapecio',
  antebrazo: 'Antebrazo y agarre', tibial: 'Tibial', lumbar: 'Zona lumbar',
};
const DEFAULTS = {
  iso_cuad: [[1, 'iso_ext_90']],
  rf_iso_largo: [[1, 'iso_rf_prono'], [2, 'iso_rf_zancada'], [3, 'iso_rf_zancada_carga']],
  rf_exc: [[2, 'rev_nordic_asist'], [3, 'rev_nordic']],
  ext_uni: [[2, 'ext_uni_exc'], [3, 'ext_uni_reclinada']],
  flex_cadera: [[1, 'flex_cadera_banda'], [2, 'flex_cadera_polea_iso'], [3, 'flex_cadera_polea_exc'], [4, 'flex_cadera_polea_rap']],
  patada_rapida: [[3, 'patada_polea']],
  uni_sent: [[1, 'step_down'], [2, 'bulgara_rf_atras'], [4, 'bulgara']],
  spanish: [[1, 'spanish_iso']],
  isquio_exc: [[1, 'nordic_asist'], [2, 'nordic']],
  isquio: [[1, 'curl_fem_uni']],
  aductor: [[1, 'copenhagen_corto'], [2, 'copenhagen'], [3, 'copenhagen_din']],
  gluteo_med: [[1, 'almeja'], [2, 'plancha_lat_abd'], [3, 'avion_cadera']],
  core_antirot: [[1, 'pallof'], [2, 'pallof_rodilla']],
  core_antiext: [[1, 'dead_bug'], [2, 'plancha'], [3, 'rueda']],
  core_lat: [[1, 'plancha_lat'], [2, 'suitcase']],
  core_rot: [[2, 'lenador'], [4, 'landmine_rot']],
  gemelo: [[1, 'gemelo_uni']],
  tobillo: [[1, 'equilibrio_uni'], [2, 'y_balance']],
  sent_princ: [[2, 'sent_goblet'], [3, 'trap_bar']],
  bisagra: [[2, 'rdl']],
  empuje_cadera: [[1, 'puente_gluteo'], [2, 'hip_thrust']],
  trineo: [[2, 'trineo_atras'], [3, 'trineo_empuje'], [4, 'trineo_sprint']],
  salto_v: [[3, 'box_jump'], [4, 'salto_cabeceo'], [6, 'cmj']],
  salto_h: [[3, 'broad_jump'], [4, 'salto_uni_h'], [5, 'bounds']],
  salto_lat: [[3, 'skater']],
  reactivo: [[3, 'pogo'], [4, 'hurdle_hops'], [5, 'drop_jump']],
  olimpico: [[3, 'jump_squat'], [4, 'hang_clean']],
  lanz_mb: [[2, 'mb_pecho'], [3, 'mb_rotacional'], [4, 'mb_atras']],
  empuje_h: [[1, 'press_mancuernas']],
  traccion_h: [[1, 'remo_mancuerna']],
  empuje_v: [[1, 'press_landmine']],
  traccion_v: [[1, 'dominadas']],
  hombro: [[1, 'face_pull']],
  cuello: [[1, 'cuello_iso']],
  mov_cadera: [[1, 'mov_9090'], [3, 'world_greatest']],
  mov_tobillo: [[1, 'mov_tobillo']],
  mov_toracica: [[1, 'mov_toracica']],
  foam: [[1, 'foam_isquio'], [4, 'foam_cuad']],
  respiracion: [[1, 'respiracion']],
  mov_din: [[3, 'mov_dinamica']],
  activacion: [[1, 'activ_gluteo']],
  cardio_suave: [[1, 'bici_suave']],
  acel: [[3, 'acel_10']],
  empuje_incl: [[1, 'press_incl_mancuernas']], delt_lat: [[1, 'elev_lateral']], delt_post: [[1, 'pajaros']], biceps: [[1, 'curl_biceps']], triceps: [[1, 'ext_triceps_polea']],
  trapecio: [[1, 'encogimientos']], antebrazo: [[1, 'antebrazo_curl']], tibial: [[1, 'tibial']], lumbar: [[1, 'hiperext_45']],
};

/* ---------- Prescripción estructurada: s series, r reps, t segundos, m metros, c contactos, min minutos ---------- */
const P = (f1, f2, f3, f4, f5, f6) => { const a = [null, f1, f2, f3, f4, f5, f6]; for (let i = 2; i <= 6; i++) if (a[i] === undefined) a[i] = a[i - 1]; return a; };
const PRESC = {
  iso_cuad: P({ s: 5, t: [30, 45], note: '60-70 % de esfuerzo, sin dolor' }, { s: 3, t: [30, 30], note: 'al 70 %' }, { s: 2, t: [30, 30] }, undefined, { s: 2, t: [20, 20], note: 'activación' }),
  rf_iso_largo: P({ s: 4, t: [20, 30], note: '30-50 %, rango corto' }, { s: 4, t: [30, 45], rpe: '6-7', note: 'sin dolor' }, { s: 4, t: [20, 30], rpe: '8', note: 'más carga' }, { s: 3, t: [20, 20], rpe: '8-9' }, { s: 2, t: [20, 20], note: 'mantenimiento' }),
  rf_exc: P(null, { s: 3, r: [5, 6], note: 'bajada 4 s, rango sin dolor' }, { s: 3, r: [6, 8], note: 'rango completo' }, { s: 3, r: [6, 6], note: 'lastre si es fácil' }, { s: 2, r: [6, 6] }, { s: 2, r: [5, 6], note: 'mantenimiento' }),
  ext_uni: P(null, { s: 4, r: [6, 8], rpe: '7', note: 'bajada 3-4 s' }, { s: 4, r: [5, 6], rpe: '8', note: 'subida rápida' }, { s: 3, r: [5, 5], rpe: '8-9' }, { s: 3, r: [6, 6], rpe: '8' }),
  flex_cadera: P({ s: 3, r: [10, 10], note: 'lento' }, { s: 4, t: [20, 30], note: 'isométrica' }, { s: 3, r: [8, 8], note: 'excéntrica lenta' }, { s: 3, r: [6, 6], note: 'explosiva' }, { s: 2, r: [8, 8], note: 'explosiva' }),
  patada_rapida: P(null, null, { s: 3, r: [6, 6], note: '70-80 % de velocidad' }, { s: 4, r: [6, 6], note: 'velocidad máxima' }, { s: 3, r: [5, 5] }),
  uni_sent: P({ s: 3, r: [8, 8], note: 'bajada lenta' }, { s: 3, r: [6, 8], rpe: '7' }, { s: 4, r: [6, 6], rpe: '8' }, { s: 4, r: [5, 5], rpe: '8-9' }, { s: 3, r: [6, 6], rpe: '8' }, { s: 3, r: [5, 6], rpe: '8' }),
  spanish: P({ s: 4, t: [30, 30] }, { s: 3, t: [45, 45] }, { s: 3, t: [30, 30] }, { s: 2, t: [30, 30] }),
  isquio_exc: P({ s: 2, r: [4, 4], note: 'asistido' }, { s: 3, r: [4, 6] }, { s: 3, r: [5, 6] }, { s: 3, r: [5, 5] }, { s: 2, r: [5, 5] }, { s: 2, r: [4, 6] }),
  isquio: P({ s: 3, r: [10, 10], rpe: '6' }, { s: 3, r: [8, 8], rpe: '7' }),
  aductor: P({ s: 3, t: [10, 10], note: '70-80 %' }, { s: 3, t: [20, 30] }, { s: 3, r: [6, 8], note: 'dinámico' }, { s: 3, r: [8, 8] }),
  gluteo_med: P({ s: 2, r: [15, 15] }, { s: 3, r: [12, 15] }, { s: 3, r: [10, 10] }),
  core_antirot: P({ s: 3, r: [8, 8], note: 'pausa 2 s' }, { s: 3, r: [10, 10], note: 'pausa 2 s' }),
  core_antiext: P({ s: 3, r: [8, 10], note: 'lento' }, { s: 3, t: [30, 40] }, { s: 3, r: [8, 10] }),
  core_lat: P({ s: 3, t: [30, 30] }, { s: 3, t: [30, 40] }),
  core_rot: P(null, { s: 3, r: [8, 8] }, { s: 3, r: [6, 8], note: 'explosivo' }),
  gemelo: P({ s: 3, r: [12, 15], note: 'pausa arriba' }, { s: 3, r: [10, 12], note: 'con carga' }),
  tobillo: P({ s: 3, t: [30, 30] }, { s: 3, r: [5, 5], note: 'alcances por dirección' }),
  sent_princ: P(null, { s: 3, r: [8, 8], rpe: '6-7' }, { s: 4, r: [5, 5], rpe: '7-8' }, { s: 4, r: [4, 5], rpe: '8' }, undefined, { s: 4, r: [3, 5], note: '80-88 % 1RM' }),
  bisagra: P(null, { s: 3, r: [8, 8], rpe: '6-7' }, { s: 3, r: [6, 6], rpe: '7-8' }, { s: 3, r: [5, 5], rpe: '8' }, { s: 3, r: [5, 6], rpe: '8' }, { s: 4, r: [4, 6], rpe: '8' }),
  empuje_cadera: P({ s: 3, r: [12, 12] }, { s: 3, r: [8, 8], rpe: '7' }, { s: 3, r: [6, 8], rpe: '8' }),
  trineo: P(null, { s: 4, m: 15, note: 'pesado, caminando' }, { s: 5, m: 15 }, { s: 5, m: 20, note: 'rápido' }, { s: 5, m: 15 }),
  salto_v: P(null, null, { s: 4, r: [3, 3], note: 'aterrizaje estable' }, { s: 5, r: [3, 3] }, { s: 4, r: [3, 3] }),
  salto_h: P(null, null, { s: 3, r: [3, 3], note: 'aterrizaje estable' }, { s: 4, r: [3, 3] }),
  salto_lat: P(null, null, { s: 3, r: [4, 4] }, { s: 3, r: [5, 5] }),
  aterrizaje: P(null, { s: 3, r: [5, 5], note: 'sostén 2 s' }),
  reactivo: P(null, null, { s: 3, c: 10 }, { s: 3, c: 15 }, { s: 3, c: 12 }, { s: 2, c: 10, note: 'baja dosis' }),
  olimpico: P(null, null, { s: 4, r: [3, 3], note: '20-30 % 1RM' }, { s: 4, r: [3, 3], note: 'técnica limpia' }, { s: 5, r: [2, 3], note: '70-80 %' }),
  lanz_mb: P(null, { s: 3, r: [5, 5] }, { s: 4, r: [5, 5], note: 'máxima intención' }),
  empuje_h: P({ s: 3, r: [8, 10], rpe: '7' }, { s: 3, r: [6, 8], rpe: '8' }),
  traccion_h: P({ s: 3, r: [10, 10], rpe: '7' }, { s: 3, r: [8, 8], rpe: '8' }),
  empuje_v: P({ s: 3, r: [8, 8] }, { s: 3, r: [6, 8] }),
  traccion_v: P({ s: 3, r: [6, 8] }, { s: 4, r: [5, 8], note: 'lastre si haces más de 10' }),
  hombro: P({ s: 2, r: [15, 15] }, { s: 3, r: [12, 15] }),
  cuello: P({ s: 2, t: [20, 20], note: 'por dirección' }, { s: 3, t: [20, 20], note: 'por dirección' }),
  acarreo: P({ s: 3, m: 20 }, { s: 3, m: 30 }),
  mov_cadera: P({ min: 5 }), mov_tobillo: P({ s: 2, r: [10, 10] }), mov_toracica: P({ s: 2, r: [8, 8] }),
  foam: P({ min: 4, note: 'lejos de la lesión' }, undefined, undefined, { min: 4 }),
  respiracion: P({ min: 5, note: 'inhala 4 s, exhala 6-8 s' }), mov_din: P({ min: 8 }), activacion: P({ s: 2, r: [10, 10] }), cardio_suave: P({ min: 15 }),
  acel: P(null, null, { s: 4, m: 10, note: '85-90 %' }, { s: 4, m: 10, note: '95 %' }, { s: 4, m: 10 }),
  empuje_incl: P({ s: 3, r: [10, 12], rpe: '7' }, { s: 3, r: [8, 12], rpe: '8' }), delt_lat: P({ s: 3, r: [12, 15] }), delt_post: P({ s: 3, r: [12, 15] }),
  biceps: P({ s: 3, r: [10, 12] }, { s: 3, r: [8, 12], rpe: '8' }), triceps: P({ s: 3, r: [10, 12] }, { s: 3, r: [8, 12], rpe: '8' }), trapecio: P({ s: 2, r: [12, 12] }, { s: 3, r: [10, 12] }),
  antebrazo: P({ s: 2, r: [15, 15], note: 'y 20 s de agarre' }), tibial: P({ s: 2, r: [15, 20] }), lumbar: P({ s: 2, r: [12, 12] }, { s: 3, r: [10, 12] }),
};
const PRIO = {
  rf_iso_largo: 1, rf_exc: 1, ext_uni: 1, flex_cadera: 1, patada_rapida: 1, sent_princ: 1, bisagra: 1, olimpico: 1, salto_v: 1, salto_h: 1, iso_cuad: 1,
  uni_sent: 2, isquio_exc: 2, aductor: 2, trineo: 2, empuje_h: 2, traccion_v: 2, empuje_v: 2, traccion_h: 2, empuje_incl: 2, reactivo: 2, salto_lat: 2, empuje_cadera: 2, lanz_mb: 2,
};
function specFor(slot, phase) { const p = PRESC[slot]; if (!p) return { s: 3, r: [8, 10] }; const v = p[clamp(phase, 1, 6)]; return v ? Object.assign({}, v) : (p[6] ? Object.assign({}, p[6]) : { s: 3, r: [8, 10] }); }
function specMode(sp) { return !sp ? 'reps' : sp.min ? 'min' : sp.t ? 'time' : sp.m ? 'dist' : sp.c ? 'contacts' : 'reps'; }
function fmtRange(a) { return !a ? '' : a[0] === a[1] ? String(a[0]) : a[0] + '-' + a[1]; }
function fmtSpec(sp, side) {
  if (!sp) return '';
  let b = '';
  if (sp.min) b = sp.min + ' min';
  else if (sp.t) b = sp.s + ' × ' + fmtRange(sp.t) + ' s';
  else if (sp.m) b = sp.s + ' × ' + sp.m + ' m';
  else if (sp.c) b = sp.s + ' × ' + sp.c + ' contactos';
  else if (sp.r) b = sp.s + ' × ' + fmtRange(sp.r);
  if (side && !sp.min && b) b += ' por lado';
  return [b, sp.rpe ? 'RPE ' + sp.rpe : '', sp.note || ''].filter(Boolean).join(' · ');
}
function restFor(ex, sp, slot) {
  if (!ex || (sp && sp.min)) return 0;
  if (['sent_princ', 'bisagra', 'olimpico'].includes(slot)) return 150;
  if (specMode(sp) === 'time') return ex.fv === 'RE' ? 30 : 60;
  const r = { FM: 120, FV: 120, VF: 90, V: 120, RE: 45, MOV: 0 }[ex.fv];
  return r === undefined ? 60 : r;
}
function incFor(ex) {
  const eq = (ex && ex.eq) || [];
  if ((eq.includes('barra') || eq.includes('barra hexagonal')) && ['sentadilla', 'bisagra'].includes(ex.pat) && ex.lat === 'B') return 5;
  if (eq.includes('mancuernas') || eq.includes('kettlebell')) return 2;
  return 2.5;
}

/* ---------- Duración estimada ---------- */
function estimateItemSec(it) {
  const sp = it.spec; if (!sp) return 0;
  if (sp.min) return sp.min * 60;
  const sides = it.side ? 2 : 1, sets = sp.s || 3;
  let work;
  if (sp.t) work = (sp.t[1] + 8) * sides;
  else if (sp.m) work = 25 * sides;
  else if (sp.c) work = 20 * sides;
  else work = ((sp.r ? sp.r[1] : 8) * 4 + 6) * sides;
  const rest = (it.rest || 0) * (it.side ? 0.5 : 1);
  return sets * work + Math.max(0, sets - 1) * rest + 50;
}
function fieldSec(f) {
  if (!f) return 0;
  if (f.kind === 'golpeo') return [0, 15, 20, 20, 25, 25, 25, 35, 30][f.level] * 60;
  if (f.kind === 'sprint') return (f.level <= 2 ? 15 : 20) * 60;
  if (f.kind === 'rt') return f.series * f.reps * 30 + (f.series - 1) * 150;
  if (f.kind === 'test') return 20 * 60;
  if (f.kind === 'list') return f.steps.reduce((a, x) => a + (x.min || 0) * 60, 0);
  if (f.kind === 'club') return (f.minutes || 90) * 60;
  if (f.kind === 'balon') return (f.min || (f.drills || []).length * 7) * 60;
  return 0;
}
function estimateSession(s) {
  const sec = (s.warmup ? s.warmup.min * 60 : 0) + (s.items || []).reduce((a, it) => a + estimateItemSec(it), 0) + fieldSec(s.field);
  return sec ? Math.max(5, Math.round(sec / 300) * 5) : 0;
}

/* ---------- Calentamiento automático: cada paso es un ejercicio real ---------- */
function warmupFor(type, st, lugar) {
  const inj = st.injuryActive, ph = st.phase;
  /* En cancha no hay banco: la isometría de RF en zancada se hace contra la pared */
  const rfId = lugar === 'cancha' ? 'iso_rf_zancada_pared' : 'iso_rf_zancada';
  const W = (id, spec, min, note, side) => { const b = BANK_INDEX[id] || {}; return { id, n: b.n || id, spec: Object.assign({}, spec), min, d: note || fmtSpec(spec, side), side: !!side, img: b.img || null, warmup: true }; };
  let items = [];
  if (['fuerzaA', 'fuerzaMax', 'fuerzaCorta', 'prevencion', 'test'].includes(type)) {
    items = [W('bici_suave', { min: 4 }, 4, '4 min · ritmo suave'), W('mov_9090', { s: 1, r: [5, 5] }, 1, '5 por lado, sin manos'), W('mov_tobillo', { s: 1, r: [8, 8] }, 1, '', true),
      W('activ_gluteo', { s: 1, r: [10, 10] }, 2, 'Puentes, almejas y pasos laterales: 10 de cada uno')];
    if (inj) items.push(W('iso_ext_90', { s: 2, t: [30, 30] }, 2, '2 × 30 s por pierna al 50-70 %, sin dolor', true));
  } else if (['potenciaB', 'potencia'].includes(type)) {
    items = [W('bici_suave', { min: 4 }, 4, '4 min · ritmo suave'), W(ph >= 3 ? 'mov_dinamica' : 'mov_9090', ph >= 3 ? { min: 3 } : { s: 1, r: [5, 5] }, 3, ph >= 3 ? 'Balanceos frontales y laterales, rango progresivo' : '5 por lado')];
    if (inj) items.push(W(rfId, { s: 2, t: [20, 20] }, 2, '2 × 20 s por pierna', true));
    items.push(W('pogo', { s: 2, c: 10 }, 2, '2 × 10 contactos'), W('saltos_sub', { s: 1, r: [3, 3] }, 1, '3 saltos al 70 %'));
  } else if (UPPER_TYPES.includes(type)) {
    items = [W('mov_toracica', { s: 2, r: [8, 8] }, 2, '2 × 8 por lado'), W('pull_apart', { s: 2, r: [12, 12] }, 2, '2 × 12'), W('rot_ext_banda', { s: 1, r: [12, 12] }, 1, '', true)];
  } else if (type === 'golpeo' || type === 'golpeoTec') {
    items = [W('trote_suave', { min: 5 }, 5, '5 min'), W(ph >= 3 ? 'mov_dinamica' : 'mov_9090', ph >= 3 ? { min: 3 } : { s: 1, r: [5, 5] }, 3, ph >= 3 ? 'Balanceos frontales y laterales' : 'Controlada, rango sin dolor')];
    if (inj) items.push(W(rfId, { s: 2, t: [20, 20] }, 2, '2 × 20 s, pierna lesionada atrás', true));
    items.push(W('pases_prog', { s: 1, r: [10, 10] }, 2, '10 pases, de cerca a lejos'));
  } else if (type === 'sprint') {
    items = [W('trote_suave', { min: 4 }, 4, '4 min'), W('a_skip', { s: 2, m: 20 }, 3, '2 × 20 m de cada uno'), W('acel_prog', { s: 3, m: 20 }, 3, '3 × 20 m al 50, 60 y 70 %')];
  } else if (type === 'rt') {
    items = [W('trote_suave', { min: 4 }, 4, '4 min'), W('skips', { s: 2, m: 20 }, 2, '2 × 20 m'), W('acel_prog', { s: 2, m: 15 }, 2, '2 × 15 m suaves')];
  } else if (type === 'juego' || type === 'prueba') {
    items = [W('trote_suave', { min: 5 }, 5, '5 min'), W('mov_dinamica', { min: 3 }, 3, 'Balanceos y aperturas')];
    if (inj) items.push(W(rfId, { s: 2, t: [20, 20] }, 2, '2 × 20 s', true));
    items.push(W('activ_gluteo', { s: 1, r: [10, 10] }, 2, ''), W('acel_prog', { s: 3, m: 20 }, 3, 'Aceleraciones y cambios de dirección'), W('pases_prog', { s: 3, r: [5, 5] }, 4, 'Golpeo progresivo al 50, 70 y 85 %'));
  }
  /* Cada paso tiene que poder hacerse en el lugar: si no, se cambia por su sustituto o se quita */
  if (lugar) {
    const prof = st.profile;
    items = items.map(x => {
      if (exAvailable(BANK_INDEX[x.id], lugar, prof)) return x;
      const sub = (WARM_SUB[x.id] || []).find(id => BANK_INDEX[id] && exAvailable(BANK_INDEX[id], lugar, prof) && !items.some(y => y && y.id === id));
      if (!sub) return null;
      const b = BANK_INDEX[sub];
      return Object.assign({}, x, { id: sub, n: b.n, img: b.img || null });
    }).filter(Boolean);
  }
  if (!items.length) return null;
  return { min: items.reduce((a, x) => a + x.min, 0), items, steps: items.map(x => ({ n: x.n, d: x.d, min: x.min })) };
}
const WARM_SUB = {
  bici_suave: ['trote_suave', 'trote_sitio'], trote_suave: ['bici_suave', 'trote_sitio'],
  iso_ext_90: ['iso_rf_zancada', 'iso_rf_zancada_pared', 'spanish_iso', 'wall_sit'],
  iso_rf_zancada: ['iso_rf_zancada_pared', 'iso_rf_arco_banda'], iso_rf_zancada_pared: ['iso_rf_zancada', 'iso_rf_arco_banda'],
  pases_prog: ['mov_dinamica'], acel_prog: ['saltos_sub'], a_skip: ['pogo'], skips: ['pogo'],
};

/* ---------- Biblioteca: clasificación por músculos ---------- */
const MUSCLE_Z = { quadriceps: 'cuad', hamstrings: 'isquio', glutes: 'gluteo', adductors: 'aductor', abductors: 'gluteo_med', calves: 'pantorrilla', abdominals: 'core', 'lower back': 'lumbar', chest: 'pecho', shoulders: 'hombro', lats: 'espalda', 'middle back': 'espalda', traps: 'espalda', biceps: 'brazos', triceps: 'brazos', forearms: 'brazos', neck: 'cuello' };
function classifyLib(x) {
  const pm = x.pm || [], z = Array.from(new Set(pm.concat(x.sm || []).map(m => MUSCLE_Z[m]).filter(Boolean)));
  const n = (x.n || '').toLowerCase();
  let pat = 'movilidad';
  if (x.c === 'stretching') pat = 'movilidad';
  else if (x.c === 'plyometrics') pat = /lateral|side/.test(n) ? 'salto_lat' : /long|broad|bound|hop/.test(n) ? 'salto_h' : 'salto_v';
  else if (/sprint/.test(n)) pat = 'sprint';
  else if (pm.includes('quadriceps')) pat = /lunge|split|step|one leg|one-leg|single|pistol/.test(n) ? 'unilateral' : x.m === 'isolation' ? 'rodilla' : 'sentadilla';
  else if (pm.includes('hamstrings')) pat = /curl/.test(n) ? 'isquio' : 'bisagra';
  else if (pm.includes('glutes')) pat = 'ext_cadera';
  else if (pm.includes('adductors')) pat = 'aductor';
  else if (pm.includes('abductors')) pat = 'abductor';
  else if (pm.includes('calves')) pat = 'tobillo';
  else if (pm.includes('chest')) pat = 'empuje_h';
  else if (pm.includes('shoulders')) pat = x.f === 'pull' ? 'hombro' : 'empuje_v';
  else if (pm.includes('lats')) pat = 'traccion_v';
  else if (pm.includes('middle back') || pm.includes('traps')) pat = 'traccion_h';
  else if (pm.includes('abdominals')) pat = /twist|rotation|chop|russian/.test(n) ? 'rotacion' : 'antiextension';
  else if (pm.includes('lower back')) pat = 'bisagra';
  else if (pm.includes('neck')) pat = 'cuello';
  else if (pm.some(m => ['biceps', 'triceps', 'forearms'].includes(m))) pat = x.f === 'push' ? 'empuje_h' : 'traccion_h';
  const c = x.c === 'plyometrics' ? 'pliom' : x.f === 'static' ? 'iso' : x.c === 'stretching' ? '—' : 'mixta';
  const k = x.c === 'stretching' ? 1 : x.c === 'plyometrics' ? 3 : x.m === 'compound' ? (x.e === 'barbell' ? 4 : 3) : 2;
  const lat = /one-arm|one arm|single|one-leg|one leg|alternat|lunge|split|step-up|step up/.test(n) ? 'U' : 'B';
  const fv = x.c === 'plyometrics' ? 'VF' : x.c === 'stretching' ? 'MOV' : x.c === 'olympic weightlifting' ? 'FV' : 'FM';
  const eqMap = { barbell: 'barra', dumbbell: 'mancuernas', kettlebells: 'kettlebell', cable: 'polea', machine: 'máquina', bands: 'banda' };
  return { pat, z, c, k, lat, fv, eq: x.e && eqMap[x.e] ? [eqMap[x.e]] : [] };
}

/* ---------- Niveles (golpeo, sprint, RT) ---------- */
function outcome(pd, pn, partial) {
  pd = num(pd); pn = num(pn);
  if ((pd !== null && pd >= 3) || (pn !== null && pn >= 3)) return 'regress';
  if (partial) return 'hold';
  if (pn === null) return 'pending';
  if ((pd === null || pd <= 2) && pn === 0) return 'clean';
  return 'hold';
}
function deriveLadder(sessions, type, field, req, max, baseline) {
  const list = sessions.filter(s => s.type === type && s.done !== false && s[field] && s[field].level).slice().sort(byDate);
  let level = clamp(baseline || 1, 1, max), streak = 0, top = false, last = null;
  for (const s of list) {
    const L = clamp(Number(s[field].level), 1, max);
    const o = outcome(s[field].pd, s[field].pn, s[field].partial);
    last = { date: s.date, level: L, outcome: o, id: s.id };
    if (o === 'pending') continue;
    if (o === 'regress') { level = Math.max(1, L - 1); streak = 0; top = false; continue; }
    if (o === 'hold') { if (L === level) streak = 0; continue; }
    if (L > level) { level = L; streak = 0; }
    if (L === level) {
      streak++;
      if (streak >= req[level]) { if (level < max) { level++; streak = 0; } else top = true; }
    }
  }
  return { level, streak, req: req[level], top, last, count: list.length };
}
function deriveKick(sessions, baseline) { return deriveLadder(sessions, 'golpeo', 'kick', KICK_REQ, 8, baseline); }
function deriveSprint(sessions, baseline) { return deriveLadder(sessions, 'sprint', 'spr', SPRINT_REQ, 6, baseline); }
/* RT: sube tras 2 sesiones al mismo nivel con RPE ≤ 7. RPE ≥ 8 reinicia la cuenta. */
function deriveRT(sessions) {
  const list = sessions.filter(s => s.type === 'rt' && s.done !== false && s.rt && s.rt.level).slice().sort(byDate);
  if (!list.length) return { idx: 0, streak: 0, last: null };
  let idx = Math.max(0, RT_LEVELS.indexOf(list[0].rt.level)), streak = 0;
  for (const s of list) {
    const i = RT_LEVELS.indexOf(s.rt.level); if (i < 0) continue;
    const rpe = num(s.rpe);
    if (i > idx) { idx = i; streak = 0; }
    if (i < idx) continue;
    if (rpe !== null && rpe >= 8) { streak = 0; continue; }
    streak++;
    if (streak >= 2 && idx < RT_LEVELS.length - 1) { idx++; streak = 0; }
  }
  return { idx, streak, last: list[list.length - 1] };
}

/* ---------- Tests ---------- */
function lsi(pair, injuredSide) {
  if (!pair) return null;
  const inj = num(injuredSide === 'i' ? pair.i : pair.d), hea = num(injuredSide === 'i' ? pair.d : pair.i);
  if (inj === null || hea === null || hea === 0 || inj === 0) return null;
  return Math.round(inj / hea * 1000) / 10;
}
function testSummary(t, side) {
  if (!t) return null;
  const st = t.stretch || {};
  const sd = num(st.d), si = num(st.i);
  return {
    date: t.date, ext: lsi(t.ext8, side), hop1: lsi(t.hop1, side), hop3: lsi(t.hop3, side),
    rn: t.rn || null, rnPain: num(t.rnPain), palp: num(t.palp),
    stretchDiff: (sd !== null && si !== null) ? Math.abs(sd - si) : null,
    s10: num(t.s10), s30: num(t.s30), cmj: num(t.cmj),
  };
}
function latestTest(tests) { const l = tests.slice().sort(byDate); return l.length ? l[l.length - 1] : null; }
/* Último valor de cada medición: los tests parciales se suman (v3) */
const TEST_METRICS = ['ext8', 'hop1', 'hop3', 'stretch', 'rn', 'palp', 's10', 's30', 'cmj'];
function hasMetric(t, k) {
  if (!t) return false;
  if (k === 'rn') return !!t.rn;
  const v = t[k];
  if (v && typeof v === 'object') return num(v.d) !== null && num(v.i) !== null;
  return num(v) !== null;
}
function mergedTest(tests, today, maxAge) {
  const list = (tests || []).slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.updatedAt || a.createdAt || 0) - (b.updatedAt || b.createdAt || 0)));
  const out = { dates: {}, date: null };
  for (let i = list.length - 1; i >= 0; i--) {
    const t = list[i];
    if (maxAge && today && diffDays(today, t.date) > maxAge) break;
    for (const k of TEST_METRICS) if (out[k] === undefined && hasMetric(t, k)) {
      out[k] = t[k];
      if (k === 'rn') out.rnPain = t.rnPain;
      out.dates[k] = t.date;
      if (!out.date || t.date > out.date) out.date = t.date;
    }
  }
  return out.date ? out : null;
}

function rnDetail(T) {
  if (!T) return 'Haz el test';
  if (!T.rn) return 'sin dato';
  if (T.rn !== 'completo') return T.rn + ' · debe ser completo';
  if (T.rnPain !== null && T.rnPain !== undefined && T.rnPain > 1) return 'dolor ' + T.rnPain + '/10 · máximo 1';
  return 'completo · dolor ' + (T.rnPain === null || T.rnPain === undefined ? 0 : T.rnPain);
}
function phaseCriteria(phase, ctx) {
  const T = ctx.test, items = [];
  const add = (label, ok, detail, req = true) => items.push({ label, ok: !!ok, detail, req });
  const pct = (v) => (v === null || v === undefined ? 'sin dato' : String(v).replace('.', ',') + ' %');
  if (phase === 1) {
    const c = (ctx.injury && ctx.injury.f1checks) || {};
    add('Caminar sin dolor', c.walk, 'Manual');
    add('Trotar sin dolor', c.jog, 'Manual');
    add('Estirar el recto femoral sin dolor', c.stretch, 'Manual');
  } else if (phase === 2) {
    add('Extensión 8RM ≥ 90 % de la sana', T && T.ext !== null && T.ext >= 90, T ? pct(T.ext) + (T.ext !== null && T.ext < 90 ? ' · mínimo 90 %' : '') : 'Haz el test');
    add('Reverse Nordic completo sin dolor', T && T.rn === 'completo' && (T.rnPain === null || T.rnPain <= 1), rnDetail(T));
    add('Sin dolor a la palpación', T && T.palp === 0, T ? (T.palp === null ? 'sin dato' : T.palp + '/10') : 'Haz el test');
    add('Estiramiento simétrico (≤ 2 cm)', T && T.stretchDiff !== null && T.stretchDiff <= 2, T && T.stretchDiff !== null ? fmtNum(T.stretchDiff) + ' cm' : 'sin dato', false);
    add('Salto a una pierna ≥ 85 %', T && T.hop1 !== null && T.hop1 >= 85, T ? pct(T.hop1) : 'sin dato', false);
  } else if (phase === 3) {
    const k = ctx.kick, s = ctx.sprint;
    add('Golpeo K5 limpio en 2 sesiones', k.level >= 6 || k.top, k.level >= 6 || k.top ? 'Cumplido' : k.level === 5 ? 'K5 · ' + k.streak + '/2 limpias' : 'Vas en K' + k.level + ' · faltan ' + (5 - k.level) + ' nivel' + (5 - k.level === 1 ? '' : 'es'));
    add('Sprint al 90 % limpio en 2 sesiones', s.level >= 5 || s.top, s.level >= 5 || s.top ? 'Cumplido' : s.level === 4 ? 'S4 · ' + s.streak + '/2 limpias' : 'Vas en S' + s.level + ' · faltan ' + (4 - s.level) + ' nivel' + (4 - s.level === 1 ? '' : 'es'));
  } else if (phase === 4) {
    const k = ctx.kick, s = ctx.sprint;
    add('Extensión 8RM ≥ 90 %', T && T.ext !== null && T.ext >= 90, T ? pct(T.ext) : 'Haz el test');
    add('Salto simple ≥ 90 %', T && T.hop1 !== null && T.hop1 >= 90, T ? pct(T.hop1) : 'Haz el test');
    add('Triple salto ≥ 90 %', T && T.hop3 !== null && T.hop3 >= 90, T ? pct(T.hop3) : 'Haz el test');
    add('Reverse Nordic completo sin dolor', T && T.rn === 'completo' && (T.rnPain === null || T.rnPain <= 1), rnDetail(T));
    add('Sin dolor a la palpación', T && T.palp === 0, T ? (T.palp === null ? 'sin dato' : T.palp + '/10') : 'Haz el test');
    add('Golpeo K8 limpio', k.top, k.top ? 'Cumplido' : 'Vas en K' + k.level);
    add('Sprint al 100 % limpio en 2 sesiones', s.top, s.top ? 'Cumplido' : s.level === 6 ? 'S6 · ' + s.streak + '/2 limpias' : 'Vas en S' + s.level);
    const c = (ctx.injury && ctx.injury.f4checks) || {};
    add('Fisio o médico + ecografía de control', c.medical, 'Recomendado', false);
  } else if (phase === 5) {
    const c = (ctx.injury && ctx.injury.f5checks) || {};
    const since = ctx.phaseSince ? diffDays(ctx.today, ctx.phaseSince) : 0;
    add('Al menos 14 días en F5', since >= 14, since + ' días');
    add('Sin dolor ≥ 3/10 en 14 días', !ctx.recentPain, ctx.recentPain ? 'Hubo dolor' : 'Sin dolor');
    add('Entrenamiento completo con el equipo sin síntomas', c.fullTeam, 'Manual');
  }
  const required = items.filter(i => i.req);
  return { items, ready: required.length > 0 && required.every(i => i.ok), ok: required.filter(i => i.ok).length, total: required.length };
}

/* Pasos del test de control: cada uno se carga en el modo entrenamiento */
const TEST_STEPS = [
  { key: 'ext8', kind: 'pair', unit: 'kg', n: 'Extensión de rodilla 8RM', img: 'Single-Leg_Leg_Extension', min: 8,
    d: 'Primero la sana. Sube el peso hasta el máximo que mueves 8 veces limpias, 2 min de pausa entre intentos.' },
  { key: 'rn', kind: 'rn', n: 'Reverse Nordic', min: 3, d: 'De rodillas, cadera extendida. Baja hacia atrás en 3-4 s hasta donde controles.' },
  { key: 'stretch', kind: 'pair', unit: 'cm', n: 'Talón a glúteo boca abajo', min: 2, d: 'Boca abajo, lleva el talón al glúteo sin despegar la cadera. Mide la distancia que queda (0 = toca).' },
  { key: 'hop1', kind: 'pair', unit: 'cm', n: 'Salto simple a una pierna', min: 3,
    d: 'Mejor de 3 por pierna. Cae y sostén 2 s sin apoyar la otra pierna. Sin cinta: cuenta baldosas o largos de pie y anota cm.' },
  { key: 'hop3', kind: 'pair', unit: 'cm', n: 'Triple salto a una pierna', min: 3, d: 'Tres saltos seguidos con la misma pierna. Mejor de 3 intentos. Aterrizaje final estable 2 s.' },
  { key: 'palp', kind: 'scale', n: 'Palpación', min: 1, d: 'Presiona la zona de la lesión con 2-3 dedos. Marca el dolor, no la presión.' },
];

/* ---------- Lugares ---------- */
/* Equipo disponible en cada lugar, con lo que el perfil desmarcó */
function placesOf(profile) {
  profile = profile || {};
  const raw = profile.places || {};
  const out = {};
  for (const k of PLACES) {
    const def = PLACES_DEFAULT[k] || { eq: [], space: false };
    const legacyOff = k === 'gimnasio' && !raw.gimnasio ? (profile.equipmentOff || []) : [];
    const off = (raw[k] && raw[k].off) || legacyOff;
    out[k] = { eq: def.eq.filter(e => !off.includes(e)), off, allEq: def.eq, space: !!def.space };
  }
  return out;
}
/* Lugar por defecto de un bloque (gym/campo/club/recup), salvo que el perfil o el día lo cambien */
function placeOf(blockKey, profile, override) {
  if (override) return override;
  const custom = profile && profile.places && profile.places.blockDefault && profile.places.blockDefault[blockKey];
  if (custom) return custom;
  return PLACE_BY_BLOCK[blockKey] || 'gimnasio';
}
/* Lugar de un bloque en una fecha: cambio del día (agenda) > preferencia del perfil > por defecto */
function placeFor(st, date, blockKey) {
  const ov = st && st.placeOv && st.placeOv[date] && st.placeOv[date][blockKey];
  return placeOf(blockKey, st && st.profile, ov || null);
}
/* ¿Se puede hacer este ejercicio en este lugar con el equipo que hay? */
const PLACES_CACHE = { key: null, val: null };
function placesCached(profile) {
  const k = JSON.stringify((profile && profile.places) || null) + '|' + JSON.stringify((profile && profile.equipmentOff) || null);
  if (PLACES_CACHE.key !== k) { PLACES_CACHE.key = k; PLACES_CACHE.val = placesOf(profile); }
  return PLACES_CACHE.val;
}
function exAvailable(ex, lugar, profile) {
  if (!lugar || !ex) return true;
  const places = placesCached(profile);
  const P = places[lugar] || places.gimnasio;
  if (needsSpace(ex) && !P.space) return false;
  const eq = (ex.eq || []).filter(e => e && e !== 'peso corporal' && e !== 'ninguno');
  if (!eq.length) return true;
  return eq.every(e => P.eq.includes(e));
}
/* Equipo que necesita un bloque entero (para "qué llevar") */
function blockNeeds(block) {
  const eq = new Set();
  for (const s of (block && block.sessions) || []) {
    for (const it of (s.items || [])) { const ex = BANK_INDEX[it.id]; (ex && ex.eq || []).forEach(e => { if (e && e !== 'peso corporal') eq.add(e); }); }
    if (s.field && (s.field.kind === 'sprint' || s.field.kind === 'golpeo')) eq.add('espacio');
  }
  return Array.from(eq);
}

/* ---------- Balón: selección de estaciones y dosis ---------- */
/* Pie real según el lado lesionado (las estaciones están pensadas para la lesión en la derecha) */
function ballSideFoot(foot, side) { return side !== 'i' ? foot : ({ izq: 'der', 'der-suave': 'izq-suave', der: 'izq' }[foot] || foot); }
function ballFootLabel(foot) { return { ambos: 'Ambos pies', izq: 'Zurda', der: 'Derecha', 'der-suave': 'Derecha suave', 'izq-suave': 'Izquierda suave' }[foot] || 'Ambos pies'; }
function effLevels(st) {
  return { k: Math.min(st.kick.level, st.injuryActive ? (KCAP[st.phase] || 0) : 8), s: Math.min(st.sprint.level, st.injuryActive ? (SCAP[st.phase] || 0) : 6) };
}
function ballEligible(d, st) {
  if ((d.minPhase || 1) > st.phase) return false;
  const L = effLevels(st);
  if (d.kRight && L.k < d.kRight) return false;
  if (d.sMin && L.s < d.sMin) return false;
  return true;
}
/* Valor de una estación registrada (formato nuevo y registros viejos) */
function ballEntryVal(x) {
  if (!x) return null;
  if (x.valor !== undefined && x.valor !== null) return num(x.valor);
  return x.metric === 'hits' || x.metric === 'aciertos' ? num(x.hits) : num(x.count);
}
function ballHeadersOf(log) {
  if (!log || !log.ball || log.done === false) return 0;
  if (num(log.ball.headersAlta) !== null) return num(log.ball.headersAlta);
  return (log.ball.drills || []).filter(x => x.headerStrong).reduce((a, x) => a + (num(x.attempts) || 0), 0);
}
function ballHeaderCount(sessions, weekStart) {
  const end = addDays(weekStart, 6);
  let n = 0;
  for (const s of sessions) if (s.date >= weekStart && s.date <= end) n += ballHeadersOf(s);
  return n;
}
function ballDose(d, ph) { return Math.max(1, Math.round((d.n0 || 6) * (BALL_DOSE_MULT[clamp(ph, 1, 6)] || 1))); }
/* Estaciones del día: foco del día por etiquetas, minutos del día y tope de cabeceo */
function ballPlanFor(date, st, hdrLeft) {
  const F = BALL_FOCUS[weekday(date)] || BALL_FOCUS[0];
  const pool = BALL_DRILLS.filter(d => ballEligible(d, st) && (d.header !== 'alta' || hdrLeft >= 3));
  const picks = [], used = new Set();
  let mins = 0;
  const tryAdd = (d) => {
    if (!d || used.has(d.id) || mins + d.min > F.min + 2) return false;
    used.add(d.id); picks.push(d); mins += d.min; return true;
  };
  let progress = true;
  while (mins < F.min - 3 && progress) {
    progress = false;
    for (const t of F.tags) {
      if (mins >= F.min - 3) break;
      if (tryAdd(pool.find(x => !used.has(x.id) && x.tags.includes(t)))) progress = true;
    }
  }
  for (const id of ['dominio_libre', 'pase_pared', 'control_or', 'conduccion_tec', 'zurda_parado']) { if (mins >= F.min - 3) break; tryAdd(pool.find(x => x.id === id)); }
  return { focus: F, picks, mins };
}
/* Mejor marca histórica de una estación (por pie si corresponde) */
function ballBest(sessions, id, pie, beforeDate) {
  const d = BALL_DRILL_INDEX[id] || {};
  let best = null, date = null;
  for (const s of sessions) {
    if (s.done === false || !s.ball || (beforeDate && s.date >= beforeDate)) continue;
    for (const x of s.ball.drills || []) {
      if (x.id !== id || (pie && x.pie && x.pie !== pie)) continue;
      const v = ballEntryVal(x); if (v === null || v <= 0) continue;
      if (best === null || (d.lowerBetter ? v < best : v > best)) { best = v; date = s.date; }
    }
  }
  return best === null ? null : { val: best, date };
}
/* Minutos con balón por semana (registros de tipo balón) */
function ballMinutesByWeek(sessions, today, weeks) {
  const ws = weekStartOf(today), out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(ws, -7 * i), end = addDays(start, 6);
    const m = sessions.filter(s => s.done !== false && s.date >= start && s.date <= end && (s.type === 'balon' || s.type === 'golpeoTec')).reduce((a, s) => a + (num(s.minutes) || 0), 0);
    out.push({ start, min: m });
  }
  return out;
}
/* Presupuesto de 90 min de campo: recorta primero RT, luego Balón (golpeo y sprint no se tocan) */
function trimFieldForBudget(sessions) {
  const campo = sessions.filter(s => blockKind(s.type) === 'campo');
  if (!campo.length) return [];
  const total = () => campo.reduce((a, s) => a + (s.est || 0), 0);
  const BUD = 90;
  let trimmedRT = false, trimmedBall = false;
  const rt = campo.find(s => s.type === 'rt');
  while (total() > BUD && rt && rt.field && rt.field.series > 2) { rt.field.series--; rt.estRaw = estimateSession(rt); rt.est = rt.estRaw; trimmedRT = true; }
  const ball = campo.find(s => s.type === 'balon');
  while (total() > BUD && ball && ball.field && ball.field.drills && ball.field.drills.length > 1) {
    ball.field.drills.pop();
    ball.field.min = ball.field.drills.reduce((a, d) => a + (d.min || 6), 0);
    ball.short = 'Balón ' + ball.field.min + '′';
    ball.estRaw = estimateSession(ball); ball.est = ball.estRaw; trimmedBall = true;
  }
  const notes = [];
  if (trimmedRT) notes.push('Circuito RT recortado por el presupuesto de 90 min de campo.');
  if (trimmedBall) notes.push('Balón recortado por el presupuesto de 90 min de campo.');
  return notes;
}

/* ---------- Ejercicios ---------- */
function exEligible(ex, ctx) {
  if (ctx.injuryActive && (ex.f || 1) > ctx.phase) return false;
  if (ctx.place) { if (!exAvailable(ex, ctx.place, ctx.profile)) return false; }
  else if (ctx.equipmentOff && ctx.equipmentOff.length && (ex.eq || []).some(e => ctx.equipmentOff.includes(e))) return false;
  return true;
}
/* Máquina ocupada o sin equipo: 1-3 alternativas del mismo lugar */
function busyAlternatives(exId, slot, st, place) {
  const ctx = { phase: st.phase, injuryActive: st.injuryActive, equipmentOff: st.equipmentOff, bank: st.bank, place: place || null, profile: st.profile };
  const ex = BANK_INDEX[exId] || (st.bank || []).find(e => e.id === exId) || {}, busyEq = (ex.eq || []).filter(e => BUSY_EQ.includes(e));
  const ok = (e) => e && e.id !== exId && exEligible(e, ctx) && !(e.eq || []).some(q => busyEq.includes(q));
  const out = [];
  (ALT[exId] || []).forEach(id => { const e = BANK_INDEX[id]; if (ok(e) && !out.includes(e)) out.push(e); });
  if (out.length < 3 && slot) slotAlternatives(slot, ctx).forEach(e => { if (out.length < 3 && ok(e) && !out.includes(e)) out.push(e); });
  if (out.length < 2 && ex.pat) st.bank.forEach(e => { if (out.length < 2 && ok(e) && e.pat === ex.pat && (e.z || []).some(z => (ex.z || []).includes(z)) && !out.includes(e)) out.push(e); });
  return { list: out.slice(0, 3), busyEq };
}
function pickExercise(slot, ctx, used) {
  const cands = ctx.bank.filter(e => (e.s || []).includes(slot) && exEligible(e, ctx) && !used.has(e.id));
  if (!cands.length) return null;
  const pref = ctx.choices && ctx.choices[slot];
  if (pref) { const p = cands.find(e => e.id === pref); if (p) return p; }
  const defs = DEFAULTS[slot] || [];
  for (let i = defs.length - 1; i >= 0; i--) if (defs[i][0] <= ctx.phase) { const p = cands.find(e => e.id === defs[i][1]); if (p) return p; }
  return cands.slice().sort((a, b) => (b.f - a.f))[0];
}
function slotAlternatives(slot, ctx) { return ctx.bank.filter(e => (e.s || []).includes(slot) && exEligible(e, ctx)); }
function makeItem(ex, slot, spec) {
  const side = ex.lat === 'U' && !(spec && spec.min);
  return { slot: slot || null, slotName: slot ? (SLOT_NAMES[slot] || slot) : '', id: ex.id, n: ex.n, spec, side, rest: restFor(ex, spec, slot), prio: PRIO[slot] || 3, mode: specMode(spec) };
}

/* Superseries automáticas: pares de ejercicios opuestos, el descanso va tras el par */
function autoSupersets(items) {
  let g = 0;
  for (let i = 0; i + 1 < items.length; i += 2) {
    const L = String.fromCharCode(65 + g++);
    items[i].group = L; items[i + 1].group = L;
    items[i].rest = 20;
  }
}
/* Tope de duración (usa el factor real/estimado): primero 1 serie menos en accesorios, después fuera lo menos prioritario */
function capSession(s, st, cap) {
  const f = st.durFactor || 1, est = () => estimateSession(s) * f;
  for (const it of s.items.slice().reverse()) { if (est() <= cap) break; if (it.prio >= 3 && it.spec && it.spec.s > 2) it.spec = Object.assign({}, it.spec, { s: it.spec.s - 1 }); }
  while (est() > cap && s.items.length > 4) {
    let k = -1;
    for (let i = s.items.length - 1; i >= 0; i--) if (k < 0 || s.items[i].prio > s.items[k].prio) k = i;
    const it = s.items.splice(k, 1)[0];
    const mate = s.items.find(x => x.group && x.group === it.group); if (mate) { mate.group = null; mate.rest = restFor(BANK_INDEX[mate.id], mate.spec, mate.slot); }
  }
}

/* ---------- Construcción de una sesión ---------- */
function makeSession(type, date, st, opts) {
  opts = opts || {};
  const ph = st.phase, T = STYPES[type] || { n: type, short: type, cat: 'gym' };
  const place = opts.place || placeFor(st, date, blockKind(type));
  const s = { key: date + ':' + type, type, date, title: T.n, short: T.short, cat: T.cat, icon: T.icon, items: [], intense: false, notes: [], field: null, place };
  const ctx = { bank: st.bank, phase: ph, injuryActive: st.injuryActive, choices: st.choices, equipmentOff: st.equipmentOff, place, profile: st.profile };
  if (GYM_TYPES.includes(type)) {
    const used = new Set();
    const prefer = type === 'superiorB' ? { traccion_h: 'remo_pecho_apoyado', biceps: 'curl_martillo', triceps: 'press_frances', cuello: 'cuello_banda' } : null;
    const upperMain = ['empuje_h', 'traccion_v', 'empuje_v', 'traccion_h'];
    for (const slot of sessionSlots(type, ph, st.injuryActive)) {
      let ex = null;
      if (type === 'activacion' && slot === 'reactivo' && !(st.choices && st.choices.activacion_reactivo)) ex = ctx.bank.find(e => e.id === 'pogo');
      if (!ex && prefer && prefer[slot] && !(st.choices && st.choices[slot])) { const pf = ctx.bank.find(e => e.id === prefer[slot]); if (pf && exEligible(pf, ctx) && !used.has(pf.id)) ex = pf; }
      if (!ex) ex = pickExercise(slot, ctx, used);
      if (!ex) continue;
      used.add(ex.id);
      let spec = specFor(slot, ph);
      if (type === 'prevencion' && slot === 'rf_exc') spec = ph <= 3 ? { s: 2, r: [5, 5], note: 'ligero' } : { s: 2, r: [6, 6] };
      if (type === 'prevencion' && ['gemelo', 'tibial', 'lumbar'].includes(slot) && spec.s > 2) spec.s = 2;
      if (type === 'potencia' && slot === 'rf_exc') spec = { s: 2, r: [5, 5], note: 'mantenimiento' };
      if (type === 'fuerzaCorta' && spec.s) spec.s = 2;
      if ((type === 'superiorA' || type === 'superior') && upperMain.includes(slot)) spec = ph >= 2 ? { s: 4, r: [5, 6], rpe: '8', note: 'fuerza' } : { s: 3, r: [8, 8], rpe: '7' };
      if (type === 'superiorB' && (slot === 'empuje_incl' || slot === 'traccion_h')) spec = { s: 4, r: [10, 12], rpe: '8', note: 'volumen' };
      s.items.push(makeItem(ex, slot, spec));
    }
    if (UPPER_TYPES.includes(type)) { autoSupersets(s.items); capSession(s, st, 55); }
    s.short = T.short;
  }
  if (STRENGTH_TYPES.includes(type)) s.intense = true;
  if (type === 'fuerzaA') s.notes.push(ph >= 2 ? 'Primero el recto femoral, después el resto. Para con dolor mayor a 2/10.' : 'Todo sin dolor y submáximo.');
  if (UPPER_TYPES.includes(type)) s.notes.push((type === 'superiorB' ? 'Volumen: 10-12 repeticiones. ' : type === 'superiorA' ? 'Fuerza: básicos pesados. ' : '') + 'Superseries de pares opuestos para entrar en ≈ 60 min. No carga el recto femoral.');
  if (type === 'golpeo' || type === 'golpeoTec') {
    const tec = type === 'golpeoTec';
    let L = Math.min(st.kick.level, KCAP[ph] || 0);
    if (tec || opts.capLight) L = Math.min(L, 3);
    L = Math.max(1, L);
    s.level = L; s.title = (tec ? 'Técnica · ' : 'Golpeo · ') + KICK[L].n; s.short = (tec ? 'Técnica ' : 'Golpeo ') + KICK[L].n;
    s.field = { kind: 'golpeo', level: L, target: KICK_TARGET[L], tec };
    if (!tec) {
      s.intense = L >= 4;
      if (st.kick.top && L === 8) s.notes.push('K8 completado: mantenimiento.');
      else if (L === st.kick.level) s.notes.push('Para subir: ' + Math.max(0, KICK_REQ[L] - st.kick.streak) + ' sesión(es) limpia(s): dolor ≤ 2 durante y 0 al día siguiente.');
      else if (L < st.kick.level) s.notes.push('Nivel limitado por la fase ' + PHASES[ph].n + '.');
    } else s.notes.push('Técnica: no cuenta para subir de nivel.');
  }
  if (type === 'sprint') {
    let L = Math.max(1, Math.min(st.sprint.level, SCAP[ph] || 1));
    if (opts.capLight) L = Math.min(L, 2);
    if (ph >= 5 && st.sprint.top) L = 6;
    s.level = L; s.title = 'Sprint · ' + SPRINT[L].n; s.short = 'Sprint ' + SPRINT[L].n; s.intense = L >= 3;
    s.field = { kind: 'sprint', level: L, reps: SPRINT_REPS[L], rest: 90 };
    if (L === st.sprint.level && !(st.sprint.top && L === 6)) s.notes.push('Para subir: ' + Math.max(0, SPRINT_REQ[L] - st.sprint.streak) + ' sesión(es) limpia(s).');
  }
  if (type === 'rt') {
    const lv = RT_LEVELS[st.rt.idx];
    const [r, ser] = lv.split('x').map(Number);
    s.level = lv; s.title = 'Circuito RT · ' + lv.replace('x', '×'); s.short = 'RT ' + lv.replace('x', '×');
    s.field = { kind: 'rt', level: lv, reps: r, series: ser, rest: 150 };
    s.notes.push('Sube tras 2 sesiones al mismo nivel con RPE ≤ 7.');
  }
  if (type === 'balon') {
    const hdrLeft = opts.hdrLeft !== undefined ? opts.hdrLeft : BALL_HEADER_CAP - ballHeaderCount(st.sessions, weekStartOf(date));
    const P = ballPlanFor(date, st, hdrLeft);
    const rightSoft = st.injuryActive;
    const drills = P.picks.map(d => {
      let target = ballDose(d, ph);
      if (d.header === 'alta') target = Math.max(1, Math.min(target, hdrLeft));
      const foot = ballSideFoot(d.foot, st.side);
      const les = st.side === 'i' ? 'izquierda' : 'derecha';
      const note = d.foot === 'ambos' && rightSoft ? 'Con la ' + les + ': interior y control, sin empeine fuerte.' : d.foot === 'der' ? 'Habilitado por tu nivel de golpeo.' : '';
      return { id: d.id, n: d.n, d: d.d, foot, perFoot: !!d.perFoot, metric: d.metric, unit: d.unit, secs: d.secs || null, lowerBetter: !!d.lowerBetter, header: d.header || null, target, min: d.min, note };
    });
    s.field = { kind: 'balon', min: P.mins, focus: P.focus.t, drills };
    s.title = 'Balón · ' + P.focus.t;
    s.short = 'Balón ' + P.mins + '′';
    s.headersPlan = drills.filter(d => d.header === 'alta').reduce((a, d) => a + d.target, 0);
    if (s.headersPlan) s.notes.push('Cabeceo con salto: ' + s.headersPlan + ' cabezazos de fuerza alta (tope ' + BALL_HEADER_CAP + ' por semana).');
    if (rightSoft) s.notes.push('Derecha: dominio, control y pase con interior. El empeine fuerte va solo en el golpeo, según la escalera K' + (effLevels(st).k >= 7 ? '.' : '; voleas y centros con la derecha desde K7.'));
    if (!drills.length) s.notes.push('Sin estaciones habilitadas en ' + PHASES[ph].n + '.');
  }
  if (type === 'juego') { s.intense = true; s.field = { kind: 'list', steps: [{ n: 'Juego reducido 4c4 o 5c5', d: '4 × 4 min con 2 min de pausa. Con remates y duelos.', min: 24 }] }; }
  if (type === 'test') {
    s.field = { kind: 'test', steps: TEST_STEPS.filter(t => !t.minPhase || ph >= t.minPhase).map(t => Object.assign({}, t)) };
    s.notes.push('Cada resultado se guarda al escribirlo. Lo que no midas hoy se toma del último test.');
  }
  if (type === 'equipo') s.field = { kind: 'club', minutes: 90 };
  if (type === 'partido') { s.intense = true; s.field = { kind: 'club', minutes: 95 }; }
  if (type === 'prueba') {
    s.intense = true; s.field = { kind: 'club', minutes: 120 };
    if (st.injuryActive && ph < 5) s.notes.push('Todavía no cumples los criterios de F5 para jugar.');
  }
  if (type === 'descanso') s.field = { kind: 'rest' };
  if (type === 'fuerzaCorta') s.notes.push('Semana cargada: mismo peso, la mitad de series.');
  s.warmup = warmupFor(type, st, place);
  s.estRaw = estimateSession(s);
  s.est = s.estRaw;
  if (s.items.length && st.durFactor && Math.abs(st.durFactor - 1) >= 0.05) s.est = Math.max(5, Math.round(s.estRaw * st.durFactor / 5) * 5);
  return s;
}
/* Factor real/estimado de tus sesiones de gimnasio (mediana de las últimas 10) */
function durationFactor(sessions, today) {
  const r = sessions.filter(s => s.done !== false && s.source === 'entreno' && num(s.est) > 0 && num(s.minutes) > 0 && s.date >= addDays(today, -45) && (s.exercises || []).length >= 3)
    .sort(byDate).slice(-10).map(s => num(s.minutes) / num(s.est)).sort((a, b) => a - b);
  if (r.length < 2) return 1;
  const m = r.length % 2 ? r[(r.length - 1) / 2] : (r[r.length / 2 - 1] + r[r.length / 2]) / 2;
  return clamp(Math.round(m * 100) / 100, 0.8, 1.6);
}

/* ---------- Bloques del día: gimnasio, campo, recuperación, club ---------- */
function blockKind(type) {
  if (type === 'descanso') return 'rest';
  if (FIXED_TYPES.includes(type)) return 'club';
  const c = (STYPES[type] || {}).cat;
  if (c === 'campo') return 'campo';
  if (c === 'recup') return 'recup';
  return 'gym';
}
function mergeWarmups(list) {
  const seen = new Set(), items = [];
  for (const w of list) if (w) for (const x of w.items) { if (seen.has(x.id)) continue; seen.add(x.id); items.push(x); }
  if (!items.length) return null;
  return { min: items.reduce((a, x) => a + x.min, 0), items, steps: items.map(x => ({ n: x.n, d: x.d, min: x.min })) };
}
function dayBlocks(day) {
  const by = { gym: [], campo: [], recup: [], club: [] };
  for (const s of day.sessions) { const k = blockKind(s.type); if (by[k]) by[k].push(s); }
  const rank = (x) => x.type === 'sprint' ? 0 : x.type === 'golpeoTec' ? 1 : x.type === 'golpeo' ? (x.level >= 8 ? 4 : 1) : x.type === 'balon' ? 2 : x.type === 'rt' ? 3 : 5;
  by.campo.sort((a, b) => rank(a) - rank(b));
  by.gym.sort((a, b) => (a.type === 'test' ? -1 : b.type === 'test' ? 1 : 0));
  const out = [];
  for (const k of ['gym', 'campo', 'club', 'recup']) {
    const ss = by[k]; if (!ss.length) continue;
    const warm = mergeWarmups(ss.map(x => x.warmup));
    const est = ss.reduce((a, x) => a + Math.max(0, (x.est || 0) - (x.warmup ? x.warmup.min : 0)), 0) + (warm ? warm.min : 0);
    out.push({ key: k, kind: k, sessions: ss, types: ss.map(x => x.type), warmup: warm, est: Math.max(10, Math.round(est / 5) * 5), intense: ss.some(x => x.intense),
      title: k === 'gym' ? 'Gimnasio' : k === 'campo' ? 'Cancha' : k === 'club' ? (ss[0].title || 'Club') : 'Recuperación', short: ss.map(x => x.short).join(' + '),
      place: ss[0].place || PLACE_BY_BLOCK[k] || 'gimnasio' });
  }
  return out;
}

/* ---------- Compresión por tiempo disponible ---------- */
function compressSession(sess, minutes) {
  const s = JSON.parse(JSON.stringify(sess));
  const cut = [];
  const est = () => estimateSession(s);
  if (est() <= minutes) return { session: s, cut, est: est() };
  if (s.warmup && s.warmup.min > 6) {
    s.warmup = { min: 6, steps: s.warmup.steps.filter(x => x.min).slice(0, 3).map((x, i) => Object.assign({}, x, { min: i === 0 ? 2 : 2 })) };
    cut.push('Calentamiento de 6 min');
  }
  for (const p of [3, 2, 1]) {
    for (let i = s.items.length - 1; i >= 0 && est() > minutes; i--) {
      const it = s.items[i];
      if (it.prio === p && it.spec && it.spec.s > 2) { it.spec.s = 2; cut.push(it.n + ': 2 series'); }
    }
    if (est() <= minutes || p === 1) break;
    for (let i = s.items.length - 1; i >= 0 && est() > minutes; i--) {
      if (s.items[i].prio === p) {
        const nm = s.items[i].n;
        for (let j = cut.length - 1; j >= 0; j--) if (cut[j] === nm + ': 2 series') cut.splice(j, 1);
        cut.push('Sin ' + nm); s.items.splice(i, 1);
      }
    }
    if (est() <= minutes) break;
  }
  s.est = est();
  return { session: s, cut, est: s.est };
}

/* ---------- Intensidad real de una sesión registrada ---------- */
const LEG_PATS = ['sentadilla', 'unilateral', 'rodilla', 'flex_cadera', 'salto_v', 'salto_h', 'salto_lat', 'aterrizaje', 'reactivo', 'sprint', 'cod', 'golpeo', 'olimpico', 'ext_cadera'];
function exTags(e) { return (e && (BANK_INDEX[e.id] || e.tags)) || null; }
function rfLoad(s) {
  let L = 0;
  for (const e of (s.exercises || [])) {
    const t = exTags(e); if (!t || t.pat === 'movilidad' || t.pat === 'respiracion') continue;
    const z = t.z || [];
    const w = z.includes('rf') ? 1 : (z.includes('cuad') || LEG_PATS.includes(t.pat)) ? 0.5 : 0;
    if (!w) continue;
    const done = Array.isArray(e.sets) ? e.sets.filter(x => x && x.done !== false).length : 0;
    const n = done ? (t.lat === 'U' && e.sets.some(x => x && x.side) ? done / 2 : done) : ((e.spec && e.spec.s) || 3);
    L += w * (t.k || 2) * clamp(n / 3, 0.5, 1.5);
  }
  return Math.round(L * 10) / 10;
}
function isIntenseLog(s) {
  if (!s || s.done === false || s.deleted) return false;
  if (['partido', 'prueba', 'juego'].includes(s.type)) return true;
  if (s.kick && Number(s.kick.level) >= 4) return true;
  if (s.spr && Number(s.spr.level) >= 3) return true;
  const ex = (s.exercises || []).filter(e => exTags(e));
  if (ex.length) {
    const L = rfLoad(s), r = num(s.rpe);
    return L >= 8 || (r !== null && r >= 8 && L >= 4);
  }
  return STRENGTH_TYPES.includes(s.type);
}

/* ---------- Plan del día ---------- */
function mdTypes(date, prof) {
  const matchDays = prof.matchDays || [], teamDays = prof.teamDays || [];
  const wd = weekday(date);
  const team = teamDays.includes(wd);
  let until = null, since = null;
  for (let k = 0; k <= 7; k++) if (matchDays.includes(weekday(addDays(date, k)))) { until = k; break; }
  for (let k = 1; k <= 7; k++) if (matchDays.includes(weekday(addDays(date, -k)))) { since = k; break; }
  if (until === 0) return { md: 'MD', types: ['partido'] };
  if (since === 1) return { md: 'MD+1', types: ['recuperacion'] };
  const T = team ? ['equipo'] : [];
  if (until === 1) return { md: 'MD-1', types: T.concat(['activacion']) };
  if (until === 2) return { md: 'MD-2', types: T.concat(['prevencion']) };
  if (since === 2 && (until === null || until >= 4)) return { md: 'MD+2', types: team ? ['equipo'] : ['descanso'] };
  if (until === 3) return { md: 'MD-3', types: T.concat(['potencia']) };
  return { md: until ? 'MD-' + until : '', types: T.concat(['fuerzaMax']) };
}
function templateTypes(date, st) {
  const ph = st.phase, prof = st.profile || {};
  const trials = prof.trials || [];
  if (trials.includes(date)) return { md: 'Prueba', types: ['prueba'], trial: true };
  if (trials.includes(addDays(date, 1))) return { md: 'P-1', types: ['activacion'] };
  if (trials.includes(addDays(date, 2))) return { md: 'P-2', types: ['balon', 'prevencion'] };
  if (trials.includes(addDays(date, -1))) return { md: 'P+1', types: ['recuperacion'] };
  const hasCalendar = (prof.matchDays && prof.matchDays.length) || (prof.teamDays && prof.teamDays.length);
  if (ph >= 5 && hasCalendar) return mdTypes(date, prof);
  const tpl = TEMPLATES[ph <= 4 ? ph : 'off'] || TEMPLATES.off;
  const rest = prof.restDay === undefined || prof.restDay === null ? 6 : Number(prof.restDay);
  const idx = (weekday(date) - (rest + 1) + 14) % 7;
  let types = tpl[idx].slice();
  // F4 con sprint y golpeo completos: el sábado el sprint pasa a juego reducido
  if (ph === 4 && idx === 5 && st.sprint.top && st.kick.level >= 8) types = types.map(t => (t === 'sprint' ? 'juego' : t));
  return { md: '', types };
}
function typesIntenseApprox(types, st) {
  return types.some(t => STRENGTH_TYPES.includes(t) || ['partido', 'prueba', 'juego'].includes(t)
    || (t === 'golpeo' && Math.min(st.kick.level, KCAP[st.phase] || 8) >= 4)
    || (t === 'sprint' && Math.min(st.sprint.level, SCAP[st.phase] || 6) >= 3));
}
function downgradeTypes(types) {
  const map = { fuerzaA: 'prevencion', potenciaB: 'movilidad', fuerzaMax: 'fuerzaCorta', potencia: 'prevencion', golpeo: 'balon', juego: null };
  const out = [];
  types.forEach(t => { const v = t in map ? map[t] : t; if (v && !out.includes(v)) out.push(v); });
  return out.length ? out : ['movilidad'];
}
const cloneSim = (sim) => ({ kick: Object.assign({}, sim.kick), sprint: Object.assign({}, sim.sprint), rt: Object.assign({}, sim.rt), hdr: sim.hdr });
function restoreSim(sim, snap) { sim.kick = Object.assign({}, snap.kick); sim.sprint = Object.assign({}, snap.sprint); sim.rt = Object.assign({}, snap.rt); sim.hdr = snap.hdr; }
function stepLadder(lad, req, max, cap) {
  if (lad.top || lad.level > cap) return;
  lad.streak++;
  if (lad.streak >= req[lad.level]) { if (lad.level < max) { lad.level++; lad.streak = 0; } else lad.top = true; }
}
function buildDaySessions(d, st, sim, today, opts) {
  opts = opts || {};
  const future = d.date > today;
  return d.types.map(t => {
    const stx = Object.assign({}, st, { kick: Object.assign({}, sim.kick), sprint: Object.assign({}, sim.sprint), rt: Object.assign({}, sim.rt) });
    const o = t === 'balon' && sim.hdr !== undefined ? Object.assign({}, opts, { hdrLeft: sim.hdr }) : opts;
    const s = makeSession(t, d.date, stx, o);
    if (t === 'balon' && sim.hdr !== undefined && !(d.date === today && st.sessions.some(x => x.date === today && x.ball))) sim.hdr -= s.headersPlan || 0;
    const projected = future && ((t === 'golpeo' && sim.kick.level !== st.kick.level) || (t === 'sprint' && sim.sprint.level !== st.sprint.level) || (t === 'rt' && sim.rt.idx !== st.rt.idx));
    if (projected) { s.projected = true; s.notes.unshift('Nivel previsto: se confirma si la sesión anterior sale limpia.'); }
    if (t === 'golpeo') stepLadder(sim.kick, KICK_REQ, 8, KCAP[st.phase] || 0);
    if (t === 'sprint') stepLadder(sim.sprint, SPRINT_REQ, 6, SCAP[st.phase] || 0);
    if (t === 'rt') { sim.rt.streak = (sim.rt.streak || 0) + 1; if (sim.rt.streak >= 2 && sim.rt.idx < RT_LEVELS.length - 1) { sim.rt.idx++; sim.rt.streak = 0; } }
    return s;
  });
}
/* Aceleración: golpeo K1-K3 y sprint S1-S2 no son intensos, también van en días suaves */
function accelerateTypes(types, st, sim) {
  const notes = [];
  if (!st.injuryActive || st.phase < 2 || st.phase > 4) return { types, notes };
  if (types.includes('descanso') || types.some(t => FIXED_TYPES.includes(t))) return { types, notes };
  const out = types.slice();
  const kCap = KCAP[st.phase] || 0, sCap = SCAP[st.phase] || 0;
  const kL = Math.min(sim.kick.level, kCap), sL = Math.min(sim.sprint.level, sCap);
  if (kCap >= 1 && kL >= 1 && kL <= 3 && !sim.kick.top && !out.includes('golpeo')) {
    const i = out.indexOf('golpeoTec');
    if (i >= 0) out[i] = 'golpeo'; else out.push('golpeo');
    notes.push('Golpeo ' + KICK[kL].n + ' extra: no es intenso y acelera la progresión.');
  }
  if (sCap >= 1 && sL >= 1 && sL <= 2 && !sim.sprint.top && !out.includes('sprint')) {
    out.push('sprint');
    notes.push('Sprint ' + SPRINT[sL].n + ' extra: suave, suma para subir de nivel.');
  }
  return { types: out, notes };
}
/* Reglas del día según el check-in y el dolor del día siguiente */
function painToday(st, date) {
  const ci = (st.checkins || []).find(c => c.date === date);
  const rest = ci ? num(ci.rfPain) || 0 : 0;
  const prev = st.sessions.filter(s => s.date === addDays(date, -1) && s.done !== false).map(s => s.kick || s.spr).filter(Boolean).map(k => num(k.pn) || 0);
  const next = prev.length ? Math.max.apply(null, prev) : 0;
  return { rest, next, ci };
}
function readinessTypes(types, st, date) {
  const p = painToday(st, date), notes = [];
  const worst = Math.max(p.rest, p.next);
  if (worst >= 3) {
    const out = downgradeTypes(types.filter(t => !['golpeo', 'golpeoTec', 'sprint', 'rt', 'juego'].includes(t)));
    notes.push('Dolor ' + worst + '/10 ' + (p.rest >= 3 ? 'en reposo' : 'al día siguiente') + ': hoy nada intenso para el recto femoral. Si no baja en 48 h, consulta.');
    return { types: out.length ? out : ['movilidad'], notes, locked: true };
  }
  return { types, notes, locked: false };
}
const DOMS_SWAP = { rf_exc: ['iso_rf_zancada', 'rf_iso_largo', { s: 3, t: [20, 30], note: 'isométrica en lugar de excéntrica' }], isquio_exc: ['puente_isquio_iso', 'isquio', { s: 3, t: [20, 30], note: 'isométrica en lugar de excéntrica' }], aductor: ['copenhagen_corto', 'aductor', { s: 3, t: [15, 20], note: 'isométrica' }] };
function adjustSessionsForState(sessions, st, date) {
  const p = painToday(st, date), ci = p.ci, notes = [];
  if (!ci) return notes;
  const sore = num(ci.soreness), score = readinessScore(ci);
  if (sore !== null && sore <= 2) {
    let n = 0;
    for (const s of sessions) {
      if (!['prevencion', 'fuerzaA', 'fuerzaMax', 'potencia'].includes(s.type)) continue;
      s.items = s.items.map(it => {
        const sw = DOMS_SWAP[it.slot]; const ex = BANK_INDEX[it.id];
        if (!sw || !ex || ex.c === 'iso') return it;
        const alt = BANK_INDEX[sw[0]]; if (!alt) return it;
        n++; const ni = makeItem(alt, sw[1], Object.assign({}, sw[2])); ni.doms = true; return ni;
      });
      if (n) s.est = estimateSession(s);
    }
    if (n) notes.push('Dolor muscular alto: hoy isometrías en lugar de excéntricos (' + plural(n, 'ejercicio', 'ejercicios') + ').');
  }
  if (score !== null && score < 50) {
    let n = 0;
    for (const s of sessions) for (const it of s.items) if (it.prio >= 2 && it.spec && it.spec.s > 2) { it.spec = Object.assign({}, it.spec, { s: it.spec.s - 1 }); n++; }
    if (n) { sessions.forEach(s => { if (s.items.length) s.est = estimateSession(s); }); notes.push('Estado ' + score + '/100: una serie menos en ' + plural(n, 'accesorio', 'accesorios') + ', misma intensidad.'); }
  }
  return notes;
}
function plural(n, a, b) { return n + ' ' + (n === 1 ? a : b); }

function buildWeek(st, weekStart, today) {
  st._weeks = st._weeks || {};
  if (st._weeks[weekStart]) return st._weeks[weekStart];
  let carry = null;
  if (weekStart > weekStartOf(today)) { const pw = buildWeek(st, addDays(weekStart, -7), today); carry = pw.carry; }
  const res = buildWeekCore(st, weekStart, today, carry);
  st._weeks[weekStart] = res;
  return res;
}
/* Fase vigente en un día pasado, según el historial de fases */
function phaseAt(st, date) {
  const log = (st.injury && st.injury.phaseLog) || [];
  let p = null;
  for (const x of log.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))) if (x.date <= date) p = clamp(Number(x.phase) || st.phase, 1, 6);
  return p || st.phase;
}
function projectedPhaseOn(st, date, today) {
  if (st.injury && date < today) return phaseAt(st, date);
  if (!st.injuryActive || date <= today) return st.phase;
  const proj = st._proj || (st._proj = project(st, today));
  let p = st.phase;
  for (const k of [3, 4, 5]) if (k > p && proj.phases[k] && proj.phases[k] <= date) p = k;
  return p;
}
function buildWeekCore(st, weekStart, today, carry) {
  const plan = (st.settings && st.settings.plan) || {};
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(weekStart, i);
    const ov = plan[date];
    const ph = projectedPhaseOn(st, date, today);
    const sD = ph === st.phase ? st : Object.assign({}, st, { phase: ph, projectedPhase: true });
    const tt = ov && Array.isArray(ov.types) ? { md: '', types: ov.types.slice() } : templateTypes(date, sD);
    const notes = [];
    if (ph !== st.phase && date > today && projectedPhaseOn(st, addDays(date, -1), today) !== ph) notes.push('Previsto: ' + PHASES[ph].n + ' · ' + PHASES[ph].t + ' desde hoy si se cumplen los criterios.');
    days.push({ date, md: tt.md || '', types: tt.types.slice(), override: !!ov, trial: !!tt.trial, notes, st: sD, phase: ph });
  }
  if (st.phase >= 5 && days.some(d => d.md && d.md.startsWith('MD')) && !days.some(d => d.types.includes('fuerzaMax'))) {
    const d2 = days.find(d => d.md === 'MD-2' && !d.override);
    if (d2) d2.types = d2.types.map(t => (t === 'prevencion' ? 'fuerzaCorta' : t));
  }
  let lastTest = carry && carry.lastTest ? carry.lastTest : st.lastTestDate;
  if (st.phase >= 2 && st.injury) {
    const weekEnd = addDays(weekStart, 6);
    const doneTests = st.sessions.filter(s => s.type === 'test' && s.date >= weekStart && s.date <= weekEnd && s.done !== false).map(s => s.date).sort();
    if (doneTests.length) { if (!lastTest || doneTests[doneTests.length - 1] > lastTest) lastTest = doneTests[doneTests.length - 1]; }
    else {
      const sd = days.find(d => d.date >= today && !d.override && !d.types.includes('test') && d.types.some(t => t === 'fuerzaA' || t === 'fuerzaMax')
        && (!lastTest || diffDays(d.date, lastTest) >= (d.phase >= 5 ? 28 : 7)));
      if (sd) { sd.types.unshift('test'); lastTest = sd.date; }
    }
  }
  const realIntense = (date) => st.sessions.some(s => s.date === date && isIntenseLog(s));
  const doneOn = (date) => st.sessions.some(s => s.date === date && s.done !== false);
  let prevIntense = carry ? carry.lastIntense : realIntense(addDays(weekStart, -1));
  let count = 0;
  const sim = carry ? cloneSim(carry.sim) : { kick: Object.assign({}, st.kick), sprint: Object.assign({}, st.sprint), rt: Object.assign({}, st.rt) };
  sim.hdr = BALL_HEADER_CAP - ballHeaderCount(st.sessions, weekStart);
  const out = [];
  for (let i = 0; i < 7; i++) {
    const d = days[i];
    const past = d.date < today;
    let sessions, intense;
    const sD = d.st;
    if (past) {
      sessions = d.types.map(t => makeSession(t, d.date, sD));
      intense = realIntense(d.date);
    } else {
      let rLocked = false;
      if (!d.override) {
        if (d.date === today) { const r = readinessTypes(d.types, st, d.date); d.types = r.types; d.notes.push(...r.notes); rLocked = r.locked; }
        if (!rLocked) { const a = accelerateTypes(d.types, sD, sim); d.types = a.types; d.notes.push(...a.notes); }
      }
      const snap = cloneSim(sim);
      sessions = buildDaySessions(d, sD, sim, today);
      intense = sessions.some(s => s.intense);
      const locked = rLocked || d.override || d.types.some(t => FIXED_TYPES.includes(t)) || (d.date === today && doneOn(today));
      if (intense && (prevIntense || count >= 3) && !locked) {
        const why = prevIntense ? 'el día anterior fue intenso' : 'ya hay 3 días intensos esta semana';
        const nx = days[i + 1];
        let fixed = false;
        if (nx && !nx.override && !nx.types.includes('descanso') && !nx.types.some(t => FIXED_TYPES.includes(t)) && !typesIntenseApprox(nx.types, sD)) {
          const a = d.types; d.types = nx.types; nx.types = a;
          restoreSim(sim, snap);
          sessions = buildDaySessions(d, sD, sim, today);
          if (!sessions.some(s => s.intense)) { fixed = true; d.notes.push('Ajustado: ' + why + '. Lo intenso pasa al ' + DOW_LONG[weekday(nx.date)] + '.'); nx.notes.push('Recibe la sesión intensa del ' + DOW_LONG[weekday(d.date)] + '.'); }
          else { const b = d.types; d.types = nx.types; nx.types = b; }
        }
        if (!fixed) {
          restoreSim(sim, snap);
          d.types = downgradeTypes(d.types);
          sessions = buildDaySessions(d, sD, sim, today, { capLight: true });
          d.notes.push('Carga reducida: ' + why + '.');
        }
        intense = sessions.some(s => s.intense);
      }
      if (d.date === today && realIntense(today)) intense = true;
      if (d.date === today) d.notes.push(...adjustSessionsForState(sessions, st, today));
    }
    d.notes.push(...trimFieldForBudget(sessions));
    if (intense) count++;
    prevIntense = intense;
    out.push({ date: d.date, md: d.md, sessions, intense, notes: d.notes, override: d.override, past, trial: d.trial, types: d.types.slice(), phase: d.phase, projectedPhase: !past && d.phase !== st.phase });
  }
  if (addDays(weekStart, 6) >= today) fillGaps(out, st, today);
  out.carry = { sim: cloneSim(sim), lastIntense: prevIntense, lastTest };
  return out;
}

/* ---------- Proyección si todo sale limpio ---------- */
function project(st, today, horizon, opts) {
  horizon = horizon || 70; opts = opts || {};
  const sim = Object.assign({}, st, { kick: Object.assign({}, st.kick), sprint: Object.assign({}, st.sprint), rt: Object.assign({}, st.rt), phase: st.phase, lastTestDate: st.lastTestDate });
  const out = { phases: {}, k8: null, s6: null };
  const ok = { 2: !!(st.testPasses && st.testPasses[2]), 4: false };
  const step = (lad, req, max) => { if (lad.top) return; lad.streak++; if (lad.streak >= req[lad.level]) { if (lad.level < max) { lad.level++; lad.streak = 0; } else lad.top = true; } };
  let pending = null;
  for (let i = 0; i < horizon && sim.phase < 5; i++) {
    const date = addDays(today, i);
    if (pending) { sim.phase = pending; out.phases[pending] = date; pending = null; }
    const plan = (st.settings && st.settings.plan && st.settings.plan[date]) || null;
    let types = plan && Array.isArray(plan.types) ? plan.types.slice() : templateTypes(date, sim).types.slice();
    if (!plan && !opts.noAccel) types = accelerateTypes(types, Object.assign({}, sim, { injuryActive: st.injuryActive }), sim).types;
    if (sim.phase >= 2 && (!sim.lastTestDate || diffDays(date, sim.lastTestDate) >= 7) && types.includes('fuerzaA')) types.unshift('test');
    for (const t of types) {
      if (t === 'golpeo') { if (sim.kick.level <= KCAP[sim.phase]) step(sim.kick, KICK_REQ, 8); if (sim.kick.top) out.k8 = out.k8 || date; }
      if (t === 'sprint') { if (sim.sprint.level <= SCAP[sim.phase]) step(sim.sprint, SPRINT_REQ, 6); if (sim.sprint.top) out.s6 = out.s6 || date; }
      if (t === 'test') { sim.lastTestDate = date; if (sim.phase === 2) ok[2] = true; if (sim.phase === 4) ok[4] = true; }
    }
    if (sim.phase === 2 && ok[2]) pending = 3;
    else if (sim.phase === 3 && sim.kick.level >= 6 && sim.sprint.level >= 5) pending = 4;
    else if (sim.phase === 4 && sim.kick.top && sim.sprint.top && ok[4]) pending = 5;
  }
  return out;
}

/* Minutos del día: el calentamiento se cuenta completo solo en el primer bloque */
function dayMinutes(day) {
  let tot = 0, warmed = false;
  for (const s of day.sessions) {
    if (s.type === 'descanso') continue;
    let m = s.est || 0;
    if (s.warmup) { if (warmed) m = Math.max(0, m - Math.max(0, s.warmup.min - 3)); warmed = true; }
    tot += m;
  }
  return Math.round(tot / 5) * 5;
}

/* ---------- Estado diario ---------- */
function readinessScore(c) {
  if (!c) return null;
  const h = num(c.sleepH);
  const sleep = h === null ? 0.6 : h >= 8 ? 1 : h >= 7 ? 0.8 : h >= 6 ? 0.55 : 0.3;
  const n = (v) => (num(v) === null ? 0.6 : (num(v) - 1) / 4);
  return Math.round((sleep * 0.25 + n(c.sleepQ) * 0.15 + n(c.fatigue) * 0.25 + n(c.soreness) * 0.2 + n(c.stress) * 0.15) * 100);
}
function readinessAdvice(c) {
  if (!c) return null;
  const sc = readinessScore(c), pain = num(c.rfPain) || 0, out = [];
  if (pain >= 3) out.push({ level: 'critical', text: 'Dolor ' + pain + '/10 en reposo: hoy nada intenso para el recto femoral.' });
  else if (pain >= 1) out.push({ level: 'warning', text: 'Molestia ' + pain + '/10: entrena según el plan y para si sube.' });
  if (sc < 50) out.push({ level: 'warning', text: 'Estado bajo: recorta 30 % de las series y mantén la intensidad.' });
  return { score: sc, items: out };
}

/* ---------- Carga ---------- */
function sessionLoad(s) { const m = num(s.minutes) !== null ? num(s.minutes) : num(s.est), r = num(s.rpe); return m !== null && r !== null && s.done !== false ? Math.round(m * r) : 0; }
function weeklyLoads(sessions, today, weeks) {
  const ws = weekStartOf(today), out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const start = addDays(ws, -7 * i), end = addDays(start, 6);
    const list = sessions.filter(s => s.date >= start && s.date <= end && s.done !== false);
    out.push({ start, load: list.reduce((a, s) => a + sessionLoad(s), 0), count: list.length });
  }
  return out;
}

/* ---------- Cobertura ---------- */
const FIELD_TAGS = {
  golpeo: { pat: ['golpeo'], z: ['rf', 'aductor', 'cadera'], c: ['pliom'], pl: ['S', 'T'] },
  balon: { pat: ['balon'], z: [], c: ['mixta'], pl: ['S', 'F'] },
  sprint: { pat: ['sprint'], z: ['isquio', 'rf', 'pantorrilla'], c: ['pliom'], pl: ['S'] },
  rt: { pat: ['resistencia', 'sprint', 'cod'], z: ['cuad', 'isquio'], c: ['mixta'], pl: ['S', 'T'] },
  juego: { pat: ['cod', 'sprint', 'golpeo'], z: ['aductor', 'rodilla', 'tobillo'], c: ['mixta'], pl: ['S', 'F', 'T'] },
  equipo: { pat: ['cod', 'sprint', 'golpeo', 'resistencia'], z: ['aductor', 'isquio', 'rf'], c: ['mixta'], pl: ['S', 'F', 'T'] },
  partido: { pat: ['cod', 'sprint', 'golpeo', 'resistencia'], z: ['aductor', 'isquio', 'rf'], c: ['mixta'], pl: ['S', 'F', 'T'] },
  prueba: { pat: ['cod', 'sprint', 'golpeo', 'resistencia'], z: ['aductor', 'isquio', 'rf'], c: ['mixta'], pl: ['S', 'F', 'T'] },
};
function coverage(sessions, today, days) {
  const from = addDays(today, -(days - 1));
  const res = { pat: {}, z: {}, c: {}, pl: {}, exCount: 0, from };
  const inc = (o, k) => { o[k] = (o[k] || 0) + 1; };
  for (const s of sessions) {
    if (s.done === false || s.date < from || s.date > today) continue;
    const ft = FIELD_TAGS[s.type];
    if (ft && (s.type !== 'golpeo' || s.kick)) { ft.pat.forEach(p => inc(res.pat, p)); ft.z.forEach(z => inc(res.z, z)); }
    for (const it of (s.exercises || [])) {
      const t = exTags(it); if (!t) continue;
      res.exCount++;
      inc(res.pat, t.pat); (t.z || []).forEach(z => inc(res.z, z)); inc(res.c, t.c);
    }
  }
  return res;
}

/* ---------- Series por grupo muscular ---------- */
const Z_MG = { cuad: 'cuadriceps', rf: 'recto_femoral', isquio: 'isquios', aductor: 'aductores', gluteo: 'gluteo', gluteo_med: 'gluteo_med', pantorrilla: 'pantorrilla', lumbar: 'lumbar', core: 'core', pecho: 'pecho', espalda: 'espalda', hombro: 'deltoides_ant', cuello: 'cuello' };
/* Grupos de un ejercicio: del banco, o deducidos de sus zonas (propios y biblioteca) */
function exMg(ex) {
  if (!ex) return {};
  const b = BANK_INDEX[ex.id]; if (b) return b.mg || {};
  if (ex.mg && Object.keys(ex.mg).length) return ex.mg;
  if (['movilidad', 'respiracion', 'resistencia', 'sprint', 'cod'].includes(ex.pat) || ex.c === 'pliom' || ex.c === '—') return {};
  const o = {};
  (ex.z || []).forEach((z, i) => { const g = Z_MG[z]; if (g && o[g] === undefined) o[g] = i === 0 ? 1 : 0.5; });
  return o;
}
function itemMg(it) { return exMg(BANK_INDEX[it.id] || Object.assign({ id: it.id }, it.tags || {})); }
function setsDoneOf(e) { const sets = (e.sets || []).filter(Boolean), done = sets.filter(x => x.done !== false).length; return sets.some(x => x.side) ? done / 2 : done; }
function addMg(out, mg, n) { for (const g in mg) out[g] = (out[g] || 0) + mg[g] * n; }
function mgTarget(g, phase) { const t = MUSCLE_GROUPS[g] && MUSCLE_GROUPS[g].t; if (!t) return null; const m = MG_PHASE_MULT[clamp(phase || 6, 1, 6)] || 1; return [Math.round(t[0] * m), Math.round(t[1] * m)]; }
/* Series por grupo de una semana: lo registrado + lo que falta del plan */
function muscleLedger(st, weekStart, today, days) {
  const end = addDays(weekStart, 6), done = {}, plan = {}, total = {};
  for (const s of st.sessions) {
    if (s.done === false || s.date < weekStart || s.date > end) continue;
    for (const e of (s.exercises || [])) { if (!e || !e.id || e.warmup) continue; const n = setsDoneOf(e); if (n) addMg(done, itemMg(e), n); }
  }
  for (const d of (days || [])) {
    if (d.date < today) continue;
    for (const s of d.sessions) {
      if (st.sessions.some(x => x.date === d.date && x.type === s.type)) continue;
      for (const it of (s.items || [])) addMg(plan, itemMg(it), (it.spec && it.spec.s) || 0);
    }
  }
  for (const g in MUSCLE_GROUPS) total[g] = Math.round(((done[g] || 0) + (plan[g] || 0)) * 10) / 10;
  return { total, done, plan };
}
/* Grupos por debajo del objetivo semanal */
function groupGaps(led, phase) {
  return Object.keys(MUSCLE_GROUPS).map(g => { const t = mgTarget(g, phase); return t ? { g, n: MUSCLE_GROUPS[g].n, have: led.total[g] || 0, lo: t[0], hi: t[1], need: Math.round((t[0] - (led.total[g] || 0)) * 10) / 10 } : null; }).filter(Boolean);
}
const LEG_GROUPS = ['gluteo', 'isquios', 'aductores', 'cuadriceps', 'recto_femoral', 'flexores_cadera', 'gluteo_med'];
/* Accesorios para llegar a las series de la semana, en la próxima sesión de gimnasio con margen de tiempo */
function fillGaps(days, st, today) {
  if (!days.length) return;
  const led = muscleLedger(st, days[0].date, today, days);
  const gaps = groupGaps(led, st.phase).filter(x => x.need >= 1.5).sort((a, b) => b.need - a.need);
  if (!gaps.length) return;
  const hosts = [];
  for (const d of days) {
    if (d.date < today || (d.notes || []).some(n => /^Dolor/.test(n))) continue;
    for (const s of d.sessions) if (GYM_TYPES.includes(s.type) && !['movilidad', 'recuperacion', 'activacion'].includes(s.type) && !st.sessions.some(x => x.date === d.date && x.type === s.type)) hosts.push({ d, s });
  }
  for (const gp of gaps) {
    let need = gp.need;
    for (const h of hosts) {
      if (need < 1.5) break;
      const s = h.s;
      if (LEG_GROUPS.includes(gp.g) && !['fuerzaA', 'prevencion', 'fuerzaMax', 'fuerzaCorta'].includes(s.type)) continue;
      if ((s.fills || 0) >= 2) continue;
      const gymMin = () => h.d.sessions.filter(x => GYM_TYPES.includes(x.type) || x.type === 'test').reduce((a, x) => a + estimateSession(x) * (st.durFactor || 1), 0);
      const cap = h.d.sessions.filter(x => GYM_TYPES.includes(x.type) || x.type === 'test').every(x => UPPER_TYPES.includes(x.type)) ? 62 : 80;
      if (gymMin() >= cap - 4) continue;
      const ctx = { bank: st.bank, phase: h.d.phase || st.phase, injuryActive: st.injuryActive, place: s.place, profile: st.profile, avoid: s.avoid || null };
      const used = new Set(s.items.map(i => i.id));
      const cands = st.bank.filter(e => (e.mg || {})[gp.g] === 1 && exEligible(e, ctx) && !used.has(e.id) && (e.k || 2) <= 3 && e.c !== 'pliom');
      if (!cands.length) continue;
      cands.sort((a, b) => Object.keys(a.mg).length - Object.keys(b.mg).length || (a.k || 2) - (b.k || 2));
      const ex = cands[0], slot = (ex.s || []).find(x => PRESC[x]) || null;
      const base = slot ? specFor(slot, st.phase) : { s: 3, r: [10, 12] };
      const sets = clamp(Math.round(need), 2, 3);
      const spec = Object.assign({}, base.min || base.m || base.c ? { r: [10, 12] } : base, { s: sets, note: 'para completar ' + MUSCLE_GROUPS[gp.g].n.toLowerCase() });
      const it = makeItem(ex, slot, spec); it.fill = gp.g; it.prio = 3;
      s.items.push(it);
      if (gymMin() > cap) { s.items.pop(); continue; }
      s.fills = (s.fills || 0) + 1;
      s.estRaw = estimateSession(s); s.est = st.durFactor && Math.abs(st.durFactor - 1) >= 0.05 ? Math.max(5, Math.round(s.estRaw * st.durFactor / 5) * 5) : s.estRaw;
      need -= sets * ex.mg[gp.g];
      (h.d._fill = h.d._fill || []).push(MUSCLE_GROUPS[gp.g].n.toLowerCase());
    }
  }
  for (const d of days) if (d._fill) { d.notes.push('Se suma ' + Array.from(new Set(d._fill)).join(', ') + ' para llegar a las series de la semana.'); delete d._fill; }
}

/* Patrones sin estímulo que ya están permitidos en tu fase */
function coverageGaps(cov, st) {
  const open = (pat) => {
    if (!st.injuryActive) return true;
    if (pat === 'sprint') return st.phase >= 3;
    if (pat === 'cod') return st.phase >= 4;
    return st.bank.some(e => e.pat === pat && (e.f || 1) <= st.phase);
  };
  return KEY_PATTERNS.filter(p => !cov.pat[p] && open(p));
}

/* ---------- Progresión de cargas ---------- */
function lastPerf(exId, sessions, beforeDate) {
  const has = (e) => e.id === exId && Array.isArray(e.sets) && e.sets.some(x => x && x.done !== false && (num(x.kg) !== null || num(x.reps) !== null || num(x.secs) !== null));
  const list = sessions.filter(s => s.done !== false && (!beforeDate || s.date < beforeDate) && (s.exercises || []).some(has)).sort(byDate);
  if (!list.length) return null;
  const s = list[list.length - 1], e = s.exercises.find(has);
  return { date: s.date, sets: e.sets.filter(x => x && x.done !== false), pain: num(e.pain), rpe: num(e.rpe) !== null ? num(e.rpe) : num(s.rpe), fb: e.fb || null, notes: e.notes || '', planned: Array.isArray(e.sets) ? e.sets.length : 0 };
}
/* Feedback estructurado de un ejercicio: lo entiende el motor */
const FEEDBACK = {
  facil: { n: 'Fácil', d: 'Me sobró: subir' },
  justo: { n: 'Justo', d: 'Exigente y controlado' },
  dificil: { n: 'Difícil', d: 'Al límite: repetir' },
  molestia: { n: 'Molestia', d: 'Algo no se sintió bien' },
};
function roundTo(v, inc) { return Math.round(v / inc) * inc; }
function fmtSetsShort(sets) {
  if (!sets || !sets.length) return '';
  const f = sets[0];
  const val = num(f.secs) !== null ? fmtNum(f.secs) + ' s' : num(f.m) !== null ? fmtNum(f.m) + ' m' : num(f.c) !== null ? fmtNum(f.c) + ' cont.' : num(f.reps) !== null ? fmtNum(f.reps) : null;
  const sides = sets.some(x => x.side) ? 2 : 1, n = Math.round(sets.length / sides);
  return (val === null ? n + (n === 1 ? ' serie' : ' series') : n + ' × ' + val) + (sides === 2 ? ' por lado' : '') + (num(f.kg) !== null ? ' · ' + fmtKg(f.kg) : '');
}
function suggestSets(it, ex, sessions, today, injSide) {
  const sp = it.spec || { s: 3, r: [8, 10] }, mode = specMode(sp), nSets = sp.s || 3;
  const inj = injSide || 'd', hea = inj === 'd' ? 'i' : 'd';
  const sides = it.side ? [inj, hea] : [null];
  const lp = it.id ? lastPerf(it.id, sessions, today) : null;
  const isRF = ex && (ex.z || []).includes('rf');
  const painOk = !lp || !isRF || lp.pain === null || lp.pain <= 2;
  const fb = lp ? lp.fb : null, inc = incFor(ex);
  const perSide = {};
  let note = '';
  for (const side of sides) {
    const prev = lp ? lp.sets.filter(x => (side ? x.side === side : true)) : [];
    let kg = prev.length ? num(prev[0].kg) : null, reps = null, secs = null, sideNote = '';
    if (mode === 'time') {
      const lo = sp.t[0], hi = sp.t[1];
      const vals = prev.map(x => num(x.secs) || 0);
      const allTop = prev.length && vals.every(v => v >= hi);
      secs = prev.length ? (allTop ? hi : clamp(Math.max.apply(null, vals) + (fb === 'facil' ? 10 : 5), lo, hi)) : lo;
      if (fb === 'dificil' || fb === 'molestia') secs = prev.length ? clamp(Math.max.apply(null, vals), lo, hi) : lo;
      if (allTop && painOk && fb !== 'dificil' && fb !== 'molestia') sideNote = fb === 'facil' ? 'Fue fácil al tope de tiempo: añade carga o pasa a la variante siguiente.' : 'Llegaste al tope de tiempo: añade carga o dificultad.';
      if (fb === 'molestia') sideNote = 'Hubo molestia: mismo tiempo, menos intensidad.';
    } else if (mode === 'reps') {
      const lo = sp.r ? sp.r[0] : 8, hi = sp.r ? sp.r[1] : 10;
      const repsArr = prev.map(x => num(x.reps) || 0);
      if (kg !== null && prev.length) {
        const allTop = repsArr.every(r => r >= hi) && prev.length >= Math.min(nSets, 2);
        const rpeOk = !lp || lp.rpe === null || lp.rpe <= 8 || fb === 'facil' || fb === 'justo';
        if (fb === 'molestia') {
          if (isRF && kg > 0) { kg = Math.max(0, roundTo(kg * 0.9, inc)); sideNote = 'Hubo molestia: baja a ' + fmtKg(kg) + ' y controla el rango.'; }
          else sideNote = 'Hubo molestia: repite ' + fmtKg(kg) + ' con técnica estricta.';
          reps = lo;
        } else if (fb === 'dificil') {
          reps = clamp(Math.max.apply(null, repsArr), lo, hi); sideNote = 'La última vez fue difícil: repite ' + fmtKg(kg) + '.';
        } else if (allTop && rpeOk && painOk) {
          kg = kg + (fb === 'facil' ? inc * 2 : inc); reps = lo; sideNote = 'Sube a ' + fmtKg(kg) + (fb === 'facil' ? ': te sobró la última vez.' : '.');
        } else if (repsArr.filter(r => r < lo).length >= 2) { reps = lo; sideNote = 'Repite ' + fmtKg(kg) + ' hasta lograr ' + lo + ' repeticiones.'; }
        else { reps = clamp(Math.max.apply(null, repsArr) + (fb === 'facil' ? 2 : 1), lo, hi); sideNote = 'Mismo peso, busca ' + reps + ' repeticiones.'; }
        if (!painOk && fb !== 'molestia') sideNote = 'Hubo dolor la última vez: repite el peso.';
      } else reps = lo;
    }
    perSide[side || 'x'] = { kg, reps, secs };
    if (sideNote && !note) note = sideNote;
  }
  const sets = [];
  for (let k = 0; k < nSets; k++) for (const side of sides) {
    const v = perSide[side || 'x'];
    sets.push({ side, kg: v.kg, reps: mode === 'reps' ? v.reps : null, secs: mode === 'time' ? v.secs : null, m: mode === 'dist' ? sp.m : null, c: mode === 'contacts' ? sp.c : null, done: false });
  }
  return { sets, note, last: lp };
}
/* Siguiente o anterior variante dentro de la cadena de un hueco */
function chainStep(slot, id, dir, ctx) {
  const ch = CHAINS[slot]; if (!ch) return null;
  const i = ch.indexOf(id); if (i < 0) return null;
  const j = i + dir; if (j < 0 || j >= ch.length) return null;
  const ex = BANK_INDEX[ch[j]];
  if (!ex || (ctx && !exEligible(ex, ctx))) return null;
  return ex;
}
/* Sugerencias tras una sesión: reglas sobre el feedback y el rendimiento */
function postSuggestions(log, sessions, st) {
  const out = [], ctx = { phase: st.phase, injuryActive: st.injuryActive, equipmentOff: st.equipmentOff };
  for (const e of (log.exercises || [])) {
    if (!e || !e.id || e.warmup) continue;
    const slot = e.slot, done = (e.sets || []).filter(x => x && x.done !== false);
    if (!done.length) continue;
    const ex = BANK_INDEX[e.id] || null;
    if (e.fb === 'facil' && slot) {
      const prevFb = (() => { const l = sessions.filter(s => s.id !== log.id && s.date < log.date && (s.exercises || []).some(x => x.id === e.id)).sort(byDate).pop(); const x = l && l.exercises.find(y => y.id === e.id); return x ? x.fb : null; })();
      const nx = chainStep(slot, e.id, 1, ctx);
      if (nx && (prevFb === 'facil' || specMode(e.spec) === 'time')) out.push({ kind: 'choice', slot, from: e.id, to: nx.id, title: 'Pasar a ' + nx.n, text: e.n + ' te resultó fácil' + (prevFb === 'facil' ? ' dos veces seguidas' : '') + '. La variante siguiente carga más el mismo patrón.' });
    }
    if ((e.fb === 'molestia' || num(e.pain) >= 3) && slot) {
      const pv = chainStep(slot, e.id, -1, ctx);
      if (pv) out.push({ kind: 'choice', slot, from: e.id, to: pv.id, title: 'Volver a ' + pv.n, text: 'Hubo molestia en ' + e.n + '. Una variante más fácil hasta que salga limpio.', warn: true });
      else if (ex && (ex.z || []).includes('rf')) out.push({ kind: 'info', title: 'Molestia en ' + e.n, text: 'La próxima vez: menos carga y rango sin dolor. Si se repite 2 sesiones, consulta.', warn: true });
    }
    if (e.doneAs && e.doneAs.reason === 'sin_equipo' && e.doneAs.from && ex) out.push({ kind: 'equip', eq: e.doneAs.eq || null, title: 'Sin ' + (e.doneAs.eq || 'equipo'), text: 'Marca el equipo como no disponible y el plan no lo vuelve a usar.' });
  }
  const seen = new Set();
  return out.filter(x => { const k = x.kind + (x.slot || '') + (x.to || '') + (x.eq || ''); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 4);
}
/* % entre piernas estimado con el entrenamiento (Epley) */
function trainingLSI(sessions, injSide) {
  const out = [], hea = injSide === 'i' ? 'd' : 'i';
  for (const id of ['ext_uni_exc', 'ext_uni_reclinada', 'bulgara_rf_atras', 'bulgara', 'prensa_uni', 'step_down']) {
    const lp = lastPerf(id, sessions); if (!lp) continue;
    const e1 = (side) => Math.max.apply(null, [0].concat(lp.sets.filter(x => x.side === side && num(x.kg) && num(x.reps)).map(x => num(x.kg) * (1 + Math.min(12, num(x.reps)) / 30))));
    const a = e1(injSide), b = e1(hea);
    if (a > 0 && b > 0) out.push({ id, n: (BANK_INDEX[id] || {}).n || id, date: lp.date, lsi: Math.round(a / b * 1000) / 10, inj: Math.round(a * 10) / 10, hea: Math.round(b * 10) / 10 });
  }
  return out;
}
function bestE1RM(exId, sessions) {
  let best = 0;
  for (const s of sessions) for (const e of (s.exercises || [])) if (e.id === exId) for (const x of (e.sets || [])) {
    if (x && x.done !== false && num(x.kg) && num(x.reps)) best = Math.max(best, num(x.kg) * (1 + Math.min(12, num(x.reps)) / 30));
  }
  return best;
}

/* ---------- Tipo de día para la nutrición ---------- */
function dayKind(day, prof) {
  if (!day) return 'descanso';
  const types = day.sessions.map(s => s.type);
  const trials = (prof && prof.trials) || [];
  if (types.includes('partido') || types.includes('prueba') || day.trial) return 'prueba';
  if (trials.includes(addDays(day.date, 1)) || day.md === 'MD-1') return 'prueba';
  if (!types.length || types.every(t => t === 'descanso')) return 'descanso';
  if (day.intense) return 'alto';
  if (types.every(t => ['movilidad', 'recuperacion', 'descanso', 'prevencion', 'superior', 'superiorA', 'superiorB', 'activacion'].includes(t))) return 'bajo';
  return 'moderado';
}

/* ---------- Estado global derivado ---------- */
function deriveState(data, today) {
  const injury = (data.injuries || []).filter(i => i.status !== 'resuelta').sort(byDate).pop() || null;
  const phase = injury ? clamp(Number(injury.phase) || 2, 1, 6) : 6;
  const injuryActive = !!injury && phase <= 5;
  const sessions = (data.sessions || []).filter(s => !s.deleted);
  const kick = deriveKick(sessions, injury ? injury.kickStart : 1);
  const sprint = deriveSprint(sessions, injury ? injury.sprintStart : 1);
  const rt = deriveRT(sessions);
  const tests = (data.tests || []).slice().sort(byDate);
  const lt = latestTest(tests.filter(t => t.date <= today));
  const side = (injury && injury.side) || 'd';
  const merged = mergedTest(tests, today, 35);
  const T = testSummary(merged, side);
  if (T && merged) T.dates = merged.dates;
  const profile = data.profile || {};
  const settings = data.settings || {};
  const weights = (data.weights || []).slice().sort(byDate);
  const weight = weights.length ? num(weights[weights.length - 1].kg) : num(profile.weight);
  const custom = (data.customExercises || []);
  const bank = BANK.concat(custom);
  const recentPain = sessions.some(s => s.date >= addDays(today, -13) && ['kick', 'spr'].some(f => s[f] && ((num(s[f].pd) || 0) >= 3 || (num(s[f].pn) || 0) >= 3)))
    || (data.checkins || []).some(c => c.date >= addDays(today, -13) && (num(c.rfPain) || 0) >= 3);
  const phaseSince = injury && injury.phaseLog && injury.phaseLog.length ? injury.phaseLog[injury.phaseLog.length - 1].date : null;
  const checkins = (data.checkins || []).slice().sort(byDate);
  const places = placesOf(profile);
  const placeOv = {};
  for (const a of (data.agenda || [])) { const it = (a && a.items) || {}; for (const k of Object.keys(it)) if (it[k] && it[k].place) { placeOv[a.id || a.date] = placeOv[a.id || a.date] || {}; placeOv[a.id || a.date][k] = it[k].place; } }
  const st = {
    today, injury, phase, injuryActive, sessions, kick, sprint, rt, tests, test: T, latestTestDoc: lt, side, profile, settings, weight, weights, checkins,
    bank, custom, choices: settings.choices || {}, equipmentOff: places.gimnasio.off, places, placeOv, lastTestDate: lt ? lt.date : null, recentPain, phaseSince,
    durFactor: durationFactor(sessions, today),
  };
  st.criteria = injury && phase <= 5 ? phaseCriteria(phase, { test: T, kick, sprint, injury, today, phaseSince, recentPain }) : null;
  st.testPasses = { 2: !!(T && phaseCriteria(2, { test: T, kick, sprint, injury, today }).ready), 4: false };
  return st;
}


