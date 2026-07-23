import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { encryptToken, decryptToken } from "@/lib/google/tokens";
import { isPrivateHaUrl, normalizeHaBaseUrl } from "@/lib/ha";

/** Adult-only: HA URL + whether a token is stored — never the token itself. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can view this" }, { status: 403 });

  const { data } = await supabase
    .from("integration_settings")
    .select("ha_base_url, ha_token_enc")
    .eq("family_id", membership.familyId)
    .maybeSingle();

  const baseUrl = data?.ha_base_url ?? null;
  return NextResponse.json({
    baseUrl,
    tokenConfigured: !!data?.ha_token_enc,
    isPrivate: baseUrl ? isPrivateHaUrl(baseUrl) : false,
  });
}

const bodySchema = z.object({
  baseUrl: z.string().optional(),
  token: z.string().optional(),
});

/** Partial update. Empty-string token clears the stored token. */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can configure Home Assistant" }, { status: 403 });

  const update: { family_id: string; ha_base_url?: string | null; ha_token_enc?: string | null } = {
    family_id: membership.familyId,
  };
  if (parsed.data.baseUrl !== undefined) {
    const trimmed = parsed.data.baseUrl.trim();
    update.ha_base_url = trimmed ? normalizeHaBaseUrl(trimmed) : null;
  }
  if (parsed.data.token !== undefined) {
    const trimmed = parsed.data.token.trim();
    update.ha_token_enc = trimmed ? encryptToken(trimmed) : null;
  }

  const { error } = await supabase.from("integration_settings").upsert(update, { onConflict: "family_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Test connection — proxy mode only when the URL is public; for LAN, the client tests directly. */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can test Home Assistant" }, { status: 403 });

  const { data } = await supabase
    .from("integration_settings")
    .select("ha_base_url, ha_token_enc")
    .eq("family_id", membership.familyId)
    .maybeSingle();

  if (!data?.ha_base_url || !data.ha_token_enc) {
    return NextResponse.json({ ok: false, error: "Add a URL and long-lived access token first." }, { status: 400 });
  }

  if (isPrivateHaUrl(data.ha_base_url)) {
    return NextResponse.json({
      ok: false,
      error: "private",
      message: "Your Home Assistant is on the local network — test from the browser on home Wi-Fi instead.",
      baseUrl: data.ha_base_url,
    });
  }

  try {
    const token = decryptToken(data.ha_token_enc);
    const res = await fetch(`${normalizeHaBaseUrl(data.ha_base_url)}/api/`, {
      headers: { authorization: `Bearer ${token}` },
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `Home Assistant returned ${res.status}` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Unreachable" });
  }
}
