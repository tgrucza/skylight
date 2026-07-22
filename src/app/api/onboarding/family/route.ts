import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { DEFAULT_MEMBER_COLOR } from "@/lib/colors";

const bodySchema = z.object({
  familyName: z.string().trim().min(1).max(80),
  timezone: z.string().trim().min(1).max(80),
  memberName: z.string().trim().min(1).max(80),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .default(DEFAULT_MEMBER_COLOR),
});

/**
 * Bootstraps a brand-new family: no family_members row can exist yet for
 * this user, so RLS's is_family_adult() can't pass — this is the one place
 * onboarding must use the service-role client (see supabase/policies.sql).
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { familyName, timezone, memberName, colorHex } = parsed.data;

  const { data: existing } = await supabaseAdmin().from("family_members").select("id").eq("user_id", session.user.id).limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json({ error: "You already belong to a family" }, { status: 409 });
  }

  const { data: family, error: familyError } = await supabaseAdmin()
    .from("families")
    .insert({ name: familyName, timezone })
    .select("id")
    .single();
  if (familyError || !family) {
    return NextResponse.json({ error: familyError?.message ?? "Failed to create family" }, { status: 500 });
  }

  const { data: member, error: memberError } = await supabaseAdmin()
    .from("family_members")
    .insert({
      family_id: family.id,
      user_id: session.user.id,
      name: memberName,
      role: "adult",
      color_hex: colorHex,
      sort_order: 0,
    })
    .select("id")
    .single();
  if (memberError || !member) {
    return NextResponse.json({ error: memberError?.message ?? "Failed to create member" }, { status: 500 });
  }

  await supabaseAdmin().from("settings").insert({ family_id: family.id });

  return NextResponse.json({ familyId: family.id, memberId: member.id });
}
