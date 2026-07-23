import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { renewExpiringWatchChannels } from "@/lib/google/watch";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { ensureUpcomingEventReminders } from "@/lib/eventReminders";

/**
 * Daily 03:00 job (vercel.json): Google watch-channel renewal + event reminder notifications.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await renewExpiringWatchChannels();

  const admin = supabaseAdmin();
  const { data: families } = await admin.from("families").select("id");
  let reminders = 0;
  for (const family of families ?? []) {
    reminders += await ensureUpcomingEventReminders(admin, family.id);
  }

  return NextResponse.json({ ok: true, reminders });
}
