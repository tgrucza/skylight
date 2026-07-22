import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

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
