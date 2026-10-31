/* ============================================================
   APRENDE: dato del día, datos con evidencia, investigar un tema y guías
   ============================================================ */
const DATO_CATS = {
  prevencion: { n: 'Prevención', icon: 'shield', tone: 'blue' },
  sueno: { n: 'Sueño', icon: 'moon', tone: 'sleep' },
  recuperacion: { n: 'Recuperación', icon: 'leaf', tone: 'sleep' },
  nutricion: { n: 'Nutrición', icon: 'fork', tone: 'food' },
  hidratacion: { n: 'Hidratación', icon: 'drop', tone: 'water' },
  fuerza: { n: 'Fuerza', icon: 'dumb', tone: 'load' },
  velocidad: { n: 'Velocidad', icon: 'bolt', tone: 'load' },
  mente: { n: 'Mente', icon: 'spark', tone: 'blue' },
  percepcion: { n: 'Técnica y percepción', icon: 'ball', tone: 'blue' },
  elite: { n: 'Hábitos de élite', icon: 'trophy', tone: 'lime' },
  mitos: { n: 'Mitos', icon: 'x', tone: 'mute' },
};
const NIVEL_TXT = { A: 'Fuerte', B: 'Buena', C: 'Limitada', D: 'Muy limitada' };
const NIVEL_DEF = {
  A: 'Metaanálisis o varios ensayos grandes que coinciden.',
  B: 'Al menos un ensayo aleatorizado o un metaanálisis con resultados menos consistentes.',
  C: 'Estudios pequeños, sin grupo control u observacionales: muestran asociación, no prueban la causa.',
  D: 'Estudios piloto con muy pocas personas, opinión de expertos o solo mecanismo.',
};
const MITO_TXT = { mito: 'Mito', matiz: 'Mito a medias', poca: 'Poca evidencia' };

/* ---------- Carga diferida de los datos (JSON con hash, precacheado por el SW) ---------- */
const DAT = { list: null, loading: null, index: {}, error: false };
function loadDatos() {
  if (DAT.list) return Promise.resolve(DAT.list);
  if (!DAT.loading) {
    DAT.loading = fetch(DATOS_URL).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
      .then(list => { DAT.list = list; DAT.error = false; list.forEach(d => { DAT.index[d.id] = d; }); scheduleRender(); return list; })
      .catch(e => { DAT.loading = null; DAT.error = true; scheduleRender(); throw e; });
  }
  return DAT.loading;
}

/* ---------- Estado del usuario (vistos, guardados, lo que aplica, ocultos) ---------- */
function aprendeDoc() {
  const a = clone(S.data.aprende || {}) || {}; delete a.id;
  a.vistos = a.vistos || {}; a.guardados = a.guardados || []; a.aplico = a.aplico || []; a.ocultos = a.ocultos || [];
  return a;
}
function aprendeSave(a) { put('aprende', 'main', a); }
function aprendeToggle(list, id) {
  const a = aprendeDoc(), arr = a[list], on = arr.includes(id);
  a[list] = on ? arr.filter(x => x !== id) : arr.concat(id);
  aprendeSave(a); haptic(8);
  return !on;
}

/* ---------- Dato del día: el más relevante para tu día, sin repetir hasta agotar ---------- */
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function datoContext(today) {
  const ctx = new Set();
  if (!ST) return ctx;
  const sl = sleepOf(ST, today); if (sl && sl.h !== null && sl.h < 7) ctx.add('sueno-bajo');
  if (((ST.profile || {}).trials || []).some(t => t >= today && diffDays(t, today) <= 2)) ctx.add('precompetencia');
  if (typeof molActiveToday === 'function' && molActiveToday().length) ctx.add('molestia');
  if (ST.injuryActive) ctx.add('lesion');
  const ag = agendaFor(today);
  if (ag.kind === 'descanso') ctx.add('descanso');
  if (ag.kind === 'alto' || ag.kind === 'prueba') ctx.add('intenso');
  ag.items.forEach(it => { if (it.key === 'gym') ctx.add('gimnasio'); if (it.key === 'campo' || it.key === 'club') ctx.add('cancha'); });
  return ctx;
}
function pickDato(today, A) {
  const list = DAT.list || []; if (!list.length) return null;
  const hidden = new Set(A.ocultos), seen = A.vistos;
  let pool = list.filter(d => !hidden.has(d.id) && !seen[d.id]);
  // Todos vistos: vuelve a los que hace más tiempo que no salen
  if (!pool.length) pool = list.filter(d => !hidden.has(d.id)).sort((a, b) => ((seen[a.id] || '') < (seen[b.id] || '') ? -1 : 1)).slice(0, Math.max(10, Math.floor(list.length / 3)));
  if (!pool.length) return null;
  const ctx = datoContext(today), prevCat = A.dia && A.dia.fecha !== today ? A.dia.cat : null;
  const score = (d) => (d.contexto || []).reduce((s, t) => s + (ctx.has(t) ? 1 : 0), 0) - (d.cat === prevCat ? 1.5 : 0);
  return pool.slice().sort((a, b) => score(b) - score(a) || hashStr(today + a.id) - hashStr(today + b.id))[0];
}
function datoDelDia(today) {
  if (!DAT.list) return null;
  const A = aprendeDoc();
  if (A.dia && A.dia.fecha === today && DAT.index[A.dia.id] && !A.ocultos.includes(A.dia.id)) return DAT.index[A.dia.id];
  const d = pickDato(today, A); if (!d) return null;
  if (UI.datoSaved !== today + d.id) {
    UI.datoSaved = today + d.id;
    A.dia = { fecha: today, id: d.id, cat: d.cat }; A.vistos[d.id] = today;
    aprendeSave(A);
  }
  return d;
}

/* ---------- Piezas visuales ---------- */
function nivelHtml(n, compact) {
  const bars = { A: 4, B: 3, C: 2, D: 1 }[n] || 0;
  return '<span class="ev" role="img" aria-label="Evidencia ' + n + ': ' + esc((NIVEL_TXT[n] || '').toLowerCase()) + '"><span class="bars">' + [1, 2, 3, 4].map(i => '<i class="' + (i <= bars ? 'on' : '') + '"></i>').join('') + '</span>' + (compact ? '<b>' + n + '</b>' : '<b>' + n + '</b><span class="t">' + esc(NIVEL_TXT[n] || '') + '</span>') + '</span>';
}
function mitoChip(d) { return d.mito ? '<span class="chip ' + (d.mito === 'poca' ? 'warn' : '') + '">' + ic(d.mito === 'poca' ? 'info' : 'x') + esc(MITO_TXT[d.mito] || 'Mito') + '</span>' : ''; }
function catTile(cat, sm) { const c = DATO_CATS[cat] || { icon: 'book', tone: '' }; return '<span class="dt-tile ' + c.tone + (sm ? ' sm' : '') + '" aria-hidden="true">' + ic(c.icon) + '</span>'; }
function pubmedLink(e) { return 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(e.titulo); }

/* Tarjeta de Hoy */
function datoHoyCard(today) {
  if (!DAT.list) {
    if (!DAT.error) loadDatos().catch(() => {});
    return DAT.error ? '' : '<section class="card dato-card" aria-busy="true" aria-label="Dato del día"><div class="skel line" style="width:46%"></div><div class="skel line" style="height:22px;width:94%;margin-top:14px"></div><div class="skel line" style="height:22px;width:72%;margin-top:8px"></div><div class="skel line" style="width:38%;margin-top:16px"></div></section>';
  }
  const d = datoDelDia(today); if (!d) return '';
  const c = DATO_CATS[d.cat] || {}, A = aprendeDoc(), saved = A.guardados.includes(d.id);
  return '<section class="card dato-card k-' + (c.tone || 'blue') + '" aria-label="Dato del día">' +
    '<div class="dato-top">' + catTile(d.cat, true) + '<span class="grow"><span class="micro">Dato del día</span><span class="dato-cat">' + esc(c.n || '') + '</span></span>' + nivelHtml(d.nivel, true) + '</div>' +
    '<button class="dato-main" data-act="dato-open" data-id="' + esc(d.id) + '"><span class="dato-num">' + esc(d.cifra) + '</span><span class="dato-lbl">' + esc(d.cifraLbl) + '</span><span class="dato-t">' + esc(d.titular) + '</span></button>' +
    '<div class="dato-foot">' + mitoChip(d) + '<button class="linkbtn" data-act="dato-open" data-id="' + esc(d.id) + '">Más información' + ic('chev') + '</button>' +
    '<button class="iconbtn sm plain" data-act="dato-save" data-id="' + esc(d.id) + '" aria-pressed="' + saved + '" aria-label="' + (saved ? 'Quitar de guardados' : 'Guardar') + '">' + ic(saved ? 'bookmarkOn' : 'bookmark') + '</button></div></section>';
}

/* ---------- Ficha completa de un dato ---------- */
function openDato(id) {
  const d = DAT.index[id]; if (!d) { loadDatos().then(() => { if (DAT.index[id]) openDato(id); }).catch(() => toast('No se pudieron cargar los datos.', 'warn')); return; }
  openSheet({ id: 'dato-' + id, full: true, render: () => datoHtml(id) });
}
function datoHtml(id) {
  const d = DAT.index[id]; if (!d) return sheetHead('Dato');
  const c = DATO_CATS[d.cat] || {}, A = aprendeDoc(), saved = A.guardados.includes(id), aplico = A.aplico.includes(id), oculto = A.ocultos.includes(id);
  let h = sheetHead(c.n || 'Dato', 'Aprende' + (d.mito ? ' · ' + esc(MITO_TXT[d.mito]) : '')) + '<div class="sheet-body dato-sheet">';
  h += '<div class="dato-hero k-' + (c.tone || 'blue') + '"><div class="dato-num xl">' + esc(d.cifra) + '</div><div class="dato-lbl">' + esc(d.cifraLbl) + '</div><h3 class="dato-t lg">' + esc(d.titular) + '</h3><div class="row">' + nivelHtml(d.nivel) + mitoChip(d) + '</div></div>';
  h += '<p class="body pretty">' + esc(d.resumen) + '</p>';
  h += '<div class="stack-sm"><div class="micro">Por qué funciona</div><p class="small fg2 pretty">' + esc(d.mecanismo) + '</p></div>';
  h += '<div class="stack-sm"><div class="micro">Qué dice la evidencia</div>' + note('blue', '<b>Evidencia ' + d.nivel + ' · ' + esc(NIVEL_TXT[d.nivel]) + '.</b> ' + esc(NIVEL_DEF[d.nivel])) +
    d.estudios.map(e => '<a class="study" href="' + pubmedLink(e) + '" target="_blank" rel="noopener"><span class="grow"><span class="t">' + esc(e.titulo) + '</span><span class="s">' + esc(e.cita) + '</span><span class="tags">' + chip(e.diseno, 'blue') + (e.n ? chip(fmtNum(e.n) + ' personas', '') : '') + (e.poblacion ? chip(e.poblacion, '') : '') + '</span></span>' + ic('ext') + '</a>').join('') + '</div>';
  if ((d.testimonios || []).length) h += '<div class="stack-sm"><div class="micro">Testimonios</div>' + d.testimonios.map(t => '<figure class="testi"><blockquote>' + esc(t.texto) + '</blockquote><figcaption><b>' + esc(t.quien) + '</b><span>' + esc(t.fuente) + '</span></figcaption></figure>').join('') + '</div>';
  h += '<div class="stack-sm"><div class="micro">Cómo aplicarlo</div><ol class="apply">' + d.aplicar.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol></div>';
  if (d.accion && d.accion.tipo === 'ejercicio' && BANK_INDEX[d.accion.id]) h += '<button class="btn block" data-act="ex" data-id="' + esc(d.accion.id) + '">' + ic('dumb') + 'Ver el ejercicio: ' + esc(BANK_INDEX[d.accion.id].n) + '</button>';
  if (d.accion && d.accion.tipo === 'guia') h += '<button class="btn block" data-act="guide" data-g="' + esc(d.accion.id) + '">' + ic('wind') + 'Abrir la guía</button>';
  h += '<div class="grid2"><button class="btn' + (saved ? ' lime' : '') + '" data-act="dato-save" data-id="' + esc(id) + '" aria-pressed="' + saved + '">' + ic(saved ? 'bookmarkOn' : 'bookmark') + (saved ? 'Guardado' : 'Guardar') + '</button>' +
    '<button class="btn' + (aplico ? ' lime' : '') + '" data-act="dato-aplico" data-id="' + esc(id) + '" aria-pressed="' + aplico + '">' + ic('check') + (aplico ? 'Lo aplico' : 'Lo voy a aplicar') + '</button></div>';
  h += '<button class="btn block primary" data-act="inv-from-dato" data-id="' + esc(id) + '">' + ic('flask') + 'Investigar más a fondo</button>';
  h += '<button class="btn sm ghost block" data-act="dato-hide" data-id="' + esc(id) + '">' + ic(oculto ? 'undo' : 'x') + (oculto ? 'Volver a mostrarlo' : 'Ya lo sé: no mostrarlo como dato del día') + '</button>';
  h += '<p class="sub pretty">Los enlaces abren la búsqueda del estudio en PubMed. Esta información no reemplaza a tu médico ni a tu fisioterapeuta.</p>';
  return h + '</div>';
}

/* ---------- Página Aprende ---------- */
const APR_FILTERS = [['todos', 'Todos'], ['guardados', 'Guardados'], ['aplico', 'Lo aplico']];
function viewAprende(st, today) {
  const A = UI.apr;
  let h = '<div class="page-head"><a class="iconbtn" href="#hoy" aria-label="Volver">' + ic('chevL') + '</a><h1 class="h1 grow">Aprende</h1></div>';
  h += '<div class="seg blue" role="tablist" aria-label="Secciones">' + [['datos', 'Datos'], ['investigar', 'Investigar'], ['guias', 'Guías']].map(([k, l]) => '<button type="button" role="tab" aria-selected="' + (A.tab === k) + '" class="' + (A.tab === k ? 'on' : '') + '" data-act="apr-tab" data-v="' + k + '">' + l + '</button>').join('') + '</div>';
  if (A.tab === 'investigar') return h + researchPanel(st, today);
  if (A.tab === 'guias') return h + '<p class="sub">Guías prácticas de la app, con la evidencia que las respalda.</p>' + guidesPanel(st) + '<div class="stack-sm">' +
    '<button class="blk" data-act="guide" data-g="nutricion"><span class="c food">' + ic('fork') + '</span><div class="grow"><div class="t">Nutrición por evidencia</div><div class="s">Qué funciona, qué es preliminar y qué evitar</div></div>' + ic('chev') + '</button>' +
    '<button class="blk" data-act="guide" data-g="balon"><span class="c">' + ic('ball') + '</span><div class="grow"><div class="t">Guía de balón</div><div class="s">Estaciones, pierna derecha y tope de cabeceo</div></div>' + ic('chev') + '</button></div>';
  if (!DAT.list) {
    if (!DAT.error) loadDatos().catch(() => {});
    return h + (DAT.error ? '<div class="empty"><b>No se pudieron cargar los datos</b><span class="small">Revisa la conexión.</span><button class="btn sm" data-act="apr-retry">' + ic('refresh') + 'Reintentar</button></div>' : '<div class="stack-sm">' + [1, 2, 3, 4].map(() => '<div class="skel" style="height:76px;border-radius:18px"></div>').join('') + '</div>');
  }
  const ap = aprendeDoc(), dia = datoDelDia(today);
  if (dia && A.filter === 'todos' && !A.q) h += '<section class="card dato-card k-' + ((DATO_CATS[dia.cat] || {}).tone || 'blue') + '"><div class="dato-top">' + catTile(dia.cat, true) + '<span class="grow"><span class="micro">Hoy</span><span class="dato-cat">' + esc((DATO_CATS[dia.cat] || {}).n || '') + '</span></span>' + nivelHtml(dia.nivel, true) + '</div><button class="dato-main" data-act="dato-open" data-id="' + esc(dia.id) + '"><span class="dato-num">' + esc(dia.cifra) + '</span><span class="dato-lbl">' + esc(dia.cifraLbl) + '</span><span class="dato-t">' + esc(dia.titular) + '</span></button></section>';
  h += '<label class="search"><span class="sr">Buscar</span>' + ic('search') + '<input id="apr-q" class="input" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" placeholder="Buscar: sueño, creatina, sprint…" value="' + esc(A.q) + '" data-input="apr-q"></label>';
  h += '<div class="scroll-x snap" role="toolbar" aria-label="Filtros">' + APR_FILTERS.map(([k, l]) => '<button class="pill' + (A.filter === k ? ' on' : '') + '" data-act="apr-filter" data-v="' + k + '">' + l + (k === 'guardados' && ap.guardados.length ? ' · ' + ap.guardados.length : k === 'aplico' && ap.aplico.length ? ' · ' + ap.aplico.length : '') + '</button>').join('') +
    Object.entries(DATO_CATS).map(([k, c]) => '<button class="pill' + (A.filter === k ? ' on' : '') + '" data-act="apr-filter" data-v="' + k + '">' + esc(c.n) + '</button>').join('') + '</div>';
  const q = A.q.trim().toLowerCase();
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const nq = norm(q);
  const list = DAT.list.filter(d => (A.filter === 'todos' || (A.filter === 'guardados' ? ap.guardados.includes(d.id) : A.filter === 'aplico' ? ap.aplico.includes(d.id) : d.cat === A.filter)) &&
    (!nq || norm(d.titular + ' ' + d.resumen + ' ' + (DATO_CATS[d.cat] || {}).n).includes(nq)));
  if (!list.length) h += '<div class="empty"><b>' + (A.filter === 'guardados' ? 'Todavía no guardaste datos' : A.filter === 'aplico' ? 'Todavía no marcaste datos que aplicas' : 'Sin resultados') + '</b><span class="small">' + (A.filter === 'guardados' || A.filter === 'aplico' ? 'Ábrelos desde la ficha de cada dato.' : 'Prueba con otra palabra.') + '</span></div>';
  else h += '<div class="stack-sm" role="list">' + list.map(d => '<button class="dt-row" role="listitem" data-act="dato-open" data-id="' + esc(d.id) + '">' + catTile(d.cat) + '<span class="grow"><span class="t">' + esc(d.titular) + '</span><span class="s"><b>' + esc(d.cifra) + '</b> ' + esc(d.cifraLbl) + (ap.aplico.includes(d.id) ? ' · lo aplicas' : '') + '</span></span>' + nivelHtml(d.nivel, true) + '</button>').join('') + '</div>';
  h += '<details class="ev-legend"><summary>Qué significan los niveles de evidencia</summary><div class="in">' + ['A', 'B', 'C', 'D'].map(n => '<div class="row nowrap" style="align-items:flex-start">' + nivelHtml(n) + '<span class="small fg2 pretty">' + esc(NIVEL_DEF[n]) + '</span></div>').join('') + '</div></details>';
  return h;
}
/* Contexto para el coach: dato de hoy, lo que aplica e investigaciones no privadas (las privadas nunca salen de aquí) */
function aprendeCoachCtx(today) {
  const A = aprendeDoc(), d = (id) => (DAT.index[id] ? DAT.index[id].titular + ' (evidencia ' + DAT.index[id].nivel + ')' : null);
  return {
    datoDeHoy: A.dia && A.dia.fecha === today ? d(A.dia.id) : null,
    loQueAplica: A.aplico.map(d).filter(Boolean),
    investigaciones: invList().filter(x => !x.privado).slice(0, 5).map(x => ({ tema: x.tema, fecha: x.fecha, respuesta: x.respuesta, veredicto: x.veredicto, nivelEvidencia: x.nivel, estudios: (x.stats || {}).estudios || 0, participantes: (x.stats || {}).participantes || 0, queHacer: x.aplicacion || [], limites: x.limites || [] })),
  };
}
/* «Más información» desde Hoy: navega a Aprende y abre la ficha */
function goDato(id) {
  UI.apr.pending = id; UI.apr.tab = 'datos';
  if (UI.view === 'aprende') { const p = UI.apr.pending; UI.apr.pending = null; openDato(p); }
  else location.hash = '#aprende';
}
function aprendeAfterRender() {
  if (UI.view === 'aprende' && UI.apr.pending && DAT.list) { const id = UI.apr.pending; UI.apr.pending = null; setTimeout(() => openDato(id), 40); }
}
