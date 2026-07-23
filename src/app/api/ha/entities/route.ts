import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { decryptToken } from "@/lib/google/tokens";
import { filterHaEntities, isPrivateHaUrl, normalizeHaBaseUrl } from "@/lib/ha";

/** Adult-only entity list for the button picker. LAN URLs must be fetched client-side. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can browse entities" }, { status: 403 });

  const { data } = await supabase
    .from("integration_settings")
    .select("ha_base_url, ha_token_enc")
    .eq("family_id", membership.familyId)
    .maybeSingle();

  if (!data?.ha_base_url || !data.ha_token_enc) {
    return NextResponse.json({ error: "Home Assistant isn't configured" }, { status: 400 });
  }

  if (isPrivateHaUrl(data.ha_base_url)) {
    return NextResponse.json({ mode: "direct", entities: [] as [] });
  }

  try {
    const token = decryptToken(data.ha_token_enc);
    const res = await fetch(`${normalizeHaBaseUrl(data.ha_base_url)}/api/states`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ error: `Home Assistant returned ${res.status}` }, { status: 502 });
    const states = (await res.json()) as { entity_id: string; attributes?: { friendly_name?: string } }[];
    return NextResponse.json({ mode: "proxy", entities: filterHaEntities(states) });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unreachable" }, { status: 502 });
  }
}

