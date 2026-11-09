/* ============================================================
   CANCHA LIBRE: cómo lee el motor una sesión contada (con IA o a mano)
   log.campo = { side, bloques: [{ id, n, cat, min, pies, int }], golpes: { der, izq }, cabezazos, sprints,
                 companeros, pd, pn, ia, texto }
   Las bandas (no, pocos, varios, muchos) son estimaciones: nadie cuenta remates en una sesión con amigos.
   ============================================================ */
const campoRank = (b) => Math.max(0, CAMPO_BANDS.indexOf(b));
function campoSide(log) { return (log && log.campo && log.campo.side) === 'i' ? 'i' : 'd'; }
function campoLive(log) { return !!(log && log.campo && log.done !== false && !log.deleted); }
/* Golpes fuertes estimados por pierna (y cuál es la lesionada en ese registro) */
function campoShots(log) {
  if (!campoLive(log)) return { der: 0, izq: 0, les: 0, sana: 0, lesBand: 'no' };
  const g = log.campo.golpes || {}, der = CAMPO_SHOTS[g.der] || 0, izq = CAMPO_SHOTS[g.izq] || 0, d = campoSide(log) === 'd';
  return { der, izq, les: d ? der : izq, sana: d ? izq : der, lesBand: (d ? g.der : g.izq) || 'no' };
}
function campoHeaders(log) { return campoLive(log) ? CAMPO_HEADS[log.campo.cabezazos] || 0 : 0; }
/* Minutos con balón: todo menos calentamiento, vuelta a la calma, velocidad sin balón y fuerza */
function campoBallMin(log) {
  if (!campoLive(log)) return 0;
  const bl = log.campo.bloques || [];
  if (!bl.length) return num(log.minutes) || 0;
  return bl.filter(b => !['calentamiento', 'movilidad', 'sprint', 'fuerza', 'otro'].includes(b.cat)).reduce((a, b) => a + (num(b.min) || 0), 0);
}
/* Intensa para el recto femoral: golpes fuertes con la pierna lesionada (varios o más), sprints y duelos (varios o más),
   juego o 1 contra 1 a intensidad alta 15 min o más, o una sesión dura y larga (RPE ≥ 7 y 45 min o más) */
function campoIntense(log) {
  if (!campoLive(log)) return false;
  const c = log.campo;
  if (campoRank(campoShots(log).lesBand) >= 2 || campoMaxLes(log) === true) return true;
  if (campoRank(c.sprints) >= 2) return true;
  const hi = (c.bloques || []).filter(b => (CAMPO_CATS[b.cat] || {}).sprint && b.int === 'alta').reduce((a, b) => a + (num(b.min) || 0), 0);
  if (hi >= 15) return true;
  const r = num(log.rpe), m = num(log.minutes);
  return r !== null && r >= 7 && (m === null || m >= 45);
}
/* Golpes fuertes con la pierna lesionada fuera de la escalera K en los 2 días previos (varios o más) */
function campoLesShotsNear(sessions, date) {
  return (sessions || []).find(s => (s.date === addDays(date, -1) || s.date === addDays(date, -2)) && campoRank(campoShots(s).lesBand) >= 2) || null;
}
/* ¿Llegó al 100 % con la pierna que se lesionó? true, false o null si no se sabe */
function campoMaxLes(log) {
  if (!log || !log.campo) return null;
  const v = log.campo.max && log.campo.max[campoSide(log) === 'i' ? 'izq' : 'der'];
  return v === true || v === false ? v : null;
}
/* Nivel K que demuestra una cancha libre. Las bandas son estimaciones: sin confirmar el 100 %, como mucho K5.
   Al 100 %: pocos K5, varios K6 (10 remates), muchos K7 (30 o más). */
function campoKickLevel(log) {
  if (!campoLive(log) || !log.campo.side) return 0;
  const r = campoRank(campoShots(log).lesBand), k = campoSide(log) === 'i' ? 'izq' : 'der';
  if (campoMaxLes(log) === true) return r >= 3 ? 7 : r === 2 ? 6 : 5;
  const hi = (log.campo.bloques || []).filter(b => (CAMPO_CATS[b.cat] || {}).shot && b.int === 'alta' && (b.pies === 'ambos' || b.pies === k)).reduce((a, b) => a + (num(b.min) || 0), 0);
  return r >= 3 && hi >= 15 ? 5 : r >= 2 ? 4 : 0;
}
/* La cancha libre como entrada de la escalera: rige igual que una sesión (dolor ≤ 2 durante y 0 al día siguiente) */
function campoKickEntry(log) {
  if (!log || log.kick) return null;
  const L = campoKickLevel(log); if (!L) return null;
  return { id: log.id, date: log.date, type: 'golpeo', done: true, createdAt: log.createdAt || 0, kick: { level: L, pd: log.campo.pd, pn: log.campo.pn, demo: true } };
}
/* Día de golpeo fuerte: escalera K4 o más, cancha libre con varios golpes fuertes con cualquier pierna, partido o prueba */
function hardKickLog(s) {
  if (!s || s.done === false || s.deleted) return false;
  if (['partido', 'prueba', 'juego'].includes(s.type)) return true;
  if (s.kick && Number(s.kick.level) >= 4) return true;
  if (!campoLive(s)) return false;
  const g = s.campo.golpes || {};
  return campoRank(g.der) >= 2 || campoRank(g.izq) >= 2 || campoMaxLes(s) === true;
}
/* «Pateé a full con la derecha»: qué pierna llegó al máximo según el relato */
const CAMPO_MAX_RX = /(a full|al maximo|a tope|a fondo|al 100|100 ?%|con todo|maxima potencia|a toda potencia)/;
const CAMPO_KICK_RX = /(pate|remat|chut|golpe|tiro|derech|zurda|izquierd)/;
function campoMaxFromText(txt) {
  const t = String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const out = {};
  for (const sent of t.split(/[.;\n]+/)) {
    if (!CAMPO_MAX_RX.test(sent) || !CAMPO_KICK_RX.test(sent)) continue;
    const r = /derech|diestr/.test(sent), l = /zurda|izquierd/.test(sent), both = /ambas|las dos|dos piernas/.test(sent);
    if (r || both || !l) out.der = true;
    if (l || both || !r) out.izq = true;
  }
  return Object.keys(out).length ? out : null;
}
/* «Sin dolor», «sin ninguna molestia»: dolor 0 durante, si no se marcó otra cosa */
function campoNoPainFromText(txt) { return /sin (ningun[ao] )?(molestia|dolor)/.test(String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')); }
/* Bandas sugeridas a partir de los bloques (lector sin IA y bloques agregados a mano) */
function campoAutoBands(bloques, much) {
  const legs = { der: 0, izq: 0 };
  let heads = 0, spr = 0;
  for (const b of bloques || []) {
    const cat = CAMPO_CATS[b.cat] || {}, m = num(b.min) || 0;
    if (cat.shot) { const k = b.pies === 'ambos' ? 0.6 : 1; if (b.pies === 'ambos' || b.pies === 'der') legs.der += m * k; if (b.pies === 'ambos' || b.pies === 'izq') legs.izq += m * k; }
    if (b.cat === 'cabeceo') heads += m;
    if (cat.sprint) spr += b.int === 'alta' ? m : m / 2;
  }
  const band = (m) => (m >= 20 ? 'muchos' : m >= 8 ? 'varios' : m > 0 ? 'pocos' : 'no');
  const up = (b) => (much && b !== 'no' ? CAMPO_BANDS[Math.min(3, campoRank(b) + 1)] : b);
  return { golpes: { der: up(band(legs.der)), izq: up(band(legs.izq)) }, cabezazos: heads >= 15 ? 'varios' : heads > 0 ? 'pocos' : 'no', sprints: band(spr) };
}
const CAMPO_RPE = { baja: 4, media: 6, alta: 8, max: 9 };
function campoTextFlags(txt) { const m = campoMaxFromText(txt), o = {}; if (m) o.max = m; if (campoNoPainFromText(txt)) o.pd = 0; return o; }

/* ---------- Lector sin IA: palabras clave → bloques en el orden en que se cuentan ---------- */
const CAMPO_RX = [
  ['cl_def_control', /control\s*(\+|y|con|mas)?\s*(la\s*)?defini|control\s*\+\s*remat/],
  ['cl_def_primera', /de primera|primer toque/],
  ['cl_tiros_libres', /tiros? libres?|\bfaltas\b/],
  ['cl_penales', /penal/],
  ['cl_cambio_frente', /cambios? de frente|pases? largos?|diagonal/],
  ['cl_centros', /\bcentros?\b/],
  ['cl_1v1', /\b1\s*(vs?|x|contra|c)\s*1\b|uno contra uno|duelos?\b/],
  ['cl_reducido', /reducido|\b[2-6]\s*(c|x|vs|contra)\s*[2-6]\b/],
  ['cl_rondo', /rondo/],
  ['cl_partido', /picad|partido|partidito/],
  ['cl_def_ambas', /defini|remat|tiros? al arco|patea\w* al arco|\bgoles\b/],
  ['cl_cabeceo', /cabece|cabezazo/],
  ['cl_espaldas', /de espaldas|aguant\w* (el|la) (balon|pelota)|descarg|pivote|proteg\w* (el|la) (balon|pelota)/],
  ['cl_conduccion', /conduc|regate|gambeta|slalom/],
  ['cl_pases', /pases? (cortos?|con)|paredes|toque y pase/],
  ['dominio_libre', /dominio|jueguito/],
  ['cl_aceleraciones', /sprints?\b|piques?\b|aceleraci|arranques|cambios? de direccion/],
  ['cl_calentamiento', /calent|activacion/],
  ['cl_estiramiento', /estira|caminata|vuelta a la calma|enfriamiento|elongaci/],
];
function campoMinNear(t, a, b) {
  const after = t.slice(b, b + 22).match(/^[^0-9.]{0,10}?(\d{1,3})\s*(min|')/);
  if (after) return Number(after[1]);
  const before = t.slice(Math.max(0, a - 18), a).match(/(\d{1,3})\s*(min\w*|')\s*(de\s*)?$/);
  return before ? Number(before[1]) : null;
}
function campoTotalFromText(t) {
  const r = t.match(/(\d{1,2})[:.h](\d{2})\s*(a|-|hasta|al?)\s*(las\s*)?(\d{1,2})[:.h](\d{2})/);
  if (r) { let a = Number(r[1]) * 60 + Number(r[2]), b = Number(r[5]) * 60 + Number(r[6]); if (b < a) b += 720; if (b - a > 0 && b - a <= 300) return { min: b - a, start: String(r[1]).padStart(2, '0') + ':' + r[2], end: String(r[5]).padStart(2, '0') + ':' + r[6] }; }
  const h = t.match(/(\d+(?:[.,]\d+)?)\s*(h|hs|horas?)\b(\s*y\s*media)?/);
  if (h) return { min: Math.round(Number(h[1].replace(',', '.')) * 60 + (h[3] ? 30 : 0)) };
  if (/\bhora y media\b/.test(t)) return { min: 90 };
  if (/\buna hora\b/.test(t)) return { min: 60 };
  return null;
}
/* txt: lo que contaste · opts: { total, intensity: baja|media|alta|max } */
function parseTrainText(txt, opts) {
  opts = opts || {};
  const t = normTxt(txt);
  const raw = String(txt || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const used = [], found = [];
  const overlaps = (a, b) => used.some(u => a < u[1] && b > u[0]);
  for (const [id, rx] of CAMPO_RX) {
    const g = new RegExp(rx.source, 'g'); let m;
    while ((m = g.exec(t))) { const a = m.index, b = a + m[0].length; if (overlaps(a, b)) continue; used.push([a, b]); found.push({ id, pos: a, min: campoMinNear(t, a, b) }); break; }
  }
  found.sort((x, y) => x.pos - y.pos);
  const both = /ambas piernas|las dos piernas|dos piernas|ambos perfiles|ambos pies|con las dos/.test(t);
  const onlyL = !both && /zurda|izquierd/.test(t), onlyR = !both && !onlyL && /derech|diestr/.test(t);
  const bloques = found.map(f => {
    const a = CAMPO_ACT_INDEX[f.id], d = BALL_DRILL_INDEX[f.id];
    const base = a || { n: d.n, cat: ballDrillCat(d), pies: 'ambos', int: 'media', min: d.min };
    const pies = base.pies === 'ninguno' ? 'ninguno' : onlyL ? 'izq' : onlyR ? 'der' : 'ambos';
    return { id: f.id, n: base.n, cat: base.cat, min: f.min, pies, int: base.int, def: base.min };
  });
  const tot = opts.total ? { min: opts.total } : campoTotalFromText(t) || campoTotalFromText(raw);
  const total = tot ? tot.min : null;
  /* Minutos: los dichos se respetan; el resto se reparte según la duración típica de cada actividad */
  const fixed = bloques.filter(b => b.min !== null).reduce((a, b) => a + b.min, 0);
  const free = bloques.filter(b => b.min === null);
  const weight = free.reduce((a, b) => a + b.def, 0) || 1;
  const rest = total !== null ? Math.max(free.length * 5, total - fixed) : null;
  free.forEach(b => { b.min = rest === null ? b.def : Math.max(5, Math.round(rest * b.def / weight / 5) * 5); });
  if (total !== null && free.length) { const diff = total - bloques.reduce((a, b) => a + b.min, 0); const big = free.slice().sort((x, y) => y.min - x.min)[0]; big.min = Math.max(5, big.min + diff); }
  bloques.forEach(b => { delete b.def; });
  const much = /much[ao]s? (defini|remat|tiro|golpe|pase|centro)|bastante (defini|remat|tiro)/.test(t);
  const bands = campoAutoBands(bloques, much);
  let intensity = opts.intensity || null;
  if (!intensity) intensity = /a tope|al maximo|reventad|muy intens|muy exigente|matador/.test(t) ? 'max' : /intens|exigente|demandante|fuerte|dura\b|duro\b|rapido|velocidad/.test(t) ? 'alta' : /suave|tranqui|liviano|ligero|relajad/.test(t) ? 'baja' : /moderad|normal|media\b/.test(t) ? 'media' : null;
  const pm = t.match(/con (un|una|dos|tres|cuatro|\d+) (compa|amig)/);
  const companeros = pm ? ({ un: 1, una: 1, dos: 2, tres: 3, cuatro: 4 }[pm[1]] || Number(pm[1]) || 1) : /compañeros|companeros|amigos|equipo/.test(t) ? 2 : /compañero|companero|amigo/.test(t) ? 1 : 0;
  const gym = /gimnasio|\bgym\b|sentadilla|press|peso muerto|maquina|mancuerna|barra\b/.test(t);
  const minutos = total !== null ? total : bloques.reduce((a, b) => a + b.min, 0) || null;
  const field = bloques.filter(b => !['calentamiento', 'movilidad'].includes(b.cat));
  const titulo = !bloques.length ? (gym ? 'Gimnasio' : 'Sesión libre')
    : (companeros ? 'Cancha con ' + (companeros === 1 ? 'un compañero' : companeros + ' compañeros') : 'Cancha libre') + (field.length ? ': ' + field.map(b => (CAMPO_CATS[b.cat] || {}).n || b.n).filter((x, i, a) => a.indexOf(x) === i).slice(0, 2).join(' y ').toLowerCase() : '');
  return {
    titulo: titulo.slice(0, 60), tipo: bloques.length ? 'cancha' : 'libre', minutos, inicio: tot && tot.start || '', fin: tot && tot.end || '',
    rpe: intensity ? CAMPO_RPE[intensity] : null, rpeEst: !opts.intensity,
    campo: bloques.length ? Object.assign({ bloques, companeros }, bands, campoTextFlags(txt)) : null, ejercicios: [],
    nota: bloques.length ? 'Ordenado sin IA: revisa los bloques y las bandas.' : 'No reconocí actividades con balón. Agrégalas a mano o usa la IA.',
  };
}
/* Respuesta de la IA → mismo formato que el lector sin IA (valida todo: la IA puede inventar) */
function campoFromAi(res, opts) {
  opts = opts || {};
  const band = (b) => (CAMPO_BANDS.includes(b) ? b : 'no');
  const bloques = (Array.isArray(res && res.bloques) ? res.bloques : []).filter(b => b && (b.n || b.cat)).slice(0, 14).map(b => {
    const id = b.id && (CAMPO_ACT_INDEX[b.id] || BALL_DRILL_INDEX[b.id]) ? b.id : null;
    const cat = CAMPO_CATS[b.cat] ? b.cat : id && CAMPO_ACT_INDEX[id] ? CAMPO_ACT_INDEX[id].cat : 'otro';
    return { id, n: String(b.n || CAMPO_CATS[cat].n).slice(0, 60), cat, min: clamp(Math.round(num(b.min) || 0), 0, 240), pies: CAMPO_PIES[b.pies] ? b.pies : 'ambos', int: CAMPO_INT[b.int] ? b.int : 'media' };
  });
  const hmOk = (s) => (/^\d{1,2}:\d{2}$/.test(s || '') ? String(s).padStart(5, '0') : '');
  const ini = hmOk(res && res.inicio), fin = hmOk(res && res.fin);
  let minutos = num(opts.total) || num(res && res.minutos) || null;
  if (!minutos && ini && fin) { let d = hm(fin) - hm(ini); if (d < 0) d += 1440; if (d > 0 && d <= 300) minutos = d; }
  if (!minutos) minutos = bloques.reduce((a, b) => a + b.min, 0) || null;
  /* Los minutos de los bloques suman la duración total */
  const sum = bloques.reduce((a, b) => a + b.min, 0);
  if (minutos && sum && Math.abs(sum - minutos) > 5) { bloques.forEach(b => { b.min = Math.max(5, Math.round(b.min * minutos / sum / 5) * 5); }); const big = bloques.slice().sort((x, y) => y.min - x.min)[0]; big.min = Math.max(5, big.min + minutos - bloques.reduce((a, b) => a + b.min, 0)); }
  const golpes = (res && res.golpesFuertes) || {};
  const rpe = num(opts.intensity ? CAMPO_RPE[opts.intensity] : res && res.rpe);
  const ejercicios = (Array.isArray(res && res.ejercicios) ? res.ejercicios : []).filter(e => e && e.n).slice(0, 20).map(e => ({ id: String(e.id || ''), n: String(e.n).slice(0, 60), series: clamp(Math.round(num(e.series) || 3), 1, 12), reps: num(e.reps) ? Math.round(num(e.reps)) : null, kg: num(e.kg) || null, seg: num(e.seg) || null }));
  return {
    titulo: String((res && res.titulo) || (bloques.length ? 'Cancha libre' : 'Sesión libre')).slice(0, 60), tipo: bloques.length ? 'cancha' : 'libre', minutos, inicio: ini, fin,
    rpe: rpe === null ? null : clamp(Math.round(rpe), 1, 10), rpeEst: !opts.intensity,
    campo: bloques.length ? Object.assign({ bloques, golpes: { der: band(golpes.der), izq: band(golpes.izq) }, cabezazos: band(res.cabezazos), sprints: band(res.sprints), companeros: clamp(Math.round(num(res.companeros) || 0), 0, 30) }, (() => {
      /* Al máximo: lo que diga la IA y lo que diga el relato; sin dolor, solo si el relato lo dice */
      const flags = campoTextFlags(opts.text), am = (res && res.alMaximo) || {}, max = Object.assign({}, flags.max);
      if (am.der === true) max.der = true;
      if (am.izq === true) max.izq = true;
      return Object.assign({}, flags, Object.keys(max).length ? { max } : {});
    })()) : null,
    ejercicios, nota: String((res && res.nota) || '').slice(0, 200),
  };
}
