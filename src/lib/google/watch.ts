import { google } from "googleapis";
import { randomUUID, createHmac } from "node:crypto";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/google/tokens";
import type { Database } from "@/types/database";

type Integration = Database["public"]["Tables"]["calendar_integrations"]["Row"];

/**
 * Deterministic per-integration channel token, verified on inbound webhooks
 * (spec §7.5). Derived from TOKEN_ENCRYPTION_KEY rather than stored, since
 * the schema (§3, final for MVP) has no column for it — recomputing avoids
 * a migration for a value we can always regenerate from the integration id.
 */
export function channelTokenFor(integrationId: string): string {
  return createHmac("sha256", process.env.TOKEN_ENCRYPTION_KEY ?? "").update(integrationId).digest("hex").slice(0, 32);
}

/**
 * Registers a Google Calendar push notification channel (spec §2.2). Requires
 * a publicly reachable HTTPS webhook URL — Google rejects localhost, so this
 * is a no-op in local dev; the /api/sync cron fallback covers sync until
 * GOOGLE_WEBHOOK_URL is set post-deploy (spec §7.8 step 3).
 */
export async function registerWatchChannel(integration: Integration): Promise<void> {
  const webhookUrl = process.env.GOOGLE_WEBHOOK_URL;
  if (!webhookUrl || webhookUrl.includes("localhost")) return;

  const auth = new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET);
  auth.setCredentials({
    access_token: decryptToken(integration.access_token_enc),
    refresh_token: decryptToken(integration.refresh_token_enc),
  });
  const calendar = google.calendar({ version: "v3", auth });

  const channelId = randomUUID();
  const channelToken = channelTokenFor(integration.id);

  const res = await calendar.events.watch({
    calendarId: integration.google_calendar_id,
    requestBody: { id: channelId, type: "web_hook", address: webhookUrl, token: channelToken },
  });

  await supabaseAdmin()
    .from("calendar_integrations")
    .update({
      watch_channel_id: channelId,
      watch_expires_at: res.data.expiration ? new Date(Number(res.data.expiration)).toISOString() : null,
    })
    .eq("id", integration.id);
}

/** Renews any watch channel expiring within the next 24h — run daily (spec §5 M2, §7.8). */
export async function renewExpiringWatchChannels(): Promise<void> {
  const supabase = supabaseAdmin();
  const soon = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  const { data: integrations } = await supabase
    .from("calendar_integrations")
    .select("*")
    .eq("status", "active")
    .lt("watch_expires_at", soon);

  for (const integration of integrations ?? []) {
    try {
      await registerWatchChannel(integration);
    } catch {
      // best-effort; the next cron run (or /api/sync fallback) will retry
    }
  }
}
