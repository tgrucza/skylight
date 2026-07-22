import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { hashPin } from "@/lib/pin";

const memberSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: z.enum(["adult", "child"]),
  colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  pin: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  inviteEmail: z.string().trim().toLowerCase().email().optional(),
});

const bodySchema = z.object({
  familyId: z.string().uuid(),
  members: z.array(memberSchema).min(1).max(20),
});

/** Adds additional family members during onboarding (or later from /family). Adult-only, enforced by RLS. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { familyId, members } = parsed.data;

  const rows = await Promise.all(
    members.map(async (m, i) => ({
      family_id: familyId,
      name: m.name,
      role: m.role,
      color_hex: m.colorHex,
      pin_hash: m.pin ? await hashPin(m.pin) : null,
      invite_email: m.inviteEmail ?? null,
      sort_order: i + 1,
    }))
  );

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("family_members").insert(rows).select("id, name, role, color_hex");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ members: data });
}
