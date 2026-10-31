// Service worker : appli disponible hors ligne (OpenCV compris) et réception du menu Partager d'Android.
const CACHE = 'ndf-v1';
const CACHE_PARTAGE = 'ndf-partage';
const SOCLE = ['./', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SOCLE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== CACHE && k !== CACHE_PARTAGE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Fichiers chargés à la demande, absents du HTML : à ne jamais purger.
const aConserver = (chemin) => /assets\/(lazy-|opencv-)/.test(chemin);

// Supprime les anciens fichiers /assets/ que la nouvelle page n'utilise plus.
async function nettoyerAssets(html) {
  const utilises = new Set([...html.matchAll(/assets\/[^"')\s]+/g)].map((m) => m[0]));
  const cache = await caches.open(CACHE);
  for (const req of await cache.keys()) {
    const chemin = new URL(req.url).pathname;
    const i = chemin.indexOf('assets/');
    if (i >= 0 && !utilises.has(chemin.slice(i)) && !aConserver(chemin)) await cache.delete(req);
  }
}

// Reçoit les fichiers partagés, les range dans un cache, puis ouvre l'appli.
async function recevoirPartage(req) {
  const donnees = await req.formData();
  const cache = await caches.open(CACHE_PARTAGE);
  const horodatage = Date.now();
  let i = 0;
  for (const f of donnees.getAll('fichiers')) {
    if (!(f instanceof File)) continue;
    await cache.put(
      `./partage/${horodatage}-${i++}`,
      new Response(f, { headers: { 'Content-Type': f.type, 'X-Nom': encodeURIComponent(f.name) } }),
    );
  }
  return Response.redirect('./?partage=1', 303);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.method === 'POST' && url.pathname.endsWith('/partage')) {
    e.respondWith(recevoirPartage(req));
    return;
  }
  if (req.method !== 'GET') return;

  // Page : réseau d'abord (nouvelles versions), cache si hors ligne.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(async (rep) => {
          if (rep.ok) {
            const cache = await caches.open(CACHE);
            await cache.put('./', rep.clone());
            e.waitUntil(rep.clone().text().then(nettoyerAssets));
          }
          return rep;
        })
        .catch(async () => (await caches.match('./')) ?? Response.error()),
    );
    return;
  }

  // Fichiers statiques (noms versionnés par Vite) : cache d'abord.
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (enCache) =>
        enCache ??
        fetch(req).then(async (rep) => {
          if (rep.ok) (await caches.open(CACHE)).put(req, rep.clone());
          return rep;
        }),
    ),
  );
});
