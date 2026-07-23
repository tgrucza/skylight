import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { decryptToken } from "@/lib/google/tokens";
import { isPrivateHaUrl, normalizeHaBaseUrl, splitService } from "@/lib/ha";

const bodySchema = z.object({ buttonId: z.string().uuid() });

/**
 * POST: invoke a button via server proxy (public HA URL).
 * For LAN HA, the client should call /api/ha/client-token and hit HA directly —
 * this POST returns 409 with mode:"direct" so the client can fall back.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const [{ data: button }, { data: integration }] = await Promise.all([
    supabase
      .from("ha_buttons")
      .select("id, label, entity_id, service, family_id")
      .eq("id", parsed.data.buttonId)
      .eq("family_id", membership.familyId)
      .maybeSingle(),
    supabase
      .from("integration_settings")
      .select("ha_base_url, ha_token_enc")
      .eq("family_id", membership.familyId)
      .maybeSingle(),
  ]);

  if (!button) return NextResponse.json({ error: "Button not found" }, { status: 404 });
  if (!integration?.ha_base_url || !integration.ha_token_enc) {
    return NextResponse.json({ error: "Home Assistant isn't configured" }, { status: 400 });
  }

  if (isPrivateHaUrl(integration.ha_base_url)) {
    return NextResponse.json({ mode: "direct", label: button.label }, { status: 409 });
  }

  try {
    const token = decryptToken(integration.ha_token_enc);
    const { domain, service } = splitService(button.service);
    const res = await fetch(`${normalizeHaBaseUrl(integration.ha_base_url)}/api/services/${domain}/${service}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ entity_id: button.entity_id }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json({ error: text || `Home Assistant returned ${res.status}` }, { status: 502 });
    }
    return NextResponse.json({ ok: true, label: button.label });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unreachable" }, { status: 502 });
  }
}
