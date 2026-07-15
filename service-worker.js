const APP_VERSION = "86.0";
const CACHE_NAME = `jogos-santa-casa-v${APP_VERSION.replace(/\./g, "-")}`;
const APP_SHELL = [
  "./",
  "index.html",
  "style.css?v=860",
  "app.js?v=860",
  "manifest.webmanifest?v=860",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("index.html", copy)).catch(() => null);
          return response;
        })
        .catch(() => caches.match("index.html"))
    );
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response?.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => null);
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// As notificações são exclusivamente nativas via Firebase Cloud Messaging.
// Não existem handlers Web Push neste Service Worker.
