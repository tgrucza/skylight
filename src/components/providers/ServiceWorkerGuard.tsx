"use client";

import { useEffect } from "react";

/**
 * Dev-only: unregister any leftover Serwist SW + caches for this origin.
 * A prior `next build` / `next start` leaves `public/sw.js` (gitignored) and can
 * register a worker that precaches old `/_next/static/*` hashes. On phones that
 * hit the LAN IP as a PWA origin, that stale cache often surfaces as a white screen
 * while desktop/localhost still looks fine.
 */
export function ServiceWorkerGuard() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!("serviceWorker" in navigator)) return;

    void (async () => {
      try {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((reg) => reg.unregister()));
        if ("caches" in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((key) => caches.delete(key)));
        }
      } catch {
        // Best-effort cleanup — phone can still clear Site Data manually.
      }
    })();
  }, []);

  return null;
}
