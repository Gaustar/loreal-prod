const CACHE_NAME = 'loreal-prod-v22';   // ← changez ce chiffre à chaque mise à jour, et le ?v= des liens dans index.html
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
  'js/reintegration.js',
  'js/commandes.js',
  'js/shift-timer.js',
  'js/pause.js',
  'js/controle-qualite.js',
  'js/anticiper.js',
  'fonts/barlow-condensed-600.woff2',
  'fonts/barlow-condensed-800.woff2',
  'js/reglages.js',
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
  // Tout passe en réseau d'abord (cache seulement hors ligne) : en cache
  // d'abord, le premier lancement après une mise à jour mélangeait le
  // nouvel index.html avec les anciens JS.
  if (event.request.method === 'GET' && new URL(event.request.url).origin === self.location.origin) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        // ignoreSearch : la page demande app.js?v=N, le précache contient app.js
        .catch(() => caches.match(event.request, { ignoreSearch: true }))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then(response => response || fetch(event.request))
    );
  }
});
