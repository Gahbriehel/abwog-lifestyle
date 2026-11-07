// Minimal service worker: offline fallback + cached static assets.
// Profile pages, the home page (it shows the signed-in member's details) and
// server actions carry personal data and secure tokens, so they are never cached.
const VERSION = "v3";
const STATIC_CACHE = `static-${VERSION}`;
const PAGES_CACHE = `pages-${VERSION}`; // kept so old page caches get purged on activate
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

  const isPrivate = url.pathname.startsWith("/profile") || url.pathname === "/";

  if (request.mode === "navigate") {
    // Pages are never cached: navigations fall back to the offline screen.
    event.respondWith(fetch(request).catch(() => caches.match("/offline.html")));
    return;
  }

  if (isPrivate) return;

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

// ── Web Push (sent by Dove, see docs/dove-notifications.md) ────────────────

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192.png",
    // `tag` makes a newer notification of the same kind replace the earlier one.
    tag: payload.tag || "general",
    renotify: true,
    data: { url: payload.url || (payload.data && payload.data.url) || "/", topic: payload.topic },
  };
  if (payload.badge) options.badge = payload.badge;
  event.waitUntil(self.registration.showNotification(payload.title || "Amazing Grace", options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Only ever open this app's own pages, whatever the payload says.
  let target = new URL("/", self.location.origin);
  try {
    const requested = new URL((event.notification.data && event.notification.data.url) || "/", self.location.origin);
    if (requested.origin === self.location.origin) target = requested;
  } catch {
    // keep the home page
  }

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
      // iOS (Home Screen app) rejects focus() and has no navigate(); an unhandled rejection
      // here used to abort the handler, so the tap did nothing. Try each step, and fall back
      // to openWindow(), which iOS does support from a notification tap.
      const existing = windows.find((client) => "focus" in client);
      if (existing) {
        try {
          const focused = (await existing.focus()) || existing;
          if ("navigate" in focused) {
            await focused.navigate(target.href);
            return;
          }
        } catch {
          // fall through to a fresh window
        }
      }
      return self.clients.openWindow(target.href);
    }),
  );
});
