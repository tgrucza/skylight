"use client";

import { useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"] as const;

/** True once `timeoutSeconds` have passed with no pointer/keyboard activity — drives /hub's idle/ambient mode (spec §5 M3). */
export function useIdle(timeoutSeconds: number): boolean {
  const [idle, setIdle] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function reset() {
      setIdle(false);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setIdle(true), timeoutSeconds * 1000);
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
