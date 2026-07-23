"use client";

import { useEffect, useState } from "react";
import { useFamily } from "@/hooks/useFamily";
import { useQueryClient } from "@tanstack/react-query";

/**
 * On hub/home load, ask the server to insert any missing event_reminder notifications
 * for the next 24h (complements the daily cron).
 */
export function useEnsureEventReminders(familyId: string | undefined) {
  const queryClient = useQueryClient();
  const [ranFor, setRanFor] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId || ranFor === familyId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/notifications/reminders", { method: "POST" });
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as { inserted?: number };
        setRanFor(familyId);
        if ((body.inserted ?? 0) > 0) {
          void queryClient.invalidateQueries({ queryKey: ["notifications", familyId] });
        }
      } catch {
        // non-fatal — cron will still try
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [familyId, ranFor, queryClient]);
}

export function EventRemindersBootstrap() {
  const { data } = useFamily();
  useEnsureEventReminders(data?.family?.id);
  return null;
}
