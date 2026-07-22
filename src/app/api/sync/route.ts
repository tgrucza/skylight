import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { syncAllActiveIntegrations } from "@/lib/google/sync";

/** Cron fallback — every 10 min (vercel.json), safety net for missed/unregistered webhooks (spec §2.2, §7.8). */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const results = await syncAllActiveIntegrations();
  return NextResponse.json({ results });
}
