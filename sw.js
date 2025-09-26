const CACHE_NAME = 'bitacora-komtest-pro-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  // No cachear Firebase
  if (event.request.url.includes('firebaseio.com')) {
    return fetch(event.request);
  }
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});