/* ============================================================
   COMPONENTES
   ============================================================ */
const NOTE_IC = { good: 'check', warn: 'warn', warning: 'warn', critical: 'warn', pain: 'warn', info: 'info', blue: 'info', sleep: 'moon', food: 'fork' };
function note(kind, html) { const k = kind === 'warning' ? 'warn' : kind === 'critical' ? 'pain' : kind; return '<div class="note ' + (k || '') + '">' + ic(NOTE_IC[kind] || 'info') + '<div>' + html + '</div></div>'; }
function chip(text, tone, icon) { return '<span class="chip' + (tone ? ' ' + tone : '') + '">' + (icon ? ic(icon) : '') + esc(text) + '</span>'; }

function scaleHtml(name, value, opts) {
  opts = opts || {};
  const from = opts.five ? 1 : 0, to = opts.five ? 5 : 10;
  const cls = 'scale' + (opts.five ? ' five' : '') + (opts.tone ? ' ' + opts.tone : opts.pain ? ' pain' : '');
  let h = '<div class="' + cls + '" role="radiogroup" aria-label="' + esc(opts.label || name) + '">';
  for (let i = from; i <= to; i++) {
    const on = value !== null && value !== undefined && value !== '' && Number(value) === i;
    h += '<button type="button" role="radio" aria-checked="' + on + '" class="' + (on ? 'on' : '') + (opts.pain && i >= 3 ? ' hi' : '') + (opts.pain && i === 0 ? ' z' : '') + '" data-act="' + (opts.act || 'scale') + '" data-name="' + name + '" data-v="' + i + '"' + (opts.data || '') + '>' + i + '</button>';
  }
  h += '</div>';
  if (opts.l || opts.r) h += '<div class="legend"><span>' + esc(opts.l || '') + '</span><span>' + esc(opts.r || '') + '</span></div>';
  return h;
}
function stepperHtml(id, value, act, attrs, unit, cls) {
  return '<div class="stepper' + (cls ? ' ' + cls : '') + '"><button type="button" data-act="' + act + '" data-d="-1" ' + attrs + ' aria-label="Menos">−</button>' +
    '<div class="val"><input id="' + id + '" inputmode="decimal" enterkeyhint="done" autocomplete="off" data-bind="' + act + '" ' + attrs + ' value="' + esc(fmtNumRaw(value)) + '" placeholder="—" aria-label="' + esc(unit || 'Valor') + '">' + (unit ? '<span class="u">' + unit + '</span>' : '') + '</div>' +
    '<button type="button" data-act="' + act + '" data-d="1" ' + attrs + ' aria-label="Más">+</button></div>';
}
function toggleHtml(act, on, title, sub, attrs, tone) {
  return '<button type="button" class="toggle' + (on ? ' on' : '') + (tone ? ' ' + tone : '') + '" role="switch" aria-checked="' + !!on + '" data-act="' + act + '" ' + (attrs || '') + '><div><div class="h3" style="font-size:15px">' + esc(title) + '</div>' + (sub ? '<div class="sub">' + esc(sub) + '</div>' : '') + '</div><span class="sw"></span></button>';
}
function statusMark(log) {
  if (!log) return '<span class="st0" aria-label="Pendiente"></span>';
  if (log.done === false) return '<span class="st0 miss" aria-label="No hecha">' + ic('x') + '</span>';
  if (log.modified) return '<span class="st0 mod" aria-label="Hecha con cambios">' + ic('check') + '</span>';
  return '<span class="st0 done" aria-label="Hecha">' + ic('check') + '</span>';
}
function outcomeChip(o) { return { clean: chip('Limpia', 'lime', 'check'), hold: chip('Repetir nivel', 'warn'), regress: chip('Bajar nivel', 'pain'), pending: chip('Falta el dolor de mañana', 'blue') }[o] || ''; }
function phaseRail(phase) {
  return '<div class="rail" role="img" aria-label="Fase ' + PHASES[phase].n + ' de 6">' + [1, 2, 3, 4, 5, 6].map(p => '<div class="seg6 ' + (p < phase ? 'done' : p === phase ? 'cur' : '') + '"><div class="bar"></div><div class="lbl">' + PHASES[p].n + '</div></div>').join('') + '</div>';
}
function ladderHtml(kind, st) {
  const isK = kind === 'k', lad = isK ? st.kick : st.sprint, max = isK ? 8 : 6, cap = (isK ? KCAP : SCAP)[st.phase] || 0, defs = isK ? KICK : SPRINT;
  let h = '<div class="ladder" style="grid-template-columns:repeat(' + max + ',minmax(0,1fr))">';
  for (let i = 1; i <= max; i++) {
    const cls = (lad.top || i < lad.level) ? 'done' : i === lad.level ? 'cur' : (st.injuryActive && i > cap) ? 'locked' : i === lad.level + 1 ? 'next' : '';
    h += '<div class="st ' + cls + '" title="' + esc(defs[i].t) + '">' + defs[i].n + '</div>';
  }
  return h + '</div>';
}
function meter(v, max, tone) { const p = max > 0 ? clamp(v / max * 100, 0, 100) : 0; return '<div class="meter ' + (tone || '') + (v > max * 1.1 ? ' over' : '') + '"><i style="width:' + p.toFixed(1) + '%"></i></div>'; }
function ringSvg(frac, size, stroke, grad, track) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, f = clamp(frac || 0, 0, 1);
  return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size + '">' + gradDefs() +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="' + (track || 'rgba(255,255,255,.08)') + '" stroke-width="' + stroke + '"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + r + '" fill="none" stroke="url(#' + (grad || 'lg-blue') + ')" stroke-width="' + stroke + '" stroke-linecap="round" stroke-dasharray="' + (c * f).toFixed(1) + ' ' + c.toFixed(1) + '"/></svg>';
}
function ring(frac, size, stroke, grad, value, label) {
  return '<div class="ring" style="width:' + size + 'px;height:' + size + 'px">' + ringSvg(frac, size, stroke, grad) + '<div class="in"><div class="rv">' + value + '</div>' + (label ? '<div class="rk">' + esc(label) + '</div>' : '') + '</div></div>';
}
const GRAD_DEFS = '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
  '<linearGradient id="lg-blue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9cbcff"/><stop offset="1" stop-color="#2457f5"/></linearGradient>' +
  '<linearGradient id="lg-lime" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4ffa6"/><stop offset="1" stop-color="#98e02a"/></linearGradient>' +
  '<linearGradient id="lg-load" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc65a"/><stop offset="1" stop-color="#ff6d1f"/></linearGradient>' +
  '<linearGradient id="lg-sleep" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#c9b8ff"/><stop offset="1" stop-color="#7650f0"/></linearGradient>' +
  '<linearGradient id="lg-prot" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7ff5dc"/><stop offset="1" stop-color="#1fb597"/></linearGradient>' +
  '<linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe29a"/><stop offset="1" stop-color="#e0a52a"/></linearGradient>' +
  '<linearGradient id="lg-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ff9aab"/><stop offset="1" stop-color="#e8324f"/></linearGradient>' +
  '<linearGradient id="lg-white" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#aac4ff"/></linearGradient>' +
  '<linearGradient id="lg-area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a85ff" stop-opacity=".35"/><stop offset="1" stop-color="#4a85ff" stop-opacity="0"/></linearGradient>' +
  '</defs></svg>';
function gradDefs() { return ''; }
function lineChart(points, o) {
  o = o || {};
  if (!points.length) return '<p class="sub">Sin datos suficientes.</p>';
  const W = 640, H = 190, pl = 40, pr = 18, pt = 18, pb = 26;
  const ys = points.map(p => p.y);
  const min = o.min !== undefined ? Math.min(o.min, ...ys) : Math.min(...ys) - 1, max = o.max !== undefined ? Math.max(o.max, ...ys) : Math.max(...ys) + 1;
  const X = (i) => pl + (points.length === 1 ? (W - pl - pr) / 2 : i * (W - pl - pr) / (points.length - 1));
  const Y = (v) => pt + (1 - (v - min) / (max - min || 1)) * (H - pt - pb);
  let s = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Evolución') + '">' + gradDefs();
  [min, (min + max) / 2, max].forEach(t => { s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (pl - 8) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + Math.round(t) + '</text>'; });
  if (o.ref !== undefined) s += '<line class="ref" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(o.ref) + '" y2="' + Y(o.ref) + '"/>';
  const pts = points.map((p, i) => X(i) + ',' + Y(p.y)).join(' ');
  if (points.length > 1) s += '<polygon class="area" fill="url(#lg-area)" points="' + X(0) + ',' + (H - pb) + ' ' + pts + ' ' + X(points.length - 1) + ',' + (H - pb) + '"/>';
  s += '<polyline class="line" points="' + pts + '"/>';
  points.forEach((p, i) => { s += '<circle class="dot" cx="' + X(i) + '" cy="' + Y(p.y) + '" r="5"/>'; if (i === 0 || i === points.length - 1 || points.length <= 6) s += '<text x="' + X(i) + '" y="' + (H - 6) + '" text-anchor="middle">' + fmtDate(p.x) + '</text>'; });
  const last = points[points.length - 1];
  s += '<text class="lab" x="' + X(points.length - 1) + '" y="' + (Y(last.y) - 12) + '" text-anchor="end">' + fmtNum(last.y) + (o.unit || '') + '</text>';
  return s + '</svg></div>';
}
function barChart(data, o) {
  o = o || {};
  const W = 640, H = 180, pl = 44, pr = 10, pt = 22, pb = 26;
  const max = Math.max(1, ...data.map(d => d.value), o.ref || 0);
  const step = Math.pow(10, Math.floor(Math.log10(max))), top = Math.ceil(max / step) * step, bw = (W - pl - pr) / data.length;
  const Y = (v) => pt + (1 - v / top) * (H - pt - pb);
  let s = '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(o.label || 'Barras') + '">' + gradDefs();
  [0, top / 2, top].forEach(t => { s += '<line class="grid" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/><text x="' + (pl - 8) + '" y="' + (Y(t) + 4) + '" text-anchor="end">' + (o.fmt ? o.fmt(t) : Math.round(t)) + '</text>'; });
  if (o.ref) s += '<line class="ref" x1="' + pl + '" x2="' + (W - pr) + '" y1="' + Y(o.ref) + '" y2="' + Y(o.ref) + '"/>';
  data.forEach((d, i) => {
    const x = pl + i * bw + bw * 0.2, w = bw * 0.6, y = Y(d.value), hgt = Math.max(0, H - pb - y), r = Math.min(6, hgt / 2, w / 2);
    if (hgt > 0) s += '<path class="bar ' + (o.tone || '') + (o.cur !== undefined && i !== o.cur ? ' dim' : '') + '" d="M' + x + ',' + (H - pb) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (H - pb) + 'Z"/>';
    s += '<text x="' + (pl + i * bw + bw / 2) + '" y="' + (H - 6) + '" text-anchor="middle">' + esc(d.label) + '</text>';
    if ((o.cur === undefined || i === o.cur) && d.value && o.showVal !== false) s += '<text class="lab" x="' + (pl + i * bw + bw / 2) + '" y="' + (y - 7) + '" text-anchor="middle">' + (o.fmt ? o.fmt(d.value) : d.value) + '</text>';
  });
  return s + '</svg></div>';
}
function hbars(rows) {
  const max = Math.max(1, ...rows.map(r => r.v));
  return '<div class="hbars">' + rows.map(r => '<div class="hbar ' + (r.v ? '' : 'zero') + '"><span class="nm">' + esc(r.n) + '</span><span class="tr"><span class="fl" style="width:' + (r.v / max * 100) + '%"></span></span><span class="val">' + r.v + '</span></div>').join('') + '</div>';
}
function dayTitle(day) {
  const ss = day.sessions.filter(s => s.type !== 'descanso');
  if (!ss.length) return 'Descanso';
  return ss.map(s => s.short || s.title).join(' + ');
}
function blockSub(s) {
  const parts = [];
  if (s.est) parts.push(s.est + ' min');
  if (s.field && s.field.kind === 'golpeo') parts.push(KICK[s.field.level].t.toLowerCase());
  else if (s.field && s.field.kind === 'sprint') parts.push(SPRINT[s.field.level].t.toLowerCase());
  else if (s.field && s.field.kind === 'rt') parts.push(s.field.reps + ' rep × ' + s.field.series + ' series');
  else if (s.field && s.field.kind === 'test') parts.push('decide el paso de fase');
  else if (s.items.length) parts.push(plural(s.items.length, 'ejercicio', 'ejercicios'));
  return parts.join(' · ');
}
function sessIcon(type) { return (STYPES[type] || STYPES.libre).icon || 'dumb'; }
function readinessTone(sc) { return sc === null || sc === undefined ? '' : sc >= 70 ? 'lime' : sc >= 50 ? 'blue' : 'load'; }
function sleepTone(h) { const n = num(h); return n === null ? '' : n >= 8.5 ? 'sleep' : n >= 7 ? 'blue' : 'load'; }
function painTone(v) { const n = num(v); return n === null ? '' : n >= 3 ? 'pain' : n >= 1 ? 'warn' : 'lime'; }
function rpeTone(v) { const n = num(v); return n === null ? '' : n >= 8 ? 'load' : n >= 6 ? 'blue' : 'lime'; }
function fmtSide(sd) { return sd === 'd' ? 'Der' : sd === 'i' ? 'Izq' : ''; }
function sideLong(sd) { return sd === 'd' ? 'Derecha' : 'Izquierda'; }
