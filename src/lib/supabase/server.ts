import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";
import { signSupabaseAccessToken } from "./jwt";
import type { Database } from "@/types/database";

/**
 * RLS-scoped Supabase client for the current Auth.js session — use this in
 * Server Components and Route Handlers for ordinary (non-privileged) reads
 * and writes so Postgres RLS (not application code) is the security boundary
 * (spec §7.5). Falls back to an anonymous (session-less) client when signed
 * out, which RLS will simply return zero rows for.
 */
export async function createServerSupabaseClient() {
  const session = await auth();
  const userId = session?.user?.id;
  const token = userId ? signSupabaseAccessToken(userId) : undefined;

  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
  });
}
