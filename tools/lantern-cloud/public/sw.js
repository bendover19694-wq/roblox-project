// Caches only the static shell. /api, /hq and every other path go straight to the network, so nothing private is ever stored.
const CACHE = 'dv-shell-v1';
const PUBLIC = ['/style.css', '/fonts/space-grotesk.woff2', '/fonts/geist-mono.woff2', '/img/favicon.png', '/img/icon-192.png', '/img/icon-512.png', '/img/apple-touch-icon.png'];
const SCRIPTS = ['/app.js', '/mobile.js']; // behind sign-in, so cached only when fetched while signed in (never a login redirect)
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(PUBLIC)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin || !(PUBLIC.includes(u.pathname) || SCRIPTS.includes(u.pathname))) return; // anything else: the browser handles it
  // network first so a new deploy shows at once; the cache is only the offline fallback
  e.respondWith(fetch(e.request).then((r) => {
    if (r.ok && !r.redirected) { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request)));
});
