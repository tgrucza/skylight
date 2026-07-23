import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getCurrentMembership } from "@/lib/family";
import { decryptToken } from "@/lib/google/tokens";
import { synthesizeOpenAiSpeech } from "@/lib/openai";

const bodySchema = z.object({ voice: z.string().min(1), text: z.string().min(1).max(2000).optional() });
const SAMPLE_TEXT = "Hi, I'm Judy. This is what I sound like.";

/**
 * Adult-only: synthesizes OpenAI TTS speech using the family's stored OpenAI key.
 * Doubles as both the Settings voice picker's "Play sample" button (no `text`, uses the fixed
 * sample line) and Judy's actual reply-speaking in AskJudyModal (`text` = her reply).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const membership = await getCurrentMembership(supabase, session.user.id);
  if (!membership) return NextResponse.json({ error: "No family" }, { status: 404 });
  if (membership.role !== "adult") return NextResponse.json({ error: "Only adults can do this" }, { status: 403 });

  const { data } = await supabase.from("integration_settings").select("openai_api_key_enc").eq("family_id", membership.familyId).maybeSingle();
  if (!data?.openai_api_key_enc) {
    return NextResponse.json({ error: "Add an OpenAI API key first to preview OpenAI voices." }, { status: 400 });
  }

  try {
    const apiKey = decryptToken(data.openai_api_key_enc);
    const audio = await synthesizeOpenAiSpeech({ apiKey, voice: parsed.data.voice, text: parsed.data.text ?? SAMPLE_TEXT });
    return new NextResponse(audio, { headers: { "content-type": "audio/mpeg" } });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Couldn't generate a sample" }, { status: 500 });
  }
}
