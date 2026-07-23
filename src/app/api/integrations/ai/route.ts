import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { encryptToken } from "@/lib/google/tokens";
import type { Database } from "@/types/database";

type IntegrationSettingsInsert = Database["public"]["Tables"]["integration_settings"]["Insert"];

/** Adult-only: which keys are configured and the chosen provider/models/voice — never key material itself. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can view this" }, { status: 403 });

  const { data } = await supabase
    .from("integration_settings")
    .select("ai_provider, ai_api_key_enc, openai_api_key_enc, ai_model, openai_model, voice_provider, voice_name")
    .eq("family_id", membership.familyId)
    .maybeSingle();

  return NextResponse.json({
    provider: data?.ai_provider ?? "anthropic",
    anthropicModel: data?.ai_model ?? null,
    openaiModel: data?.openai_model ?? null,
    anthropicConfigured: !!data?.ai_api_key_enc,
    openaiConfigured: !!data?.openai_api_key_enc,
    voiceProvider: data?.voice_provider ?? "browser",
    voiceName: data?.voice_name ?? null,
  });
}

const bodySchema = z.object({
  provider: z.enum(["anthropic", "openai"]).optional(),
  anthropicModel: z.string().optional(),
  openaiModel: z.string().optional(),
  anthropicApiKey: z.string().optional(),
  openaiApiKey: z.string().optional(),
  voiceProvider: z.enum(["browser", "openai"]).optional(),
  voiceName: z.string().optional(),
});

/** Partial update — only fields present in the body are touched. Empty-string keys clear that provider's stored key. */
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { provider, anthropicModel, openaiModel, anthropicApiKey, openaiApiKey, voiceProvider, voiceName } = parsed.data;

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can configure the assistant" }, { status: 403 });

  const update: IntegrationSettingsInsert = { family_id: membership.familyId };
  if (provider !== undefined) update.ai_provider = provider;
  if (anthropicModel !== undefined) update.ai_model = anthropicModel.trim() || null;
  if (openaiModel !== undefined) update.openai_model = openaiModel.trim() || null;
  if (anthropicApiKey !== undefined) {
    const trimmed = anthropicApiKey.trim();
    update.ai_api_key_enc = trimmed ? encryptToken(trimmed) : null;
  }
  if (openaiApiKey !== undefined) {
    const trimmed = openaiApiKey.trim();
    update.openai_api_key_enc = trimmed ? encryptToken(trimmed) : null;
  }
  if (voiceProvider !== undefined) update.voice_provider = voiceProvider;
  if (voiceName !== undefined) update.voice_name = voiceName.trim() || null;

  const { error } = await supabase.from("integration_settings").upsert(update, { onConflict: "family_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
