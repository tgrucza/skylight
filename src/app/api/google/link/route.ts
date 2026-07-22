import { NextResponse, type NextRequest, after } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getGoogleSessionTokens } from "@/lib/google/session-tokens";
import { encryptToken } from "@/lib/google/tokens";
import { syncIntegration } from "@/lib/google/sync";
import { registerWatchChannel } from "@/lib/google/watch";

const bodySchema = z.object({
  memberId: z.string().uuid(),
  familyId: z.string().uuid(),
  calendarIds: z.array(z.string().min(1)).min(1).max(20),
});

/** Persists selected Google calendars as calendar_integrations rows (tokens encrypted at rest — spec §7.5). */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { memberId, familyId, calendarIds } = parsed.data;

  const tokens = await getGoogleSessionTokens(req);
  if (!tokens?.refreshToken) {
    return NextResponse.json({ error: "No Google refresh token on this session — sign in again with consent" }, { status: 400 });
  }

  const accessTokenEnc = encryptToken(tokens.accessToken);
  const refreshTokenEnc = encryptToken(tokens.refreshToken);

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("calendar_integrations")
    .upsert(
      calendarIds.map((googleCalendarId) => ({
        family_id: familyId,
        member_id: memberId,
        google_calendar_id: googleCalendarId,
        access_token_enc: accessTokenEnc,
        refresh_token_enc: refreshTokenEnc,
        status: "active",
      })),
      { onConflict: "member_id,google_calendar_id" }
    )
    .select("*");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Initial import + webhook registration run after the response is sent —
  // the client doesn't need to wait on a full calendar history fetch to
  // finish onboarding. `after()` keeps the function alive until these settle,
  // unlike a bare fire-and-forget promise which Vercel may freeze early.
  const integrations = data ?? [];
  after(async () => {
    const results = await Promise.allSettled(
      integrations.flatMap((integration) => [syncIntegration(integration), registerWatchChannel(integration)])
    );
    for (const result of results) {
      if (result.status === "rejected") console.error("Initial calendar sync/watch registration failed:", result.reason);
    }
  });

  return NextResponse.json({ integrations: data?.map((i) => ({ id: i.id, google_calendar_id: i.google_calendar_id })) });
}
