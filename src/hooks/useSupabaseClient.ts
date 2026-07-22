"use client";

import { useEffect, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * RLS-scoped Supabase client for Client Components (realtime subscriptions,
 * optimistic mutations). Fetches a short-lived token from /api/supabase-token
 * and refreshes it before expiry — see lib/supabase/jwt.ts for why this
 * bridge exists instead of using Supabase's own auth.
 */
export function useSupabaseClient(): SupabaseClient<Database> | null {
  const [client, setClient] = useState<SupabaseClient<Database> | null>(null);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const res = await fetch("/api/supabase-token");
      if (!res.ok || cancelled) return;
      const { token, expiresIn } = (await res.json()) as { token: string; expiresIn: number };
      if (cancelled) return;

      const supabase = createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: { persistSession: false, autoRefreshToken: false },
          global: { headers: { Authorization: `Bearer ${token}` } },
        }
      );
      supabase.realtime.setAuth(token);
      setClient(supabase);
      refreshTimer.current = setTimeout(setup, Math.max(30, expiresIn - 120) * 1000);
    }

    void setup();
    return () => {
      cancelled = true;
      clearTimeout(refreshTimer.current);
    };
  }, []);

  return client;
}
