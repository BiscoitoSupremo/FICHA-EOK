const CACHE_NAME = 'sigilo-ascensao-v1';

const URLS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/script.js',
  './manifest.json',
  './apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// Instala e coloca arquivos no cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// Intercepta requisições e responde do cache quando der
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // se tiver no cache, usa; senão, busca na rede
      return response || fetch(event.request);
    })
  );
});

// Remove caches antigos quando atualizar a versão
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
