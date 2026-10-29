# Pruebas de guardado del modo entrenamiento (modo local).
# Uso: sh test/serve.sh &  python3 test/guardado.py [carpeta_capturas]
# Simula: cerrar la app a mitad, pausar, retomar el mismo bloque, empezar otro,
# terminar, borrador de ayer, copia en la nube, bandeja de salida y editor.
import json, sys, time
from playwright.sync_api import sync_playwright

URL = 'http://127.0.0.1:8765/?local=1'
OUT = sys.argv[1] if len(sys.argv) > 1 else None
fails, n = [], [0]


def check(cond, msg):
    print(('OK   ' if cond else 'FALLA ') + msg)
    if not cond:
        fails.append(msg)


def fixture(today):
    return {
        'profile': {'main': {'name': 'Prueba', 'birth': '2004-09-21', 'height': 196, 'weight': 88, 'foot': 'Derecha'}},
        'injuries': {'rf': {'date': '2026-09-02', 'phase': 3, 'side': 'd', 'kickStart': 3, 'sprintStart': 1, 'phaseLog': [{'phase': 1, 'date': '2026-09-02'}, {'phase': 3, 'date': today}]}},
        'settings': {'main': {'plan': {today: {'types': ['sprint', 'golpeo', 'movilidad']}}}},
        'checkins': {today: {'date': today, 'rfPain': 0, 'sleepH': 9, 'sleepQ': 4, 'fatigue': 4, 'soreness': 2, 'stress': 4}},
    }


with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, is_mobile=True, has_touch=True, locale='es-PY', timezone_id='America/Asuncion')
    errors = []

    def new_page():
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errors.append(str(e)))
        pg.on('console', lambda m: errors.append('console: ' + m.text) if m.type == 'error' else None)
        return pg

    def shot(pg, name):
        if OUT:
            n[0] += 1
            pg.wait_for_timeout(350)
            pg.screenshot(path='%s/%02d-%s.png' % (OUT, n[0], name))

    def store(pg):
        return pg.evaluate("JSON.parse(localStorage.getItem('improve-local-v1') || '{}')")

    def draft(pg):
        return pg.evaluate("JSON.parse(localStorage.getItem('improve-entreno-v3') || 'null')")

    def open_app(hash_='#hoy'):
        pg = new_page()
        pg.goto(URL + hash_)
        pg.wait_for_selector('.topbar, .train', timeout=15000)
        pg.wait_for_timeout(900)
        return pg

    def click(pg, sel):
        pg.locator(sel).first.click(timeout=5000)
        pg.wait_for_timeout(150)

    def skip_rest(pg):
        r = pg.locator('[data-act="tr-rest-skip"]')
        if r.count():
            r.first.click()
            pg.wait_for_timeout(100)

    # ---- Semilla
    pg = new_page()
    pg.goto(URL + '#hoy')
    today = pg.evaluate("(() => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()")
    pg.evaluate("(s) => { localStorage.clear(); localStorage.setItem('improve-local-v1', s); }", json.dumps(fixture(today)))
    pg.close()
    print('Hoy:', today)

    # ---- 1. Cerrar la app a mitad del entrenamiento: vuelve solo, con todo
    pg = open_app()
    click(pg, '.tl-blk[data-key="campo"] .main')
    click(pg, '.sheet [data-act="start-block"]')
    pg.wait_for_selector('.train')
    shot(pg, 'entreno-abierto')
    check(pg.locator('#tr-save').count() == 1, 'la barra muestra el estado de guardado')
    click(pg, '[data-act="tr-skipwarm"]')
    click(pg, '.reps button[data-k="0"]'); skip_rest(pg)
    click(pg, '.reps button[data-k="1"]'); skip_rest(pg)
    click(pg, '.reps button[data-k="2"]')
    d = draft(pg)
    check(d is not None and d.get('wasOpen') is True, 'borrador escrito al instante y marcado como abierto')
    sp = next(s for s in d['steps'] if s['kind'] == 'sprint')
    check(sp['done'][:3] == [True, True, True], 'las 3 repeticiones están en el borrador sin esperar')
    pg.wait_for_timeout(4300)
    live = store(pg).get('live', {})
    check(d['id'] in live and json.loads(live[d['id']]['json'])['id'] == d['id'], 'copia en la nube escrita (≤ 4 s)')
    pg.close()  # el sistema mata la app

    pg = open_app()
    pg.wait_for_selector('.train', timeout=6000)
    shot(pg, 'reabierta-retoma-sola')
    check(pg.locator('.train').count() == 1, 'al reabrir vuelve solo al entrenamiento')
    check(pg.locator('.reps button.done').count() == 3, 'las 3 repeticiones siguen marcadas')

    # ---- 2. Pausar y salir: no se abre solo, aparece el aviso con Retomar / Terminar
    skip_rest(pg)
    click(pg, '[data-act="tr-min"]')
    pg.close()
    pg = open_app()
    check(pg.locator('.train').count() == 0, 'tras pausar a propósito no se abre solo')
    check(pg.locator('.banner.live').count() == 1, 'Hoy muestra el entrenamiento abierto')
    shot(pg, 'hoy-entrenamiento-abierto')

    # ---- 3. Tocar Empezar en el mismo bloque: retoma, no descarta
    click(pg, '.tl-blk[data-key="campo"] .main')
    click(pg, '.sheet [data-act="start-block"]')
    pg.wait_for_selector('.train')
    check(pg.locator('.reps button.done').count() == 3, 'empezar el mismo bloque retoma donde quedó')
    click(pg, '[data-act="tr-min"]')
    pg.wait_for_timeout(300)
    check(pg.url.startswith(URL), 'pausar no saca de la app (historial)')

    # ---- 4. Empezar otra sesión con uno abierto: lo hecho se guarda, nada se descarta
    pg.evaluate("(t) => { const b = document.createElement('button'); b.setAttribute('data-act', 'start'); b.setAttribute('data-date', t); b.setAttribute('data-type', 'movilidad'); b.id = 'x-start'; document.body.appendChild(b); }", today)
    pg.locator('#x-start').dispatch_event('click'); pg.wait_for_timeout(200)
    try:
        pg.wait_for_selector('.sheet [data-act="tr-force"]', timeout=4000)
    except Exception:
        pg.screenshot(path='/tmp/claude-0/-home-claude/adbee2fe-58c8-55f2-bd08-97edb6972cf7/scratchpad/fail4.png')
        print('DEBUG', pg.evaluate("({ draft: !!localStorage.getItem('improve-entreno-v3'), train: !!document.querySelector('.train'), sheet: document.getElementById('sheet-root').innerText.slice(0,200), toast: document.getElementById('toast').innerText })"))
        raise
    shot(pg, 'conflicto-sin-descartar')
    check('Retomar' in pg.locator('.sheet .btn.primary').inner_text(), 'la acción principal del aviso es Retomar')
    click(pg, '.sheet [data-act="tr-force"]')
    pg.wait_for_selector('.train')
    st = store(pg)
    ses = st.get('sessions', {})
    spr = ses.get('s-%s-sprint' % today)
    check(spr is not None and spr.get('spr', {}).get('reps') == 3 and spr.get('auto') is True, 'el sprint a medias quedó guardado (3 rep, automático)')
    check(('s-%s-golpeo' % today) not in ses, 'el golpeo sin datos no se registra como hecho')
    check(st.get('live', {}).get(spr.get('trId')) is None if spr else False, 'la copia en la nube del anterior se borró')
    pg.wait_for_timeout(1300)
    check(json.loads(pg.evaluate("localStorage.getItem('improve-outbox-v1') || '{}'")) == {}, 'bandeja vacía tras confirmar')

    # ---- 5. Terminar normal la movilidad
    for _ in range(8):
        ck = pg.locator('[data-act="tr-ck"]:not(.done)')
        if ck.count():
            ck.first.click(); pg.wait_for_timeout(80)
        else:
            break
    click(pg, '.tbar [data-act="tr-finish"]')
    click(pg, '[data-act="fin-scale"][data-name="rpe"][data-v="4"]')
    click(pg, '[data-act="fin-save"]')
    pg.wait_for_timeout(400)
    ses = store(pg).get('sessions', {})
    mov = [v for k, v in ses.items() if v.get('type') == 'movilidad']
    check(len(mov) == 1 and mov[0].get('rpe') == 4 and mov[0].get('trId'), 'movilidad guardada con RPE y trId')
    check(draft(pg) is None, 'sin borrador tras terminar')
    shot(pg, 'sesion-guardada')
    pg.close()

    # ---- 6. Borrador de ayer olvidado: se guarda solo al abrir
    pg = new_page(); pg.goto(URL + '#hoy'); pg.wait_for_selector('.topbar')
    yday = pg.evaluate("(() => { const d = new Date(Date.now() - 864e5); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); })()")
    old = {'id': 'tr-ayer01', 'date': yday, 'key': 'campo', 'title': 'Cancha de ayer', 'startedAt': int(time.time() * 1000) - 26 * 3600e3, 'lastActive': int(time.time() * 1000) - 25 * 3600e3, 'wasOpen': True, 'open': False,
           'sessions': [{'type': 'golpeo', 'title': 'Golpeo · K3', 'short': 'K3', 'est': 20, 'plan': None}],
           'steps': [{'kind': 'golpeo', 'sess': 'golpeo', 'level': 3, 'target': 25, 'count': 20, 'pd': 1, 'tec': False, 'notes': ''}], 'cur': 0}
    pg.evaluate("(d) => localStorage.setItem('improve-entreno-v3', JSON.stringify(d))", old)
    pg.close()
    pg = open_app()
    pg.wait_for_timeout(600)
    ses = store(pg).get('sessions', {})
    g = ses.get('s-%s-golpeo' % yday)
    check(g is not None and g['kick']['count'] == 20 and g['kick']['pd'] == 1, 'el golpeo de ayer se guardó solo con sus 20 golpes y dolor 1')
    check(pg.locator('.train').count() == 0 and draft(pg) is None, 'no reabre un entrenamiento de ayer')
    pg.close()

    # ---- 7. Datos del teléfono borrados: se recupera desde la nube
    pg = new_page(); pg.goto(URL + '#hoy'); pg.wait_for_selector('.topbar')
    cloud = {'id': 'tr-nube01', 'date': today, 'key': 'campo', 'title': 'Cancha (nube)', 'startedAt': int(time.time() * 1000) - 600e3, 'lastActive': int(time.time() * 1000) - 60e3, 'wasOpen': True, 'open': False,
             'sessions': [{'type': 'golpeo', 'title': 'Golpeo · K3', 'short': 'K3', 'est': 20, 'plan': None}],
             'steps': [{'kind': 'golpeo', 'sess': 'golpeo', 'level': 3, 'target': 25, 'count': 12, 'pd': None, 'tec': False, 'notes': ''}], 'cur': 0}
    pg.evaluate("""(c) => { localStorage.removeItem('improve-entreno-v3'); const s = JSON.parse(localStorage.getItem('improve-local-v1'));
      s.live = { [c.id]: { kind: 'entreno', trId: c.id, date: c.date, title: c.title, startedAt: c.startedAt, lastActive: c.lastActive, wasOpen: true, json: JSON.stringify(c) } };
      delete s.sessions['s-' + c.date + '-golpeo']; localStorage.setItem('improve-local-v1', JSON.stringify(s)); }""", cloud)
    pg.close()
    pg = open_app()
    pg.wait_for_selector('.train', timeout=6000)
    check('12' in pg.locator('.counter .big').inner_text(), 'recuperado desde la nube con sus 12 golpes')
    shot(pg, 'recuperado-desde-nube')
    click(pg, '[data-act="tr-min"]')
    pg.close()

    # ---- 8. Bandeja de salida: una sesión que no llegó al servidor se reenvía al abrir
    pg = new_page(); pg.goto(URL + '#hoy'); pg.wait_for_selector('.topbar')
    pg.evaluate("""(t) => { const s = JSON.parse(localStorage.getItem('improve-local-v1')); delete s.sessions['s-' + t + '-rt'];
      localStorage.setItem('improve-local-v1', JSON.stringify(s));
      localStorage.setItem('improve-outbox-v1', JSON.stringify({ ['s-' + t + '-rt']: { col: 'sessions', id: 's-' + t + '-rt', savedAt: Date.now() - 5000, trId: 'tr-x', body: { date: t, type: 'rt', title: 'Circuito RT', done: true, source: 'entreno', trId: 'tr-x', rt: { level: '8x3', series: 3 }, exercises: [] } } })); }""", today)
    pg.close()
    pg = open_app()
    pg.wait_for_timeout(600)
    ses = store(pg).get('sessions', {})
    check(('s-%s-rt' % today) in ses and ses['s-%s-rt' % today]['rt']['series'] == 3, 'la sesión de la bandeja se reenvió')
    check(json.loads(pg.evaluate("localStorage.getItem('improve-outbox-v1') || '{}'")) == {}, 'bandeja vacía tras reenviar')

    # ---- 9. Editor: editar el sprint no borra las repeticiones
    pg.evaluate("(t) => { const b = document.createElement('button'); b.setAttribute('data-act', 'edit-log'); b.setAttribute('data-id', 's-' + t + '-sprint'); b.id = 'x-ed'; document.body.appendChild(b); }", today)
    pg.locator('#x-ed').dispatch_event('click'); pg.wait_for_timeout(200)
    pg.wait_for_selector('.sheet [data-act="ed-save"]')
    click(pg, '.sheet [data-act="ed-save"]')
    pg.wait_for_timeout(400)
    spr = store(pg)['sessions']['s-%s-sprint' % today]
    check(spr['spr'].get('reps') == 3, 'editar el sprint conserva las 3 repeticiones')
    shot(pg, 'final-hoy')
    pg.close()

    browser.close()
    real = [e for e in errors if 'favicon' not in e]
    check(not real, 'sin errores de JavaScript' + ('' if not real else ': ' + ' | '.join(real[:5])))

print('\n%d fallas' % len(fails))
sys.exit(1 if fails else 0)
