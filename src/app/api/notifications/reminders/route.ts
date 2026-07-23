import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { ensureUpcomingEventReminders } from "@/lib/eventReminders";

/** Session-authed: ensure event_reminder rows exist for the next 24h (deduped). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const inserted = await ensureUpcomingEventReminders(supabase, membership.familyId);
  return NextResponse.json({ ok: true, inserted });
}
