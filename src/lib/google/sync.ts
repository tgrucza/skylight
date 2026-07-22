import { google, calendar_v3 } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/google/tokens";
import { refreshGoogleAccessToken } from "@/lib/google/calendar";
import type { Database } from "@/types/database";

type Integration = Database["public"]["Tables"]["calendar_integrations"]["Row"];

function oauthClientFor(accessToken: string, refreshToken: string) {
  const auth = new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET);
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return auth;
}

async function decryptAndRefresh(integration: Integration) {
  const refreshToken = decryptToken(integration.refresh_token_enc);
  let accessToken = decryptToken(integration.access_token_enc);

  // Access tokens are short-lived; always refresh before a sync run rather
  // than tracking expiry separately — one extra Google round trip per
  // integration per sync is cheap and avoids stale-token 401s mid-sync.
  try {
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    await supabaseAdmin()
      .from("calendar_integrations")
      .update({ access_token_enc: encryptToken(accessToken) })
      .eq("id", integration.id);
  } catch {
    // Fall back to the stored access token; if it's also expired the list() call below will surface the real error.
  }

  return { accessToken, refreshToken };
}

function mapGoogleEventToRow(
  event: calendar_v3.Schema$Event,
  familyId: string,
  memberId: string,
  integrationId: string
) {
  const start = event.start?.dateTime ?? event.start?.date;
  const end = event.end?.dateTime ?? event.end?.date;
  if (!event.id || !start || !end) return null;

  const allDay = !event.start?.dateTime;

  return {
    family_id: familyId,
    member_id: memberId,
    integration_id: integrationId,
    google_event_id: event.id,
    title: event.summary ?? "(untitled)",
    location: event.location ?? null,
    notes: event.description ?? null,
    starts_at: new Date(start).toISOString(),
    ends_at: new Date(end).toISOString(),
    all_day: allDay,
    rrule: event.recurrence && event.recurrence.length > 0 ? event.recurrence.join("\n") : null,
    source: "google" as const,
    deleted_at: event.status === "cancelled" ? new Date().toISOString() : null,
  };
}

interface SyncResult {
  imported: number;
  cancelled: number;
  nextSyncToken?: string | null;
}

/** Runs one sync pass for an integration — incremental if it has a sync_token, otherwise a full import. Self-heals on an expired (410) sync token. */
export async function syncIntegration(integration: Integration): Promise<SyncResult> {
  const { accessToken, refreshToken } = await decryptAndRefresh(integration);
  const auth = oauthClientFor(accessToken, refreshToken);
  const calendar = google.calendar({ version: "v3", auth });

  const masters: NonNullable<ReturnType<typeof mapGoogleEventToRow>>[] = [];
  const exceptions: { row: NonNullable<ReturnType<typeof mapGoogleEventToRow>>; recurringEventId: string }[] = [];

  let pageToken: string | undefined;
  let nextSyncToken: string | null | undefined;
  let usingSyncToken = !!integration.sync_token;

  do {
    let page: calendar_v3.Schema$Events;
    try {
      const res = await calendar.events.list({
        calendarId: integration.google_calendar_id,
        singleEvents: false,
        showDeleted: true,
        maxResults: 250,
        pageToken,
        ...(usingSyncToken ? { syncToken: integration.sync_token! } : { timeMin: new Date(Date.now() - 90 * 86400000).toISOString() }),
      });
      page = res.data;
    } catch (err: unknown) {
      const status = (err as { code?: number; response?: { status?: number } })?.code ?? (err as { response?: { status?: number } })?.response?.status;
      if (usingSyncToken && status === 410) {
        // Sync token expired/invalid — fall back to a full resync.
        usingSyncToken = false;
        pageToken = undefined;
        continue;
      }
      throw err;
    }

    for (const event of page.items ?? []) {
      const row = mapGoogleEventToRow(event, integration.family_id, integration.member_id, integration.id);
      if (!row) continue;
      if (event.recurringEventId) {
        exceptions.push({ row, recurringEventId: event.recurringEventId });
      } else {
        masters.push(row);
      }
    }

    pageToken = page.nextPageToken ?? undefined;
    if (page.nextSyncToken) nextSyncToken = page.nextSyncToken;
  } while (pageToken);

  const supabase = supabaseAdmin();
  let cancelled = 0;

  if (masters.length > 0) {
    const { error } = await supabase.from("events").upsert(masters, { onConflict: "integration_id,google_event_id" });
    if (error) throw new Error(`events upsert failed: ${error.message}`);
    cancelled += masters.filter((m) => m.deleted_at).length;
  }

  for (const { row, recurringEventId } of exceptions) {
    const { data: parent } = await supabase
      .from("events")
      .select("id")
      .eq("integration_id", integration.id)
      .eq("google_event_id", recurringEventId)
      .maybeSingle();

    const { error } = await supabase
      .from("events")
      .upsert({ ...row, recurrence_parent_id: parent?.id ?? null }, { onConflict: "integration_id,google_event_id" });
    if (error) throw new Error(`events upsert (exception) failed: ${error.message}`);
    if (row.deleted_at) cancelled += 1;
  }

  if (nextSyncToken) {
    await supabase.from("calendar_integrations").update({ sync_token: nextSyncToken }).eq("id", integration.id);
  }

  return { imported: masters.length + exceptions.length, cancelled, nextSyncToken };
}

/** Syncs every active integration — used by the /api/sync cron fallback and the webhook handler. */
export async function syncAllActiveIntegrations(): Promise<{ integrationId: string; ok: boolean; error?: string }[]> {
  const supabase = supabaseAdmin();
  const { data: integrations } = await supabase.from("calendar_integrations").select("*").eq("status", "active");

  const results: { integrationId: string; ok: boolean; error?: string }[] = [];
  for (const integration of integrations ?? []) {
    try {
      await syncIntegration(integration);
      results.push({ integrationId: integration.id, ok: true });
    } catch (err) {
      results.push({ integrationId: integration.id, ok: false, error: err instanceof Error ? err.message : "unknown error" });
    }
  }
  return results;
}
