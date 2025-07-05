const CACHE_NAME = "thynktech-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/offline.html",
  "/styles.css",
  "/favicon.ico",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.json",

  // JS modules (user side only)
  "/app.js",
  "/auth.js",
  "/appointments.js",
  "/db.js",
  "/formUtils.js",
  "/idUtils.js",
  "/patients.js",
  "/pwa.js",
  "/reports.js",
  "/services.js",
  "/utils.js",
  "/visits.js",
  "/export.js",
  "/backup.js"
];

// Install: Cache core assets
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
  );
});

// Activate: Clean up old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Serve cache first, then fallback to network, then offline page
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then(response => {
      // Try cache first
      if (response) return response;
      // Try network and cache the result for next time
      return fetch(event.request).then(networkResponse => {
        // Only cache successful, basic (same-origin) responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    }).catch(() => caches.match("/offline.html"))
  );
});

// Notify clients of SW updates
self.addEventListener("message", event => {
  if (event.data === "checkForUpdate") {
    self.skipWaiting();
  }
});

// App install prompt (handled in app.js or UI)
self.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  self.installPrompt = e;
  // Notify clients install prompt is available
  self.clients.matchAll().then(clients => {
    clients.forEach(client =>
      client.postMessage({ type: "installPromptAvailable" })
    );
  });
});

// Send message when online/offline or update is ready
function broadcastMessage(message) {
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage(message));
  });
}

// Notify clients when a new service worker is activated (update available)
self.addEventListener("activate", event => {
  event.waitUntil(
    (async () => {
      broadcastMessage({ type: "updateReady" });
    })()
  );
  self.clients.claim();
});

// Optional: Notify clients when going offline (relies on page events)
self.addEventListener("sync", () => {
  broadcastMessage({ type: "syncEvent" });
});