/* ============================================================
   COMIDA: objetivos del día, comidas planificadas, registro por foto o texto
   ============================================================ */
function viewComida(st, today) {
  if (!S.data.profile) return onboarding();
  const date = UI.foodDate || today;
  const ag = agendaFor(date), T = nutritionTargets(st.weight || 88, ag.kind, ag);
  const ms = mealsFor(date), tot = sumItems([].concat(...ms.map(m => m.items || [])));
  const nd = nutriDoc(date) || {}, water = (num(nd.water) || 0) / 1000;
  let h = '<div class="page-head"><h1 class="h1 grow">Comida</h1><button class="iconbtn sm" data-act="food-day" data-d="-1" aria-label="Día anterior">' + ic('chevL') + '</button><button class="btn xs" data-act="food-today"' + (date === today ? ' disabled' : '') + '>' + (date === today ? 'Hoy' : fmtDate(date)) + '</button><button class="iconbtn sm" data-act="food-day" data-d="1" aria-label="Día siguiente">' + ic('chev') + '</button></div>';
  const kcalFrac = T.kcal ? tot.kcal / T.kcal : 0;
  h += '<section class="card t-food"><div class="stack"><div class="row between"><div><div class="micro" style="color:var(--teal-ink)">' + esc(capFirst(fmtDateLong(date))) + '</div><div class="h2">' + esc(T.kindN) + '</div></div>' + chip(fmtNum(T.choKg) + ' g/kg de carbos', ag.kind === 'alto' || ag.kind === 'prueba' ? 'load' : 'food') + '</div>' +
    '<div class="macro-top">' + ring(kcalFrac, 108, 10, 'lg-prot', tot.kcal, 'de ' + T.kcal + ' kcal') + '<div class="macros">' +
    macroRow('Proteína', tot.p, T.p, 'prot', 'c-prot') + macroRow('Carbohidratos', tot.c, T.c, 'carb', 'c-carb') + macroRow('Grasas', tot.f, T.f, 'fat', 'c-fat') + '</div></div>' +
    '<div class="grid3"><button class="btn sm" data-act="meal-photo" data-date="' + date + '">' + ic('camera') + 'Foto</button><button class="btn sm" data-act="meal-text" data-date="' + date + '">' + ic('pen') + 'Escribir</button><button class="btn sm" data-act="meal-search" data-date="' + date + '">' + ic('search') + 'Buscar</button></div></div></section>';
  // Hidratación y suplementos
  h += '<section class="card tight"><div class="water"><div class="row between"><span class="h3">Agua y líquidos</span><b class="num c-water">' + fmtNum(Math.round(water * 10) / 10) + ' / ' + fmtNum(T.water) + ' L</b></div>' + meter(water, T.water, 'water') +
    '<div class="cups"><button class="btn sm" data-act="water-add" data-date="' + date + '" data-ml="-250" aria-label="Restar 250 ml">−</button><button class="btn sm" data-act="water-add" data-date="' + date + '" data-ml="250" aria-label="Sumar 250 ml">+250</button><button class="btn sm" data-act="water-add" data-date="' + date + '" data-ml="500" aria-label="Sumar 500 ml">+500</button><button class="btn sm" data-act="water-add" data-date="' + date + '" data-ml="1000" aria-label="Sumar 1 litro">+1 L</button></div>' +
    '<div class="sub">El mate, el tereré y el agua con sal cuentan. En la cancha suma 0,5-1 L por hora.</div></div></section>';
  h += '<div class="grid2">' + suppTile(date, 'creatine', 'Creatina 5 g', nd.creatine, 'lime') + suppTile(date, 'gelatin', 'Gelatina + vit. C', nd.gelatin, 'food') + '</div>';
  // Comidas del día según la agenda
  h += '<div class="sec"><span class="t">Comidas del día</span><a href="#hoy" data-act="hoy-day" data-date="' + date + '">Horario</a></div>';
  const meals = ag.items.filter(x => x.kind === 'meal');
  const slots = new Set(meals.map(m => m.slot));
  h += '<div class="stack-sm">' + meals.map(m => mealSlotCard(date, m)).join('') + '</div>';
  const extra = ms.filter(m => !slots.has(m.slot));
  if (extra.length) h += '<div class="stack-sm"><div class="micro">Fuera del plan</div>' + extra.map(m => '<div class="card tight">' + mealRowHtml(m) + '</div>').join('') + '</div>';
  // Semana
  h += proteinWeekCard(date, st);
  h += '<section class="card tight"><div class="stack-sm"><div class="h3">Tus hábitos</div>' +
    '<div class="lrow"><span class="fg2">Mate con cúrcuma por la mañana</span><span class="sub">Hidrata · suma pimienta</span></div>' +
    '<div class="lrow"><span class="fg2">Café después del almuerzo</span><span class="sub">Hasta las 14:00</span></div>' +
    '<div class="lrow"><span class="fg2">Leche de cabra cruda</span><span class="sub c-pain">Hervir siempre</span></div>' +
    '<div class="lrow"><span class="fg2">Huevos caseros</span><span class="sub">Bien cocidos</span></div>' +
    '<div class="lrow"><span class="fg2">Miel silvestre</span><span class="sub">Antes y después de entrenar</span></div>' +
    '<button class="blk" data-act="guide" data-g="nutricion" style="margin-top:6px"><span class="c food">' + ic('book') + '</span><div class="grow"><div class="t">Nutrición por evidencia</div><div class="s">Qué funciona, qué es preliminar y qué evitar</div></div>' + ic('chev') + '</button></div></section>';
  return h;
}
function macroRow(lab, v, t, tone, cls) {
  return '<div class="macro"><div class="top"><span>' + lab + '</span><b class="' + cls + '">' + v + '<span style="color:var(--fg-4)"> / ' + t + ' g</span></b></div>' + meter(v, t, tone) + '</div>';
}
function suppTile(date, key, label, on, tone) {
  return '<button class="tile ' + (on ? tone : '') + '" data-act="supp" data-date="' + date + '" data-key="' + key + '" aria-pressed="' + !!on + '" style="min-height:84px"><span class="c">' + ic(on ? 'check' : 'pill') + '</span><span class="k" style="color:var(--fg)">' + esc(label) + '</span><span class="k">' + (on ? 'Hecho' : key === 'creatine' ? 'Cuando la tengas' : 'Antes de cargar el RF') + '</span></button>';
}
function mealSlotCard(date, m) {
  const logged = mealDone(m.slot, date);
  const menu = mealMenuFor(date, m);
  let h = '<section class="card tight' + (logged.length ? ' t-food' : '') + '"><div class="meal"><div class="mh"><span class="tm">' + fmtHM(m.start) + '</span><button class="grow" data-act="ag-open" data-date="' + date + '" data-key="' + m.key + '" style="text-align:left"><div class="h3">' + esc(m.title) + (m.optional ? ' <span class="sub">· opcional</span>' : '') + '</div><div class="sub">' + (logged.length ? 'Registrado' : esc(menu.name)) + '</div></button>' + (logged.length ? '<span class="st0 done">' + ic('check') + '</span>' : '') + '</div>';
  if (logged.length) h += logged.map(x => mealRowHtml(x, true)).join('');
  else {
    h += '<div class="items">' + menu.items.map(i => '<div class="it"><span>' + esc(i.n) + '</span><span class="q">' + esc(fmtQty(i)) + '</span></div>').join('') + '</div>' +
      '<div class="mtot"><span class="p">' + menu.totals.p + ' g prot</span><span class="c">' + menu.totals.c + ' g carb</span><span class="f">' + menu.totals.f + ' g grasa</span><span class="k">' + menu.totals.kcal + ' kcal</span></div>' +
      (menu.tip ? '<div class="sub">' + esc(menu.tip) + '</div>' : '') +
      '<div class="row nowrap"><button class="btn sm lime grow" data-act="meal-ate" data-date="' + date + '" data-key="' + m.key + '">' + ic('check') + 'Comí esto</button><button class="iconbtn sm" data-act="meal-photo" data-date="' + date + '" data-slot="' + m.slot + '" aria-label="Registrar con foto">' + ic('camera') + '</button><button class="iconbtn sm" data-act="meal-text" data-date="' + date + '" data-slot="' + m.slot + '" aria-label="Escribir lo que comí">' + ic('pen') + '</button>' + (menu.variants > 1 ? '<button class="iconbtn sm" data-act="menu-var" data-date="' + date + '" data-key="' + m.key + '" aria-label="Otra opción">' + ic('refresh') + '</button>' : '') + '</div>';
  }
  return h + '</div></section>';
}
function mealRowHtml(m, inner) {
  const t = sumItems(m.items || []);
  return '<button class="' + (inner ? 'blk' : 'blk') + '" data-act="meal-edit" data-id="' + esc(m.id) + '" style="align-items:flex-start">' + (m.hasImg ? '<span class="photo-thumb" data-mealimg="' + esc(m.id) + '" style="display:block"></span>' : '<span class="c food">' + ic(m.source === 'foto' ? 'camera' : 'fork') + '</span>') +
    '<div class="grow"><div class="t">' + esc(m.title || SLOT_N[m.slot] || 'Comida') + ' · <span class="num">' + esc(m.time || '') + '</span></div><div class="s">' + esc((m.items || []).map(i => i.n).slice(0, 4).join(', ') + ((m.items || []).length > 4 ? '…' : '')) + '</div>' +
    '<div class="mtot" style="margin-top:6px"><span class="p">' + t.p + ' g prot</span><span class="c">' + t.c + ' g carb</span><span class="k">' + t.kcal + ' kcal</span></div></div></button>';
}
function proteinWeekCard(date, st) {
  const ws = weekStartOf(date), rows = [];
  let target = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i), t = sumItems([].concat(...mealsFor(d).map(m => m.items || [])));
    const ag = agendaFor(d), T = nutritionTargets(st.weight || 88, ag.kind, ag); target = T.p;
    rows.push({ label: DOW1[i], value: t.p });
  }
  if (!rows.some(r => r.value)) return '';
  return '<section class="card tight"><div class="stack-sm"><div class="row between"><span class="h3">Proteína de la semana</span><span class="sub">meta ' + target + ' g</span></div>' + barChart(rows, { tone: 'prot', ref: target, label: 'Proteína por día', showVal: false }) + '</div></section>';
}
/* Miniaturas de fotos de comida (se cargan aparte) */
const MEALIMG = {};
function hydrateMealImgs(root) {
  $$('[data-mealimg]', root || document).forEach(el => {
    const id = el.getAttribute('data-mealimg'); if (el.getAttribute('data-done')) return;
    el.setAttribute('data-done', '1');
    const set = (src) => { if (src) el.innerHTML = '<img class="photo-thumb" alt="" src="' + src + '" style="border:0">'; };
    if (MEALIMG[id]) { set(MEALIMG[id]); return; }
    FB.get('mealimg', id).then(d => { if (d && d.data) { MEALIMG[id] = d.data; set(d.data); } }).catch(() => {});
  });
}

/* ---------- Hoja de una comida del plan ---------- */
function openMeal(date, key) { openSheet({ id: 'meal-' + date + key, render: () => mealSheetHtml(date, key), after: (root) => hydrateMealImgs(root) }); }
function mealSheetHtml(date, key) {
  const ag = agendaFor(date), m = ag.items.find(x => x.key === key);
  if (!m) return sheetHead('Comida');
  const logged = mealDone(m.slot, date), menu = mealMenuFor(date, m);
  const tg = slotTargets(ag, nutritionTargets(ST.weight || 88, ag.kind, ag))[key] || {};
  let h = sheetHead(m.title, capFirst(fmtDateLong(date)) + ' · ' + fmtHM(m.start)) + '<div class="sheet-body">';
  ag.warnings.filter(w => w.key === key).forEach(w => { h += note('warn', esc(w.text)); });
  h += '<div class="stats"><div class="stat food"><span class="v">' + (tg.p || '—') + '<small>g</small></span><span class="k">Proteína objetivo</span></div><div class="stat"><span class="v c-carb">' + (tg.c || '—') + '<small>g</small></span><span class="k">Carbohidratos</span></div><div class="stat"><span class="v c-fat">' + (tg.f || '—') + '<small>g</small></span><span class="k">Grasas</span></div></div>';
  if (logged.length) h += '<div class="stack-sm"><div class="micro">Registrado</div>' + logged.map(x => mealRowHtml(x)).join('') + '</div>';
  h += '<div class="card flat tight"><div class="meal"><div class="row between"><span class="h3">' + esc(menu.name) + '</span>' + (menu.variants > 1 ? '<button class="btn xs" data-act="menu-var" data-date="' + date + '" data-key="' + key + '">' + ic('refresh') + 'Otra</button>' : '') + '</div>' +
    '<div class="items">' + menu.items.map(i => '<div class="it"><span>' + esc(i.n) + '</span><span class="q">' + esc(fmtQty(i)) + '</span></div>').join('') + '</div>' +
    '<div class="mtot"><span class="p">' + menu.totals.p + ' g prot</span><span class="c">' + menu.totals.c + ' g carb</span><span class="f">' + menu.totals.f + ' g grasa</span><span class="k">' + menu.totals.kcal + ' kcal</span></div>' + (menu.tip ? '<div class="sub">' + esc(menu.tip) + '</div>' : '') + '</div></div>';
  if (m.why) h += note('food', esc(m.why));
  h += '<div class="grid2"><button class="btn lime" data-act="meal-ate" data-date="' + date + '" data-key="' + key + '">' + ic('check') + 'Comí esto</button><button class="btn" data-act="meal-photo" data-date="' + date + '" data-slot="' + m.slot + '">' + ic('camera') + 'Foto</button></div>' +
    '<div class="grid2"><button class="btn sm" data-act="meal-text" data-date="' + date + '" data-slot="' + m.slot + '">' + ic('pen') + 'Escribir</button><button class="btn sm" data-act="meal-gallery" data-date="' + date + '" data-slot="' + m.slot + '">' + ic('image') + 'Galería</button></div>';
  h += '<div class="field"><span class="lab">Hora</span>' + timeAdjustHtml(date, m) + '</div>';
  return h + '</div>';
}
function slotForTime(date, hhmm) {
  const t = hm(hhmm), meals = agendaFor(date).items.filter(x => x.kind === 'meal');
  let best = null, bd = 1e9;
  for (const m of meals) { const d = Math.abs(m.start - t); if (d < bd) { bd = d; best = m; } }
  return best && bd <= 75 ? best.slot : 'extra';
}
function eatSuggested(date, key) {
  const m = agendaFor(date).items.find(x => x.key === key); if (!m) return;
  const menu = mealMenuFor(date, m);
  const id = uid('m');
  const time = date === todayStr() ? fmtHM(Math.min(nowMin(), m.end + 60)) : fmtHM(m.start);
  put('meals', id, { date, time, slot: m.slot, title: m.title, items: menu.items.map(i => Object.assign({}, i, { src: 'sugerido' })), source: 'sugerido', name: menu.name }).then(() => toast(m.title + ' registrado · ' + menu.totals.p + ' g de proteína.', 'ok', { label: 'Deshacer', act: 'meal-undo', data: { id } }));
  closeAllSheets();
}

/* ---------- Registro: foto, texto, buscador ---------- */
function mealDraftNew(date, slot, source) {
  const time = date === todayStr() ? fmtHM(nowMin()) : '12:30';
  UI.meal = { id: null, date, slot: slot || slotForTime(date, time), time, items: [], img: null, source: source || 'manual', note: '', busy: false, error: '', photoTime: false };
}
function pickPhoto(date, slot, gallery) {
  mealDraftNew(date, slot, 'foto');
  UI.meal.slotFixed = !!slot;
  let inp = document.getElementById(gallery ? 'meal-gal-x' : 'meal-cam-x');
  if (!inp) {
    inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.id = gallery ? 'meal-gal-x' : 'meal-cam-x'; inp.hidden = true;
    if (!gallery) inp.setAttribute('capture', 'environment');
    document.body.appendChild(inp);
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) onMealPhoto(f); });
  }
  inp.click();
}
async function onMealPhoto(file) {
  const D = UI.meal; if (!D) return;
  D.busy = true; D.error = '';
  openMealConfirm();
  try {
    const when = await exifDate(file);
    if (when && ymd(when) === D.date) { D.time = fmtHM(when.getHours() * 60 + when.getMinutes()); D.photoTime = true; if (!D.slotFixed) D.slot = slotForTime(D.date, D.time); }
    const big = await resizeImage(file, 1024, 0.82);
    D.img = await resizeImage(file, 480, 0.7);
    refreshSheet(true);
    const res = await AIX.analyzeMeal({ image: big, slot: D.slot, time: D.time });
    D.items = (res.items || []).map(normAiItem).filter(Boolean);
    D.aiNote = res.nota || '';
    if (!D.items.length) D.error = 'No reconocí alimentos en la foto. Agrégalos a mano.';
  } catch (e) {
    D.error = aiErrorText(e) + ' Agrega los alimentos a mano o escríbelos.';
  }
  D.busy = false; refreshSheet(true);
}
function normAiItem(x) {
  if (!x || !x.n) return null;
  const g = Math.max(1, Math.round(num(x.g) || 100));
  const fd = matchFood(x.n);
  const it = { n: String(x.n).slice(0, 60), g, p: num(x.p) || 0, c: num(x.c) || 0, f: num(x.f) || 0, kcal: num(x.kcal) || 0, conf: x.conf || 'media', src: 'ia' };
  if (!it.kcal) it.kcal = Math.round(it.p * 4 + it.c * 4 + it.f * 9);
  if (fd && !(num(x.p) || num(x.c) || num(x.f))) Object.assign(it, foodMacros(fd, g), { id: fd.id });
  it.k = { p: it.p / g, c: it.c / g, f: it.f / g, kcal: it.kcal / g };
  return it;
}
function openMealText(date, slot) {
  mealDraftNew(date, slot, 'texto');
  UI.meal.slotFixed = !!slot; UI.meal.text = '';
  openSheet({ id: 'meal-text', render: mealTextHtml });
}
function mealTextHtml() {
  const D = UI.meal;
  return sheetHead('¿Qué comiste?', esc(SLOT_N[D.slot] || 'Comida') + ' · ' + esc(capFirst(fmtDateLong(D.date)))) + '<div class="sheet-body">' +
    '<div class="field"><label for="meal-txt" class="sr">Lo que comiste</label><textarea class="input" id="meal-txt" data-bind="meal-text" rows="4" placeholder="3 huevos revueltos, 200 g de mandioca, un vaso de leche de cabra y una banana con miel" autocomplete="off" autocapitalize="sentences">' + esc(D.text || '') + '</textarea><span class="hint">Con cantidades si las sabes: gramos, unidades, vasos o cucharadas.</span></div>' +
    (D.error ? note('warn', esc(D.error)) : '') +
    '<div class="sheet-foot"><button class="btn" data-act="meal-text-local">Sin IA</button><button class="btn primary lg" data-act="meal-text-go"' + (D.busy ? ' disabled' : '') + '>' + (D.busy ? '<span class="spinner"></span>Analizando' : ic('spark') + 'Analizar') + '</button></div></div>';
}
async function mealTextGo(local) {
  const D = UI.meal; if (!D) return;
  const txt = (D.text || '').trim(); if (!txt) { toast('Escribe lo que comiste.', 'warn'); return; }
  if (local) { const r = parseFoodText(txt); D.items = r.items.map(i => Object.assign(i, { k: { p: i.p / i.g, c: i.c / i.g, f: i.f / i.g, kcal: i.kcal / i.g } })); D.error = r.miss.length ? 'No reconocí: ' + r.miss.join(', ') + '. Agrégalos con el buscador.' : ''; replaceSheet({ id: 'meal-confirm', full: true, render: mealConfirmHtml, after: hydrateMealImgs }); return; }
  D.busy = true; D.error = ''; refreshSheet(true);
  try {
    const res = await AIX.parseMealText({ text: txt, slot: D.slot, time: D.time });
    D.items = (res.items || []).map(normAiItem).filter(Boolean);
    if (res.hora && /^\d{1,2}:\d{2}$/.test(res.hora)) { D.time = res.hora.padStart(5, '0'); if (!D.slotFixed) D.slot = slotForTime(D.date, D.time); }
    D.busy = false;
    replaceSheet({ id: 'meal-confirm', full: true, render: mealConfirmHtml, after: hydrateMealImgs });
  } catch (e) {
    const r = parseFoodText(txt);
    D.items = r.items.map(i => Object.assign(i, { k: { p: i.p / i.g, c: i.c / i.g, f: i.f / i.g, kcal: i.kcal / i.g } }));
    D.busy = false; D.error = aiErrorText(e) + (D.items.length ? ' Usé la base de alimentos: revisa las cantidades.' : '');
    replaceSheet({ id: 'meal-confirm', full: true, render: mealConfirmHtml, after: hydrateMealImgs });
  }
}
function openMealConfirm() { openSheet({ id: 'meal-confirm', full: true, render: mealConfirmHtml, after: hydrateMealImgs }); }
function mealConfirmHtml() {
  const D = UI.meal; if (!D) return sheetHead('Comida');
  const t = sumItems(D.items);
  let h = sheetHead(D.id ? 'Editar comida' : 'Confirmar comida', esc(capFirst(fmtDateLong(D.date)))) + '<div class="sheet-body">';
  if (D.img) h += '<img class="photo" alt="Foto de la comida" src="' + D.img + '">';
  else if (D.id && D.hasImg) h += '<span class="photo" data-mealimg="' + esc(D.id) + '" style="display:block;overflow:hidden"></span>';
  if (D.busy) h += '<div class="stack-sm"><div class="row"><span class="spinner" style="color:var(--teal)"></span><span class="small fg2">Gemini está identificando los alimentos y las cantidades…</span></div><div class="skel" style="height:64px"></div><div class="skel" style="height:64px"></div><div class="skel" style="height:64px"></div></div>';
  if (D.error) h += note('warn', esc(D.error));
  if (D.aiNote) h += '<div class="sub">' + ic('spark') + ' ' + esc(D.aiNote) + '</div>';
  if (!D.busy) {
    h += '<div class="ai-items">' + D.items.map((it, i) => '<div class="ai-item"><div class="nm"><input value="' + esc(it.n) + '" data-bind="meal-item-n" data-i="' + i + '" aria-label="Alimento" autocomplete="off"><div class="s">' + (it.conf ? '<span class="conf ' + (it.conf === 'alta' ? '' : it.conf === 'baja' ? 'low' : 'mid') + '"></span>' : '') + Math.round(it.p) + ' P · ' + Math.round(it.c) + ' C · ' + Math.round(it.f) + ' G · ' + Math.round(it.kcal) + ' kcal</div></div>' +
      stepperHtml('mi-' + i, it.g, 'meal-g', 'data-i="' + i + '"', it.id && FOOD_INDEX[it.id] && FOOD_INDEX[it.id].ml ? 'ml' : 'g') + '<button class="iconbtn sm plain" data-act="meal-item-del" data-i="' + i + '" aria-label="Quitar ' + esc(it.n) + '">' + ic('x') + '</button></div>').join('') + '</div>';
    h += '<button class="btn block dash" data-act="meal-add-food">' + ic('plus') + 'Agregar alimento</button>';
    h += '<div class="card flat tight"><div class="mtot" style="font-size:14px"><span class="p">' + t.p + ' g prot</span><span class="c">' + t.c + ' g carb</span><span class="f">' + t.f + ' g grasa</span><span class="k">' + t.kcal + ' kcal</span></div></div>';
    h += '<div class="grid2"><div class="field"><label for="meal-time">Hora' + (D.photoTime ? ' (de la foto)' : '') + '</label><input class="input num" type="time" id="meal-time" data-bind="meal-time" value="' + esc(D.time) + '"></div>' +
      '<div class="field"><label for="meal-slot">Comida</label><select class="input" id="meal-slot" data-bind="meal-slot">' + Object.entries(SLOT_N).map(([k, v]) => '<option value="' + k + '"' + (k === D.slot ? ' selected' : '') + '>' + v + '</option>').join('') + '</select></div></div>';
    h += '<div class="field"><label for="meal-note">Nota</label><input class="input" id="meal-note" data-bind="meal-note" value="' + esc(D.note || '') + '" placeholder="Opcional" autocomplete="off"></div>';
    if (D.id) h += '<button class="btn sm ghost danger" data-act="meal-del" data-id="' + esc(D.id) + '">' + ic('trash') + 'Borrar comida</button>';
  }
  h += '<div class="sheet-foot"><button class="btn" data-act="close">Cancelar</button><button class="btn lime lg" data-act="meal-save"' + (D.busy || !D.items.length ? ' disabled' : '') + '>' + ic('check') + 'Guardar</button></div></div>';
  return h;
}
function mealSetGrams(i, g) {
  const D = UI.meal, it = D && D.items[i]; if (!it) return;
  g = Math.max(0, Math.round(num(g) || 0));
  if (!it.k) it.k = it.g ? { p: it.p / it.g, c: it.c / it.g, f: it.f / it.g, kcal: it.kcal / it.g } : { p: 0, c: 0, f: 0, kcal: 0 };
  it.g = g; it.p = Math.round(it.k.p * g * 10) / 10; it.c = Math.round(it.k.c * g * 10) / 10; it.f = Math.round(it.k.f * g * 10) / 10; it.kcal = Math.round(it.k.kcal * g);
}
function saveMeal() {
  const D = UI.meal; if (!D || !D.items.length) return;
  const id = D.id || uid('m');
  const items = D.items.filter(i => i.g > 0).map(i => ({ n: i.n, id: i.id || null, g: i.g, p: i.p, c: i.c, f: i.f, kcal: i.kcal, conf: i.conf || null, src: i.src || D.source }));
  const doc = { date: D.date, time: D.time, slot: D.slot, title: SLOT_N[D.slot] || 'Comida', items, source: D.source, note: D.note || '', hasImg: !!(D.img || D.hasImg) };
  put('meals', id, doc);
  if (D.img) { MEALIMG[id] = D.img; put('mealimg', id, { data: D.img }); }
  const t = sumItems(items);
  toast('Guardado · ' + t.p + ' g de proteína · ' + t.kcal + ' kcal.');
  UI.meal = null;
  closeAllSheets();
}
function editMeal(id) {
  const m = (S.data.meals || []).find(x => x.id === id); if (!m) return;
  UI.meal = { id, date: m.date, slot: m.slot, time: m.time, items: clone(m.items || []).map(i => Object.assign(i, { k: i.g ? { p: i.p / i.g, c: i.c / i.g, f: i.f / i.g, kcal: i.kcal / i.g } : null })), img: MEALIMG[id] || null, hasImg: !!m.hasImg, source: m.source, note: m.note || '' };
  openMealConfirm();
}
/* Buscador de alimentos de la base */
function openFoodSearch(date, intoDraft) {
  if (!intoDraft) { mealDraftNew(date, null, 'manual'); }
  UI.foodQ = '';
  openSheet({ id: 'food-search', full: true, render: foodSearchHtml });
}
function foodSearchHtml() {
  return sheetHead('Buscar alimento', 'Alimentos naturales, por porción') + '<div class="sheet-body"><div class="field"><label class="sr" for="food-q">Buscar</label><input class="input" id="food-q" type="search" inputmode="search" enterkeyhint="search" data-food-q="1" placeholder="Huevo, mandioca, leche de cabra…" value="' + esc(UI.foodQ || '') + '" autocomplete="off"></div><div class="exlist" id="food-list">' + foodListHtml() + '</div></div>';
}
function foodListHtml() {
  const q = normTxt(UI.foodQ || '');
  const list = FOODS.filter(f => !q || normTxt(f.n + ' ' + f.alias.join(' ')).includes(q)).slice(0, 40);
  if (!list.length) return '<div class="empty small">Sin resultados. Escríbelo con texto y lo analiza la IA.</div>';
  return list.map(f => { const g = f.ug || 100, m = foodMacros(f, g); return '<button class="exrow" data-act="food-pick" data-id="' + f.id + '" style="grid-template-columns:44px minmax(0,1fr) auto"><span class="c food" style="width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:var(--teal-soft);color:var(--teal)">' + ic('fork') + '</span><div style="min-width:0"><div class="t">' + esc(f.n) + '</div><div class="s num">' + (f.unit ? '1 ' + f.unit + ' (' + g + (f.ml ? ' ml' : ' g') + ')' : '100 g') + ' · ' + Math.round(m.p) + ' P · ' + Math.round(m.c) + ' C · ' + m.kcal + ' kcal</div></div>' + ic('plus') + '</button>'; }).join('');
}
function foodPick(id) {
  const f = FOOD_INDEX[id]; if (!f || !UI.meal) return;
  const it = itemFromFood(id, f.ug || 100);
  it.k = { p: f.p / 100, c: f.c / 100, f: f.f / 100, kcal: f.kcal / 100 };
  UI.meal.items.push(it);
  const t = topSheet();
  if (t && t.id === 'food-search') {
    const below = LAYERS[LAYERS.length - 2];
    if (below && below.id === 'meal-confirm') closeSheet(); else replaceSheet({ id: 'meal-confirm', full: true, render: mealConfirmHtml, after: hydrateMealImgs });
  }
}
function addWater(date, ml) {
  const d = clone(nutriDoc(date) || { date }); delete d.id; d.date = date;
  d.water = Math.max(0, (num(d.water) || 0) + ml);
  put('nutri', date, d);
  haptic(8);
}
function toggleSupp(date, key) {
  const d = clone(nutriDoc(date) || { date }); delete d.id; d.date = date;
  d[key] = !d[key];
  put('nutri', date, d).then(() => { if (d[key]) toast(key === 'creatine' ? 'Creatina registrada.' : 'Gelatina registrada: carga el RF en 30-60 min.'); });
}
