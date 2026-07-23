import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { decryptToken } from "@/lib/google/tokens";
import { isPrivateHaUrl, normalizeHaBaseUrl } from "@/lib/ha";

/**
 * Returns decrypted HA credentials only when the base URL is private-range (LAN).
 * Spec M10 tradeoff: token stays inside authenticated household clients on home Wi-Fi.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });

  const { data } = await supabase
    .from("integration_settings")
    .select("ha_base_url, ha_token_enc")
    .eq("family_id", membership.familyId)
    .maybeSingle();

  if (!data?.ha_base_url || !data.ha_token_enc) {
    return NextResponse.json({ error: "Home Assistant isn't configured" }, { status: 400 });
  }
  if (!isPrivateHaUrl(data.ha_base_url)) {
    return NextResponse.json({ error: "Client token is only available for LAN Home Assistant URLs" }, { status: 403 });
  }

  return NextResponse.json({
    baseUrl: normalizeHaBaseUrl(data.ha_base_url),
    token: decryptToken(data.ha_token_enc),
  });
}
