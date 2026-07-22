import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

/**
 * Reads the raw Auth.js session JWT (server-only) to get the Google access
 * token captured at sign-in. Deliberately not exposed on the public
 * `session` object from `auth()` — those fields are visible to client code,
 * and OAuth tokens must stay server-side (spec §7.5).
 */
export async function getGoogleSessionTokens(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!token?.googleAccessToken) return null;
  return {
    accessToken: token.googleAccessToken as string,
    refreshToken: token.googleRefreshToken as string | undefined,
    expiresAt: token.googleExpiresAt as number | undefined,
  };
}
