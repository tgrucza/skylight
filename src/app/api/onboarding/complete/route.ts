import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const bodySchema = z.object({ familyId: z.string().uuid() });

/** Final onboarding step: seeds the default Groceries + To-Do lists. */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { familyId } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("lists").insert([
    { family_id: familyId, name: "Groceries", kind: "grocery", sort_order: 0 },
    { family_id: familyId, name: "To-Do", kind: "checklist", sort_order: 1 },
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
