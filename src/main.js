/* ============================================================
   IMPROVE — arranque: Firebase (acceso, datos, App Check, Gemini) o modo local de prueba
   ============================================================ */
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, sendPasswordResetEmail, signOut } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, onSnapshot, setDoc, deleteDoc, getDoc } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getAI, getGenerativeModel, GoogleAIBackend } from 'firebase/ai';
import { firebaseConfig, OWNER_UID, RECAPTCHA_SITE_KEY } from './firebase-config.js';
import { bootApp, LOGO_SVG } from '../build/app.gen.js';

const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const LOCAL = isLocalHost && /[?&]local=1\b/.test(location.search);
let booted = false;

function hideBoot() { const b = document.getElementById('boot'); if (b) b.remove(); }
function el(id) { return document.getElementById(id); }

/* ---------- Gemini (Firebase AI Logic, Gemini Developer API gratis) ---------- */
const MODELS = {
  fast: ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.6-flash', 'gemini-3.5-flash'],
  vision: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'],
  smart: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3.5-flash-lite'],
};
function parseJsonLoose(txt) {
  const t = String(txt || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  try { return JSON.parse(t); } catch (e) {
    const a = t.indexOf('{'), b = t.lastIndexOf('}');
    if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
    throw e;
  }
}
function makeAI(app, ensureAppCheck) {
  let ai = null;
  const getAi = () => { if (!ai) { ensureAppCheck(); ai = getAI(app, { backend: new GoogleAIBackend() }); } return ai; };
  async function withModels(tier, fn) {
    const list = MODELS[tier] || MODELS.smart, key = 'improve-model-' + tier;
    let saved = null; try { saved = localStorage.getItem(key); } catch (e) { /* nada */ }
    const order = saved && list.includes(saved) ? [saved].concat(list.filter(x => x !== saved)) : list.slice();
    let last = null;
    for (const name of order) {
      try { const r = await fn(name); try { localStorage.setItem(key, name); } catch (e) { /* nada */ } return r; }
      catch (e) {
        if (e && e.name === 'AbortError') throw e;
        last = e;
        const st = e && e.customErrorData && e.customErrorData.status;
        const msg = String((e && e.message) || '');
        if (st === 404 || st === 429 || st === 500 || st === 503 || /not found|not supported|unavailable|overloaded|quota|exhausted|deprecated/i.test(msg)) continue;
        throw e;
      }
    }
    if (last && last.customErrorData && last.customErrorData.status === 429) last.code = 'resource-exhausted';
    throw last;
  }
  return {
    async json({ prompt, schema, image, tier }) {
      const parts = [{ text: prompt }];
      if (image) parts.push({ inlineData: { mimeType: 'image/jpeg', data: String(image).split(',')[1] } });
      return withModels(image ? 'vision' : (tier || 'fast'), async (name) => {
        let res;
        try {
          const m = getGenerativeModel(getAi(), { model: name, generationConfig: { responseMimeType: 'application/json', responseJsonSchema: schema } });
          res = await m.generateContent({ contents: [{ role: 'user', parts }] }, { timeout: 60000 });
        } catch (e) {
          const st = e && e.customErrorData && e.customErrorData.status;
          if (st !== 400) throw e;
          const m2 = getGenerativeModel(getAi(), { model: name, generationConfig: { responseMimeType: 'application/json' } });
          const p2 = [{ text: prompt + '\n\nResponde SOLO con JSON válido con esta forma: ' + JSON.stringify(schema) }].concat(parts.slice(1));
          res = await m2.generateContent({ contents: [{ role: 'user', parts: p2 }] }, { timeout: 60000 });
        }
        return parseJsonLoose(res.response.text());
      });
    },
    async stream({ system, history, onText, signal }) {
      return withModels('smart', async (name) => {
        const m = getGenerativeModel(getAi(), { model: name, systemInstruction: system });
        const contents = history.map(h => ({ role: h.role, parts: [{ text: h.text }] }));
        const r = await m.generateContentStream({ contents }, { signal, timeout: 90000 });
        let txt = '';
        for await (const chunk of r.stream) { let t = ''; try { t = chunk.text(); } catch (e) { t = ''; } if (t) { txt += t; onText && onText(txt); } }
        return txt;
      });
    },
  };
}

/* ---------- Modo local de prueba (sin Firebase) ---------- */
function localAdapter() {
  const KEY = 'improve-local-v1';
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { data = {}; }
  const subs = {};
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* lleno */ } };
  const list = (col) => Object.entries(data[col] || {}).map(([id, d]) => Object.assign({ id }, d));
  const emit = (col) => (subs[col] || []).forEach(fn => fn(list(col)));
  const mockAI = {
    async json({ schema, image }) {
      await new Promise(r => setTimeout(r, 700));
      if (schema && schema.properties && schema.properties.pasos) return { resumen: 'Ejercicio de prueba (modo local).', pasos: ['Colócate en posición.', 'Baja controlado en 3 s.', 'Vuelve sin rebote.', 'Respira y repite.'], claves: ['Cadera extendida', 'Rango sin dolor'], errores: ['Ir rápido', 'Flexionar la cadera'], seguridad: 'Para si el dolor pasa de 2/10.', busqueda: 'reverse nordic' };
      if (schema && schema.properties && schema.properties.items) return { items: image ? [{ n: 'Huevo revuelto', g: 150, p: 19, c: 2, f: 16, kcal: 230, conf: 'alta' }, { n: 'Mandioca hervida', g: 200, p: 2.4, c: 64, f: 0.6, kcal: 270, conf: 'media' }, { n: 'Banana', g: 120, p: 1.3, c: 27.6, f: 0.4, kcal: 107, conf: 'alta' }] : [{ n: 'Huevo', g: 150, p: 19, c: 2, f: 16, kcal: 233, conf: 'alta' }], hora: '', nota: 'Valores de prueba del modo local.' };
      if (schema && schema.properties && schema.properties.consultas) return { tema: 'Sueño y sprint', consultas: ['sleep AND sprint', 'sleep extension AND athletes', 'sleep deprivation AND performance'], poblacion: 'athletes', resultado: 'sprint' };
      if (schema && schema.properties && schema.properties.respuesta) return {
        respuesta: 'Respuesta de prueba (modo local): dormir poco empeora el sprint y dormir más lo mejora.', veredicto: 'beneficia', nivel: 'A',
        hallazgos: [{ texto: 'Dormir poco empeoró el sprint en un metaanálisis.', ids: ['E1'] }, { texto: 'Dormir más mejoró el tiempo de reacción.', ids: ['E2', 'E9'] }, { texto: 'Hallazgo sin estudio válido.', ids: ['E9'] }],
        mecanismo: 'El sueño consolida la recuperación nerviosa.', aplicacion: ['Dormir 9 h en semanas de carga.'], limites: ['Estudios de prueba.'], mitos: [],
        estudios: [{ id: 'E1', n: 600, poblacion: 'Deportistas', deportistas: true, resultado: 'Menos sprint con poco sueño.', direccion: 'perjuicio' }, { id: 'E2', n: 40, poblacion: 'Futbolistas', deportistas: true, resultado: 'Mejor reacción.', direccion: 'beneficio' }, { id: 'E9', n: 9999, resultado: 'Inventado.', direccion: 'beneficio' }],
        preguntas: ['¿Y la siesta?'],
      };
      return { n: 'Ejercicio traducido', ins: 'Paso 1\nPaso 2' };
    },
    async stream({ onText }) { const t = 'Respuesta de prueba del coach en modo local. Hoy: cancha a las 17:30, come la merienda a las 16:15.'; let s = ''; for (const w of t.split(' ')) { s += (s ? ' ' : '') + w; onText && onText(s); await new Promise(r => setTimeout(r, 30)); } return s; },
  };
  return {
    mode: 'local', user: { uid: 'local', email: 'modo local de prueba' },
    subscribe(col, onDocs) { (subs[col] = subs[col] || []).push(onDocs); setTimeout(() => onDocs(list(col)), 0); return () => {}; },
    set(col, id, body) { data[col] = data[col] || {}; data[col][id] = JSON.parse(JSON.stringify(body)); save(); setTimeout(() => emit(col), 0); return Promise.resolve(); },
    del(col, id) { if (data[col]) delete data[col][id]; save(); setTimeout(() => emit(col), 0); return Promise.resolve(); },
    get(col, id) { return Promise.resolve(data[col] && data[col][id] ? Object.assign({ id }, data[col][id]) : null); },
    ai: /[?&]noai=1\b/.test(location.search) ? null : mockAI,
    signOut() { location.reload(); },
  };
}

/* ---------- Acceso ---------- */
const AUTH_ERR = {
  'auth/invalid-credential': 'Correo o contraseña incorrectos.',
  'auth/invalid-email': 'Ese correo no es válido.',
  'auth/user-disabled': 'Esta cuenta está desactivada.',
  'auth/user-not-found': 'Correo o contraseña incorrectos.',
  'auth/wrong-password': 'Correo o contraseña incorrectos.',
  'auth/too-many-requests': 'Demasiados intentos. Espera unos minutos.',
  'auth/network-request-failed': 'Sin conexión. Revisa internet e inténtalo de nuevo.',
};
function loginHtml() {
  return '<div class="login" id="login"><form class="box" id="login-form" novalidate>' +
    '<div class="logo"><div class="mk">' + LOGO_SVG + '</div><div class="wm">IMPROVE</div><div class="tag">Entrenamiento, recuperación y comida. Acceso privado.</div></div>' +
    '<div class="card"><div class="stack">' +
    '<div class="field"><label for="lg-email">Correo</label><input class="input" id="lg-email" name="email" type="email" inputmode="email" autocomplete="username" autocapitalize="off" spellcheck="false" enterkeyhint="next" required></div>' +
    '<div class="field"><label for="lg-pass">Contraseña</label><input class="input" id="lg-pass" name="password" type="password" autocomplete="current-password" enterkeyhint="go" required></div>' +
    '<p class="err" id="lg-err" role="alert" hidden></p><p class="sub" id="lg-ok" role="status" hidden></p>' +
    '<button class="btn primary lg block" type="submit" id="lg-go">Entrar</button>' +
    '<button class="linkbtn" type="button" id="lg-reset" style="justify-self:center">Olvidé mi contraseña</button>' +
    '</div></div>' +
    '<p class="sub center">Protegido por reCAPTCHA · <a class="c-blue" href="https://policies.google.com/privacy" target="_blank" rel="noopener">Privacidad</a> · <a class="c-blue" href="https://policies.google.com/terms" target="_blank" rel="noopener">Condiciones</a></p>' +
    '</form></div>';
}
function showLogin(auth, msg) {
  hideBoot();
  document.body.classList.add('locked');
  let root = el('login-root');
  if (!root) { root = document.createElement('div'); root.id = 'login-root'; document.body.appendChild(root); }
  root.innerHTML = loginHtml();
  const form = el('login-form'), err = el('lg-err'), ok = el('lg-ok'), go = el('lg-go');
  const showErr = (m) => { err.textContent = m; err.hidden = !m; ok.hidden = true; };
  if (msg) showErr(msg);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = el('lg-email').value.trim(), pass = el('lg-pass').value;
    if (!email || !pass) { showErr('Escribe tu correo y tu contraseña.'); return; }
    go.disabled = true; go.innerHTML = '<span class="spinner"></span>Entrando';
    try { await signInWithEmailAndPassword(auth, email, pass); }
    catch (ex) { showErr(AUTH_ERR[ex && ex.code] || 'No se pudo entrar. Inténtalo de nuevo.'); go.disabled = false; go.textContent = 'Entrar'; }
  });
  el('lg-reset').addEventListener('click', async () => {
    const email = el('lg-email').value.trim();
    if (!email) { showErr('Escribe tu correo y vuelve a tocar «Olvidé mi contraseña».'); el('lg-email').focus(); return; }
    try { await sendPasswordResetEmail(auth, email); err.hidden = true; ok.hidden = false; ok.textContent = 'Si el correo es tuyo, te llega un enlace para crear una contraseña nueva.'; }
    catch (ex) { showErr(AUTH_ERR[ex && ex.code] || 'No se pudo enviar el correo.'); }
  });
  setTimeout(() => { const e1 = el('lg-email'); if (e1 && !e1.value) e1.focus(); }, 300);
}
function hideLogin() { const r = el('login-root'); if (r) r.remove(); document.body.classList.remove('locked'); }

/* ---------- Service worker ---------- */
function registerSW() {
  if (!('serviceWorker' in navigator) || isLocalHost) return;
  navigator.serviceWorker.register('sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing; if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          // Solo avisa si esta pestaña corre un código distinto al publicado
          const mine = ([...document.scripts].map(x => x.src).find(x => /assets\/app-[0-9a-f]+\.js/.test(x)) || '').split('/').pop();
          fetch('index.html?v=' + Date.now(), { cache: 'no-store' }).then(r => r.text()).then(html => {
            const m = html.match(/app-[0-9a-f]+\.js/); if (!m || m[0] === mine) return;
            // Nunca en medio de un entrenamiento: se ofrece al terminarlo
            const offer = () => {
              let open = false; try { open = !!localStorage.getItem('improve-entreno-v3'); } catch (e) { open = false; }
              if (open) { setTimeout(offer, 60000); return; }
              const t = document.getElementById('toast');
              if (t) { t.innerHTML = '<span>Nueva versión lista.</span><button id="sw-reload">Actualizar</button>'; t.hidden = false; const b = document.getElementById('sw-reload'); if (b) b.onclick = () => location.reload(); }
            };
            offer();
          }).catch(() => {});
        }
      });
    });
  }).catch(() => {});
}

/* ---------- Inicio ---------- */
function start() {
  if (LOCAL) { hideBoot(); bootApp(localAdapter()); booted = true; return; }
  const app = initializeApp(firebaseConfig);
  let appCheck = null;
  const ensureAppCheck = () => { if (!appCheck) { try { appCheck = initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(RECAPTCHA_SITE_KEY), isTokenAutoRefreshEnabled: true }); } catch (e) { appCheck = null; } } return appCheck; };
  const auth = getAuth(app);
  auth.languageCode = 'es';
  let db = null;
  const getDb = () => { if (!db) { try { db = initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); } catch (e) { db = initializeFirestore(app, {}); } } return db; };
  const ai = makeAI(app, ensureAppCheck);
  onAuthStateChanged(auth, (user) => {
    if (user && user.uid === OWNER_UID) {
      hideLogin();
      if (booted) return;
      booted = true;
      const fdb = getDb(), base = (col) => collection(fdb, 'users', user.uid, col), ref = (col, id) => doc(fdb, 'users', user.uid, col, id);
      hideBoot();
      bootApp({
        mode: 'cloud', user: { uid: user.uid, email: user.email },
        subscribe(col, onDocs, onErr) { return onSnapshot(base(col), (snap) => onDocs(snap.docs.map(d => Object.assign({ id: d.id }, d.data()))), onErr); },
        set(col, id, body) { return setDoc(ref(col, id), body); },
        del(col, id) { return deleteDoc(ref(col, id)); },
        async get(col, id) { const s = await getDoc(ref(col, id)); return s.exists() ? Object.assign({ id: s.id }, s.data()) : null; },
        ai,
        signOut() { return signOut(auth).then(() => location.reload()); },
      });
      setTimeout(ensureAppCheck, 2500);
    } else if (user) {
      signOut(auth).finally(() => showLogin(auth, 'Esta cuenta no tiene acceso a IMPROVE.'));
    } else {
      if (booted) { location.reload(); return; }
      showLogin(auth);
    }
  });
  registerSW();
}
start();
