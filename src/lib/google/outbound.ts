import { google, calendar_v3 } from "googleapis";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { decryptToken, encryptToken } from "@/lib/google/tokens";
import { refreshGoogleAccessToken } from "@/lib/google/calendar";
import type { Database } from "@/types/database";

type Integration = Database["public"]["Tables"]["calendar_integrations"]["Row"];

export interface OutboundEventPayload {
  title: string;
  location?: string | null;
  notes?: string | null;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  rrule?: string | null;
}

async function calendarClientFor(integration: Integration) {
  const refreshToken = decryptToken(integration.refresh_token_enc);
  let accessToken = decryptToken(integration.access_token_enc);

  try {
    const refreshed = await refreshGoogleAccessToken(refreshToken);
    accessToken = refreshed.accessToken;
    await supabaseAdmin()
      .from("calendar_integrations")
      .update({ access_token_enc: encryptToken(accessToken) })
      .eq("id", integration.id);
  } catch {
    // use stored token; a real failure surfaces from the API call itself
  }

  const auth = new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET);
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.calendar({ version: "v3", auth });
}

function toGoogleEventBody(payload: OutboundEventPayload): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = {
    summary: payload.title,
    location: payload.location ?? undefined,
    description: payload.notes ?? undefined,
  };
  if (payload.allDay) {
    body.start = { date: payload.startsAt.slice(0, 10) };
    body.end = { date: payload.endsAt.slice(0, 10) };
  } else {
    body.start = { dateTime: payload.startsAt };
    body.end = { dateTime: payload.endsAt };
  }
  if (payload.rrule) body.recurrence = payload.rrule.split("\n").filter(Boolean);
  return body;
}

/** Spec §5 M2: outbound writes go to Google first, then the caller mirrors the returned event locally. */
export async function createGoogleEvent(integration: Integration, payload: OutboundEventPayload) {
  const calendar = await calendarClientFor(integration);
  const res = await calendar.events.insert({
    calendarId: integration.google_calendar_id,
    requestBody: toGoogleEventBody(payload),
  });
  return res.data;
}

export async function updateGoogleEvent(integration: Integration, googleEventId: string, payload: OutboundEventPayload) {
  const calendar = await calendarClientFor(integration);
  const res = await calendar.events.update({
    calendarId: integration.google_calendar_id,
    eventId: googleEventId,
    requestBody: toGoogleEventBody(payload),
  });
  return res.data;
}

export async function deleteGoogleEvent(integration: Integration, googleEventId: string) {
  const calendar = await calendarClientFor(integration);
  try {
    await calendar.events.delete({ calendarId: integration.google_calendar_id, eventId: googleEventId });
  } catch (err: unknown) {
    const status = (err as { code?: number; response?: { status?: number } })?.code ?? (err as { response?: { status?: number } })?.response?.status;
    if (status !== 410 && status !== 404) throw err; // already gone on Google's side — fine
  }
}
