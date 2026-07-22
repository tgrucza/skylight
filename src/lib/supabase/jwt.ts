import { createHmac } from "node:crypto";

function base64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Mints a Supabase-compatible HS256 access token for a given app user id, so
 * a Postgres RLS policy's `auth.uid()` resolves correctly for requests that
 * originate from our Auth.js session rather than Supabase's own auth system.
 * Signed with SUPABASE_JWT_SECRET (the same secret backing the project's
 * anon/service_role keys) — server-only.
 */
export function signSupabaseAccessToken(userId: string, expiresInSeconds = 3600): string {
  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) throw new Error("SUPABASE_JWT_SECRET is not set");

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const payload = {
    sub: userId,
    role: "authenticated",
    aud: "authenticated",
    iat: now,
    exp: now + expiresInSeconds,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();
  return `${signingInput}.${base64url(signature)}`;
}
