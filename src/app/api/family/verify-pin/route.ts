import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { verifyPin } from "@/lib/pin";
import { isRateLimited, recordAttempt } from "@/lib/rateLimit";

const bodySchema = z.object({ memberId: z.string().uuid(), pin: z.string().regex(/^\d{4}$/) });

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 5 * 60_000;

/** Verifies a child's wall PIN to switch the active profile (spec §6.6, §7.5). Rate-limited per member. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { memberId, pin } = parsed.data;

  if (isRateLimited(memberId, MAX_ATTEMPTS, WINDOW_MS)) {
    return NextResponse.json({ error: "Too many attempts — try again in a few minutes" }, { status: 429 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: member } = await supabase.from("family_members").select("id, pin_hash, role").eq("id", memberId).single();

  if (!member || member.role !== "child" || !member.pin_hash) {
    return NextResponse.json({ error: "No PIN set for this profile" }, { status: 400 });
  }

  const ok = await verifyPin(pin, member.pin_hash);
  if (!ok) {
    recordAttempt(memberId);
    return NextResponse.json({ error: "Incorrect PIN" }, { status: 401 });
  }

  return NextResponse.json({ ok: true });
}
