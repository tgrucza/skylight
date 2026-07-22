import type { NextRequest } from "next/server";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set — reject anything else so these routes can't be triggered by outsiders. */
export function isAuthorizedCronRequest(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}
