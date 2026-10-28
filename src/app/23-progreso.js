/* ============================================================
   PROGRESO: fase y criterios, niveles, tests, sueño, carga, cobertura, peso
   ============================================================ */
function viewProgreso(st, today) {
  if (!S.data.profile) return onboarding();
  let h = '<div class="page-head"><h1 class="h1 grow">Progreso</h1><button class="iconbtn" data-act="guide" data-g="fks" aria-label="Qué significan F, K y S">' + ic('info') + '</button><a class="iconbtn glow" href="#coach" aria-label="Coach con IA">' + ic('spark') + '</a></div>';
  const inj = st.injury;
  if (inj) {
    const since = diffDays(today, inj.date), crit = st.criteria;
    h += '<section class="hero" style="min-height:236px">' + photoImg('f2') + '<span class="tag"><span class="d"></span>' + esc(inj.zone) + ' ' + (inj.side === 'i' ? 'izquierdo' : 'derecho') + ' · día ' + since + '</span>' +
      '<div class="t">' + PHASES[st.phase].n + ' · ' + esc(PHASES[st.phase].t) + '</div><div class="meta">' + (crit ? '<span>' + ic('check') + crit.ok + ' de ' + crit.total + ' criterios para ' + (PHASES[st.phase + 1] ? PHASES[st.phase + 1].n : '') + '</span>' : '<span>' + ic('check') + 'Rendimiento</span>') + '<span>' + ic('flame') + plural(inj.recurrences || 1, 'lesión', 'lesiones') + ' en la zona</span></div>' +
      '<div style="margin-top:8px">' + phaseRail(st.phase) + '</div><div class="cta"><button class="btn glass" data-act="guide" data-g="fks">' + ic('info') + 'Qué significan F, K y S</button></div></section>';
    if (st.injuryActive) h += roadCard(st, today);
    if (crit && PHASES[st.phase + 1]) {
      const next = PHASES[st.phase + 1];
      h += '<section class="card"><div class="stack"><div class="row between"><span class="h3">Para pasar a ' + next.n + ' · ' + esc(next.t) + '</span>' + chip(crit.ok + '/' + crit.total, crit.ready ? 'lime' : '') + '</div><ul class="crit">' +
        crit.items.map(i => '<li><span class="mk ' + (i.ok ? 'ok' : i.req ? 'no' : '') + '">' + (i.ok ? ic('check') : '') + '</span><div><div class="small" style="font-weight:620">' + esc(i.label) + '</div>' + (i.req ? '' : '<div class="opt">Recomendado</div>') + '</div><span class="det">' + esc(i.detail || '') + '</span></li>').join('') + '</ul>';
      const manual = [];
      if (st.phase === 1) [['walk', 'Camino sin dolor'], ['jog', 'Troto sin dolor'], ['stretch', 'Estiro sin dolor']].forEach(([k, l]) => manual.push(['f1checks', k, l]));
      if (st.phase === 4) manual.push(['f4checks', 'medical', 'Fisio y ecografía hechos']);
      if (st.phase === 5) manual.push(['f5checks', 'fullTeam', 'Entreno completo sin síntomas']);
      if (manual.length) h += '<div class="pills">' + manual.map(([g, k, l]) => { const on = inj[g] && inj[g][k]; return '<button type="button" class="pill' + (on ? ' on lime' : '') + '" data-act="injury-check" data-g="' + g + '" data-k="' + k + '" aria-pressed="' + !!on + '">' + esc(l) + '</button>'; }).join('') + '</div>';
      h += '<div class="grid2"><button class="btn ' + (crit.ready ? 'lime' : '') + '" data-act="phase-up"' + (crit.ready ? '' : ' disabled') + '>Avanzar a ' + next.n + '</button>' + (st.phase > 1 ? '<button class="btn ghost" data-act="phase-down">Volver a ' + PHASES[st.phase - 1].n + '</button>' : '<span></span>') + '</div>' +
        (crit.ready ? '' : '<p class="sub">Se activa con todos los criterios obligatorios. Sin excepciones: así no recaes.</p>') + '</div></section>';
    } else if (st.phase === 6) h += '<section class="card"><div class="stack"><p class="body">Fase final. El recto femoral recibe mantenimiento 2 veces por semana.</p><div class="grid2"><button class="btn" data-act="resolve-injury">Cerrar lesión</button><button class="btn ghost" data-act="phase-down">Volver a F5</button></div></div></section>';
  } else h += '<div class="empty"><b>Sin lesión activa.</b><span class="small">El plan trabaja en modo rendimiento.</span><button class="btn sm" data-act="new-injury">Registrar lesión</button></div>';
  h += levelsCard(st);
  h += testsCard(st);
  const tl = trainingLSI(st.sessions, st.side);
  if (tl.length) h += '<section class="card"><div class="stack-sm"><span class="h3">Entre piernas · entrenamiento</span><p class="sub">Estimado con el peso y las repeticiones de cada lado. Orienta entre tests.</p>' + tl.map(r => '<div class="lrow"><span class="fg2">' + esc(r.n) + ' · ' + fmtDate(r.date) + '</span><b class="num ' + (r.lsi >= 90 ? 'c-lime' : 'c-load') + '">' + fmtNum(r.lsi) + ' %</b></div>').join('') + '</div></section>';
  h += sleepCard(st, today);
  h += loadCard(st, today);
  h += coverageCard(st, today);
  h += weightCard(st);
  return h;
}
function levelsCard(st) {
  const K = st.kick, Sp = st.sprint;
  const kNeed = K.top ? 'Completado' : K.streak + '/' + K.req + ' limpias para subir';
  const sNeed = Sp.top ? 'Completado' : Sp.streak + '/' + Sp.req + ' limpias para subir';
  const kCap = st.injuryActive ? KCAP[st.phase] : 8, sCap = st.injuryActive ? SCAP[st.phase] : 6;
  return '<section class="card"><div class="stack">' +
    '<div class="stack-sm"><div class="row between"><span class="h3"><span class="c-lime">K</span> · Golpeo</span><span class="sub num">' + kNeed + '</span></div>' + ladderHtml('k', st) + '<div class="small fg2"><b>' + KICK[K.level].n + ':</b> ' + esc(KICK[K.level].d) + '</div>' + (st.injuryActive && kCap < 8 ? '<div class="sub">Hasta ' + KICK[kCap].n + ' en ' + PHASES[st.phase].n + '.</div>' : '') + '</div>' +
    '<div class="stack-sm"><div class="row between"><span class="h3"><span class="c-load">S</span> · Sprint</span><span class="sub num">' + sNeed + '</span></div>' + ladderHtml('s', st) + '<div class="small fg2"><b>' + SPRINT[Sp.level].n + ':</b> ' + esc(SPRINT[Sp.level].d) + '</div>' + (st.injuryActive && sCap < 6 ? '<div class="sub">Hasta ' + SPRINT[sCap].n + ' en ' + PHASES[st.phase].n + '.</div>' : '') + '</div>' +
    '<div class="row between"><span class="h3"><span class="c-sleep">RT</span> · Esfuerzos repetidos</span><span class="sub num">' + RT_LEVELS[st.rt.idx].replace('x', ' × ') + ' · ' + st.rt.streak + '/2</span></div>' +
    '<details><summary>' + ic('info') + 'Reglas de los niveles</summary><div class="in"><ul class="crit">' + [
      ['Sesión limpia', 'Dolor ≤ 2 durante y 0 al día siguiente.'], ['K5, K7, S4 y S6', 'Piden 2 limpias seguidas: son los umbrales donde te lesionaste.'], ['Dolor 3 o más', 'Bajas un nivel.'], ['Una variable a la vez', 'Distancia, intensidad, tipo de golpe, volumen o carrera.'],
    ].map(([a, b]) => '<li><span class="mk">' + ic('info') + '</span><div class="small"><b>' + a + '</b><div class="fg3">' + b + '</div></div><span></span></li>').join('') + '</ul></div></details></div></section>';
}
function testsCard(st) {
  const T = st.test;
  let h = '<section class="card"><div class="stack"><div class="row between"><span class="h3">Tests</span><button class="btn sm primary" data-act="new-test">' + ic('plus') + 'Cargar</button></div>';
  if (!T) h += '<p class="sub">Sin tests todavía. El primero es la línea base.</p>';
  else {
    const dd = T.dates || {};
    const rows = [['Extensión 8RM', T.ext, dd.ext8], ['Salto simple', T.hop1, dd.hop1], ['Triple salto', T.hop3, dd.hop3]];
    h += '<div class="sub">Pierna lesionada vs sana · la línea marca el 90 %</div><div class="lsi">' + rows.map(([n, v, d]) => '<div class="lsi-row"><div class="top"><span>' + n + (d ? ' <span class="fg4">· ' + fmtDate(d) + '</span>' : '') + '</span><span class="num ' + (v === null ? 'fg4' : v >= 90 ? 'c-lime' : 'c-load') + '">' + (v === null ? 'sin medir' : fmtNum(v) + ' %') + '</span></div><div class="lsi-track"><div class="lsi-fill' + (v !== null && v >= 90 ? ' pass' : '') + '" style="width:' + (v === null ? 0 : clamp(v, 0, 110) / 110 * 100) + '%"></div><div class="lsi-ref" style="left:' + (90 / 110 * 100) + '%"></div></div></div>').join('') + '</div>' +
      '<div class="stats"><div class="stat ' + (T.rn === 'completo' && (T.rnPain || 0) <= 1 ? 'lime' : '') + '"><span class="v" style="font-size:16px">' + esc(T.rn ? capFirst(T.rn) : '—') + '</span><span class="k">Reverse Nordic' + (T.rnPain !== null && T.rnPain !== undefined ? ' · dolor ' + T.rnPain : '') + '</span></div><div class="stat ' + (T.palp === 0 ? 'lime' : T.palp >= 3 ? 'pain' : '') + '"><span class="v">' + (T.palp ?? '—') + '</span><span class="k">Palpación</span></div><div class="stat"><span class="v">' + (T.stretchDiff === null ? '—' : fmtNum(T.stretchDiff)) + '<small>cm</small></span><span class="k">Talón-glúteo</span></div></div>';
    const pts = st.tests.map(t => ({ x: t.date, y: testSummary(t, st.side).ext })).filter(p => p.y !== null);
    if (pts.length > 1) h += lineChart(pts, { ref: 90, unit: ' %', min: 60, max: 110, label: 'Evolución de la extensión' });
    h += '<details><summary>' + ic('history') + 'Historial de tests</summary><div class="in">' + st.tests.slice().reverse().map(t => { const x = testSummary(t, st.side); return '<button class="blk" data-act="edit-test" data-id="' + esc(t.id) + '"><span class="c">' + ic('flask') + '</span><div class="grow"><div class="t">' + fmtDate(t.date) + '</div><div class="s">Ext. ' + (x.ext === null ? '—' : fmtNum(x.ext) + ' %') + ' · Salto ' + (x.hop1 === null ? '—' : fmtNum(x.hop1) + ' %') + ' · RN ' + esc(t.rn || '—') + '</div></div>' + ic('chev') + '</button>'; }).join('') + '</div></details>';
  }
  h += '<details><summary>' + ic('info') + 'Cómo se hacen</summary><div class="in"><ul class="crit">' + TEST_STEPS.map(t => '<li><span class="mk">' + ic('info') + '</span><div class="small"><b>' + esc(t.n) + '</b><div class="fg3">' + esc(t.d) + '</div></div><span></span></li>').join('') + '</ul></div></details></div></section>';
  return h;
}
function sleepCard(st, today) {
  const rows = [];
  for (let i = 13; i >= 0; i--) { const d = addDays(today, -i), c = checkinFor(d); rows.push({ label: i % 2 ? '' : DOW1[weekday(d)], value: c && num(c.sleepH) !== null ? num(c.sleepH) : 0 }); }
  const vals = rows.map(r => r.value).filter(Boolean);
  if (!vals.length) return '';
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
  const scores = (S.data.checkins || []).filter(c => c.date >= addDays(today, -13)).map(readinessScore).filter(x => x !== null);
  const rAvg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
  return '<section class="card t-sleep"><div class="stack-sm"><div class="row between"><span class="h3">Sueño · 14 días</span><span class="row nowrap" style="gap:6px">' + chip('media ' + fmtNum(avg) + ' h', avg >= 9 ? 'sleep' : avg >= 8 ? 'blue' : 'warn', 'moon') + (rAvg !== null ? chip('estado ' + rAvg, readinessTone(rAvg) === 'load' ? 'warn' : readinessTone(rAvg)) : '') + '</span></div>' +
    barChart(rows, { tone: 'sleep', ref: 9, label: 'Horas de sueño', showVal: false, fmt: (v) => fmtNum(v) }) + '<p class="sub">La línea marca 9 h. Dormir de 21:30 a 7:30 te da 10 h: tu mayor ventaja.</p></div></section>';
}
function loadCard(st, today) {
  const loads = weeklyLoads(st.sessions, today, 8), cur = loads[loads.length - 1], prev = loads[loads.length - 2];
  const ch = prev.load > 0 ? Math.round((cur.load / prev.load - 1) * 100) : null;
  return '<section class="card"><div class="stack-sm"><div class="row between"><span class="h3">Carga semanal</span>' + (ch !== null ? chip((ch > 0 ? '+' : '') + ch + ' %', ch > 20 ? 'warn' : 'lime') : '') + '</div>' +
    barChart(loads.map(l => ({ label: fmtDate(l.start), value: l.load })), { cur: loads.length - 1, label: 'Carga semanal' }) +
    '<p class="sub">Minutos × esfuerzo (RPE). Subir más de 20 % de una semana a otra aumenta el riesgo de lesión.</p></div></section>';
}
function coverageCard(st, today) {
  const cov = coverage(st.sessions, today, 28);
  const gaps = coverageGaps(cov, st).map(p => LABELS.pat[p]);
  const patRows = KEY_PATTERNS.map(p => ({ n: LABELS.pat[p], v: cov.pat[p] || 0 })), zoneRows = PREV_ZONES.map(z => ({ n: LABELS.z[z], v: cov.z[z] || 0 }));
  return '<section class="card"><div class="stack-sm"><span class="h3">Qué entrenas y qué no · 28 días</span>' +
    (gaps.length ? note('warn', '<b>Sin estímulo y ya permitido en tu fase:</b> ' + esc(gaps.slice(0, 8).join(', ')) + (gaps.length > 8 ? ' y ' + (gaps.length - 8) + ' más' : '') + '.') : note('good', 'Todos los patrones permitidos en tu fase tuvieron estímulo.')) +
    '<details><summary>' + ic('chart') + 'Ver detalle</summary><div class="in"><div class="h3">Patrones</div>' + hbars(patRows) + '<div class="h3">Zonas de prevención</div>' + hbars(zoneRows) + '</div></details></div></section>';
}
function weightCard(st) {
  const ws = st.weights;
  return '<section class="card"><div class="stack-sm"><div class="row between"><span class="h3">Peso</span><button class="btn sm" data-act="add-weight">' + ic('plus') + 'Registrar</button></div>' +
    (ws.length >= 2 ? lineChart(ws.map(w => ({ x: w.date, y: Number(w.kg) })), { unit: ' kg', label: 'Peso' }) : '<p class="sub">' + (ws.length ? fmtNum(ws[0].kg) + ' kg el ' + fmtDate(ws[0].date) + '. ' : '') + 'Pésate una vez por semana en el gimnasio, a la misma hora.</p>') +
    (st.profile.weightTarget ? '<div class="sub">' + ic('target') + ' ' + esc(st.profile.weightTarget) + '</div>' : '') + '</div></section>';
}

/* ---------- Test manual (se fusiona por fecha) ---------- */
function openTest(id, date) {
  const t = id ? (S.data.tests || []).find(x => x.id === id) : (S.data.tests || []).find(x => x.id === 't-' + (date || todayStr()));
  UI.test = t ? clone(t) : { date: date || todayStr(), ext8: {}, hop1: {}, hop3: {}, stretch: {}, rn: null, rnPain: null, palp: null };
  openSheet({ id: 'test', full: true, render: testHtml });
}
function testHtml() {
  const v = UI.test, side = ST.side;
  const pair = (key, label, unit, hint) => '<div class="field"><span class="lab">' + label + ' (' + unit + ')</span><div class="grid2">' +
    ['d', 'i'].map(sd => '<input class="input num" inputmode="decimal" enterkeyhint="next" data-bind="test" data-key="' + key + '" data-s="' + sd + '" placeholder="' + sideLong(sd) + (side === sd ? ' · les.' : '') + '" aria-label="' + label + ' ' + sideLong(sd) + '" value="' + esc(fmtNumRaw((v[key] || {})[sd])) + '">').join('') + '</div>' + (hint ? '<span class="hint">' + hint + '</span>' : '') + '</div>';
  return sheetHead(v.id ? 'Editar test' : 'Cargar test', 'Deja vacío lo que no midas: se toma el último valor') + '<div class="sheet-body">' +
    '<div class="field"><label for="t-date">Fecha</label><input class="input" type="date" id="t-date" data-bind="test-date" value="' + esc(v.date) + '"' + (v.id ? ' disabled' : '') + '></div>' +
    pair('ext8', 'Extensión de rodilla 8RM', 'kg', 'Máximo peso para 8 repeticiones limpias.') + pair('hop1', 'Salto simple a una pierna', 'cm', 'Sin cinta: cuenta baldosas o largos de pie.') + pair('hop3', 'Triple salto', 'cm') + pair('stretch', 'Talón a glúteo boca abajo', 'cm', '0 = el talón toca el glúteo.') +
    '<div class="field"><span class="lab">Reverse Nordic</span><div class="seg">' + [['no', 'No pude'], ['parcial', 'Parcial'], ['completo', 'Completo']].map(([k, l]) => '<button type="button" data-act="test-rn" data-v="' + k + '" class="' + (v.rn === k ? 'on' : '') + '">' + l + '</button>').join('') + '</div></div>' +
    '<div class="field"><span class="lab">Dolor en el Reverse Nordic</span>' + scaleHtml('rnPain', v.rnPain, { pain: true, act: 'test-scale', l: '0 nada', r: '10 máximo' }) + '<span class="hint">Dolor, no esfuerzo.</span></div>' +
    '<div class="field"><span class="lab">Dolor a la palpación</span>' + scaleHtml('palp', v.palp, { pain: true, act: 'test-scale', l: '0 nada', r: '10 máximo' }) + '</div>' +
    '<div class="grid2"><div class="field"><label for="t-s10">Sprint 10 m (s)</label><input class="input num" id="t-s10" inputmode="decimal" data-bind="test-n" data-key="s10" value="' + esc(fmtNumRaw(v.s10)) + '"></div><div class="field"><label for="t-s30">Sprint 30 m (s)</label><input class="input num" id="t-s30" inputmode="decimal" data-bind="test-n" data-key="s30" value="' + esc(fmtNumRaw(v.s30)) + '"></div></div>' +
    '<div class="field"><label for="t-cmj">Salto CMJ (cm)</label><input class="input num" id="t-cmj" inputmode="decimal" data-bind="test-n" data-key="cmj" value="' + esc(fmtNumRaw(v.cmj)) + '"></div>' +
    (v.id ? '<button class="btn sm ghost danger" data-act="del-test" data-id="' + esc(v.id) + '">' + ic('trash') + 'Borrar test</button>' : '') +
    '<div class="sheet-foot"><button class="btn primary lg" data-act="test-save">Guardar test</button></div></div>';
}
function saveTest() {
  const v = UI.test, id = v.id || 't-' + (v.date || todayStr());
  const prev = clone((S.data.tests || []).find(t => t.id === id) || {}); delete prev.id;
  const pair = (o) => ({ d: num((o || {}).d), i: num((o || {}).i) });
  const doc = Object.assign(prev, { date: v.date || todayStr(), ext8: pair(v.ext8), hop1: pair(v.hop1), hop3: pair(v.hop3), stretch: pair(v.stretch), rn: v.rn || null, rnPain: num(v.rnPain), palp: num(v.palp), cmj: num(v.cmj), s10: num(v.s10), s30: num(v.s30) });
  put('tests', id, doc).then(() => {
    const T = testSummary(doc, ST.side);
    toast(T && T.ext !== null ? 'Test guardado · extensión ' + fmtNum(T.ext) + ' %' : 'Test guardado.');
  });
  if (!findLog(doc.date, 'test')) put('sessions', 's-' + doc.date + '-test', { date: doc.date, type: 'test', title: 'Test de control', done: true, source: 'app', exercises: [] });
  closeSheet();
}
