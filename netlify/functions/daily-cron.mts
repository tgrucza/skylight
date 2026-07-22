import type { Config } from "@netlify/functions";

// Netlify equivalent of the Vercel Cron for /api/cron/daily (watch-channel
// renewal today; chore reset / notification digests join this route as
// those features grow). Netlify Scheduled Functions run in UTC.
export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("daily-cron: missing URL or CRON_SECRET env var");
    return;
  }
  const res = await fetch(`${base}/api/cron/daily`, { headers: { Authorization: `Bearer ${secret}` } });
  if (!res.ok) console.error("daily-cron failed", res.status, await res.text());
};

export const config: Config = {
  schedule: "0 3 * * *",
};
