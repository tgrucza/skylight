/** Thin fetch wrappers for OpenAI's Chat Completions and TTS APIs — no SDK dependency, server-only. */

const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_SPEECH_URL = "https://api.openai.com/v1/audio/speech";

export interface OpenAiToolDef {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: { type: "object"; properties: Record<string, unknown>; required?: string[] };
  };
}

export interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export type OpenAiContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | OpenAiContentPart[] | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

interface OpenAiChatResponse {
  choices: { message: OpenAiMessage; finish_reason: string }[];
}

class OpenAiError extends Error {}

/** Curated for the Settings model picker — OpenAI's lineup moves faster than Anthropic's, so Settings also offers a free-text override. */
export const OPENAI_MODELS = [
  { id: "gpt-4o-mini", label: "GPT-4o mini (fastest)" },
  { id: "gpt-4o", label: "GPT-4o (recommended)" },
  { id: "gpt-4.1", label: "GPT-4.1 (most capable)" },
];
export const DEFAULT_OPENAI_MODEL = "gpt-4o";

export async function callOpenAiChat({
  apiKey,
  model,
  messages,
  tools,
}: {
  apiKey: string;
  model: string;
  messages: OpenAiMessage[];
  tools?: OpenAiToolDef[];
}): Promise<OpenAiChatResponse> {
  const res = await fetch(OPENAI_CHAT_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      ...(tools && tools.length > 0 ? { tools, tool_choice: "auto" } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `OpenAI API error (${res.status})`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // leave the generic message
    }
    throw new OpenAiError(message);
  }

  return res.json();
}

/** OpenAI's TTS voice roster — evolves over time; the "Other" free-text option in Settings covers drift. */
export const OPENAI_TTS_VOICES = ["alloy", "ash", "ballad", "coral", "echo", "fable", "onyx", "nova", "sage", "shimmer", "verse"];

export async function synthesizeOpenAiSpeech({ apiKey, voice, text }: { apiKey: string; voice: string; text: string }): Promise<ArrayBuffer> {
  const res = await fetch(OPENAI_SPEECH_URL, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "tts-1", voice, input: text }),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `OpenAI TTS error (${res.status})`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // leave the generic message
    }
    throw new OpenAiError(message);
  }

  return res.arrayBuffer();
}
