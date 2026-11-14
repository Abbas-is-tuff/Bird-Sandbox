// Bird Sandbox offline support: keeps a copy of the game on the device.
// When you're online it always loads the NEWEST version from GitHub first;
// with no internet it opens the saved copy instead.
const CACHE = 'bird-sandbox-v53';
const FILES = ['./', './index.html', './manifest.webmanifest', './logo/icon-180.png', './logo/icon-192.png', './logo/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE)
    .then(c => Promise.all(FILES.map(f => fetch(new Request(f, { cache: 'reload' })).then(r => r.ok && c.put(f, r)).catch(() => {}))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const page = req.mode === 'navigate' || /\/(index\.html)?$/.test(new URL(req.url).pathname);
  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = page ? './index.html' : req;
    if (page) {
      // network first: always get the latest game when online
      try {
        const res = await fetch(new Request(req.url, { cache: 'no-store' }));
        if (res && res.ok) { cache.put(key, res.clone()); return res; }
      } catch (err) {}
      return (await cache.match(key, { ignoreSearch: true })) || new Response('Bird Sandbox is offline and was not saved yet.', { status: 503 });
    }
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => { if (res && res.ok) cache.put(key, res.clone()); return res; }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response('Offline', { status: 503 });
  }));
});
