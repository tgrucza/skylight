import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { signSupabaseAccessToken } from "@/lib/supabase/jwt";

const EXPIRES_IN_SECONDS = 3600;

/** Issues a short-lived Supabase-compatible access token for the signed-in Auth.js user (see lib/supabase/jwt.ts). */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = signSupabaseAccessToken(session.user.id, EXPIRES_IN_SECONDS);
  return NextResponse.json({ token, expiresIn: EXPIRES_IN_SECONDS });
}
