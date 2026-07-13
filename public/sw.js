const CACHE_VERSION = 'npt-dashboard-v1';
const APP_SHELL = [
  '/',
  '/offline.html',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/pwa-icon.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
  );
  self.clients.claim();
});

const isPrivateRequest = (request, url) =>
  request.method !== 'GET' ||
  url.origin !== self.location.origin ||
  url.pathname.startsWith('/api/') ||
  url.pathname.startsWith('/.netlify/functions/');

const cacheResponse = (request, response) => {
  if (!response.ok) return Promise.resolve();
  return caches
    .open(CACHE_VERSION)
    .then((cache) => cache.put(request, response.clone()));
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (isPrivateRequest(request, url)) return;

  if (request.mode === 'navigate') {
    const network = fetch(request);
    event.waitUntil(
      network
        .then((response) => cacheResponse(request, response))
        .catch(() => undefined)
    );
    event.respondWith(
      network.catch(
        async () =>
          (await caches.match(request)) ||
          (await caches.match('/')) ||
          caches.match('/offline.html')
      )
    );
    return;
  }

  const network = fetch(request);
  const cacheWrite = network
    .then((response) => cacheResponse(request, response))
    .catch(() => undefined);
  event.waitUntil(cacheWrite);
  event.respondWith(
    caches
      .match(request)
      .then((cached) => cached || network.catch(() => cached))
  );
});
