const CACHE_NAME = 'loreal-prod-v4';   // ← changez ce chiffre à chaque mise à jour
const urlsToCache = [
  '.',
  'index.html',
  'manifest.json',
  'css/style.css',
  'js/config.js',
  'js/storage.js',
  'js/ui.js',
  'js/cadence.js',
  'js/poste.js',
  'js/calcul-lignes.js',
  'js/shift-timer.js',
  'js/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();   // force l'activation immédiate
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(key => {
        if (key !== CACHE_NAME) {
          console.log('Ancien cache supprimé :', key);
          return caches.delete(key);
        }
      })
    ))
  );
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === '/' || url.pathname === '/index.html') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});
