import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

type Client = SupabaseClient<Database>;

/**
 * Insert in-app event_reminder notifications for events starting in the next 24h.
 * Dedupes on family + title within a ~36h window so cron + hub-on-load don't double-post.
 */
export async function ensureUpcomingEventReminders(supabase: Client, familyId: string): Promise<number> {
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 3600_000);

  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at, all_day")
    .eq("family_id", familyId)
    .is("deleted_at", null)
    .gte("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString())
    .order("starts_at")
    .limit(40);

  if (!events || events.length === 0) return 0;

  const { data: existing } = await supabase
    .from("notifications")
    .select("title")
    .eq("family_id", familyId)
    .eq("kind", "event_reminder")
    .gte("created_at", new Date(now.getTime() - 36 * 3600_000).toISOString());

  const recentTitles = new Set((existing ?? []).map((n) => n.title.trim().toLowerCase()));

  let inserted = 0;
  for (const event of events) {
    const titleKey = event.title.trim().toLowerCase();
    if (recentTitles.has(titleKey)) continue;

    const when = event.all_day
      ? "all day"
      : new Date(event.starts_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

    const { error } = await supabase.from("notifications").insert({
      family_id: familyId,
      kind: "event_reminder",
      title: event.title,
      body: `Coming up — ${when}`,
    });
    if (!error) {
      inserted += 1;
      recentTitles.add(titleKey);
    }
  }

  return inserted;
}
