/* ============================================================
   IA (Gemini vía Firebase AI Logic): técnica de ejercicios, contar el entreno, coach, traducción
   ============================================================ */
const AI_STYLE = 'Responde en español neutro, directo, conciso y práctico. Sin relleno ni saludos.';
const EX_SCHEMA = {
  type: 'object',
  properties: {
    resumen: { type: 'string', description: 'Qué es y para qué sirve, 1-2 frases' },
    pasos: { type: 'array', items: { type: 'string' }, description: '4-6 pasos de ejecución, en orden' },
    claves: { type: 'array', items: { type: 'string' }, description: '2-4 claves técnicas' },
    errores: { type: 'array', items: { type: 'string' }, description: '2-3 errores comunes' },
    seguridad: { type: 'string', description: 'Precaución específica para un recto femoral en rehabilitación' },
    busqueda: { type: 'string', description: 'Nombre en inglés para buscar videos' },
  },
  required: ['resumen', 'pasos', 'claves', 'errores', 'seguridad', 'busqueda'],
};
/* Contar el entreno: el relato libre se ordena en bloques; lo que no se puede contar va por bandas */
const BAND_ENUM = { type: 'string', enum: ['no', 'pocos', 'varios', 'muchos'] };
const TRAIN_SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string', description: 'Título corto de la sesión, máximo 48 caracteres' },
    minutos: { type: 'number', description: 'Duración total en minutos; 0 si no se puede saber' },
    inicio: { type: 'string', description: 'HH:MM si el relato lo dice; vacío si no' },
    fin: { type: 'string', description: 'HH:MM si el relato lo dice; vacío si no' },
    rpe: { type: 'number', description: 'Esfuerzo de la sesión entera, 1 a 10' },
    bloques: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string', description: 'Id de la lista de actividades si coincide; vacío si no' },
      n: { type: 'string', description: 'Nombre corto en español' },
      cat: { type: 'string', enum: Object.keys(CAMPO_CATS) },
      min: { type: 'number', description: 'Minutos del bloque' },
      pies: { type: 'string', enum: ['ambos', 'der', 'izq', 'ninguno'] },
      int: { type: 'string', enum: ['baja', 'media', 'alta'] },
    }, required: ['n', 'cat', 'min', 'pies', 'int'] } },
    golpesFuertes: { type: 'object', properties: { der: BAND_ENUM, izq: BAND_ENUM }, required: ['der', 'izq'] },
    cabezazos: BAND_ENUM,
    sprints: BAND_ENUM,
    alMaximo: { type: 'object', description: 'Solo si el relato dice que pateó al máximo (a full, a tope, al 100 %, con todo)', properties: { der: { type: 'boolean' }, izq: { type: 'boolean' } } },
    companeros: { type: 'number' },
    ejercicios: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string', description: 'Id de la lista del banco si coincide; vacío si no' },
      n: { type: 'string' }, series: { type: 'number' }, reps: { type: 'number' }, kg: { type: 'number' }, seg: { type: 'number' },
    }, required: ['n'] } },
    nota: { type: 'string', description: 'Una línea: qué supusiste o qué revisar' },
  },
  required: ['titulo', 'rpe', 'bloques', 'golpesFuertes', 'cabezazos', 'sprints', 'nota'],
};
const TT_INT_N = { baja: 'suave', media: 'media', alta: 'intensa', max: 'al máximo' };
function aiErrorText(e) {
  const c = e && (e.code || e.name || '');
  if (c === 'no-ai' || c === 'offline') return 'La IA necesita conexión.';
  if (/quota|resource-exhausted|429/i.test(String(c) + ' ' + (e && e.message))) return 'Se alcanzó el límite gratuito de la IA por ahora. Prueba en unos minutos.';
  if (/app-check|appcheck/i.test(String(c) + ' ' + (e && e.message))) return 'No se pudo verificar la app para usar la IA. Recarga la página.';
  return 'La IA no respondió.';
}
function athleteDesc() {
  const p = (ST && ST.profile) || {}, inj = ST && ST.injury;
  const base = 'un futbolista' + (p.position ? ' (' + p.position.toLowerCase() + (p.heightCm ? ', ' + p.heightCm + ' cm' : '') + ')' : '');
  return base + (inj && ST.injuryActive ? ' que rehabilita una lesión de ' + String(inj.zone || 'la pierna').toLowerCase() + ' ' + (inj.side === 'i' ? 'izquierdo' : 'derecho') : '');
}
const AIX = {
  available() { return !!(FB && FB.ai) && navigator.onLine !== false; },
  async json(prompt, schema, opts) {
    if (!this.available()) throw { code: 'no-ai' };
    return FB.ai.json(Object.assign({ prompt, schema }, opts || {}));
  },
  async exerciseHelp(ex) {
    const prompt = 'Explica cómo se hace este ejercicio de gimnasio o de campo a ' + athleteDesc() + ', ahora en ' + PHASES[ST.phase].n + ' (' + PHASES[ST.phase].t + ').\n' +
      'Ejercicio: "' + ex.n + '".' + (ex.cue ? '\nIndicación del plan: ' + ex.cue : '') + (ex.m ? '\nMúsculos: ' + ex.m : '') + (ex.eq && ex.eq.length ? '\nEquipo: ' + ex.eq.join(', ') : '') +
      '\nPasos cortos (máximo 18 palabras cada uno), en imperativo. ' + AI_STYLE;
    return this.json(prompt, EX_SCHEMA, { tier: 'fast' });
  },
  /* o: { text, date, total, start, end, intensity } */
  async parseTraining(o) {
    const L = ST && ST.injuryActive ? effLevels(ST) : null;
    const les = ST && ST.side === 'i' ? 'izquierda' : 'derecha';
    const acts = CAMPO_ACTS.map(a => a.id + '=' + a.n).concat(BALL_DRILLS.map(d => d.id + '=' + d.n)).join('; ');
    const gym = /gim|gym|serie|kg|kilo|repet|sentadilla|press|peso muerto|nordic|n[oó]rdico|m[aá]quina|mancuerna|barra|polea|plancha|zancada|b[uú]lgara/i.test(o.text);
    const bank = gym ? BANK.map(b => b.id + '=' + b.n).concat((S.data.custom || []).map(c => c.id + '=' + c.n)).join('; ') : '';
    const prompt = 'Ordena el relato de un entrenamiento de ' + athleteDesc() + (L ? ', hoy en ' + PHASES[ST.phase].n + ': su escalera de golpeo con la ' + les + ' va por K' + L.k + ' y la de sprint por S' + L.s : '') + '.\n' +
      'Fecha: ' + o.date + (o.total ? '. Duró ' + o.total + ' min' : '') + (o.start && o.end ? ' (de ' + o.start + ' a ' + o.end + ')' : '') + (o.intensity ? '. Intensidad que marcó: ' + TT_INT_N[o.intensity] : '') + '.\n' +
      'Relato: "' + String(o.text).slice(0, 2000) + '"\n\n' +
      '1) bloques: lo que hizo en el orden en que lo cuenta. cat es la categoría; min los minutos (si no los dice, estímalos; deben sumar la duración total); pies: ambos, der, izq o ninguno (estiramiento, cabeceo o sprint sin balón: ninguno); int: baja, media o alta. Si una actividad coincide con esta lista, usa su id y su nombre: ' + acts + '.\n' +
      '2) golpesFuertes por pierna: remates, tiros libres, penales, pases largos, centros y cambios de frente. Bandas: no (ninguno), pocos (1-10), varios (10-30), muchos (más de 30). «Con ambas piernas» cuenta para las dos. Si dice «mucha definición» o la sesión es larga de remate, usa muchos. No inventes golpes con una pierna que el relato no usa.\n' +
      '3) cabezazos: solo cabezazos con salto o fuertes (mismas bandas). sprints: aceleraciones al máximo, 1 contra 1, duelos y cambios de dirección (mismas bandas). companeros: cuántos lo acompañaron (0 si entrenó solo).\n' +
      '   alMaximo: por pierna, true solo si el relato dice que esa pierna pateó al máximo (a full, a tope, al 100 %, con todo); si no lo dice, déjalo sin marcar.\n' +
      '4) rpe de 1 a 10 de la sesión entera: si marcó la intensidad, respétala (suave 4, media 6, intensa 8, al máximo 9); si no, estímala por lo que cuenta.\n' +
      '5) ejercicios: solo de gimnasio, si los hay' + (gym ? ', con el id de este banco si coincide (si no, id vacío), series, reps, kg o segundos: ' + bank : ' (aquí no hay: lista vacía)') + '.\n' +
      '6) titulo corto (máximo 48 caracteres) y nota de una línea con lo que supusiste. No inventes actividades que no están en el relato. ' + AI_STYLE;
    return this.json(prompt, TRAIN_SCHEMA, { tier: 'fast' });
  },
};

/* ---------- Ficha con IA: cómo se hace (sin salir del entrenamiento) ---------- */
function openExerciseAI(id, name) {
  const ex = exInfo(id) || { id, n: name || id };
  UI.exai = { id, busy: false, data: null, error: '' };
  openSheet({ id: 'exai-' + id, full: true, render: () => exAiHtml(ex), after: (root) => { if (ex.img) imagesFor(ex.img).then(fr => { const box = $('#exai-frames', root); if (box && fr && fr.length) { box.hidden = false; box.innerHTML = fr.slice(0, 2).map((b, i) => '<img alt="' + esc(ex.n) + ', posición ' + (i + 1) + '" src="data:image/jpeg;base64,' + b + '">').join(''); } }); } });
  loadExerciseAI(ex);
}
async function loadExerciseAI(ex, force) {
  const A = UI.exai; if (!A) return;
  const key = 'ex_' + String(ex.id || ex.n).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 80);
  if (!force) {
    try { const c = AI_CACHE[key] || await FB.get('aiCache', key); if (c && c.data) { AI_CACHE[key] = c; A.data = c.data; refreshSheet(true); return; } } catch (e) { /* sin caché */ }
  }
  A.busy = true; A.error = ''; refreshSheet(true);
  try {
    const data = await AIX.exerciseHelp(ex);
    A.data = data; AI_CACHE[key] = { data };
    put('aiCache', key, { data, n: ex.n, at: Date.now() });
  } catch (e) { A.error = aiErrorText(e); }
  A.busy = false; refreshSheet(true);
}
const AI_CACHE = {};
function exAiHtml(ex) {
  const A = UI.exai || {};
  let h = sheetHead(ex.n, 'Cómo se hace · ' + (ex.m ? esc(ex.m) : 'técnica')) + '<div class="sheet-body"><div id="exai-frames" class="frames" hidden></div>';
  if (ex.cue) h += '<div class="card flat tight"><div class="micro">Indicación del plan</div><p class="small fg2 mt-1">' + esc(ex.cue) + '</p></div>';
  if (A.busy) h += '<div class="stack-sm"><div class="row"><span class="spinner c-blue"></span><span class="small fg2">Gemini está preparando la explicación…</span></div><div class="skel sk-h54"></div><div class="skel line sk-w90"></div><div class="skel line sk-w80"></div><div class="skel line sk-w86"></div><div class="skel line sk-w60"></div></div>';
  if (A.error) h += note('warn', esc(A.error)) + '<button class="btn sm" data-act="exai-retry" data-id="' + esc(ex.id) + '">' + ic('refresh') + 'Reintentar</button>';
  const d = A.data;
  if (d) {
    h += '<p class="body">' + esc(d.resumen || '') + '</p>';
    if (d.pasos && d.pasos.length) h += '<div class="stack-sm"><div class="micro">Paso a paso</div><ol class="crit">' + d.pasos.map((p, i) => '<li><span class="mk num">' + (i + 1) + '</span><div class="small">' + esc(p) + '</div><span></span></li>').join('') + '</ol></div>';
    if (d.claves && d.claves.length) h += '<div class="stack-sm"><div class="micro">Claves</div>' + d.claves.map(c => '<div class="small fg2">' + ic('check') + ' ' + esc(c) + '</div>').join('') + '</div>';
    if (d.errores && d.errores.length) h += '<div class="stack-sm"><div class="micro">Errores comunes</div>' + d.errores.map(c => '<div class="small fg2">' + ic('x') + ' ' + esc(c) + '</div>').join('') + '</div>';
    if (d.seguridad) h += note('pain', '<b>Tu recto femoral:</b> ' + esc(d.seguridad));
    h += '<div class="sub">' + ic('spark') + ' Generado con IA. Ante dolor, para y consulta.</div>';
  }
  const q = (d && d.busqueda) || ex.n;
  h += '<div class="grid2"><a class="btn sm" href="' + ytLink(q) + '" target="_blank" rel="noopener">' + ic('play') + 'Videos</a><a class="btn sm" href="' + googleLink(q + ' exercise') + '" target="_blank" rel="noopener">' + ic('google') + 'Google</a></div>';
  if (d) h += '<button class="btn sm ghost" data-act="exai-retry" data-id="' + esc(ex.id) + '">' + ic('refresh') + 'Generar de nuevo</button>';
  return h + '</div>';
}

/* ---------- Traducir un ejercicio de la biblioteca ---------- */
async function translateLib(id) {
  const x = LIB.index && LIB.index[id]; if (!x) return;
  const note1 = $('#tr-note');
  if (!AIX.available()) { if (note1) note1.textContent = 'La traducción necesita conexión.'; return; }
  if (note1) note1.textContent = 'Traduciendo…';
  try {
    const out = await AIX.json('Traduce al español neutro el nombre y las instrucciones de este ejercicio de gimnasio. Usa el nombre habitual en gimnasios hispanohablantes.\n\nNombre: ' + x.n + '\nInstrucciones:\n' + x.ins,
      { type: 'object', properties: { n: { type: 'string' }, ins: { type: 'string', description: 'Pasos separados por saltos de línea' } }, required: ['n', 'ins'] }, { tier: 'fast' });
    if (!out || !out.n) throw { code: 'invalid' };
    await put('traducciones', id, { n: String(out.n), ins: String(out.ins || '') });
    refreshSheet(true);
  } catch (e) { if (note1) note1.textContent = aiErrorText(e); }
}

/* ---------- Coach ---------- */
/* Las escalas de 5 puntos del check-in son 1 = primer rótulo, 5 = segundo rótulo (ver checkinHtml) */
const FIVE_LABELS = {
  sleepQ: ['Mala', 'Regular', 'Normal', 'Buena', 'Excelente'],
  fatigue: ['Agotado', 'Cansado', 'Normal', 'Con energía', 'Fresco'],
  soreness: ['Mucho', 'Bastante', 'Algo', 'Poco', 'Nada'],
  stress: ['Muy alto', 'Alto', 'Medio', 'Algo bajo', 'Bajo'],
};
function fiveLabel(key, v) {
  v = num(v); if (v === null) return null;
  const L = FIVE_LABELS[key], w = L && L[clamp(Math.round(v), 1, 5) - 1];
  return v + '/5' + (w ? ' (' + w.toLowerCase() + ')' : '');
}
function coachContext(st, today) {
  const prof = st.profile;
  const exLine = (e) => (e.n || (exInfo(e.id, e) || {}).n || e.id) + (e.sets && e.sets.length ? ' ' + fmtSetsShort(e.sets.filter(x => x && x.done !== false)) : '') + (e.fb ? ' [' + e.fb + ']' : '');
  const ballLine = (d) => (d.n || (BALL_DRILL_INDEX[d.id] || {}).n || d.id) + (d.pie ? ' (' + d.pie + ')' : '') + ' ' + ballValTxt(d);
  const last14 = st.sessions.filter(s => s.date >= addDays(today, -13)).sort(byDate).map(s => ({ fecha: s.date, sesion: s.title || s.type, hecha: s.done !== false, min: s.minutes, rpe: s.rpe, intensa: isIntenseLog(s), ejercicios: (s.exercises || []).filter(e => !e.warmup).slice(0, 12).map(exLine), dolorDurante: (s.kick || s.spr || s.campo || {}).pd, dolorDiaSiguiente: (s.kick || s.spr || s.campo || {}).pn, balon: s.ball ? (s.ball.drills || []).map(ballLine) : null, canchaLibre: s.campo ? { bloques: (s.campo.bloques || []).map(b => b.n + ' ' + b.min + ' min (' + (CAMPO_PIES[b.pies] || '').toLowerCase() + ', ' + (CAMPO_INT[b.int] || '').toLowerCase() + ')'), golpesFuertesEstimados: 'derecha ' + CAMPO_BAND_N[(s.campo.golpes || {}).der || 'no'] + ', izquierda ' + CAMPO_BAND_N[(s.campo.golpes || {}).izq || 'no'], cabezazos: CAMPO_BAND_N[s.campo.cabezazos || 'no'], sprintsYDuelos: CAMPO_BAND_N[s.campo.sprints || 'no'], companeros: s.campo.companeros || 0, relato: s.campo.texto || s.notes || '' } : null }));
  const ci = (S.data.checkins || []).filter(c => c.date >= addDays(today, -6)).sort(byDate).map(c => ({ fecha: c.date, sueno: c.sleepH, calidad: fiveLabel('sleepQ', c.sleepQ), energia: fiveLabel('fatigue', c.fatigue), dolorMuscular: fiveLabel('soreness', c.soreness), estres: fiveLabel('stress', c.stress), dolorRF: c.rfPain }));
  const week = weekPlan(weekStartOf(today)).map(d => ({ fecha: d.date, intenso: d.intense, sesiones: d.sessions.map(s => s.title), ajustes: d.notes }));
  const cov = coverage(st.sessions, today, 28);
  const proj = st.injuryActive ? project(st, today) : null;
  const ag = agendaFor(today);
  return {
    hoy: today, hora: fmtHM(nowMin()),
    perfil: { nombre: prof.name, edad: ageFrom(prof.birth, today), alturaCm: prof.heightCm, pesoKg: st.weight, posicion: prof.position, pieHabil: prof.foot, objetivo: prof.goalText, fechaObjetivo: prof.targetDate, objetivoFecha: prof.targetText, pruebas: prof.trials || [] },
    lesion: st.injury ? { zona: st.injury.zone, lado: st.injury.side === 'i' ? 'izquierdo' : 'derecho', fecha: st.injury.date, localizacion: st.injury.location, ecografia: (st.injury.imaging || []).map(i => i.text), mecanismo: st.injury.mechanism, recaidas: st.injury.recurrences } : null,
    fase: st.injury ? PHASES[st.phase].n + ' ' + PHASES[st.phase].t : 'Rendimiento',
    criteriosSiguienteFase: st.criteria ? st.criteria.items.map(i => ({ criterio: i.label, cumplido: i.ok, dato: i.detail, obligatorio: i.req })) : null,
    pretemporada: (() => { const bi = blockInfo(st, today); return bi ? { desde: bi.b.desde, hasta: bi.end, prueba: bi.trial, dia: bi.day, total: bi.total, fase: bi.fase, enfoque: 'resistencia intermitente (10/10, 4×4 con balón, 15/15), velocidad, agilidad, potencia y balón; afinamiento desde P-6' } : null; })(),
    enfermedad: (() => { const sk = sickOn(st, today), rr = sickReturn(st, today), last = sickRanges(st).slice(-1)[0]; return sk || rr || (last && last.to >= addDays(today, -14)) ? { enfermoHoy: !!sk, vuelta: rr ? { dia: rr.day, de: rr.n } : null, ultima: last || null } : null; })(),
    golpeoDemostradoEnCancha: st.kick.demo ? { nivel: 'K' + st.kick.demo.level, fecha: st.kick.demo.date } : null,
    cargaDeMas: (() => { const c = carryRule(st, today, today); return c ? { nivel: c.tier, carga: c.load, fecha: c.date, regla: c.note } : null; })(),
    niveles: { golpeo: 'K' + st.kick.level + ' (' + st.kick.streak + '/' + st.kick.req + ')', sprint: 'S' + st.sprint.level + ' (' + st.sprint.streak + '/' + st.sprint.req + ')', rt: RT_LEVELS[st.rt.idx] },
    ultimoTest: st.test, entrePiernasEntrenamiento: trainingLSI(st.sessions, st.side), checkins7dias: ci, sesiones14dias: last14, planSemana: week,
    agendaHoy: ag.items.filter(x => !x.marker).map(x => fmtHM(x.start) + ' ' + x.title + (x.sub ? ' (' + x.sub + ')' : '')),
    sinRegistrar: pendingItems(today).map(p => (p.date === today ? '' : 'ayer ') + fmtHM(p.it.start) + ' ' + pendTitle(p)),
    patronesSinEstimulo28dias: coverageGaps(cov, st).map(p => LABELS.pat[p]),
    molestias14dias: (S.data.molestias || []).filter(m => m && !m.deleted && m.fecha >= addDays(today, -13)).map(m => ({ fecha: m.fecha, zona: zoneName(m.zona, m.lado), tipo: m.tipo, nivel: m.nivel, nota: m.nota || '', resuelta: !!m.resuelta, seguimiento: (m.updates || []).map(u => u.fecha + ' ' + u.estado + ' ' + u.nivel + '/10') })),
    molestiasActivasHoy: activeMolestias(st, today).map(m => zoneName(m.zona, m.lado) + ' ' + m.tipo + ' ' + m.nivelAct + '/10'),
    patronesMolestias: molestiaInsights(st, today).map(x => zoneName(x.zona, x.lado) + ': ' + x.n + ' días con molestia en 14 · ' + x.tip),
    seriesPorGrupoSemana: (() => { const ws = weekStartOf(today), led = muscleLedger(st, ws, today, weekPlan(ws)); return groupGaps(led, st.phase).map(g => g.n + ': ' + g.have + ' (objetivo ' + g.lo + '-' + g.hi + ')'); })(),
    balon: { recordsPorEstacion: BALL_DRILLS.map(d => { const b = ballBest(st.sessions, d.id, null); return b ? d.n + ': ' + fmtNum(b.val) + ' ' + d.unit + ' (' + b.date + ')' : null; }).filter(Boolean), minutosPorSemana: ballMinutesByWeek(st.sessions, today, 4).map(w => w.start + ': ' + w.min + ' min'), cabezazosFuerzaAltaSemana: ballHeaderCount(st.sessions, weekStartOf(today)) + '/' + BALL_HEADER_CAP, reglaDerecha: 'Derecha solo interior y control; empeine por la escalera K; voleas y centros con la derecha desde K7', canchaLibre: 'Las sesiones de cancha libre registran golpes fuertes por bandas estimadas (pocos ≈ 8, varios ≈ 20, muchos ≈ 40), no conteos: no cuentan para subir de nivel K ni S' },
    proyeccion: proj ? { F4: proj.phases[4] || null, K8: proj.k8, S6: proj.s6, listoParaPruebas: proj.phases[5] || null } : null,
    estadoHoy: (() => { const ds = dayStatus(st, today); return { nivel: ds.level, motivos: ds.reasons, puntaje: ds.score, mediaPersonal28dias: ds.baseline ? ds.baseline.mean : null }; })(),
    carga: (() => { const lm = loadModel(st, today); return { ultimos7dias: lm.week, semanaAnterior: lm.prevWeek, aguda7: lm.acute, cronica28: lm.chronic, cociente: lm.ratio }; })(),
    sueno: (() => { const d = sleepDebt(st, today); return { deuda7noches: d.debt, objetivoH: d.target, nochesRegistradas: d.nights }; })(),
    rematesFuertesSemana: (() => { const w = shotsWeek(st.sessions, weekStartOf(today)); return { piernaSana: w.sana, topePiernaSana: sanaShotCap(st.sessions, weekStartOf(today)), piernaLesionada: w.les }; })(),
    deudaSesiones: weekPlan(weekStartOf(today)).filter(d => d.debtFrom).map(d => d.date + ' recupera la sesión del ' + d.debtFrom),
    aprendizaje: aprendeCoachCtx(today),
  };
}
const COACH_RULES = 'Eres preparador físico y readaptador de élite en fútbol profesional. Tu tema es el entrenamiento, la recuperación, el sueño y las molestias; la alimentación no está en la app. Hablas directamente con el atleta (sus datos están en el JSON). Responde en español neutro, directo, conciso, frío, realista y práctico. Sin relleno. Usa solo los datos del JSON; si falta un dato que cambia la respuesta, dilo en una línea. No diagnostiques: ante dolor que no baja o empeora, deriva a un profesional. Respeta la progresión por criterios: nunca recomiendes saltar niveles de golpeo o sprint ni adelantar fases sin cumplir los criterios. Formato: párrafos cortos o listas breves en texto plano, sin tablas ni markdown pesado. Si pregunta por un tema que ya investigó en la app (aprendizaje.investigaciones), usa esa respuesta y su nivel de evidencia y dilo («según tu investigación del …»); no inventes estudios, autores ni cifras. Lo que marcó en «Lo aplico» son hábitos que adoptó: tenlos en cuenta.';
/* Atajo con la próxima prueba del perfil (o el objetivo) */
function coachTrialAsk(st, today) {
  const next = ((st.profile || {}).trials || []).filter(t => t >= today).sort()[0] || ((st.profile || {}).targetDate >= today ? st.profile.targetDate : null);
  return ['¿Llego a las pruebas?', next ? '¿Llego bien a la prueba del ' + fmtDateLong(next) + '? ¿Qué es lo que más me puede frenar y qué ajusto?' : '¿Cómo voy hacia mi objetivo? ¿Qué es lo que más me puede frenar?'];
}
function viewCoach(st, today) {
  const C = UI.coach;
  let h = '<div class="aura" aria-hidden="true"></div><div class="page-head"><a class="iconbtn" href="#hoy" aria-label="Volver">' + ic('chevL') + '</a><h1 class="h1 grow">Coach</h1>' + (C.turns.length ? '<button class="btn xs ghost" data-act="coach-clear">Borrar</button>' : '') + '</div>';
  h += '<section class="card coach-intro"><div class="stack"><p class="body">Lee tu lesión, tests, check-ins, sesiones y molestias, y responde.</p>' +
    '<div class="scroll-x">' + [['Analiza mi semana', 'Analiza mi situación y la semana. Dime: 1) estado en 2-3 líneas, 2) riesgos concretos, 3) ajustes para los próximos 7 días (máximo 5), 4) qué datos me faltan registrar.'],
      ['¿Qué ajusto hoy?', '¿Qué ajusto hoy según mi check-in, lo que hice ayer y la agenda de hoy?'], ['¿Por qué cambió mi plan?', '¿Por qué el plan de hoy es así? Explícame cada ajuste (molestias, sueño, carga, pretemporada) en una línea.'], coachTrialAsk(st, today)]
      .map(([l, q]) => '<button class="pill" data-act="coach-ask" data-q="' + esc(q) + '" data-l="' + esc(l) + '"' + (C.busy ? ' disabled' : '') + '>' + esc(l) + '</button>').join('') + '</div>' +
    (C.unavailable ? note('warn', 'La IA no está disponible ahora. Revisa la conexión.') : '') + '</div></section>';
  if (C.turns.length) h += '<section class="stack" aria-live="polite">' + C.turns.map(t => '<div class="msg ' + (t.role === 'user' ? 'me' : 'cl') + (t.pending ? ' pending' : '') + '">' + esc(t.show || t.content) + '</div>').join('') + '</section>';
  h += '<section class="composer"><div class="stack-sm"><label class="sr" for="coach-q">Pregunta</label><textarea class="input" id="coach-q" data-bind="coach-q" rows="3" placeholder="¿Puedo hacer sentadilla pesada esta semana?">' + esc(C.draft || '') + '</textarea><div class="row between"><button class="btn primary" data-act="coach-send"' + (C.busy ? ' disabled' : '') + '>' + ic('spark') + 'Preguntar</button>' + (C.busy ? '<button class="btn ghost" data-act="coach-stop">Detener</button>' : '') + '</div></div></section>';
  return h;
}
async function coachAsk(text, show) {
  const C = UI.coach;
  if (!AIX.available()) { C.unavailable = true; scheduleRender(); return; }
  C.unavailable = false;
  C.turns.push({ role: 'user', content: text, show: show || text });
  const answer = { role: 'model', content: 'Pensando…', pending: true };
  C.turns.push(answer); C.busy = true; C.ctl = new AbortController(); scheduleRender();
  const history = C.turns.filter(t => !t.pending && !t.failed).map(t => ({ role: t.role === 'user' ? 'user' : 'model', text: t.content }));
  try {
    const res = await FB.ai.stream({ system: COACH_RULES + '\n\nDATOS DE LA APP (JSON):\n' + JSON.stringify(coachContext(ST, todayStr())), history, signal: C.ctl.signal, onText: (txt) => { answer.content = txt; const els = $$('.msg.cl'); if (els.length) { const el = els[els.length - 1]; el.textContent = txt; el.classList.remove('pending'); } } });
    answer.content = res || answer.content; answer.pending = false;
  } catch (e) {
    answer.pending = false;
    if (e && e.name === 'AbortError') answer.content = (answer.content === 'Pensando…' ? '' : answer.content) + '\n(Detenido.)';
    else { answer.content = aiErrorText(e); answer.failed = true; }
  }
  C.busy = false; C.ctl = null; scheduleRender();
}
