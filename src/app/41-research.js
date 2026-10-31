/* ============================================================
   INVESTIGAR UN TEMA: estudios reales (Europe PMC, respaldo OpenAlex) + síntesis con Gemini.
   La IA solo resume los estudios encontrados; cada afirmación cita un estudio de la lista
   y el código descarta citas que no existan. El nivel de evidencia final es el más prudente
   entre el que propone la IA y el que calcula el código.
   ============================================================ */
const EPMC_URL = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search';
const OPENALEX_URL = 'https://api.openalex.org/works';
const RESEARCH_MAX = 14;
const DESIGN_N = { ma: 'Metaanálisis', sr: 'Revisión sistemática', rct: 'Ensayo aleatorizado', ct: 'Ensayo controlado', coh: 'Cohorte', rev: 'Revisión', obs: 'Observacional' };
const DESIGN_W = { ma: 6, sr: 5, rct: 4, ct: 3, coh: 2.5, rev: 2, obs: 1.5 };
const INV_EXAMPLES = ['¿Sirve la crioterapia para recuperar?', '¿Cuánto afecta dormir poco al sprint?', '¿El ayuno empeora el rendimiento?', '¿Funciona el colágeno para los tendones?'];
const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    tema: { type: 'string', description: 'Tema en 3-7 palabras, en español' },
    consultas: { type: 'array', items: { type: 'string' }, description: 'Exactamente 3 consultas en inglés para buscar en PubMed/Europe PMC: términos clave unidos con AND/OR, sinónimos entre paréntesis, sin frases largas entre comillas' },
    poblacion: { type: 'string', description: 'Población de interés en inglés (ej. athletes, soccer players)' },
    resultado: { type: 'string', description: 'Resultado de interés en inglés (ej. performance, recovery, injury)' },
  },
  required: ['tema', 'consultas'],
};
const SYN_SCHEMA = {
  type: 'object',
  properties: {
    respuesta: { type: 'string', description: 'Respuesta directa en 2-4 frases, en español. Si la evidencia es escasa, de baja calidad o no es en deportistas, dilo en la primera frase.' },
    veredicto: { type: 'string', enum: ['beneficia', 'perjudica', 'sin efecto claro', 'depende', 'evidencia insuficiente'] },
    nivel: { type: 'string', enum: ['A', 'B', 'C', 'D'], description: 'A: metaanálisis o varios ensayos grandes coincidentes; B: al menos un ensayo aleatorizado; C: estudios pequeños u observacionales; D: casi nada, pilotos o mecanismo' },
    hallazgos: { type: 'array', items: { type: 'object', properties: { texto: { type: 'string', description: 'Hallazgo concreto en una o dos frases, con cifras si el resumen las da' }, ids: { type: 'array', items: { type: 'string' }, description: 'ids de los estudios que lo respaldan (E1, E2…)' } }, required: ['texto', 'ids'] } },
    mecanismo: { type: 'string', description: 'Por qué ocurre, en 1-3 frases; vacío si los estudios no lo explican' },
    aplicacion: { type: 'array', items: { type: 'string' }, description: '2-4 acciones prácticas para este atleta' },
    limites: { type: 'array', items: { type: 'string' }, description: '1-4 límites de la evidencia (tamaño, población, diseño, conflictos)' },
    mitos: { type: 'array', items: { type: 'object', properties: { mito: { type: 'string' }, realidad: { type: 'string' }, ids: { type: 'array', items: { type: 'string' } } }, required: ['mito', 'realidad'] } },
    estudios: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, n: { type: 'number', description: 'Participantes según el resumen; 0 si no lo dice' }, poblacion: { type: 'string', description: 'Población en español, corta' }, deportistas: { type: 'boolean' }, resultado: { type: 'string', description: 'Resultado principal en una frase, en español' }, direccion: { type: 'string', enum: ['beneficio', 'perjuicio', 'sin efecto', 'mixto'] } }, required: ['id', 'n', 'resultado', 'direccion'] } },
    preguntas: { type: 'array', items: { type: 'string' }, description: '2-3 preguntas para seguir investigando, en español' },
  },
  required: ['respuesta', 'veredicto', 'nivel', 'hallazgos', 'aplicacion', 'limites', 'estudios'],
};

/* ---------- Búsqueda de estudios ---------- */
function stripTags(s) { return String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); }
async function fetchJson(url, ms) {
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms || 15000);
  try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('http ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
function designOf(tipos, titulo) {
  const t = (tipos || []).join(' ').toLowerCase() + ' ' + String(titulo || '').toLowerCase();
  if (/meta-analy|meta analy|metaanal/.test(t)) return 'ma';
  if (/systematic review/.test(t)) return 'sr';
  if (/randomi[sz]ed|randomi[sz]ation/.test(t)) return 'rct';
  if (/clinical trial|controlled trial|crossover|cross-over/.test(t)) return 'ct';
  if (/cohort|prospective|longitudinal/.test(t)) return 'coh';
  if (/review/.test(t)) return 'rev';
  return 'obs';
}
function normEpmc(x) {
  const j = (x.journalInfo && x.journalInfo.journal) || {};
  return { pmid: x.pmid || null, doi: x.doi || null, titulo: stripTags(x.title), autores: x.authorString || '', revista: j.isoabbreviation || j.title || x.journalTitle || '', anio: Number(x.pubYear) || null, abstract: stripTags(x.abstractText), citas: Number(x.citedByCount) || 0, tipos: ((x.pubTypeList || {}).pubType || []) };
}
function invertedToText(inv) {
  if (!inv) return '';
  const words = []; for (const w of Object.keys(inv)) for (const i of inv[w]) words[i] = w;
  return words.join(' ');
}
function normOpenAlex(w) {
  const auth = (w.authorships || []).map(a => a.author && a.author.display_name).filter(Boolean);
  const src = w.primary_location && w.primary_location.source;
  return { pmid: w.ids && w.ids.pmid ? String(w.ids.pmid).replace(/\D/g, '') : null, doi: w.doi ? String(w.doi).replace(/^https?:\/\/doi\.org\//, '') : null, titulo: stripTags(w.title || w.display_name), autores: auth.slice(0, 3).join(', ') + (auth.length > 3 ? ' y col.' : ''), revista: src ? src.display_name : '', anio: w.publication_year || null, abstract: invertedToText(w.abstract_inverted_index), citas: w.cited_by_count || 0, tipos: [w.type || ''] };
}
async function searchEuropePmc(queries) {
  const qs = queries.slice(0, 3).map(q => '(' + q + ') AND HAS_ABSTRACT:y AND SRC:MED');
  if (queries[0]) qs.push('(' + queries[0] + ') AND HAS_ABSTRACT:y AND SRC:MED AND (PUB_TYPE:"Meta-Analysis" OR PUB_TYPE:"Systematic Review")');
  const res = await Promise.allSettled(qs.map(q => fetchJson(EPMC_URL + '?query=' + encodeURIComponent(q) + '&resultType=core&format=json&pageSize=25&synonym=true')));
  if (!res.some(r => r.status === 'fulfilled')) throw { code: 'net' };
  return res.flatMap(r => r.status === 'fulfilled' ? ((r.value.resultList || {}).result || []).map(normEpmc) : []);
}
async function searchOpenAlex(queries) {
  const res = await Promise.allSettled(queries.slice(0, 3).map(q => fetchJson(OPENALEX_URL + '?search=' + encodeURIComponent(q.replace(/\b(AND|OR|NOT)\b|[()"]/g, ' ').replace(/\s+/g, ' ').trim()) + '&filter=has_abstract:true&per-page=25')));
  if (!res.some(r => r.status === 'fulfilled')) throw { code: 'net' };
  return res.flatMap(r => r.status === 'fulfilled' ? (r.value.results || []).map(normOpenAlex) : []);
}
/* Ordena por diseño, citas, actualidad y si es en deportistas; quita duplicados; asigna E1…En */
function rankStudies(raw) {
  const seen = new Set(), out = [], year = new Date().getFullYear();
  for (const s of raw) {
    if (!s.titulo || !s.abstract || s.abstract.length < 200) continue;
    const key = s.pmid || (s.doi || '').toLowerCase() || s.titulo.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue; seen.add(key);
    s.design = designOf(s.tipos, s.titulo);
    const sport = /athlet|soccer|football|sport|player|runner|cyclist|team/i.test(s.titulo + ' ' + s.abstract.slice(0, 600));
    s.score = DESIGN_W[s.design] + Math.log10(s.citas + 1) * 0.8 + (s.anio && s.anio >= year - 10 ? 0.6 : s.anio && s.anio >= year - 20 ? 0.3 : 0) + (sport ? 0.6 : 0);
    out.push(s);
  }
  return out.sort((a, b) => b.score - a.score).slice(0, RESEARCH_MAX).map((s, i) => Object.assign(s, { id: 'E' + (i + 1) }));
}
async function searchStudies(queries) {
  if (FB && FB.mode === 'local') return rankStudies(localStudies());
  let raw = [];
  try { raw = await searchEuropePmc(queries); } catch (e) { raw = []; }
  if (rankStudies(raw.slice()).length < 5) { try { raw = raw.concat(await searchOpenAlex(queries)); } catch (e) { if (!raw.length) throw { code: 'net' }; } }
  return rankStudies(raw);
}
/* Modo local de prueba: estudios ficticios (no salen del navegador) */
function localStudies() {
  const ab = (t) => t + ' Background and methods were described in detail for this local test entry so the abstract passes the minimum length used to filter search results in the app.';
  return [
    { pmid: '1', titulo: 'Test meta-analysis of sleep and sprint performance in athletes', autores: 'Prueba A, Prueba B', revista: 'Test J', anio: 2022, abstract: ab('Meta-analysis of 20 trials (n = 600 athletes). Sleep loss reduced sprint performance.'), citas: 120, tipos: ['Meta-Analysis'] },
    { pmid: '2', titulo: 'Randomized trial of sleep extension in soccer players', autores: 'Prueba C', revista: 'Test J', anio: 2020, abstract: ab('Randomized controlled trial in 40 soccer players. Sleep extension improved reaction time.'), citas: 40, tipos: ['Randomized Controlled Trial'] },
    { pmid: '3', titulo: 'Observational study of sleep and injuries in adolescents', autores: 'Prueba D', revista: 'Test J', anio: 2014, abstract: ab('Observational study of 112 adolescents. Less than 8 h of sleep was associated with more injuries.'), citas: 300, tipos: ['Journal Article'] },
  ];
}

/* ---------- IA: plan de búsqueda y síntesis ---------- */
AIX.researchPlan = function (q) {
  const prompt = 'Un futbolista quiere investigar este tema con evidencia científica: "' + q + '".\n' +
    'Devuelve 3 consultas de búsqueda en inglés para PubMed/Europe PMC que encuentren metaanálisis, revisiones sistemáticas y ensayos en humanos. ' +
    'Usa términos MeSH o habituales, sinónimos con OR entre paréntesis y AND entre conceptos. La primera consulta debe ser la más específica; la tercera, más amplia (sin limitar a deportistas). ' + AI_STYLE;
  return this.json(prompt, PLAN_SCHEMA, { tier: 'fast' });
};
AIX.researchSynthesis = function (q, plan, studies) {
  const list = studies.map(s => s.id + ' | ' + DESIGN_N[s.design] + ' | ' + (s.anio || '') + ' | ' + s.titulo + '\nResumen: ' + s.abstract.slice(0, 1500)).join('\n\n');
  const prompt = 'Eres investigador en ciencias del deporte. Responde la pregunta del atleta usando SOLO los resúmenes de abajo (ids E1…E' + studies.length + ').\n' +
    'Reglas: no inventes estudios, autores, cifras ni resultados que no estén en los resúmenes. Cada hallazgo cita los ids que lo respaldan. ' +
    'Prioriza metaanálisis y ensayos con más participantes; señala si los estudios no son en deportistas. Si los estudios no responden la pregunta, dilo y usa veredicto "evidencia insuficiente". ' +
    'Ignora los estudios que no tratan el tema (no los incluyas en "estudios"). Escribe en español neutro, claro, frío y directo; explica los términos técnicos.\n' +
    'Atleta: ' + athleteDesc() + (ST ? ', fase ' + PHASES[ST.phase].n + ' (' + PHASES[ST.phase].t + ')' : '') + '.\n' +
    'Pregunta: "' + q + '"\n\nESTUDIOS:\n' + list;
  return this.json(prompt, SYN_SCHEMA, { tier: 'smart' });
};

/* ---------- Nivel de evidencia calculado y armado del informe ---------- */
const NIVEL_RANK = { A: 0, B: 1, C: 2, D: 3 };
function codeLevel(cited) {
  const ma = cited.filter(s => s.design === 'ma' || s.design === 'sr').length, rct = cited.filter(s => s.design === 'rct').length;
  const nPrim = cited.filter(s => s.design !== 'ma' && s.design !== 'sr' && s.design !== 'rev').reduce((a, s) => a + (num(s.n) || 0), 0);
  if ((ma >= 1 && rct >= 2) || (rct >= 3 && nPrim >= 300)) return 'A';
  if (ma >= 1 || rct >= 1) return 'B';
  if (cited.length >= 3 && nPrim >= 100) return 'C';
  return 'D';
}
function buildInvestigacion(q, plan, studies, syn, privado) {
  const ids = new Set(studies.map(s => s.id));
  const keep = (arr) => (arr || []).map(String).filter(id => ids.has(id));
  const hallazgos = (syn.hallazgos || []).map(h => ({ texto: String(h.texto || '').trim(), ids: keep(h.ids) })).filter(h => h.texto && h.ids.length);
  const mitos = (syn.mitos || []).map(m => ({ mito: String(m.mito || ''), realidad: String(m.realidad || ''), ids: keep(m.ids) })).filter(m => m.mito && m.realidad);
  const ext = {}; (syn.estudios || []).forEach(e => { if (ids.has(String(e.id))) ext[e.id] = e; });
  const citedIds = new Set(hallazgos.flatMap(h => h.ids).concat(mitos.flatMap(m => m.ids)));
  const estudios = studies.filter(s => citedIds.has(s.id) || ext[s.id]).map(s => {
    const e = ext[s.id] || {};
    return { id: s.id, pmid: s.pmid, doi: s.doi, titulo: s.titulo, autores: s.autores, revista: s.revista, anio: s.anio, design: s.design, citas: s.citas, n: Math.max(0, Math.round(num(e.n) || 0)) || null, poblacion: e.poblacion || '', deportistas: !!e.deportistas, resultado: e.resultado || '', direccion: e.direccion || '', citado: citedIds.has(s.id) };
  });
  const cited = estudios.filter(s => s.citado);
  const lvlAI = NIVEL_RANK[syn.nivel] !== undefined ? syn.nivel : 'D', lvlCode = cited.length ? codeLevel(cited) : 'D';
  const nivel = NIVEL_RANK[lvlAI] >= NIVEL_RANK[lvlCode] ? lvlAI : lvlCode;
  const stats = { estudios: cited.length, participantes: cited.filter(s => s.design !== 'ma' && s.design !== 'sr' && s.design !== 'rev').reduce((a, s) => a + (s.n || 0), 0), metaanalisis: cited.filter(s => s.design === 'ma' || s.design === 'sr').length, deportistas: cited.filter(s => s.deportistas).length, revisados: studies.length };
  return {
    tema: q, titulo: String(plan.tema || q).slice(0, 80), fecha: todayStr(), privado: !!privado, consultas: plan.consultas || [], v: 1,
    respuesta: String(syn.respuesta || ''), veredicto: hallazgos.length ? syn.veredicto || 'depende' : 'evidencia insuficiente', nivel: hallazgos.length ? nivel : 'D',
    hallazgos, mecanismo: String(syn.mecanismo || ''), aplicacion: (syn.aplicacion || []).map(String).slice(0, 5), limites: (syn.limites || []).map(String).slice(0, 5), mitos, preguntas: (syn.preguntas || []).map(String).slice(0, 3),
    estudios, stats,
  };
}
function researchErrorText(e) {
  const c = e && e.code;
  if (c === 'no-studies') return 'No encontré estudios con resumen sobre esto. Prueba con otras palabras o un tema más concreto.';
  if (c === 'net') return 'No se pudo conectar con la base de estudios científicos. Revisa la conexión y prueba de nuevo.';
  return aiErrorText(e);
}

/* ---------- Ejecución con progreso ---------- */
const INV_STEPS = ['Preparando la búsqueda', 'Buscando estudios', 'Leyendo los resúmenes', 'Escribiendo el informe'];
async function runResearch(q, privado) {
  const I = UI.inv; if (I.busy) return;
  q = String(q || '').trim();
  if (q.length < 4) { toast('Escribe el tema con un poco más de detalle.', 'warn'); return; }
  if (!AIX.available()) { I.error = 'La investigación necesita conexión.'; scheduleRender(); return; }
  Object.assign(I, { busy: true, step: 1, error: '', q, n: 0 }); scheduleRender();
  try {
    const plan = await AIX.researchPlan(q);
    if (!plan || !Array.isArray(plan.consultas) || !plan.consultas.length) throw { code: 'invalid' };
    I.step = 2; scheduleRender();
    const studies = await searchStudies(plan.consultas.map(String));
    if (!studies.length) throw { code: 'no-studies' };
    I.step = 3; I.n = studies.length; scheduleRender();
    const syn = await AIX.researchSynthesis(q, plan, studies);
    I.step = 4; scheduleRender();
    const doc = buildInvestigacion(q, plan, studies, syn || {}, privado), id = uid('inv');
    await put('investigaciones', id, doc);
    Object.assign(I, { busy: false, step: 0, q: '', lastId: id });
    if (privado) I.showPriv = true;
    scheduleRender();
    if (UI.view === 'aprende') openInvestigacion(id);
    else toast('Investigación lista: ' + doc.titulo + '.', 'ok', { label: 'Ver', act: 'inv-open', data: { id } });
  } catch (e) { Object.assign(I, { busy: false, step: 0, error: researchErrorText(e) }); scheduleRender(); }
}
function invList() { return (S.data.investigaciones || []).filter(x => x && !x.deleted).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)); }

/* ---------- Panel «Investigar» ---------- */
function researchPanel(st, today) {
  const I = UI.inv, all = invList(), priv = all.filter(x => x.privado), shown = all.filter(x => I.showPriv || !x.privado);
  let h = '<section class="card t-blue"><div class="stack">' +
    '<div class="stack-xs"><div class="h2">Investiga un tema</div><p class="sub pretty">Busca metaanálisis y ensayos reales en Europe PMC (que incluye PubMed) y Gemini resume solo lo que dicen esos estudios, citándolos.</p></div>' +
    '<div class="field"><label for="inv-q" class="sr">Tema a investigar</label><textarea class="input" id="inv-q" data-bind="inv-q" rows="3" maxlength="300" enterkeyhint="go" placeholder="Ej.: ¿Qué efecto tiene la crioterapia en la recuperación?"' + (I.busy ? ' disabled' : '') + '>' + esc(I.q) + '</textarea></div>' +
    (I.busy ? '' : '<div class="scroll-x">' + INV_EXAMPLES.map(x => '<button class="pill" data-act="inv-example" data-q="' + esc(x) + '">' + esc(x) + '</button>').join('') + '</div>') +
    toggleHtml('inv-priv', I.privado, 'Privada', 'No aparece en la lista ni la usa el coach', '', '') +
    (I.busy ? researchProgress(I) : '<button class="btn primary lg block" data-act="inv-go">' + ic('flask') + 'Investigar</button>') +
    (I.error ? note('warn', esc(I.error)) : '') +
    '<p class="sub pretty">Usa el límite gratuito de la IA (2 consultas por tema). Solo lee resúmenes, no los artículos completos. Si hay pocos estudios, el informe lo dice primero.</p>' +
    '</div></section>';
  h += '<div class="sec"><span class="t">Tus investigaciones</span>' + (priv.length ? '<button class="linkbtn" data-act="inv-showpriv">' + ic('lock') + (I.showPriv ? 'Ocultar privadas' : 'Mostrar privadas (' + priv.length + ')') + '</button>' : '') + '</div>';
  if (!shown.length) h += '<div class="empty"><b>Todavía no investigaste nada</b><span class="small">Escribe una pregunta arriba.</span></div>';
  else h += '<div class="stack-sm">' + shown.map(x => '<button class="dt-row" data-act="inv-open" data-id="' + esc(x.id) + '"><span class="dt-tile ' + (x.privado ? 'mute' : 'blue') + '" aria-hidden="true">' + ic(x.privado ? 'lock' : 'flask') + '</span><span class="grow"><span class="t">' + esc(x.titulo || x.tema) + '</span><span class="s">' + esc(fmtDate(x.fecha) + ' · ' + plural((x.stats || {}).estudios || 0, 'estudio', 'estudios') + ' · ' + (x.veredicto || '')) + '</span></span>' + nivelHtml(x.nivel || 'D', true) + '</button>').join('') + '</div>';
  return h;
}
function researchProgress(I) {
  return '<div class="inv-prog" role="status" aria-live="polite">' + INV_STEPS.map((t, i) => {
    const n = i + 1, st = I.step > n ? 'done' : I.step === n ? 'cur' : '';
    return '<div class="st ' + st + '"><span class="mk">' + (st === 'done' ? ic('check') : st === 'cur' ? '<span class="spinner"></span>' : n) + '</span><span>' + esc(t) + (n === 3 && I.n ? ' (' + I.n + ')' : '') + '</span></div>';
  }).join('') + '</div>';
}

/* ---------- Informe ---------- */
const VEREDICTO_TONE = { beneficia: 'lime', perjudica: 'warn', 'sin efecto claro': '', depende: 'blue', 'evidencia insuficiente': 'warn' };
function openInvestigacion(id) { openSheet({ id: 'inv-' + id, full: true, render: () => invHtml(id) }); }
function studyUrl(s) { return s.pmid ? 'https://pubmed.ncbi.nlm.nih.gov/' + encodeURIComponent(s.pmid) + '/' : s.doi ? 'https://doi.org/' + s.doi : 'https://pubmed.ncbi.nlm.nih.gov/?term=' + encodeURIComponent(s.titulo); }
function citeChips(ids, estudios) {
  return (ids || []).map(id => { const i = estudios.findIndex(s => s.id === id); return i < 0 ? '' : '<button class="cite" data-act="inv-cite" data-id="' + esc(id) + '" aria-label="Ver estudio ' + (i + 1) + '">' + (i + 1) + '</button>'; }).join('');
}
function invHtml(id) {
  const x = invList().find(v => v.id === id);
  if (!x) return sheetHead('Investigación') + '<div class="sheet-body"><p class="sub">Ya no existe.</p></div>';
  const ests = (x.estudios || []).filter(s => s.citado !== false), st = x.stats || {};
  let h = sheetHead(x.titulo || x.tema, esc(fmtDate(x.fecha)) + (x.privado ? ' · privada' : '')) + '<div class="sheet-body dato-sheet">';
  h += '<div class="inv-q">«' + esc(x.tema) + '»</div>';
  h += '<div class="stats four"><div class="stat"><span class="v">' + (st.estudios || 0) + '</span><span class="k">Estudios</span></div><div class="stat"><span class="v">' + (st.participantes ? fmtNum(st.participantes) : '—') + '</span><span class="k">Participantes</span></div><div class="stat"><span class="v">' + (st.metaanalisis || 0) + '</span><span class="k">Metaanálisis</span></div><div class="stat"><span class="v">' + esc(x.nivel || 'D') + '</span><span class="k">Evidencia</span></div></div>';
  h += '<div class="row">' + nivelHtml(x.nivel || 'D') + '<span class="chip ' + (VEREDICTO_TONE[x.veredicto] || '') + '">' + esc(capFirst(x.veredicto || '')) + '</span>' + (st.estudios && st.deportistas < st.estudios ? '<span class="chip">' + (st.deportistas || 0) + ' de ' + st.estudios + ' en deportistas</span>' : '') + '</div>';
  h += '<p class="body pretty">' + esc(x.respuesta) + '</p>';
  if ((x.hallazgos || []).length) h += '<div class="stack-sm"><div class="micro">Qué encontraron</div><ul class="findings">' + x.hallazgos.map(f => '<li><span class="pretty">' + esc(f.texto) + '</span> ' + citeChips(f.ids, ests) + '</li>').join('') + '</ul></div>';
  if (x.mecanismo) h += '<div class="stack-sm"><div class="micro">Por qué pasa</div><p class="small fg2 pretty">' + esc(x.mecanismo) + '</p></div>';
  if ((x.aplicacion || []).length) h += '<div class="stack-sm"><div class="micro">Qué hacer</div><ol class="apply">' + x.aplicacion.map(a => '<li>' + esc(a) + '</li>').join('') + '</ol></div>';
  if ((x.limites || []).length) h += '<div class="stack-sm"><div class="micro">Límites de la evidencia</div>' + note('warn', '<ul class="lims">' + x.limites.map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>') + '</div>';
  if ((x.mitos || []).length) h += '<div class="stack-sm"><div class="micro">Mitos</div>' + x.mitos.map(m => '<div class="card flat tight"><div class="small"><b>Mito:</b> ' + esc(m.mito) + '</div><div class="small fg2" style="margin-top:4px"><b>Realidad:</b> ' + esc(m.realidad) + ' ' + citeChips(m.ids, ests) + '</div></div>').join('') + '</div>';
  if (ests.length) h += '<div class="stack-sm"><div class="micro">Estudios</div>' + ests.map((s, i) => '<a class="study" id="est-' + esc(x.id) + '-' + esc(s.id) + '" href="' + studyUrl(s) + '" target="_blank" rel="noopener"><span class="num-b">' + (i + 1) + '</span><span class="grow"><span class="t">' + esc(s.titulo) + '</span><span class="s">' + esc([s.autores, s.revista, s.anio].filter(Boolean).join(' · ')) + '</span>' + (s.resultado ? '<span class="r">' + esc(s.resultado) + '</span>' : '') + '<span class="tags">' + chip(DESIGN_N[s.design] || 'Estudio', s.design === 'ma' || s.design === 'sr' || s.design === 'rct' ? 'blue' : '') + (s.n ? chip(fmtNum(s.n) + ' personas', '') : '') + (s.poblacion ? chip(s.poblacion, '') : '') + '</span></span>' + ic('ext') + '</a>').join('') + '</div>';
  if ((x.preguntas || []).length) h += '<div class="stack-sm"><div class="micro">Seguir investigando</div><div class="pills">' + x.preguntas.map(p => '<button class="pill" data-act="inv-ask" data-q="' + esc(p) + '">' + esc(p) + '</button>').join('') + '</div></div>';
  h += toggleHtml('inv-setpriv', !!x.privado, 'Privada', 'No aparece en la lista ni la usa el coach', 'data-id="' + esc(x.id) + '"', '');
  h += '<p class="sub pretty">Resumen generado por IA a partir de los resúmenes de ' + plural(st.revisados || ests.length, 'estudio encontrado', 'estudios encontrados') + ' en Europe PMC. Revisa los estudios antes de cambiar algo importante; no reemplaza a tu médico.</p>';
  h += '<button class="btn sm ghost danger block" data-act="inv-del" data-id="' + esc(x.id) + '">' + ic('trash') + 'Borrar investigación</button>';
  return h + '</div>';
}
function invSetPrivate(id, on) {
  const x = invList().find(v => v.id === id); if (!x) return;
  const d = clone(x); delete d.id; d.privado = !!on;
  put('investigaciones', id, d).then(() => toast(on ? 'Ahora es privada.' : 'Visible en tu lista y para el coach.', 'info'));
  refreshSheet(true);
}
