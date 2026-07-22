import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron";
import { renewExpiringWatchChannels } from "@/lib/google/watch";

/**
 * Daily 03:00 job (vercel.json). Currently: Google watch-channel renewal.
 * Chore weekly reset and notification digests join this route in M4/M6 when
 * those features exist.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorizedCronRequest(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await renewExpiringWatchChannels();
  return NextResponse.json({ ok: true });
}
