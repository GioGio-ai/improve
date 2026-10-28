/* ============================================================
   NUTRICIÓN — objetivos por día, alimentos naturales y menús
   Valores por 100 g (cocido salvo indicación). p proteína, c carbohidratos, f grasa.
   ============================================================ */
const FD = (id, n, cat, p, c, f, kcal, unit, ug, alias, x) => Object.assign({ id, n, cat, p, c, f, kcal, unit: unit || null, ug: ug || null, alias: alias || [] }, x || {});
const FOODS = [
  // Proteínas
  FD('huevo', 'Huevo casero', 'prot', 12.6, 1.1, 10.6, 155, 'unidad', 50, ['huevos', 'huevo duro', 'huevo revuelto', 'omelette', 'tortilla de huevo'], { note: 'Siempre bien cocido.' }),
  FD('clara', 'Clara de huevo', 'prot', 10.9, 0.7, 0.2, 52, 'unidad', 33, ['claras']),
  FD('carne', 'Carne vacuna magra', 'prot', 30, 0, 6, 180, 'porción', 150, ['carne', 'bife', 'nalga', 'peceto', 'lomo', 'carne asada', 'asado magro', 'milanesa al horno sin rebozar']),
  FD('carne_picada', 'Carne picada', 'prot', 26, 0, 10, 200, 'porción', 150, ['picadito', 'carne molida', 'albóndigas']),
  FD('pollo', 'Pechuga de pollo', 'prot', 31, 0, 3.6, 165, 'porción', 150, ['pollo', 'pechuga', 'pollo a la plancha']),
  FD('pollo_muslo', 'Muslo de pollo sin piel', 'prot', 26, 0, 9, 190, 'unidad', 110, ['muslo', 'pata muslo']),
  FD('pescado', 'Pescado de río (surubí, dorado)', 'prot', 20, 0, 5, 125, 'porción', 150, ['pescado', 'surubí', 'dorado', 'pacú', 'tilapia', 'merluza']),
  FD('higado', 'Hígado vacuno', 'prot', 29, 5, 5, 175, 'porción', 120, ['hígado']),
  FD('atun', 'Atún al natural', 'prot', 26, 0, 1, 116, 'lata', 120, ['atún'], { proc: true }),
  // Lácteos
  FD('leche_cabra', 'Leche de cabra (hervida)', 'lacteo', 3.6, 4.5, 4.1, 69, 'vaso', 250, ['leche de cabra', 'leche'], { ml: true, note: 'Cruda: hiérvela siempre.' }),
  FD('leche_vaca', 'Leche de vaca entera', 'lacteo', 3.2, 4.8, 3.3, 61, 'vaso', 250, ['leche de vaca'], { ml: true }),
  FD('yogur', 'Yogur natural sin azúcar', 'lacteo', 3.5, 4.7, 3.3, 61, 'pote', 200, ['yogur', 'yogurt']),
  FD('yogur_griego', 'Yogur griego natural', 'lacteo', 9, 4, 5, 97, 'pote', 170, ['griego']),
  FD('queso_py', 'Queso Paraguay', 'lacteo', 22, 2, 23, 300, 'feta', 30, ['queso paraguay', 'queso', 'queso fresco']),
  FD('ricota', 'Ricota', 'lacteo', 11, 3, 10, 150, 'porción', 100, ['ricotta', 'requesón']),
  // Legumbres y frutos secos
  FD('poroto', 'Poroto cocido', 'carb', 8.7, 22.8, 0.5, 127, 'taza', 170, ['porotos', 'frijol', 'feijão', 'kumanda']),
  FD('lenteja', 'Lenteja cocida', 'carb', 9, 20, 0.4, 116, 'taza', 200, ['lentejas', 'guiso de lentejas']),
  FD('garbanzo', 'Garbanzo cocido', 'carb', 8.9, 27, 2.6, 164, 'taza', 165, ['garbanzos']),
  FD('mani', 'Maní tostado sin sal', 'grasa', 26, 16, 49, 585, 'puñado', 30, ['maní', 'cacahuate']),
  FD('manteca_mani', 'Manteca de maní natural', 'grasa', 25, 20, 50, 590, 'cda', 16, ['mantequilla de maní', 'pasta de maní']),
  FD('nueces', 'Nueces', 'grasa', 15, 14, 65, 654, 'puñado', 30, ['nuez']),
  FD('almendras', 'Almendras', 'grasa', 21, 22, 50, 579, 'puñado', 30, ['almendra']),
  FD('chia', 'Semillas de chía', 'grasa', 17, 42, 31, 486, 'cda', 12, ['chía']),
  // Carbohidratos
  FD('mandioca', 'Mandioca hervida', 'carb', 1.2, 32, 0.3, 135, 'trozo', 100, ['mandioca', 'yuca', "mandi'o"]),
  FD('arroz', 'Arroz blanco cocido', 'carb', 2.7, 28, 0.3, 130, 'taza', 160, ['arroz']),
  FD('arroz_int', 'Arroz integral cocido', 'carb', 2.6, 23, 0.9, 112, 'taza', 160, ['arroz integral']),
  FD('papa', 'Papa hervida', 'carb', 1.9, 20, 0.1, 87, 'unidad', 170, ['papa', 'papas', 'puré de papa', 'patata']),
  FD('batata', 'Batata', 'carb', 1.6, 20.7, 0.1, 90, 'unidad', 150, ['batata', 'boniato', 'camote']),
  FD('avena', 'Avena en copos (cruda)', 'carb', 13, 66, 7, 380, 'taza', 40, ['avena']),
  FD('quinoa', 'Quinoa cocida', 'carb', 4.4, 21.3, 1.9, 120, 'taza', 185, ['quinua']),
  FD('choclo', 'Choclo cocido', 'carb', 3.4, 21, 1.5, 96, 'unidad', 150, ['choclo', 'maíz', 'elote']),
  FD('zapallo', 'Zapallo cocido', 'verdura', 1, 10, 0.1, 40, 'porción', 150, ['zapallo', 'calabaza', 'andaí']),
  // Frutas
  FD('banana', 'Banana', 'fruta', 1.1, 23, 0.3, 89, 'unidad', 120, ['banana', 'plátano', 'banano']),
  FD('manzana', 'Manzana', 'fruta', 0.3, 14, 0.2, 52, 'unidad', 180, ['manzana']),
  FD('naranja', 'Naranja', 'fruta', 0.9, 12, 0.1, 47, 'unidad', 160, ['naranja', 'mandarina']),
  FD('mamon', 'Mamón (papaya)', 'fruta', 0.5, 11, 0.3, 43, 'porción', 200, ['mamón', 'papaya']),
  FD('mango', 'Mango', 'fruta', 0.8, 15, 0.4, 60, 'unidad', 200, ['mango']),
  FD('sandia', 'Sandía', 'fruta', 0.6, 7.6, 0.2, 30, 'tajada', 300, ['sandía']),
  FD('pina', 'Piña', 'fruta', 0.5, 13, 0.1, 50, 'porción', 150, ['piña', 'ananá']),
  FD('frutilla', 'Frutillas', 'fruta', 0.7, 7.7, 0.3, 32, 'taza', 150, ['frutilla', 'fresas']),
  FD('uva', 'Uvas', 'fruta', 0.7, 18, 0.2, 69, 'taza', 150, ['uva']),
  FD('mburucuya', 'Mburucuyá', 'fruta', 2.2, 23, 0.7, 97, 'unidad', 40, ['maracuyá', 'mburucuyá']),
  FD('palta', 'Palta', 'grasa', 2, 8.5, 14.7, 160, 'media', 100, ['palta', 'aguacate']),
  // Grasas, endulzante, bebidas
  FD('aceite_oliva', 'Aceite de oliva', 'grasa', 0, 0, 100, 884, 'cda', 13.5, ['aceite de oliva', 'aceite']),
  FD('miel', 'Miel silvestre', 'otro', 0.3, 82, 0, 304, 'cda', 21, ['miel']),
  FD('jugo_naranja', 'Jugo de naranja natural', 'bebida', 0.7, 10.4, 0.2, 45, 'vaso', 250, ['jugo de naranja', 'jugo'], { ml: true }),
  FD('jugo_remolacha', 'Jugo de remolacha natural', 'bebida', 1, 7.5, 0.1, 35, 'vaso', 250, ['jugo de remolacha', 'remolacha licuada'], { ml: true }),
  FD('verduras', 'Ensalada de verduras', 'verdura', 1, 5, 0.2, 25, 'plato', 150, ['ensalada', 'lechuga', 'tomate', 'verduras']),
  FD('zanahoria', 'Zanahoria', 'verdura', 0.9, 9.6, 0.2, 41, 'unidad', 70, ['zanahoria']),
  FD('remolacha', 'Remolacha cocida', 'verdura', 1.7, 10, 0.2, 44, 'porción', 100, ['remolacha', 'betarraga']),
  FD('brocoli', 'Brócoli cocido', 'verdura', 2.4, 7, 0.4, 35, 'taza', 150, ['brócoli']),
  FD('espinaca', 'Espinaca cocida', 'verdura', 3, 3.8, 0.3, 23, 'taza', 180, ['espinaca', 'acelga']),
  FD('gelatina', 'Gelatina sin sabor', 'prot', 86, 0, 0, 335, 'cda', 10, ['gelatina', 'colágeno'], { note: '15 g con vitamina C, 30-60 min antes de la carga del recto femoral.' }),
  FD('mate', 'Mate o tereré', 'bebida', 0, 0, 0, 0, 'termo', 500, ['mate', 'tereré', 'cocido'], { ml: true, water: true }),
  FD('cafe', 'Café', 'bebida', 0.1, 0, 0, 2, 'taza', 150, ['café'], { ml: true, water: true, caf: 80 }),
  FD('agua', 'Agua', 'bebida', 0, 0, 0, 0, 'vaso', 250, ['agua', 'agua con sal'], { ml: true, water: true }),
];
const FOOD_INDEX = {};
FOODS.forEach(f => { FOOD_INDEX[f.id] = f; });
/* Alimentos propios (agregados con IA): entran a la base y al buscador */
function syncUserFoods() {
  for (const d of ((typeof S !== 'undefined' && S.data && S.data.foods) || [])) {
    if (!d || !d.id || !d.n) continue;
    const f = FOOD_INDEX[d.id] || { id: d.id, user: true };
    Object.assign(f, { n: d.n, alias: d.alias || [], p: num(d.p) || 0, c: num(d.c) || 0, f: num(d.f) || 0, kcal: num(d.kcal) || 0, ug: num(d.ug) || 100, unit: d.unit || 'porción', ml: !!d.ml });
    if (!FOOD_INDEX[d.id]) { FOOD_INDEX[d.id] = f; FOODS.unshift(f); }
  }
}
function foodMacros(food, g) {
  const k = (num(g) || 0) / 100;
  return { p: Math.round(food.p * k * 10) / 10, c: Math.round(food.c * k * 10) / 10, f: Math.round(food.f * k * 10) / 10, kcal: Math.round(food.kcal * k) };
}
function itemFromFood(id, g) {
  const fd = FOOD_INDEX[id]; if (!fd) return null;
  return Object.assign({ n: fd.n, id: fd.id, g: Math.round(g) }, foodMacros(fd, g), { src: 'db' });
}
function sumItems(items) {
  const t = { p: 0, c: 0, f: 0, kcal: 0 };
  for (const x of (items || [])) { t.p += num(x.p) || 0; t.c += num(x.c) || 0; t.f += num(x.f) || 0; t.kcal += num(x.kcal) || 0; }
  return { p: Math.round(t.p), c: Math.round(t.c), f: Math.round(t.f), kcal: Math.round(t.kcal) };
}
function fmtQty(it) {
  const fd = it.id && FOOD_INDEX[it.id];
  const g = num(it.g);
  if (g === null) return '';
  if (fd && fd.unit && fd.ug && Math.abs(g / fd.ug - Math.round(g / fd.ug)) < 0.08 && Math.round(g / fd.ug) >= 1 && ['unidad', 'vaso', 'cda', 'feta', 'pote', 'lata', 'media'].includes(fd.unit)) {
    const n = Math.round(g / fd.ug);
    return n + ' ' + (n === 1 ? fd.unit : fd.unit === 'unidad' ? 'unidades' : fd.unit === 'cda' ? 'cdas' : fd.unit + 's') + (fd.ml ? ' (' + g + ' ml)' : '');
  }
  return g + (fd && fd.ml ? ' ml' : ' g');
}

/* ---------- Objetivos del día ---------- */
const CHO_BY_KIND = { descanso: 3.5, bajo: 4.5, moderado: 5.5, alto: 7, prueba: 7 };
const KIND_N = { descanso: 'Descanso', bajo: 'Carga baja', moderado: 'Carga media', alto: 'Carga alta', prueba: 'Día clave' };
function nutritionTargets(kg, kind, ag) {
  if (!kg) return null;
  const choKg = CHO_BY_KIND[kind] || 5.5;
  const p = Math.round(kg * 2.0 / 5) * 5, c = Math.round(kg * choKg / 10) * 10, f = Math.round(kg * 1.1 / 5) * 5;
  let trainMin = 0, fieldMin = 0;
  if (ag) for (const it of ag.items) if (it.kind === 'train') { trainMin += it.dur; if (it.key === 'campo' || it.key === 'club') fieldMin += it.dur; }
  const water = Math.round((kg * 0.04 + (trainMin - fieldMin) / 60 * 0.5 + fieldMin / 60 * 0.8) * 10) / 10;
  return { kind, kindN: KIND_N[kind] || '', kg, p, c, f, kcal: Math.round(p * 4 + c * 4 + f * 9), choKg, perMeal: Math.round(kg * 0.4 / 5) * 5, water, creatine: 5 };
}

/* ---------- Reparto por comida ---------- */
const SLOT_N = { desayuno: 'Desayuno', post: 'Post entreno', colacion: 'Media mañana', almuerzo: 'Almuerzo', merienda: 'Merienda', cena: 'Cena', nocturna: 'Antes de dormir', extra: 'Extra' };
const SLOT_SHARE = {
  desayuno: { p: 1, c: 1.0, f: 0.9 }, post: { p: 0.8, c: 0.8, f: 0.3 }, colacion: { p: 0.6, c: 0.7, f: 0.5 },
  almuerzo: { p: 1.1, c: 1.3, f: 1.3 }, merienda: { p: 0.7, c: 0.9, f: 0.5 }, cena: { p: 1.1, c: 1.1, f: 1.2 }, nocturna: { p: 0.7, c: 0.2, f: 0.6 },
};
function slotTargets(ag, T) {
  const meals = ag.items.filter(x => x.kind === 'meal');
  const sum = (k) => meals.reduce((a, m) => a + (SLOT_SHARE[m.slot] ? SLOT_SHARE[m.slot][k] : 0.8), 0) || 1;
  const sp = sum('p'), sc = sum('c'), sf = sum('f');
  const out = {};
  for (const m of meals) {
    const w = SLOT_SHARE[m.slot] || { p: 0.8, c: 0.8, f: 0.8 };
    out[m.key] = { p: Math.round(T.p * w.p / sp), c: Math.round(T.c * w.c / sc), f: Math.round(T.f * w.f / sf) };
  }
  return out;
}

/* ---------- Menús sugeridos: comida casera, sin harinas ni azúcar ---------- */
// Cada plantilla: proteína base (escala para llegar a la proteína), carbohidrato principal (escala), extras fijos.
const MENUS = {
  desayuno: [
    { name: 'Huevos, leche de cabra y fruta', prot: [['huevo', 150], ['leche_cabra', 250]], carb: ['banana', 120, 360], fix: [['miel', 21]], tip: 'Con el mate de la mañana.' },
    { name: 'Huevos con mandioca y queso', prot: [['huevo', 150], ['queso_py', 30]], carb: ['mandioca', 150, 300], fix: [['naranja', 160]] },
    { name: 'Avena con leche, banana y miel', prot: [['leche_cabra', 300], ['huevo', 100]], carb: ['avena', 50, 90], fix: [['banana', 120], ['miel', 14]] },
  ],
  post: [
    { name: 'Leche de cabra, banana y miel', prot: [['leche_cabra', 400], ['huevo', 100]], carb: ['banana', 120, 240], fix: [['miel', 21]], tip: 'Lleva los huevos duros y la fruta al gimnasio.' },
    { name: 'Yogur con fruta, miel y queso', prot: [['yogur', 300], ['queso_py', 40]], carb: ['banana', 120, 240], fix: [['miel', 14]] },
  ],
  colacion: [
    { name: 'Fruta y yogur', prot: [['yogur', 250]], carb: ['banana', 120, 240], fix: [['miel', 14]] },
  ],
  almuerzo: [
    { name: 'Carne, arroz, poroto y ensalada', prot: [['carne', 130]], carb: ['arroz', 160, 450], fix: [['poroto', 85], ['verduras', 150], ['aceite_oliva', 10]] },
    { name: 'Pollo, mandioca y ensalada', prot: [['pollo', 140]], carb: ['mandioca', 150, 450], fix: [['verduras', 150], ['aceite_oliva', 10]] },
    { name: 'Pescado, papa y verduras', prot: [['pescado', 180]], carb: ['papa', 200, 600], fix: [['brocoli', 150], ['aceite_oliva', 10]] },
    { name: 'Guiso de lentejas con carne', prot: [['carne_picada', 100], ['lenteja', 200]], carb: ['arroz', 100, 350], fix: [['zanahoria', 70], ['aceite_oliva', 8]] },
  ],
  merienda: [
    { name: 'Mandioca con queso Paraguay', prot: [['queso_py', 40], ['leche_cabra', 200]], carb: ['mandioca', 150, 300], fix: [], tip: 'Clásico y fácil de digerir antes de la cancha.' },
    { name: 'Banana, miel y yogur', prot: [['yogur', 250]], carb: ['banana', 120, 360], fix: [['miel', 21]] },
  ],
  cena: [
    { name: 'Pescado, batata y verduras', prot: [['pescado', 180]], carb: ['batata', 150, 450], fix: [['verduras', 150], ['aceite_oliva', 10]] },
    { name: 'Pollo, arroz y zapallo', prot: [['pollo', 140]], carb: ['arroz', 150, 400], fix: [['zapallo', 150], ['aceite_oliva', 10]] },
    { name: 'Carne, papa y ensalada', prot: [['carne', 130]], carb: ['papa', 200, 550], fix: [['verduras', 150], ['aceite_oliva', 10]] },
    { name: 'Tortilla de huevos con quinoa', prot: [['huevo', 200], ['queso_py', 30]], carb: ['quinoa', 150, 400], fix: [['espinaca', 120]] },
  ],
  nocturna: [
    { name: 'Leche de cabra tibia', prot: [['leche_cabra', 350]], carb: null, fix: [] },
    { name: 'Ricota con miel', prot: [['ricota', 150]], carb: null, fix: [['miel', 10]] },
  ],
};
function dayIndex(date) { const d = parseYmd(date); return Math.floor((d - new Date(d.getFullYear(), 0, 1)) / DAYMS); }
function buildMenu(slot, tgt, date, variant) {
  const list = MENUS[slot] || MENUS.colacion;
  const tpl = list[(dayIndex(date) + (variant || 0)) % list.length];
  const items = [];
  // Proteína: escala la primera fuente hasta el objetivo (máximo x1,8)
  const prot = tpl.prot.map(([id, g]) => [id, g]);
  const fixed = (tpl.fix || []).map(([id, g]) => itemFromFood(id, g));
  const pFixed = fixed.reduce((a, x) => a + x.p, 0) + prot.slice(1).reduce((a, [id, g]) => a + foodMacros(FOOD_INDEX[id], g).p, 0);
  const main = FOOD_INDEX[prot[0][0]];
  let mainG = prot[0][1];
  const needP = tgt.p - pFixed;
  if (main.p > 0 && needP > 0) mainG = clamp(needP / main.p * 100, prot[0][1] * 0.75, prot[0][1] * 1.5);
  if (main.id === 'huevo') mainG = Math.min(mainG, 200);
  mainG = main.ug && ['unidad', 'vaso'].includes(main.unit) ? Math.max(main.ug, Math.round(mainG / main.ug) * main.ug) : Math.round(mainG / (main.cat === 'lacteo' ? 50 : 10)) * (main.cat === 'lacteo' ? 50 : 10);
  items.push(itemFromFood(main.id, mainG));
  prot.slice(1).forEach(([id, g]) => items.push(itemFromFood(id, g)));
  // Carbohidrato: escala el principal para cubrir lo que falta
  if (tpl.carb) {
    const [cid, cmin, cmax] = tpl.carb, cf = FOOD_INDEX[cid];
    const cSoFar = items.reduce((a, x) => a + x.c, 0) + fixed.reduce((a, x) => a + x.c, 0);
    let g = clamp((tgt.c - cSoFar) / cf.c * 100, cmin, cmax);
    g = cf.ug && cf.unit === 'unidad' ? Math.max(cf.ug, Math.round(g / cf.ug) * cf.ug) : Math.round(g / 10) * 10;
    items.push(itemFromFood(cid, g));
  }
  fixed.forEach(x => items.push(x));
  return { slot, name: tpl.name, tip: tpl.tip || '', items, totals: sumItems(items), variants: list.length };
}

/* ---------- Texto → alimentos (sin IA, para cuando no hay conexión) ---------- */
const UNIT_WORDS = { g: 1, gr: 1, grs: 1, gramos: 1, gramo: 1, kg: 1000, ml: 1, cc: 1, l: 1000, litro: 1000, litros: 1000 };
const PORTION_WORDS = { unidad: 1, unidades: 1, u: 1, vaso: 'vaso', vasos: 'vaso', taza: 'taza', tazas: 'taza', cda: 'cda', cdas: 'cda', cucharada: 'cda', cucharadas: 'cda', plato: 'plato', porcion: 'porción', porción: 'porción', porciones: 'porción', trozo: 'trozo', trozos: 'trozo', feta: 'feta', fetas: 'feta', puñado: 'puñado', pote: 'pote', media: 'media' };
const WORD_NUM = { un: 1, una: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, medio: 0.5, media: 0.5 };
function normTxt(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9ñ.,\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function matchFood(txt) {
  const t = normTxt(txt);
  let best = null, bestLen = 0;
  for (const f of FOODS) for (const a of [f.n].concat(f.alias)) {
    const k = normTxt(a);
    if (k && (t.includes(k) || (k.length > 4 && t.includes(k.replace(/s$/, ''))))) { if (k.length > bestLen) { best = f; bestLen = k.length; } }
  }
  return best;
}
function parseFoodText(text) {
  const parts = String(text || '').split(/,|;|\n|\+|\by\b|\bcon\b/i).map(x => x.trim()).filter(Boolean);
  const out = [], miss = [];
  for (const raw of parts) {
    const t = normTxt(raw);
    const fd = matchFood(t);
    if (!fd) { miss.push(raw); continue; }
    let qty = null, g = null;
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*([a-zñ]+)?/);
    if (m) { qty = Number(m[1].replace(',', '.')); const u = m[2] || ''; if (UNIT_WORDS[u]) g = qty * UNIT_WORDS[u]; else g = qty * (fd.ug || 100); }
    else { const w = t.split(' ').find(x => WORD_NUM[x] !== undefined); qty = w ? WORD_NUM[w] : 1; g = qty * (fd.ug || 100); }
    out.push(itemFromFood(fd.id, g));
  }
  return { items: out, miss };
}

/* ---------- Guía de nutrición basada en evidencia ---------- */
const NUTRI_GUIDE = [
  { lvl: 'Alta', cls: 'good', items: [
    ['Proteína 2 g/kg al día', 'Repartida en 4-5 comidas de ~0,4 g/kg (≈ 35 g). Clave para reparar el recto femoral.'],
    ['Carbohidratos según la carga', 'De 3,5 g/kg en descanso a 7 g/kg en días de doble sesión o pruebas. Son el combustible del sprint y el golpeo.'],
    ['Hidratación', 'Orina clara durante el día. Tras entrenar, repón 1,25-1,5 L por cada kg perdido. El mate y el tereré cuentan como agua.'],
    ['Creatina monohidrato 3-5 g al día', 'Todos los días, con cualquier comida. Mejora fuerza y potencia y ayuda a conservar músculo en la rehabilitación.'],
  ] },
  { lvl: 'Moderada', cls: 'warn', items: [
    ['Proteína antes de dormir', '30-40 g de proteína lenta (leche, queso, ricota) en días de mucha carga.'],
    ['Cafeína 3 mg/kg antes de pruebas', 'Unos 260 mg, 60 min antes, solo si ya la tomas. Nunca después de las 14:00: arruina el sueño.'],
    ['Jugo de remolacha', '500 ml 2-3 h antes de una prueba o partido. Mejora el rendimiento en esfuerzos repetidos.'],
    ['Sal en días de calor', 'Tu agua con sal marina ayuda a reponer sodio. En calor fuerte, súmala también durante la cancha.'],
  ] },
  { lvl: 'Preliminar', cls: '', items: [
    ['Gelatina + vitamina C', '15 g de gelatina sin sabor con una naranja, 30-60 min antes de cargar el recto femoral. Evidencia temprana para tendones.'],
    ['Cúrcuma en el mate', 'Efecto modesto sobre el dolor muscular. Se absorbe mejor con pimienta negra y algo de grasa.'],
  ] },
  { lvl: 'Seguridad', cls: 'pain', items: [
    ['Leche de cabra cruda', 'Hiérvela siempre: puede tener Brucella, Listeria o E. coli.'],
    ['Huevos caseros', 'Bien cocidos: yema y clara firmes.'],
    ['Alcohol', 'Cero en la rehabilitación: baja la síntesis de proteína y empeora el sueño 24-48 h.'],
  ] },
];
