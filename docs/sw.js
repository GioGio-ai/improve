/* IMPROVE · service worker: la app abre sin conexión. Los datos los sincroniza Firestore. */
const VERSION = '3.0.0-6127db';
const CACHE = 'improve-' + VERSION;
const LIB = 'improve-lib-1';
const PRECACHE = ["./","./index.html","./manifest.webmanifest","./assets/app-e6f5c47a45.js","./assets/app-125d580b9c.css","./fonts/geist-latin-wght-normal.woff2","./fonts/geist-mono-latin-wght-normal.woff2","./icons/icon.svg","./icons/icon-192.png","./icons/apple-touch-icon.png"];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k.startsWith('improve-') && k !== CACHE && k !== LIB).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-cache' }).then((r) => { const cp = r.clone(); caches.open(CACHE).then((c) => c.put('./index.html', cp)); return r; }).catch(() => caches.match('./index.html')));
    return;
  }
  if (url.pathname.includes('/lib/')) {
    e.respondWith(caches.open(LIB).then((c) => c.match(req).then((hit) => hit || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
    if (r.ok && /\/(assets|fonts|icons)\//.test(url.pathname)) { const cp = r.clone(); caches.open(CACHE).then((c) => c.put(req, cp)); }
    return r;
  })));
});
