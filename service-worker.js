const CACHE_NAME = "jogos-santa-casa-v34";
const APP_SHELL = [
  "./",
  "index.html",
  "style.css?v=26.1",
  "app.js?v=26.1",
  "manifest.webmanifest?v=26.1",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "icons/apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .catch(() => null)
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

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

  if (!isSameOrigin) return;

  event.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, copy)).catch(() => null);
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});

self.addEventListener("notificationclick", (event) => { event.notification.close(); event.waitUntil(clients.openWindow("./")); });

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch (e) { data = { title: "Jogos Santa Casa", body: event.data ? event.data.text() : "Nova atualização disponível." }; }
  event.waitUntil(self.registration.showNotification(data.title || "Jogos Santa Casa", {
    body: data.body || "Toca para abrir o verificador.", icon: data.icon || "./icon-192.png", badge: data.badge || "./icon-192.png", tag: data.tag || "jsc-push", data: { url: data.url || "./" }
  }));
});
