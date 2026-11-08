// Contraste WCAG de cada combinación texto/fondo que usa la interfaz.
// node scripts/contrast.mjs [--all]   (sale con código 1 si alguna combinación no llega al mínimo)
// Lee los tokens de src/styles/00-tokens.css; los colores con transparencia se componen sobre su fondo.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const css = fs.readFileSync(path.join(ROOT, 'src', 'styles', '00-tokens.css'), 'utf8');
const root = (css.match(/:root\s*\{([\s\S]*?)\n\}/) || [])[1] || '';
const T = {};
for (const m of root.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) T[m[1]] = m[2].trim();

function resolve(v, seen = new Set()) {
  const m = /^var\((--[a-z0-9-]+)\)$/.exec(v);
  if (!m) return v;
  if (seen.has(m[1]) || !(m[1] in T)) throw new Error('token sin valor: ' + m[1]);
  seen.add(m[1]);
  return resolve(T[m[1]], seen);
}
function parse(v) {
  v = resolve(v.startsWith('--') ? 'var(' + v + ')' : v);
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) { const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255, 1]; }
  m = /^#([0-9a-f]{3})$/i.exec(v);
  if (m) return [...m[1]].map(c => parseInt(c + c, 16)).concat(1);
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/i.exec(v);
  if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  throw new Error('color no reconocido: ' + v);
}
// Capas de abajo hacia arriba: ['--surface-1', '--blue-soft'] = blue-soft sobre surface-1
function flatten(layers) {
  let [r, g, b] = parse(layers[0]);
  for (const l of layers.slice(1)) { const [r2, g2, b2, a] = parse(l); r = r2 * a + r * (1 - a); g = g2 * a + g * (1 - a); b = b2 * a + b * (1 - a); }
  return [r, g, b];
}
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
function ratio(fg, bgLayers) {
  const bg = flatten(bgLayers);
  const [r, g, b, a] = parse(fg);
  const f = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
  const L1 = lum(f), L2 = lum(bg);
  return (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
}

const SURF = ['--bg', '--surface-1', '--surface-2', '--surface-3'];
const TONES = ['blue', 'lime', 'amber', 'red', 'violet'];
const C = [];
const add = (fg, bg, min, what) => C.push({ fg, bg: Array.isArray(bg) ? bg : [bg], min, what });
// Texto neutro
for (const s of SURF) { add('--fg', s, 4.5, 'texto'); add('--fg-2', s, 4.5, 'texto secundario'); add('--fg-3', s, 4.5, 'metadatos'); }
// Controles sobre cualquier superficie (rellenos translúcidos: escalas, pasos, filas)
for (const s of ['--surface-1', '--surface-2']) for (const f of ['--fill-1', '--fill-2', '--fill-3']) { add('--fg-2', [s, f], 4.5, 'control'); if (f !== '--fill-3') add('--fg-3', [s, f], 4.5, 'control (metadato)'); } // fill-3 solo lleva texto principal o secundario
// Texto en tono sobre su fondo suave (chips, badges, notas)
for (const t of TONES) for (const s of ['--surface-1', '--surface-2']) add('--' + t + '-ink', [s, '--' + t + '-soft'], 4.5, 'chip ' + t);
// Color base como texto (cifras, etiquetas) y como icono o borde con significado
for (const t of TONES) for (const s of SURF) { add('--' + t, s, 4.5, 'cifra ' + t); add('--' + t + '-ink', s, 4.5, 'texto ' + t); }
// Botones y rellenos
add('--on-blue', '--blue-fill', 4.5, 'botón primario');
add('--fg', '--surface-3', 4.5, 'botón secundario');
for (const t of ['lime', 'amber', 'red', 'violet']) add('--on-accent', '--' + t, 4.5, 'texto sobre relleno ' + t);
add('--on-accent', '--lime-ink', 4.5, 'récord');
// Bordes, foco e indicadores (≥ 3:1)
for (const s of SURF) { add('--blue', s, 3, 'anillo de foco'); add('--line-sel', s, 3, 'borde seleccionado'); }
// Notas y avisos: texto sobre el tinte suave de la nota
for (const t of ['amber', 'red']) for (const s of ['--surface-1', '--bg']) add('--fg-2', [s, '--' + t + '-tint'], 4.5, 'nota ' + t);
// Barra de pestañas y hoja (translúcidas sobre el fondo)
add('--fg-3', ['--bg', '--tabbar-bg'], 4.5, 'pestaña inactiva');
add('--fg', ['--bg', '--tabbar-bg'], 4.5, 'pestaña activa');
add('--on-blue', '--blue-fill', 4.5, 'badge de pendientes');
// Degradados de acción: se comprueban los dos extremos
for (const end of ['#3A6CF6', '#5A4FE6']) add('--on-blue', end, 4.5, 'botón primario, serie en curso, mensaje propio');
for (const end of ['#D8FB72', '#ADE73E']) add('--on-accent', end, 4.5, 'botón lima, serie hecha');
// Paneles con degradado: la zona más intensa (blanco 7 % + tono --g1 del contexto) sobre el fondo y sobre la hoja.
// Dentro de los paneles el texto usa --fg-2-tint y --fg-3-tint (un paso más claros); la cifra usa la tinta del tono.
const comp = fs.readFileSync(path.join(ROOT, 'src', 'styles', '20-components.css'), 'utf8');
const PANELS = [{ g1: T['--g1'], ink: T['--tone'] }].concat([...comp.matchAll(/(\.k-[a-z]+[^{]*)\{([^}]*--g1:[^}]*)\}/g)].map(m => ({ g1: (/--g1:\s*(rgba\([^)]*\))/.exec(m[2]) || [])[1], ink: (/--tone:\s*(var\(--[a-z0-9-]+\))/.exec(m[2]) || [])[1] || T['--tone'] })));
for (const { g1, ink } of PANELS) for (const base of ['--bg', '--surface-2']) {
  const L = [base, 'rgba(255, 255, 255, 0.07)', g1];
  add('--fg', L, 4.5, 'titular en panel ' + g1); add('--fg-2-tint', L, 4.5, 'texto en panel'); add('--fg-3-tint', L, 4.5, 'antetítulo en panel');
  add(ink.replace(/^var\((.*)\)$/, '$1'), L, 4.5, 'cifra del tono en panel');
  if (base === '--bg') for (const t of ['blue', 'lime', 'amber']) add('--' + t + '-ink', L, 4.5, 'estado ' + t + ' en panel');
}
// Auroras: arriba de cada pantalla, del modo entrenamiento, del descanso y de las hojas
add('--fg-3', ['--bg', 'rgba(70, 110, 255, 0.34)'], 4.5, 'texto sobre la aurora del entrenamiento');
add('--fg-3', ['--bg', 'rgba(255, 160, 50, 0.2)'], 4.5, 'texto sobre la aurora del calentamiento');
add('--fg-3', ['--surface-2', 'rgba(70, 110, 255, 0.16)'], 4.5, 'texto sobre la aurora de la hoja');
for (const [ink, glow] of [['--blue-ink', 'rgba(91, 140, 255, 0.24)'], ['--amber-ink', 'rgba(255, 160, 50, 0.22)']]) add(ink, ['--bg', glow], 4.5, 'cifra del descanso');

let fails = 0;
const rows = [];
for (const c of C) {
  let r;
  try { r = ratio(c.fg, c.bg); } catch (e) { rows.push(['ERROR', c.fg, c.bg.join(' + '), e.message]); fails++; continue; }
  const ok = r >= c.min;
  if (!ok) fails++;
  if (!ok || process.argv.includes('--all')) rows.push([ok ? 'ok' : 'FALLA', c.fg, c.bg.join(' + '), r.toFixed(2) + ' (mín ' + c.min + ')', c.what]);
}
const w = [6, 18, 40, 18];
for (const r of rows) console.log(r.map((x, i) => String(x).padEnd(w[i] || 0)).join(' '));
console.log('contraste · ' + C.length + ' combinaciones · fallas: ' + fails);
process.exit(fails ? 1 : 0);
