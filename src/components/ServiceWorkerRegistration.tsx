"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // The worker serves /_next/static/ cache-first, which is only safe for hashed production
      // assets. Dev chunk names stay the same while their contents change, so a worker left
      // over from a `bun start` on this origin would keep serving stale CSS and JS. Remove it.
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        if (registrations.length === 0) return;
        await Promise.all(registrations.map((registration) => registration.unregister()));
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        window.location.reload();
      });
      return;
    }

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
      // Installability and offline support degrade gracefully without it.
    });
  }, []);
  return null;
}
