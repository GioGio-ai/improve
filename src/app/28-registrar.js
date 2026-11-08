/* ============================================================
   REGISTRAR (v5.0): un solo camino para anotar lo entrenado
   Del plan: tal cual · con cambios · no lo hice. Fuera del plan: contarlo · cargar a mano.
   Las acciones son las de siempre (block-done, quick-done, did-other, resched, train-text, new-log).
   ============================================================ */
/* Bloques del día con sesiones planificadas sin registrar, en orden de hora */
function regPending(date) {
  return agendaFor(date).items
    .filter(it => (it.kind === 'train' || it.kind === 'recup') && it.block)
    .map(it => ({ it, pend: it.block.sessions.filter(s => !findLog(date, s.type)) }))
    .filter(x => x.pend.length);
}
/* o: { date } elegir qué registrar · { date, key } un bloque · { date, type } una sesión */
/* Cada hoja guarda su propio estado (una hoja de bloque puede abrirse encima de la general) */
function openRegister(o) {
  const R = Object.assign({ date: todayStr(), key: null, type: null }, o || {});
  if (!R.key && !R.type && R.date > todayStr()) R.date = todayStr();
  openSheet({ id: 'reg-' + (R.key || R.type || 'dia'), reg: R, render: () => registerHtml(R) });
}
function regSetDate(date) { const t = topSheet(); if (t && t.reg) { t.reg.date = date; refreshSheet(true); } }
function regWhen(date) {
  const today = todayStr();
  return date === today ? 'Hoy' : date === addDays(today, -1) ? 'Ayer' : capFirst(fmtDateLong(date));
}
function regRow(act, attrs, icon, tone, title, sub) {
  return '<button class="blk" data-act="' + act + '" ' + attrs + '><span class="c ' + (tone || '') + '">' + ic(icon) + '</span><div class="grow"><div class="t">' + esc(title) + '</div>' + (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>' + ic('chev') + '</button>';
}
function registerHtml(R) {
  if (!R) return sheetHead('Registrar');
  if (R.key) return regBlockHtml(R.date, R.key);
  if (R.type) return regSessionHtml(R.date, R.type);
  const today = todayStr(), date = R.date, d = 'data-date="' + date + '"';
  let h = sheetHead('Registrar', esc(regWhen(date)) + (date === today || date === addDays(today, -1) ? ' · ' + fmtDate(date) : '')) + '<div class="sheet-body">';
  h += '<div class="pills" role="group" aria-label="Día">' + [0, -1, -2].map(k => {
    const x = addDays(today, k), on = x === date;
    return '<button type="button" class="pill' + (on ? ' on' : '') + '" data-act="reg-date" data-v="' + x + '" aria-pressed="' + on + '">' + (k === 0 ? 'Hoy' : k === -1 ? 'Ayer' : capFirst(DOW_LONG[weekday(x)])) + '</button>';
  }).join('') + '</div>';
  const pend = regPending(date);
  if (pend.length) {
    h += '<div class="stack-sm"><div class="micro">Del plan, sin registrar</div><div class="pend in-sheet">' + pend.map(x =>
      '<div class="pend-row"><button class="pend-main" data-act="reg-open" ' + d + ' data-key="' + x.it.key + '" aria-label="' + esc(x.it.title + ' · ' + x.it.block.short + ', más opciones') + '">' +
        '<span class="grow"><span class="t">' + esc(x.it.title + ' · ' + x.it.block.short) + '</span><span class="s">' + fmtHM(x.it.start) + ' · ' + esc(x.pend.map(s => s.title).join(' · ')) + '</span></span></button>' +
        '<button class="btn sm pend-ok" data-act="block-done" ' + d + ' data-key="' + x.it.key + '">' + ic('check', 'ok') + 'Tal cual</button></div>').join('') + '</div></div>';
  } else if (dayBlocks(dayPlan(date)).length) h += note('good', 'Lo planificado de este día ya está registrado.');
  h += '<div class="stack-sm"><div class="micro">' + (pend.length ? 'Fuera del plan' : '¿Qué hiciste?') + '</div>' +
    regRow('train-text', d, 'spark', 'blue', 'Contarlo', 'Escribe qué hiciste: un picado, patear con un amigo… La IA lo ordena') +
    regRow('new-log', d, 'edit', '', 'Cargar a mano', 'Tipo, minutos, esfuerzo y ejercicios') + '</div>';
  return h + '</div>';
}
/* Un bloque del plan (gimnasio, cancha, recuperación) */
function regBlockHtml(date, key) {
  const it = agendaFor(date).items.find(x => x.key === key);
  if (!it || !it.block) return sheetHead('Registrar') + '<div class="sheet-body"><p class="sub">Este bloque ya no está en el plan.</p></div>';
  const pend = it.block.sessions.filter(s => !findLog(date, s.type)), past = date < todayStr(), d = 'data-date="' + date + '"';
  let h = sheetHead('Registrar', esc(it.title + ' · ' + it.block.short) + ' · ' + esc(regWhen(date)) + ' ' + fmtHM(it.start)) + '<div class="sheet-body">';
  if (!pend.length) return h + note('good', 'Ya está registrado.') + '<button class="btn block" data-act="ag-open" ' + d + ' data-key="' + key + '">' + ic('list') + 'Ver el bloque</button></div>';
  if (pend.length < it.block.sessions.length) h += note('info', 'Falta: ' + esc(pend.map(s => s.title).join(' · ')) + '.');
  const types = pend.map(s => s.type);
  h += '<div class="stack-sm">' +
    regRow('block-done', d + ' data-key="' + key + '"', 'check', 'lime', 'Hecho tal cual', 'Minutos y esfuerzo en un paso') +
    regRow('did-other', d + ' data-type="' + types[0] + '"', 'edit', '', 'Con cambios', 'Ejercicios, series y minutos; también puedes contarlo con IA') +
    (it.kind === 'train' ? regRow('resched', d + ' data-types="' + esc(types.join(',')) + '"', 'x', 'mute', 'No lo hice', past ? 'Elige si se recupera otro día o se pierde' : 'Moverlo o adaptarlo') : '') + '</div>';
  return h + '</div>';
}
/* Una sesión del plan (desde su ficha) */
function regSessionHtml(date, type) {
  const s = findPlanned(date, type), log = findLog(date, type), d = 'data-date="' + date + '" data-type="' + type + '"';
  let h = sheetHead('Registrar', esc((s ? s.title : (STYPES[type] || STYPES.libre).n) + ' · ' + regWhen(date))) + '<div class="sheet-body">';
  if (log) return h + note('good', 'Ya está registrada.') + '<button class="btn block" data-act="edit-log" data-id="' + esc(log.id) + '">' + ic('edit') + 'Editar el registro</button></div>';
  h += '<div class="stack-sm">' +
    regRow('quick-done', d, 'check', 'lime', 'Hecha tal cual', 'Minutos y esfuerzo en un paso') +
    regRow('did-other', d, 'edit', '', 'Con cambios', 'Ejercicios, series y minutos; también puedes contarla con IA') +
    regRow('resched', d, 'x', 'mute', 'No la hice', date < todayStr() ? 'Elige si se recupera otro día o se pierde' : 'Moverla o adaptarla') + '</div>';
  return h + '</div>';
}
