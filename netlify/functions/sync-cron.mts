import type { Config } from "@netlify/functions";

// Netlify's equivalent of the Vercel Cron declared in vercel.json — same
// /api/sync route, just invoked by a Netlify Scheduled Function instead
// (Netlify has no native "run this Next.js route on a cron" primitive).
export default async () => {
  const base = process.env.URL || process.env.DEPLOY_PRIME_URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("sync-cron: missing URL or CRON_SECRET env var");
    return;
  }
  const res = await fetch(`${base}/api/sync`, { headers: { Authorization: `Bearer ${secret}` } });
  if (!res.ok) console.error("sync-cron failed", res.status, await res.text());
};

export const config: Config = {
  schedule: "*/10 * * * *",
};
