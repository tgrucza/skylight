"use client";

import { useEffect } from "react";

/** Keeps the wall tablet's screen on while /hub is mounted (spec §2.1 "wake-lock on wall display"). Silently no-ops where unsupported. */
export function useWakeLock(): void {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        sentinel = await navigator.wakeLock.request("screen");
      } catch {
        // permission denied or unsupported in this context — non-fatal
      }
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      void sentinel?.release();
    };
  }, []);
}
