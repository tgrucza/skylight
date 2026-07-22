import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { channelTokenFor } from "@/lib/google/watch";
import { syncIntegration } from "@/lib/google/sync";

/**
 * Google Calendar push notification receiver (spec §2.2). Google sends a
 * bodyless POST ping — X-Goog-Resource-State tells us what kind of event,
 * but never the actual diff, so we always just kick an incremental sync for
 * the channel that fired. Verifies X-Goog-Channel-Token before doing
 * anything (spec §7.5).
 */
export async function POST(req: NextRequest) {
  const channelId = req.headers.get("x-goog-channel-id");
  const channelToken = req.headers.get("x-goog-channel-token");
  const resourceState = req.headers.get("x-goog-resource-state");

  if (!channelId || !channelToken) return NextResponse.json({ error: "missing channel headers" }, { status: 400 });

  const supabase = supabaseAdmin();
  const { data: integration } = await supabase.from("calendar_integrations").select("*").eq("watch_channel_id", channelId).maybeSingle();

  if (!integration || channelTokenFor(integration.id) !== channelToken) {
    return NextResponse.json({ error: "unrecognized or invalid channel" }, { status: 404 });
  }

  // "sync" state is Google's initial handshake ping when the channel is created — nothing to do yet.
  if (resourceState === "sync") return NextResponse.json({ ok: true });

  try {
    await syncIntegration(integration);
  } catch (err) {
    // Google doesn't retry on error bodies, only on non-2xx — return 200 anyway and let the /api/sync cron fallback catch it next pass.
    console.error("webhook sync failed", integration.id, err);
  }

  return NextResponse.json({ ok: true });
}
