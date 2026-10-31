// Construye la app en docs/ (GitHub Pages): node scripts/build.mjs [--dev]
import { build, transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');
const GEN = path.join(ROOT, 'build');
const ASSETS_SRC = process.env.IMPROVE_ASSETS || '/home/claude/build/dist';
const dev = process.argv.includes('--dev');
const hash = (buf) => crypto.createHash('sha256').update(buf).digest('hex').slice(0, 10);
const rm = (p) => fs.rmSync(p, { recursive: true, force: true });
const cp = (a, b) => { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); };

// 1) Código de la app: archivos en orden, en un módulo
const appDir = path.join(SRC, 'app');
const files = fs.readdirSync(appDir).filter(f => f.endsWith('.js')).sort();
let code = "/* Generado por scripts/build.mjs: no editar */\n";
for (const f of files) code += '\n/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(appDir, f), 'utf8');
const version = (code.match(/const VERSION = '([^']+)'/) || [])[1] || '0';
// Datos de la sección Aprende: src/data/datos-*.json → un JSON con hash (carga diferida, precache del SW)
const dataDir = path.join(SRC, 'data');
const datos = fs.existsSync(dataDir) ? fs.readdirSync(dataDir).filter(f => /^datos-.*\.json$/.test(f)).sort().flatMap(f => JSON.parse(fs.readFileSync(path.join(dataDir, f), 'utf8'))) : [];
const datosJson = JSON.stringify(datos);
const datosName = 'datos-' + hash(datosJson) + '.json';
code += "\nconst DATOS_URL = 'assets/" + datosName + "';\n";
code += '\nexport { bootApp, LOGO_SVG, VERSION };\n';
fs.mkdirSync(GEN, { recursive: true });
fs.writeFileSync(path.join(GEN, 'app.gen.js'), code);

// 2) Limpieza de docs/ (se conservan .nojekyll y CNAME)
for (const f of fs.existsSync(OUT) ? fs.readdirSync(OUT) : []) if (!['.nojekyll', 'CNAME', 'lib'].includes(f)) rm(path.join(OUT, f));
fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

// 3) JS
const res = await build({
  entryPoints: [path.join(SRC, 'main.js')], bundle: true, format: 'esm', minify: !dev, sourcemap: dev ? 'inline' : false,
  target: ['es2020', 'chrome96', 'safari15'], write: false, legalComments: 'none', charset: 'utf8', logLevel: 'warning',
  define: { 'process.env.NODE_ENV': '"production"' },
});
const js = res.outputFiles[0].contents;
const jsName = 'app-' + hash(js) + '.js';
fs.writeFileSync(path.join(OUT, 'assets', jsName), js);
fs.writeFileSync(path.join(OUT, 'assets', datosName), datosJson);

// 4) CSS
const cssSrc = fs.readdirSync(path.join(SRC, 'styles')).filter(f => f.endsWith('.css')).sort().map(f => fs.readFileSync(path.join(SRC, 'styles', f), 'utf8')).join('\n');
const css = (await transform(cssSrc, { loader: 'css', minify: !dev, target: ['chrome96', 'safari15'] })).code;
const cssName = 'app-' + hash(css) + '.css';
fs.writeFileSync(path.join(OUT, 'assets', cssName), css);

// 5) Fuentes, íconos, biblioteca de ejercicios (pública: Free Exercise DB)
const fontDir = path.join(ROOT, 'node_modules', '@fontsource-variable');
cp(path.join(fontDir, 'geist', 'files', 'geist-latin-wght-normal.woff2'), path.join(OUT, 'fonts', 'geist-latin-wght-normal.woff2'));
cp(path.join(fontDir, 'geist-mono', 'files', 'geist-mono-latin-wght-normal.woff2'), path.join(OUT, 'fonts', 'geist-mono-latin-wght-normal.woff2'));
const barlowDir = path.join(ROOT, 'node_modules', '@fontsource', 'barlow-condensed', 'files');
cp(path.join(barlowDir, 'barlow-condensed-latin-600-normal.woff2'), path.join(OUT, 'fonts', 'barlow-condensed-latin-600-normal.woff2'));
cp(path.join(barlowDir, 'barlow-condensed-latin-700-normal.woff2'), path.join(OUT, 'fonts', 'barlow-condensed-latin-700-normal.woff2'));
for (const f of fs.readdirSync(path.join(SRC, 'static', 'icons'))) cp(path.join(SRC, 'static', 'icons', f), path.join(OUT, 'icons', f));
const libSrc = path.join(ASSETS_SRC, 'lib');
if (fs.existsSync(libSrc)) for (const f of fs.readdirSync(libSrc)) { const dst = path.join(OUT, 'lib', f); if (!fs.existsSync(dst) || fs.statSync(dst).size !== fs.statSync(path.join(libSrc, f)).size) cp(path.join(libSrc, f), dst); }

// 6) HTML, manifest y service worker
const html = fs.readFileSync(path.join(SRC, 'static', 'index.html'), 'utf8').replace('{{CSS}}', cssName).replace('{{JS}}', jsName);
fs.writeFileSync(path.join(OUT, 'index.html'), html);
cp(path.join(SRC, 'static', 'manifest.webmanifest'), path.join(OUT, 'manifest.webmanifest'));
const pre = ['./', './index.html', './manifest.webmanifest', './assets/' + jsName, './assets/' + cssName, './assets/' + datosName, './fonts/geist-latin-wght-normal.woff2', './fonts/geist-mono-latin-wght-normal.woff2', './fonts/barlow-condensed-latin-600-normal.woff2', './fonts/barlow-condensed-latin-700-normal.woff2', './icons/icon.svg', './icons/icon-192.png', './icons/apple-touch-icon.png'];
const swVer = version + '-' + hash(js + css).slice(0, 6);
fs.writeFileSync(path.join(OUT, 'sw.js'), fs.readFileSync(path.join(SRC, 'static', 'sw.js'), 'utf8').replace('{{VERSION}}', swVer).replace('{{PRECACHE}}', JSON.stringify(pre)));

const kb = (n) => (n / 1024).toFixed(1) + ' KB';
console.log('IMPROVE ' + swVer + ' → docs/  js ' + kb(js.length) + ' · css ' + kb(css.length) + ' · datos ' + datos.length + ' (' + kb(datosJson.length) + ') · ' + files.length + ' módulos');
