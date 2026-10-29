/* ============================================================
   FICHAS DE EJERCICIO, BIBLIOTECA, EJERCICIOS PROPIOS Y GUÍAS
   ============================================================ */
function openExercise(id) {
  const ex = exInfo(id); if (!ex) return;
  if (ex.lib && !BANK_INDEX[id] && !(S.data.custom || []).some(c => c.id === id)) { openLibExercise(id); return; }
  openSheet({ id: 'ex-' + id, render: () => exerciseHtml(id), after: (root) => { if (ex.img) imagesFor(ex.img).then(fr => { const box = $('#ex-frames', root); if (box && fr && fr.length) { box.hidden = false; box.innerHTML = fr.map((b, i) => '<img alt="' + esc(ex.n) + ', posición ' + (i + 1) + '" src="data:image/jpeg;base64,' + b + '">').join(''); } }); } });
}
function exerciseHtml(id) {
  const ex = exInfo(id), st = ST;
  const allowed = !st.injuryActive || exEligible(ex, { phase: st.phase, injuryActive: true });
  const choices = (S.data.settings && S.data.settings.choices) || {};
  const slots = (ex.s || []).filter(s => SLOT_NAMES[s]);
  const lp = lastPerf(id, st.sessions);
  let h = sheetHead(ex.n, esc([LABELS.pat[ex.pat], LABELS.c[ex.c]].filter(Boolean).join(' · '))) + '<div class="sheet-body"><div id="ex-frames" class="frames" hidden></div>';
  if (st.injuryActive) h += allowed ? note('good', 'Permitido en ' + PHASES[st.phase].n + '.') : note('warn', 'Se abre en ' + PHASES[ex.f].n + '. Hoy estás en ' + PHASES[st.phase].n + '.');
  if (ex.cue) h += '<p class="body">' + esc(ex.cue) + '</p>';
  if (ex.why) h += '<div class="card flat tight"><div class="micro">Por qué</div><p class="small fg2" style="margin-top:4px">' + esc(ex.why) + '</p></div>';
  h += '<button class="btn block" data-act="ex-ai" data-id="' + esc(id) + '">' + ic('spark') + 'Cómo se hace, paso a paso (IA)</button>';
  if (lp) h += '<div class="target"><span>Última vez · ' + fmtDate(lp.date) + '</span><b>' + esc(fmtSetsShort(lp.sets)) + '</b></div>';
  h += '<dl class="kv"><dt>Músculos</dt><dd>' + esc(ex.m || '—') + '</dd><dt>Contracción</dt><dd>' + esc(LABELS.c[ex.c] || '—') + '</dd><dt>Zonas</dt><dd>' + esc((ex.z || []).map(z => LABELS.z[z]).filter(Boolean).join(', ') || '—') + '</dd><dt>Fatiga</dt><dd>' + (ex.k || '—') + ' de 5</dd><dt>Equipo</dt><dd>' + esc((ex.eq || []).join(', ') || '—') + '</dd></dl>';
  const rel = [['Progresión', ex.prog], ['Regresión', ex.reg]].filter(([, v]) => v && BANK_INDEX[v]);
  if (rel.length) h += '<div class="stack-sm">' + rel.map(([l, v]) => '<button class="blk" data-act="ex" data-id="' + v + '"><span class="c ' + (l === 'Progresión' ? 'lime' : 'load') + '">' + ic(l === 'Progresión' ? 'up' : 'down') + '</span><div class="grow"><div class="s">' + l + '</div><div class="t">' + esc(BANK_INDEX[v].n) + '</div></div>' + ic('chev') + '</button>').join('') + '</div>';
  const alts = (ALT[id] || []).map(a => BANK_INDEX[a]).filter(Boolean);
  if (alts.length) h += '<div class="field"><span class="lab">Si la máquina está ocupada</span><div class="stack-sm">' + alts.map(a => '<button class="blk" data-act="ex" data-id="' + a.id + '"><span class="c">' + ic('swap') + '</span><div class="grow"><div class="t">' + esc(a.n) + '</div><div class="s">' + esc((a.eq || []).join(', ')) + '</div></div>' + ic('chev') + '</button>').join('') + '</div></div>';
  if (slots.length) h += '<div class="field"><span class="lab">Usarlo en mi plan como</span><div class="pills">' + slots.map(s => '<button type="button" class="pill' + (choices[s] === ex.id ? ' on' : '') + '" data-act="choose" data-slot="' + s + '" data-id="' + esc(ex.id) + '" aria-pressed="' + (choices[s] === ex.id) + '">' + esc(SLOT_NAMES[s]) + '</button>').join('') + '</div></div>';
  h += '<div class="grid2"><a class="btn sm" href="' + ytLink(ex.n) + '" target="_blank" rel="noopener">' + ic('play') + 'YouTube</a><a class="btn sm" href="' + googleLink(ex.n + ' ejercicio') + '" target="_blank" rel="noopener">' + ic('google') + 'Google</a></div>' +
    (ex.custom ? '<button class="btn sm danger" data-act="del-custom" data-id="' + esc(ex.id) + '">' + ic('trash') + 'Borrar ejercicio</button>' : '');
  return h + '</div>';
}
function openLibExercise(id) {
  loadLib().then(() => {
    const x = LIB.index[id]; if (!x) return;
    openSheet({ id: 'lib-' + id, render: () => libHtml(id), after: (root) => imagesFor(id).then(fr => { const box = $('#ex-frames', root); if (box && fr && fr.length) { box.hidden = false; box.innerHTML = fr.map((b, i) => '<img alt="' + esc(x.n) + ', posición ' + (i + 1) + '" src="data:image/jpeg;base64,' + b + '">').join(''); } }) });
  });
}
function libHtml(id) {
  const x = LIB.index[id], t = (S.data.traducciones || []).find(d => d.id === id);
  const ins = (t ? t.ins : x.ins) || '';
  return sheetHead(t ? t.n : x.n, esc((t ? x.n + ' · ' : '') + [LIB_ES.category[x.c], LIB_ES.level[x.l]].filter(Boolean).join(' · '))) + '<div class="sheet-body"><div id="ex-frames" class="frames" hidden></div>' +
    '<div class="row">' + (x.pm || []).map(m => chip(LIB_ES.muscles[m] || m, 'blue')).join('') + (x.sm || []).map(m => chip(LIB_ES.muscles[m] || m, '')).join('') + '</div>' +
    '<div class="stack-sm">' + ins.split('\n').filter(Boolean).map(p => '<p class="small fg2">' + esc(p) + '</p>').join('') + '</div>' +
    '<p class="sub" id="tr-note">' + (t ? 'Traducción guardada.' : 'Instrucciones originales en inglés.') + '</p>' +
    '<div class="grid2">' + (t ? '<span></span>' : '<button class="btn sm" data-act="translate" data-id="' + esc(id) + '">' + ic('spark') + 'Traducir</button>') + '<button class="btn sm primary" data-act="lib-add" data-id="' + esc(id) + '">' + ic('plus') + 'A mi banco</button></div>' +
    '<a class="btn sm ghost block" href="' + ytLink(x.n) + '" target="_blank" rel="noopener">' + ic('play') + 'Ver técnica</a></div>';
}
function openCustom(fromLib) {
  const x = fromLib && LIB.index ? LIB.index[fromLib] : null;
  const t = fromLib ? (S.data.traducciones || []).find(d => d.id === fromLib) : null;
  const cls = x ? classifyLib(x) : null;
  UI.cx = { n: t ? t.n : x ? x.n : '', pat: cls ? cls.pat : 'sentadilla', c: cls ? cls.c : 'mixta', lat: cls ? cls.lat : 'B', fv: cls ? cls.fv : 'FM', f: 3, k: cls ? cls.k : 3, z: cls ? cls.z.slice() : [], s: [], cue: t ? (t.ins || '').split('\n')[0] : '', img: fromLib || null, m: x ? (x.pm || []).map(m => LIB_ES.muscles[m] || m).join(', ') : '', eq: cls ? cls.eq : [] };
  openSheet({ id: 'custom', full: true, render: customHtml });
}
function customHtml() {
  const c = UI.cx;
  const sel = (name, obj, val, label) => '<div class="field"><label for="cx-' + name + '">' + label + '</label><select class="input" id="cx-' + name + '" data-bind="cx" data-name="' + name + '">' + Object.entries(obj).map(([k, v]) => '<option value="' + esc(k) + '"' + (String(k) === String(val) ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></div>';
  return sheetHead('Ejercicio propio', 'Etiquétalo para que el motor sepa cuándo usarlo') + '<div class="sheet-body">' +
    '<div class="field"><label for="cx-n">Nombre</label><input class="input" id="cx-n" data-bind="cx" data-name="n" value="' + esc(c.n) + '" autocomplete="off"></div>' +
    '<div class="grid2">' + sel('pat', LABELS.pat, c.pat, 'Patrón') + sel('c', LABELS.c, c.c, 'Contracción') + '</div>' +
    '<div class="grid2">' + sel('lat', LABELS.lat, c.lat, 'Lateralidad') + sel('fv', LABELS.fv, c.fv, 'Fuerza-velocidad') + '</div>' +
    '<div class="grid2">' + sel('f', { 1: 'F1', 2: 'F2', 3: 'F3', 4: 'F4', 5: 'F5' }, c.f, 'Fase mínima con lesión') + sel('k', { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5' }, c.k, 'Fatiga (1-5)') + '</div>' +
    '<div class="field"><span class="lab">Zonas</span><div class="pills">' + Object.entries(LABELS.z).map(([k, v]) => '<button type="button" class="pill' + (c.z.includes(k) ? ' on' : '') + '" data-act="cx-multi" data-f="z" data-v="' + k + '">' + esc(v) + '</button>').join('') + '</div></div>' +
    '<div class="field"><span class="lab">Huecos del plan que puede ocupar</span><div class="pills">' + Object.entries(SLOT_NAMES).map(([k, v]) => '<button type="button" class="pill' + (c.s.includes(k) ? ' on' : '') + '" data-act="cx-multi" data-f="s" data-v="' + k + '">' + esc(v) + '</button>').join('') + '</div></div>' +
    '<div class="field"><label for="cx-cue">Indicación técnica</label><textarea class="input" id="cx-cue" data-bind="cx" data-name="cue" rows="2">' + esc(c.cue) + '</textarea></div>' +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="cx-save">Guardar ejercicio</button></div></div>';
}
function saveCustom() {
  const c = UI.cx;
  if (!c.n.trim()) { toast('Escribe un nombre.', 'warn'); return; }
  put('custom', uid('c'), { n: c.n.trim(), pat: c.pat, c: c.c, lat: c.lat, fv: c.fv, f: Number(c.f), k: Number(c.k), z: c.z, s: c.s, eq: c.eq || [], pl: 'S', m: c.m, cue: c.cue, img: c.img, custom: true }).then(() => toast('Ejercicio añadido a tu banco.'));
  closeSheet();
}

/* ---------- Guías ---------- */
const EVIDENCE = [
  { lvl: 'Alta', cls: 'good', items: [
    ['Sueño de 9 h o más', 'Tu horario de 21:30 a 7:30 es ideal. Habitación oscura y fresca, sin pantallas 30-60 min antes.'],
    ['Proteína 2 g/kg al día', 'En 4-5 tomas de ~35 g. Proteína lenta antes de dormir en días de mucha carga.'],
    ['Carbohidratos según la carga', 'Más en días dobles y antes de pruebas; menos en descanso.'],
    ['Creatina 3-5 g al día', 'La mejor evidencia para fuerza y potencia. Ayuda a conservar músculo en la rehabilitación.'],
    ['Carga progresiva', 'Ninguna técnica de recuperación reemplaza que el tejido tolere más carga.'],
  ] },
  { lvl: 'Moderada', cls: 'warn', items: [
    ['Respiración con exhalación larga', '5 min después de entrenar: pasa a modo recuperación.'],
    ['Baño de agua fría', 'Solo tras partidos o semanas muy cargadas (10-15 °C, 10-15 min). Nunca en las horas siguientes a la fuerza: frena la ganancia. Beber agua fría no tiene problema.'],
    ['Siesta de 20-30 min', 'Antes de las 15:00. Mejora el rendimiento de la tarde sin quitar sueño de noche.'],
    ['Omega-3', 'Pescado 2-3 veces por semana. Efecto modesto sobre dolor e inflamación.'],
    ['Cafeína 3 mg/kg', 'Antes de pruebas o sesiones clave, solo si ya la tomas. No después de las 14:00.'],
  ] },
  { lvl: 'Baja', cls: '', items: [
    ['Gelatina + vitamina C', '15 g de gelatina con una naranja, 30-60 min antes de cargar el recto femoral. Evidencia temprana para tendones.'],
    ['Masaje y compresión', 'Mejoran la sensación; efecto fisiológico modesto. Nada profundo sobre la lesión.'],
  ] },
  { lvl: 'Evitar', cls: 'pain', items: [
    ['Antiinflamatorios de rutina', 'Interfieren con la reparación del tejido. Solo con indicación médica.'],
    ['Alcohol', 'Baja la síntesis de proteína y empeora el sueño 24-48 h.'],
    ['Estirar fuerte la lesión', 'La longitud del recto femoral se gana con carga excéntrica e isométrica en rango largo, no con estiramientos agresivos.'],
  ] },
];
function openGuide(g) { openSheet({ id: 'guide-' + g, full: ['prueba', 'recuperacion', 'nutricion', 'fks'].includes(g), render: () => guideHtml(g), onClose: () => { if (g === 'respiracion') stopBreath(true); } }); }
function evidenceList(groups) {
  return groups.map(gr => '<div class="stack-sm">' + chip(gr.lvl === 'Evitar' || gr.lvl === 'Seguridad' ? gr.lvl : 'Evidencia ' + gr.lvl.toLowerCase(), gr.cls === 'good' ? 'lime' : gr.cls === 'warn' ? 'warn' : gr.cls === 'pain' ? 'pain' : '') + '<ul class="crit">' + gr.items.map(([a, b]) => '<li><span class="mk' + (gr.cls === 'good' ? ' ok' : gr.cls === 'pain' ? ' pain' : '') + '">' + ic(gr.cls === 'pain' ? 'x' : 'check') + '</span><div class="small"><b>' + esc(a) + '</b><div class="fg3">' + esc(b) + '</div></div><span></span></li>').join('') + '</ul></div>').join('');
}
function guideHtml(g) {
  const kg = ST && ST.weight;
  if (g === 'respiracion') return sheetHead('Respiración guiada', 'Pasa a modo recuperación') + '<div class="sheet-body">' + breathWidget() + '</div>';
  if (g === 'recuperacion') return sheetHead('Recuperación por evidencia') + '<div class="sheet-body">' + evidenceList(EVIDENCE) + '</div>';
  if (g === 'nutricion') return sheetHead('Nutrición por evidencia', 'Para tu dieta natural, sin harinas ni azúcar') + '<div class="sheet-body">' + evidenceList(NUTRI_GUIDE) + '</div>';
  if (g === 'fks') return sheetHead('Qué significan F, K y S') + '<div class="sheet-body">' + fksExplain(ST) + '</div>';
  if (g === 'prueba') {
    const c1 = kg ? Math.round(kg * 1 / 5) * 5 + '-' + Math.round(kg * 2 / 5) * 5 + ' g' : '1-2 g/kg';
    const caf = kg ? Math.round(kg * 3 / 10) * 10 + ' mg' : '3 mg/kg';
    const fl = kg ? Math.round(kg * 5) + '-' + Math.round(kg * 7) + ' ml' : '5-7 ml/kg';
    const rows = [
      ['48-24 h antes', ['Carbohidratos altos: 6-8 g/kg al día (mandioca, arroz, papa, frutas, miel).', 'Sueño de 9 h las dos noches.', 'El día anterior, solo activación de 20-25 min.']],
      ['3-4 h antes', ['Comida con ' + c1 + ' de carbohidratos, proteína moderada, poca grasa y fibra. Ej.: arroz, pollo y banana.', 'Agua: ' + fl + '.', 'Jugo de remolacha 500 ml 2-3 h antes.']],
      ['60-90 min antes', ['Snack de 30-60 g de carbohidratos si tienes hambre: banana con miel.', 'Cafeína ' + caf + ' solo si ya la tomas.']],
      ['Calentamiento 20-25 min', ['Trote y movilidad dinámica.', 'Isometría de recto femoral 2 × 20 s.', 'Aceleraciones y cambios de dirección.', 'Golpeo progresivo 50, 70 y 85 %, solo si completaste K8.']],
      ['Durante', ['Agua con una pizca de sal.', 'Entre partidos: 30-60 g de carbohidratos por hora (banana, miel).']],
      ['Después', ['Carbohidratos 1-1,2 g/kg por hora las primeras 3-4 h y ' + (kg ? Math.round(kg * 0.4) + ' g' : '0,4 g/kg') + ' de proteína.', 'Repón 1,25-1,5 L por cada kg perdido.', 'Agua fría 10-15 min: acá sí sirve.', 'Mañana: check-in y dolor del recto femoral.']],
    ];
    const ready = !ST.injuryActive || ST.phase >= 5;
    return sheetHead('Día de prueba', 'Antes, durante y después') + '<div class="sheet-body">' + (ready ? '' : note('warn', 'Todavía estás en ' + PHASES[ST.phase].n + '. Jugar a máxima intensidad requiere F5.')) +
      rows.map(([t, items]) => '<div class="stack-sm"><div class="h3">' + t + '</div><ul class="crit">' + items.map(x => '<li><span class="mk ok">' + ic('check') + '</span><div class="small fg2">' + esc(x) + '</div><span></span></li>').join('') + '</ul></div>').join('') +
      '<p class="sub">Agrega las fechas de tus pruebas en Perfil: el plan ajusta los días anteriores y el posterior.</p></div>';
  }
  if (g === 'balon') {
    const L = effLevels(ST), les = ST.side === 'i' ? 'izquierda' : 'derecha', sana = ST.side === 'i' ? 'derecha' : 'zurda';
    return sheetHead('Guía de balón', 'Estaciones técnicas en la cancha') + '<div class="sheet-body">' +
      '<div class="stack-sm"><div class="h3">Cómo funciona</div><ul class="crit">' + [
        ['Estaciones', 'Cada día tiene un foco: lunes pase y conducción, martes ' + sana + ' y cabeceo, miércoles sesión larga de 45 min, jueves dominio y ' + sana + ', viernes control orientado y sábado cabeceo.'],
        ['Registro', 'Récord (mejor intento), cantidad en un tiempo (tandas de 30 s), cronómetro (menos es mejor) o aciertos sobre intentos. Las marcas nuevas salen en lima.'],
        ['No suma intensidad', 'El balón no cuenta como día intenso para el recto femoral. Si la cancha pasa de 90 min, se recorta primero el RT y después el balón; golpeo y sprint no se tocan.'],
      ].map(([a, b]) => '<li><span class="mk ok">' + ic('check') + '</span><div class="small"><b>' + a + '</b><div class="fg3">' + b + '</div></div><span></span></li>').join('') + '</ul></div>' +
      '<div class="stack-sm"><div class="h3">Reglas de la ' + les + '</div><ul class="crit">' + [
        ['Desde ya', 'Dominio, control y pase con interior.'],
        ['Empeine', 'Solo dentro del golpeo, según la escalera K (hoy K' + L.k + ').'],
        ['Voleas y centros', 'Desde K7' + (L.k >= 7 ? ': habilitado.' : '.')],
      ].map(([a, b]) => '<li><span class="mk">' + ic('info') + '</span><div class="small"><b>' + a + '</b><div class="fg3">' + b + '</div></div><span></span></li>').join('') + '</ul></div>' +
      note('warn', '<b>Cabeceo de fuerza alta:</b> máximo ' + BALL_HEADER_CAP + ' cabezazos por semana entre lo planificado y lo registrado. El cabeceo técnico, sin salto, no cuenta.') +
      '<div class="stack-sm"><div class="h3">Estaciones</div>' + BALL_DRILLS.map(d => '<div class="lrow"><span class="fg2"><b>' + esc(d.n) + '</b> ' + chip(ballFootLabel(ballSideFoot(d.foot, ST.side)), '') + (d.header === 'alta' ? ' ' + chip('fuerza alta', 'load') : '') + '<br><span class="fg3">' + esc(d.d) + '</span></span></div>').join('') + '</div></div>';
  }
  if (g === 'porque') return sheetHead('Por qué este plan') + '<div class="sheet-body"><div class="h2">El músculo se rompe largo. Se entrena largo.</div>' +
    '<p class="body">El recto femoral cruza la cadera y la rodilla. Al armar el golpe la cadera se extiende y la rodilla se flexiona: el músculo está en su máxima longitud justo antes de contraerse a máxima velocidad. ' + (ST.injury && (ST.injury.recurrences || 0) > 1 ? 'Ahí te lesionaste ' + (ST.injury.recurrences === 3 ? 'las tres veces' : 'las ' + ST.injury.recurrences + ' veces') + '.' : 'Ahí se produce la lesión al patear.') + '</p>' +
    '<p class="body">En la extensora sentado, la cadera está flexionada y el músculo trabaja corto. Da fuerza de cuádriceps, pero no prepara esa posición. Por eso el plan prioriza Reverse Nordic, isometrías en zancada con la cadera extendida y flexión de cadera con polea desde atrás.</p>' +
    '<p class="body">Las lesiones sobre el tendón central tardan más y recaen más. La progresión por criterios cierra la brecha entre lo que el músculo tolera y lo que le pide el partido.</p></div>';
  return '';
}
function fksExplain(st) {
  const K = st.kick, Sp = st.sprint;
  const row = (b, cls, t, d) => '<div class="row-x"><div class="badge ' + cls + '">' + b + '</div><div class="stack-xs"><div class="h3">' + t + '</div><div class="small fg2">' + d + '</div></div></div>';
  return '<div class="explain">' +
    row('F' + st.phase, 'f', 'F = Fase de la rehabilitación', 'Seis fases, de F1 (proteger) a F6 (rendimiento). Pasas a la siguiente solo cuando cumples sus criterios: tests y niveles. Ahora estás en <b>' + PHASES[st.phase].n + ' · ' + esc(PHASES[st.phase].t) + '</b>.') +
    row('K' + K.level, 'k', 'K = Nivel de golpeo', 'Ocho niveles, de pases suaves (K1) a remates al 100 % con fatiga (K8). Ahora: <b>' + esc(KICK[K.level].t) + '</b>. Subes con sesiones limpias.') +
    row('S' + Sp.level, 's', 'S = Nivel de sprint', 'Seis niveles, de sprints al 60-70 % (S1) a velocidad máxima con cambios de dirección (S6). Ahora: <b>' + esc(SPRINT[Sp.level].t) + '</b>.') +
    row('RT', 'r', 'RT = Esfuerzos repetidos', 'Circuito de conducción intensa y vuelta trotando. Sube tras 2 sesiones con esfuerzo ≤ 7.') +
    row('%', 'l', '% entre piernas', 'Fuerza o salto de la pierna lesionada dividido la sana. Meta: 90 % o más.') +
    '</div>' + note('blue', '<b>Sesión limpia:</b> dolor ≤ 2 durante y 0 al día siguiente. Con dolor 3 o más bajas un nivel. K5, K7, S4 y S6 piden dos limpias seguidas porque son los umbrales donde te lesionaste.');
}
function breathWidget() {
  const b = UI.breath || {};
  return '<div class="stack" style="justify-items:center;text-align:center"><div class="ring" style="width:220px;height:220px"><div id="breath-core" style="width:90px;height:90px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#d7cbff,#7650f0 70%);box-shadow:0 0 60px rgba(157,125,255,.6);transition:transform 4s cubic-bezier(.45,0,.55,1)"></div><div class="in"><span class="h2" id="breath-txt">' + (b.running ? esc(b.label || '') : 'Listo') + '</span></div></div>' +
    '<div class="seg" style="width:100%">' + [6, 7, 8].map(x => '<button type="button" class="' + ((b.ex || 6) === x ? 'on' : '') + '" data-act="breath-ex" data-v="' + x + '">4 / ' + x + ' s</button>').join('') + '</div>' +
    '<button class="btn ' + (b.running ? '' : 'primary') + ' lg block" data-act="breath">' + (b.running ? 'Detener' : 'Empezar 5 min') + '</button><span class="sub num" id="breath-left">' + (b.running ? '' : 'Inhala 4 s · exhala ' + (b.ex || 6) + ' s') + '</span></div>';
}
function startBreath() {
  ensureAudio();
  const ex = (UI.breath && UI.breath.ex) || 6;
  UI.breath = { running: true, ex, phase: 'in', end: Date.now() + 5 * 60000 };
  requestWake(); refreshSheet(true); setTimeout(breathTick, 60);
}
function breathTick() {
  const b = UI.breath; if (!b || !b.running) return;
  const core = $('#breath-core'), txt = $('#breath-txt'), left = $('#breath-left');
  const rem = Math.max(0, b.end - Date.now());
  if (rem <= 0 || !core) { stopBreath(); if (rem <= 0) { beep(2, 660); toast('Respiración completada.'); } return; }
  const inhale = b.phase === 'in', dur = inhale ? 4 : b.ex;
  b.label = inhale ? 'Inhala' : 'Exhala';
  core.style.transitionDuration = dur + 's'; core.style.transform = inhale ? 'scale(2.1)' : 'scale(1)';
  if (txt) txt.textContent = b.label;
  if (left) left.textContent = mmss(rem / 1000) + ' restantes';
  b.phase = inhale ? 'out' : 'in';
  b.timer = setTimeout(breathTick, dur * 1000);
}
function stopBreath(silent) {
  const b = UI.breath; if (!b) return;
  clearTimeout(b.timer); if (!TR.open) releaseWake();
  UI.breath = { running: false, ex: b.ex };
  if (!silent) refreshSheet(true);
}
