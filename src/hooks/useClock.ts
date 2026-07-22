"use client";

import { useEffect, useState } from "react";

/** Re-renders every `intervalMs` (default 15s — plenty for a minute-resolution clock) so time-of-day UI stays live. */
export function useClock(intervalMs = 15_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
