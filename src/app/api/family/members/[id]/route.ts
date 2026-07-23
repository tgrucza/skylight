import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership, normalizeEmail } from "@/lib/family";
import { hashPin } from "@/lib/pin";
import type { Database } from "@/types/database";

type MemberUpdate = Database["public"]["Tables"]["family_members"]["Update"];

const bodySchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  role: z.enum(["adult", "child"]).optional(),
  colorHex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  pin: z
    .union([z.string().regex(/^\d{4}$/), z.null()])
    .optional(),
  birthday: z.union([z.string().date(), z.null()]).optional(),
  inviteEmail: z
    .union([
      z
        .string()
        .trim()
        .email()
        .transform((v) => normalizeEmail(v)),
      z.null(),
    ])
    .optional(),
  avatarUrl: z.union([z.string(), z.null()]).optional(),
});

/** Edits a family member's profile. Adult-only (RLS also enforces this on the underlying update). */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id: memberId } = await params;
  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const body = parsed.data;

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can edit members" }, { status: 403 });

  // Only an only-adult may not demote themselves — check before writing.
  if (body.role === "child" && memberId === membership.memberId) {
    const { count } = await supabase
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("family_id", membership.familyId)
      .eq("role", "adult");
    if ((count ?? 0) <= 1) {
      return NextResponse.json({ error: "You're the only adult in the family — add another adult before stepping down." }, { status: 400 });
    }
  }

  const update: MemberUpdate = {};
  if (body.name !== undefined) update.name = body.name;
  if (body.role !== undefined) update.role = body.role;
  if (body.colorHex !== undefined) update.color_hex = body.colorHex;
  if (body.birthday !== undefined) update.birthday = body.birthday;
  if (body.inviteEmail !== undefined) update.invite_email = body.inviteEmail;
  if (body.avatarUrl !== undefined) update.avatar_url = body.avatarUrl;
  if (body.pin !== undefined) update.pin_hash = body.pin ? await hashPin(body.pin) : null;

  if (Object.keys(update).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

  const { data, error } = await supabase.from("family_members").update(update).eq("id", memberId).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ member: data });
}
