"use client";

import { useEffect, useRef, useState } from "react";
import { useUIStore } from "@/stores/uiStore";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;
/** How often to recheck whether an open dropdown/modal still blocks going idle. */
const BLOCKED_RECHECK_MS = 1000;

/**
 * True once `timeoutSeconds` have passed with no pointer/keyboard activity — drives /hub's idle/ambient mode (spec §5 M3).
 * Never fires while a dropdown or modal is open (openOverlaysCount > 0): otherwise clicking the account
 * menu and pausing to read it lets the ambient screen cover it mid-interaction, which reads as the
 * whole app randomly vanishing. Reads the store directly via getState() (not a subscription) since this
 * only needs the live value at the moment the timer is about to fire, not on every count change.
 */
export function useIdle(timeoutSeconds: number): boolean {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function tryGoIdle() {
      if (useUIStore.getState().openOverlaysCount > 0) {
        timer.current = setTimeout(tryGoIdle, BLOCKED_RECHECK_MS);
      } else {
        setIdle(true);
      }
    }
    function reset() {
      setIdle(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(tryGoIdle, timeoutSeconds * 1000);
    }

    reset();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, reset, { passive: true });

    return () => {
      clearTimeout(timer.current);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, reset);
    };
  }, [timeoutSeconds]);

  return idle;
}
