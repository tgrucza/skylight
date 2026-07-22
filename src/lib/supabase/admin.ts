import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

let cached: SupabaseClient<Database> | undefined;

/**
 * Service-role Supabase client. Bypasses RLS entirely — server-only, and
 * only for the specific privileged operations the spec calls out: family
 * creation during onboarding (no family_members row can exist yet to grant
 * RLS access), Google sync/webhooks/cron, and upserting `users` on sign-in.
 * Never import this from a Client Component or expose the key to the browser.
 *
 * Lazily constructed (not a module-level client) so route handlers that
 * don't touch Supabase can still be statically analyzed at build time even
 * before env vars are configured.
 */
export function supabaseAdmin(): SupabaseClient<Database> {
  if (!cached) {
    cached = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
