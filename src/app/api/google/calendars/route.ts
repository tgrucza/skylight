import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getGoogleSessionTokens } from "@/lib/google/session-tokens";
import { listGoogleCalendars } from "@/lib/google/calendar";

/** Lists the signed-in user's Google calendars for the onboarding "link calendars" step. */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const tokens = await getGoogleSessionTokens(req);
  if (!tokens) return NextResponse.json({ error: "No Google session tokens — sign in again" }, { status: 400 });

  try {
    const calendars = await listGoogleCalendars(tokens.accessToken, tokens.refreshToken);
    return NextResponse.json({ calendars });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to list calendars" }, { status: 502 });
  }
}
