import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership, linkPendingMembership } from "@/lib/family";

/** The signed-in user's family + member roster + settings — used across the app for color-coding, filters, pickers, and /hub idle timing. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  let membership = await getCurrentMembership(supabase, session.user.id);
  // Repairs an already-stuck duplicate-family user if a pending invite now matches them (spec §3.2 retrofit).
  if (!membership && session.user.email) membership = await linkPendingMembership(session.user.id, session.user.email);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const [{ data: family }, { data: members }, { data: settings }] = await Promise.all([
    supabase.from("families").select("id, name, timezone, theme").eq("id", membership.familyId).single(),
    supabase
      .from("family_members")
      .select("id, name, role, color_hex, avatar_url, birthday, invite_email, sort_order")
      .eq("family_id", membership.familyId)
      .order("sort_order"),
    supabase.from("settings").select("*").eq("family_id", membership.familyId).maybeSingle(),
  ]);

  return NextResponse.json({ family, members: members ?? [], currentMemberId: membership.memberId, settings });
}
