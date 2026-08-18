const CACHE_NAME = 'rollevillerando-cache-v5';

const PRECACHE_ASSETS = [
  './',
  './index.html',
  './carte.html',
  './carte.js',
  './installation.html',
  './kml-gpx.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(
          keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
        )
      )
    ])
  );
});

// Les fichiers de contenu (liste des randonnées + fiches JSON) doivent
// toujours refléter la dernière publication : jamais servis depuis le
// cache en priorité.
function isDynamicContent(pathname) {
  return pathname.endsWith('.json') || pathname.includes('/randonnees/');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Réseau d'abord pour le shell de l'app et le contenu dynamique
  if (
    request.mode === 'navigate' ||
    PRECACHE_ASSETS.includes(url.pathname) ||
    PRECACHE_ASSETS.includes('.' + url.pathname) ||
    isDynamicContent(url.pathname)
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Cache d'abord pour le reste (icônes, polices, assets peu changeants)
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});
