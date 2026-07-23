import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { decryptToken } from "@/lib/google/tokens";
import { callClaude } from "@/lib/anthropic";
import { callOpenAiChat } from "@/lib/openai";

const bodySchema = z.object({ provider: z.enum(["anthropic", "openai"]) });

/** Sends a trivial prompt through the family's stored key for the given provider so Settings can show a clear pass/fail. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({ provider: "anthropic" })));
  const provider = parsed.success ? parsed.data.provider : "anthropic";

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can do this" }, { status: 403 });

  const { data } = await supabase
    .from("integration_settings")
    .select("ai_api_key_enc, openai_api_key_enc, ai_model")
    .eq("family_id", membership.familyId)
    .maybeSingle();

  try {
    if (provider === "anthropic") {
      if (!data?.ai_api_key_enc) return NextResponse.json({ ok: false, error: "No Anthropic key saved yet" });
      const apiKey = decryptToken(data.ai_api_key_enc);
      await callClaude({ apiKey, model: data.ai_model ?? undefined, system: "Reply with exactly: ok", messages: [{ role: "user", content: "ping" }] });
    } else {
      if (!data?.openai_api_key_enc) return NextResponse.json({ ok: false, error: "No OpenAI key saved yet" });
      const apiKey = decryptToken(data.openai_api_key_enc);
      await callOpenAiChat({
        apiKey,
        model: data.ai_model ?? "gpt-4o",
        messages: [
          { role: "system", content: "Reply with exactly: ok" },
          { role: "user", content: "ping" },
        ],
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : "Test failed" });
  }
}
