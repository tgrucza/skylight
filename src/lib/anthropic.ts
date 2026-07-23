/** Thin fetch wrapper for the Claude Messages API — no SDK dependency, server-only (uses the family's own decrypted key). */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

/** Curated for the Settings model picker — current as of the claude-api skill's model table. */
export const ANTHROPIC_MODELS = [
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fastest)" },
  { id: "claude-sonnet-5", label: "Claude Sonnet 5 (recommended)" },
  { id: "claude-opus-4-8", label: "Claude Opus 4.8 (most capable)" },
];
export const DEFAULT_ANTHROPIC_MODEL = "claude-sonnet-5";

export interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export type AnthropicContentBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } }
  | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> }
  | { type: "tool_result"; tool_use_id: string; content: string };

export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | AnthropicContentBlock[];
}

interface AnthropicResponse {
  content: AnthropicContentBlock[];
  stop_reason: string;
}

class AnthropicError extends Error {}

export async function callClaude({
  apiKey,
  model,
  system,
  messages,
  tools,
}: {
  apiKey: string;
  model?: string;
  system: string;
  messages: AnthropicMessage[];
  tools?: AnthropicToolDef[];
}): Promise<AnthropicResponse> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model: model || DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 1024,
      system,
      messages,
      ...(tools && tools.length > 0 ? { tools } : {}),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = `Claude API error (${res.status})`;
    try {
      const parsed = JSON.parse(body);
      if (parsed?.error?.message) message = parsed.error.message;
    } catch {
      // leave the generic message
    }
    throw new AnthropicError(message);
  }

  return res.json();
}
