// The build replaces the placeholder with a digest of the complete release.
const CACHE = 'supersudoku-__BUILD_ID__';
const ASSETS = ['./', './index.html', './styles.css', './mobile.css', './icon.svg', './manifest.webmanifest', './data/starter.json',
  ...['icon-192.png', 'icon-512.png', 'maskable-512.png', 'apple-touch-icon.png'].map(name => `./icons/${name}`),
  ...['app', 'engine', 'game', 'generator', 'generator-worker', 'i18n', 'layout', 'difficulty', 'touch-board', 'install'].map(name => `./src/${name}.js`)];
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('message', event => { if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting(); });
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('supersudoku-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  // Installation diagnostics must see the actual host's anonymous response, not a cached copy.
  if (event.request.cache === 'no-store') { event.respondWith(fetch(event.request)); return; }
  event.respondWith(caches.open(CACHE).then(async cache => {
    // Unbuilt local development stays network-first so source edits appear on reload.
    if (CACHE.includes('_')) {
      try { return await fetch(event.request); } catch { /* Use the offline snapshot below. */ }
    }
    // A running version keeps its own precached files until the player accepts an update.
    const cached = await cache.match(event.request);
    if (cached) return cached;
    if (event.request.mode === 'navigate') return await cache.match(new URL('./index.html', self.location.href)) || fetch(event.request);
    return fetch(event.request);
  }));
});
