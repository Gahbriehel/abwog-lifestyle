// Minimal service worker: offline fallback + cached static assets.
// Profile pages and server actions carry personal data and secure tokens, so
// they are never cached.
const VERSION = "v1";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`;
const PRECACHE = ["/offline.html", "/brand/icon-gold.png", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== PAGES_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  const isProfile = url.pathname.startsWith("/profile");

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only the public home page is kept for offline use.
          if (url.pathname === "/" && response.ok) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put("/", copy));
          }
          return response;
        })
        .catch(async () => {
          if (!isProfile) {
            const home = url.pathname === "/" ? await caches.match("/") : undefined;
            if (home) return home;
          }
          return caches.match("/offline.html");
        }),
    );
    return;
  }

  if (isProfile) return;

  // Hashed build assets never change: cache-first.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/brand/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
  }
});
