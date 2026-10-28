/* ============================================================
   UTILIDADES: DOM, texto, iconos
   ============================================================ */
const $ = (s, el) => (el || document).querySelector(s);
const $$ = (s, el) => Array.from((el || document).querySelectorAll(s));
const esc = (s) => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const todayStr = () => ymd(new Date());
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };
const uid = (p) => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clone = (o) => JSON.parse(JSON.stringify(o === undefined ? null : o));
const sleepMs = (ms) => new Promise(r => setTimeout(r, ms));
function fmtNumRaw(v) { const n = num(v); return n === null ? '' : String(Math.round(n * 100) / 100).replace('.', ','); }
function parseNum(raw) { return num(String(raw === undefined || raw === null ? '' : raw).replace(',', '.').trim()); }
function haptic(ms) { try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (e) { /* sin vibración */ } }

const SVG = (p, sw) => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 2) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
const ICONS = {
  home: SVG('<path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z"/>'),
  dumb: SVG('<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>'),
  fork: SVG('<path d="M7 3v8M4.5 3v5a2.5 2.5 0 0 0 5 0V3M7 11v10M17 21V3c-2.5 1.5-3.5 4-3.5 7.5 0 1.6.9 2.5 2.2 2.5H17"/>'),
  chart: SVG('<path d="M5 20V12M12 20V5M19 20v-7"/>', 2.3),
  user: SVG('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
  spark: SVG('<path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>', 1.8),
  chat: SVG('<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4.2A8 8 0 1 1 20 12z"/>'),
  clock: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
  layers: SVG('<path d="M12 4l8 4-8 4-8-4z"/><path d="M4 12l8 4 8-4M4 16l8 4 8-4"/>'),
  bolt: SVG('<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>'),
  ball: SVG('<circle cx="12" cy="12" r="8.5"/><path d="M12 8.2l3.2 2.3-1.2 3.8H10l-1.2-3.8z"/><path d="M12 3.5v4.7M15.2 10.5l4.6-1.6M14 14.3l2.8 4M10 14.3l-2.8 4M8.8 10.5L4.2 8.9"/>', 1.8),
  flask: SVG('<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3"/>'),
  run: SVG('<circle cx="14" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v5M6 12l3-3 4 1 2 3 3 1M11 15l-1-4"/>'),
  cones: SVG('<path d="M7 20l3-14h4l3 14z"/><path d="M5 20h14M9 13h6"/>'),
  users: SVG('<circle cx="9" cy="8" r="3.2"/><path d="M3.5 19.5a5.5 5.5 0 0 1 11 0"/><path d="M16 5.2a3 3 0 0 1 0 5.6M18 19.5a5 5 0 0 0-2.5-4.3"/>'),
  trophy: SVG('<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a2 2 0 0 0 2 4M16 6h3a2 2 0 0 1-2 4M12 13v4M8.5 20h7M10 17h4"/>'),
  shield: SVG('<path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z"/>'),
  leaf: SVG('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19l7-7"/>'),
  moon: SVG('<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/>'),
  sun: SVG('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>'),
  sunrise: SVG('<path d="M12 3v5M8.5 6.5 12 3l3.5 3.5M4.9 12.9l1.4 1.4M17.7 14.3l1.4-1.4M3 18h2M19 18h2M7 18a5 5 0 0 1 10 0M3 21h18"/>'),
  bed: SVG('<path d="M3 18V8M21 18v-5a3 3 0 0 0-3-3h-7v6M3 14h18M3 18h18"/><circle cx="7" cy="11.5" r="1.8"/>'),
  coffee: SVG('<path d="M4 9h12v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16M8 3.5c-.6.8-.6 1.7 0 2.5M12 3.5c-.6.8-.6 1.7 0 2.5"/>'),
  heart: SVG('<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>'),
  pulse: SVG('<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>'),
  drop: SVG('<path d="M12 3.5s6 6.6 6 10.5a6 6 0 0 1-12 0c0-3.9 6-10.5 6-10.5z"/>'),
  flame: SVG('<path d="M12 21a6 6 0 0 0 6-6c0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 4.5-3 8a6 6 0 0 0 6 6z"/>'),
  camera: SVG('<path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.4-2h5.6l1.4 2h2.3A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z"/><circle cx="12" cy="12.8" r="3.4"/>'),
  image: SVG('<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><circle cx="9" cy="10" r="1.8"/><path d="M20.5 16l-5-5-8.5 8.5"/>'),
  pen: SVG('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
  chev: SVG('<path d="M9 6l6 6-6 6"/>', 2.4),
  chevL: SVG('<path d="M15 5l-7 7 7 7"/>', 2.4),
  chevD: SVG('<path d="M6 9l6 6 6-6"/>', 2.4),
  x: SVG('<path d="M6 6l12 12M18 6L6 18"/>', 2.4),
  check: SVG('<path d="M5 12.5l4.5 4.5L19 7.5"/>', 3),
  up: SVG('<path d="M6 15l6-6 6 6"/>', 2.4),
  down: SVG('<path d="M6 9l6 6 6-6"/>', 2.4),
  plus: SVG('<path d="M12 5v14M5 12h14"/>', 2.4),
  minus: SVG('<path d="M5 12h14"/>', 2.4),
  swap: SVG('<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>'),
  play: SVG('<path d="M8 5l11 7-11 7z" fill="currentColor"/>'),
  pause: SVG('<path d="M8 5v14M16 5v14"/>', 2.6),
  edit: SVG('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
  trash: SVG('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  copy: SVG('<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>'),
  star: SVG('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.7 1-5.9L3.5 9.7l5.9-.8z"/>'),
  cal: SVG('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
  info: SVG('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>', 2.2),
  warn: SVG('<path d="M12 4l9 16H3z"/><path d="M12 10v4M12 17.5h.01"/>', 2.2),
  dots: SVG('<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>', 2.4),
  grip: SVG('<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>', 2.2),
  search: SVG('<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>'),
  move: SVG('<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>'),
  timer: SVG('<circle cx="12" cy="13" r="7.5"/><path d="M12 9v4l2.5 2M9.5 2.5h5"/>'),
  book: SVG('<path d="M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z"/><path d="M5 19.5A1.5 1.5 0 0 0 6.5 21H19"/>'),
  wind: SVG('<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h7"/>'),
  undo: SVG('<path d="M9 7L4 12l5 5"/><path d="M4 12h10a6 6 0 0 1 0 12h-2"/>'),
  refresh: SVG('<path d="M20 11a8 8 0 0 0-14.8-3.5M4 4v4h4M4 13a8 8 0 0 0 14.8 3.5M20 20v-4h-4"/>'),
  ext: SVG('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  google: SVG('<path d="M20.5 12.2c0-.6 0-1.1-.1-1.7H12v3.3h4.8a4.1 4.1 0 0 1-1.8 2.7v2.2h2.9c1.7-1.6 2.6-3.9 2.6-6.5z"/><path d="M12 21c2.4 0 4.5-.8 5.9-2.2L15 16.6c-.8.6-1.8.9-3 .9-2.3 0-4.3-1.6-5-3.7H4.1v2.3A9 9 0 0 0 12 21z"/><path d="M7 13.8a5.4 5.4 0 0 1 0-3.6V7.9H4.1a9 9 0 0 0 0 8.2z"/><path d="M12 6.5c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 4.1 7.9L7 10.2c.7-2.1 2.7-3.7 5-3.7z"/>', 1.6),
  logout: SVG('<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10"/>'),
  sliders: SVG('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  scale: SVG('<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M8 9a5 5 0 0 1 8 0l-3 3"/>'),
  target: SVG('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>'),
  list: SVG('<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>', 2.4),
  history: SVG('<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6M3.5 4v4h4M12 8v4l3 2"/>'),
  min: SVG('<path d="M5 15h14"/>', 2.6),
  pill: SVG('<rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)"/><path d="M9.4 8.3l5.2 7.4" />'),
};
const ic = (n, cls) => '<span class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + (ICONS[n] || '') + '</span>';
const LOGO_SVG = '<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 28l7.5-7.5 5 4.5L30 14" stroke="#fff" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="30" cy="14" r="3.6" fill="#c8f250"/></svg>';

/* ---------- Portapapeles ---------- */
async function copyText(text) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch (e) { /* uso el respaldo */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.top = '0';
    document.body.appendChild(ta); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  } catch (e) { return false; }
}
function googleLink(q) { return 'https://www.google.com/search?q=' + encodeURIComponent(q); }
function ytLink(name) { return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(name + ' ejercicio técnica'); }

/* ---------- Imágenes ---------- */
function readFileAsDataURL(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(file); }); }
function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
async function resizeImage(file, max, quality) {
  const url = URL.createObjectURL(file);
  try {
    let bmp = null;
    try { if (window.createImageBitmap) bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = null; }
    const src = bmp || await loadImage(url);
    const w = src.width, h = src.height, k = Math.min(1, max / Math.max(w, h));
    const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
    const cx = cv.getContext('2d'); cx.imageSmoothingQuality = 'high'; cx.drawImage(src, 0, 0, cv.width, cv.height);
    if (bmp && bmp.close) bmp.close();
    return cv.toDataURL('image/jpeg', quality || 0.8);
  } finally { URL.revokeObjectURL(url); }
}
/* Fecha y hora de la foto (EXIF DateTimeOriginal), si existe */
async function exifDate(file) {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer();
    const v = new DataView(buf);
    if (v.getUint16(0) !== 0xFFD8) return null;
    let off = 2;
    while (off < v.byteLength - 4) {
      const mk = v.getUint16(off); const len = v.getUint16(off + 2);
      if (mk === 0xFFE1 && v.getUint32(off + 4) === 0x45786966) {
        const t = off + 10, le = v.getUint16(t) === 0x4949;
        const g16 = (o) => v.getUint16(t + o, le), g32 = (o) => v.getUint32(t + o, le);
        const readStr = (o, n) => { let s = ''; for (let i = 0; i < n - 1; i++) s += String.fromCharCode(v.getUint8(t + o + i)); return s; };
        const ifd = (o, want) => { const n = g16(o); for (let i = 0; i < n; i++) { const e = o + 2 + i * 12; if (g16(e) === want) return e; } return null; };
        const e0 = ifd(g32(4), 0x8769);
        let ds = null;
        if (e0 !== null) { const sub = g32(e0 + 8); const e1 = ifd(sub, 0x9003); if (e1 !== null) ds = readStr(g32(e1 + 8), 20); }
        if (!ds) { const e2 = ifd(g32(4), 0x0132); if (e2 !== null) ds = readStr(g32(e2 + 8), 20); }
        if (ds && /^\d{4}:\d{2}:\d{2} \d{2}:\d{2}/.test(ds)) { const p = ds.split(/[: ]/).map(Number); return new Date(p[0], p[1] - 1, p[2], p[3], p[4], p[5] || 0); }
        return null;
      }
      if ((mk & 0xFF00) !== 0xFF00) break;
      off += 2 + len;
    }
  } catch (e) { /* sin EXIF */ }
  return null;
}
