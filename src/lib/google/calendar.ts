import { google } from "googleapis";

function oauthClient() {
  return new google.auth.OAuth2(process.env.AUTH_GOOGLE_ID, process.env.AUTH_GOOGLE_SECRET);
}

export interface GoogleCalendarSummary {
  id: string;
  summary: string;
  primary: boolean;
  backgroundColor?: string | null;
}

/** Lists the signed-in Google account's calendars, refreshing the access token first if needed. */
export async function listGoogleCalendars(accessToken: string, refreshToken?: string): Promise<GoogleCalendarSummary[]> {
  const auth = oauthClient();
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth });
  const res = await calendar.calendarList.list({ minAccessRole: "writer" });

  return (res.data.items ?? []).map((item) => ({
    id: item.id!,
    summary: item.summary ?? item.id!,
    primary: !!item.primary,
    backgroundColor: item.backgroundColor,
  }));
}

/** Exchanges a refresh token for a fresh access token (used by the M2 sync engine, not onboarding). */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: number }> {
  const auth = oauthClient();
  auth.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await auth.refreshAccessToken();
  if (!credentials.access_token) throw new Error("Google did not return a refreshed access token");
  return {
    accessToken: credentials.access_token,
    expiresAt: credentials.expiry_date ? Math.floor(credentials.expiry_date / 1000) : Math.floor(Date.now() / 1000) + 3600,
  };
}
