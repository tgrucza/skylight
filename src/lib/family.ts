import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CurrentMembership {
  familyId: string;
  memberId: string;
  role: "adult" | "child";
}

/** MVP assumes one family per signed-in user (spec's roadmap explicitly excludes multi-family sharing). */
export async function getCurrentMembership(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<CurrentMembership | null> {
  const { data } = await supabase.from("family_members").select("id, family_id, role").eq("user_id", userId).limit(1).maybeSingle();
  if (!data) return null;
  return { familyId: data.family_id, memberId: data.id, role: data.role };
}

/**
 * Join-family flow (spec §3.2, H2): links a signing-in user to a
 * `family_members` row an adult already pre-created for them (matched by
 * `invite_email`), instead of the layout bouncing them to /onboarding to
 * create a duplicate family. Runs with the service-role client because the
 * signing-in user has no membership yet, so RLS would return zero rows.
 */
export async function linkPendingMembership(userId: string, email: string): Promise<CurrentMembership | null> {
  const admin = supabaseAdmin();
  const { data: pending } = await admin
    .from("family_members")
    .select("id, family_id, role")
    .eq("invite_email", email.trim().toLowerCase())
    .is("user_id", null)
    .limit(1)
    .maybeSingle();
  if (!pending) return null;

  const { data, error } = await admin
    .from("family_members")
    .update({ user_id: userId, invite_email: null })
    .eq("id", pending.id)
    .select("id, family_id, role")
    .single();
  if (error || !data) return null;

  return { familyId: data.family_id, memberId: data.id, role: data.role };
}
