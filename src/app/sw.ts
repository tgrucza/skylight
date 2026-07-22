/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import { Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Offline read cache (spec §1.5 MVP: "PWA: ... offline read cache"). The wall
// kiosk and family phones should still show the last-known schedule/lists if
// the network drops; writes still require connectivity (TanStack Query
// handles the online mutation queue, this just keeps GETs available).
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();
