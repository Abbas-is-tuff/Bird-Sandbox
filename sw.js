// Bird Sandbox offline support: keeps a copy of the game on the device.
// Opens instantly from the cache (works with no internet) and quietly
// downloads the newest version in the background whenever you are online.
const CACHE = 'bird-sandbox-v38';
const FILES = ['./', './index.html', './manifest.webmanifest', './logo/icon-180.png', './logo/icon-192.png', './logo/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async cache => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const cached = await cache.match(key, { ignoreSearch: true });
    const fresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    }).catch(() => null);
    if (cached) { e.waitUntil(fresh); return cached; }
    return (await fresh) || new Response('Bird Sandbox is offline and this file was not saved yet.', { status: 503 });
  }));
});
