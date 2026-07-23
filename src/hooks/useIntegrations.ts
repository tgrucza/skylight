"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";

/** Just the Home Assistant link (spec: HA integration is a link for now — entity tiles/buttons are a later phase). */
export function useHomeAssistantUrl(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["integration-settings", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase!.from("integration_settings").select("ha_base_url").eq("family_id", familyId!).maybeSingle();
      if (error) throw new Error(error.message);
      return data?.ha_base_url ?? null;
    },
  });
}

export function useUpdateHomeAssistantUrl(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (haBaseUrl: string) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const { error } = await supabase
        .from("integration_settings")
        .upsert({ family_id: familyId, ha_base_url: haBaseUrl || null }, { onConflict: "family_id" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["integration-settings", familyId] }),
  });
}

export interface AiSettingsDTO {
  provider: "anthropic" | "openai";
  anthropicModel: string | null;
  openaiModel: string | null;
  anthropicConfigured: boolean;
  openaiConfigured: boolean;
  voiceProvider: "browser" | "openai";
  voiceName: string | null;
}

/** Adult-only — goes through /api/integrations/ai (not the RLS client directly) so the encrypted key blobs never reach the browser. */
export function useAiSettings(enabled: boolean) {
  return useQuery({
    queryKey: ["ai-settings"],
    enabled,
    queryFn: async (): Promise<AiSettingsDTO> => {
      const res = await fetch("/api/integrations/ai");
      if (!res.ok) throw new Error("Failed to load AI settings");
      return res.json();
    },
  });
}

export interface AiSettingsUpdate {
  provider?: "anthropic" | "openai";
  anthropicModel?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  openaiApiKey?: string;
  voiceProvider?: "browser" | "openai";
  voiceName?: string;
}

/** Partial update — only send the fields that changed (e.g. just `{ openaiApiKey }`, or just `{ voiceProvider, voiceName }`). */
export function useUpdateAiSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (update: AiSettingsUpdate) => {
      const res = await fetch("/api/integrations/ai", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(update),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Failed to save");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["ai-settings"] }),
  });
}

export function useTestAiKey() {
  return useMutation({
    mutationFn: async (provider: "anthropic" | "openai"): Promise<{ ok: boolean; error?: string }> => {
      const res = await fetch("/api/integrations/ai/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      return res.json();
    },
  });
}

/** Fetches a short OpenAI TTS sample as a playable object URL — caller is responsible for revoking it once done. */
export function usePlayVoiceSample() {
  return useMutation({
    mutationFn: async (voice: string): Promise<string> => {
      const res = await fetch("/api/integrations/voice-sample", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ voice }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Couldn't generate a sample");
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    },
  });
}

export interface AssistantResponse {
  reply: string;
  actions: { tool: string; summary: string; clientInvoke?: string }[];
}

export interface AssistantImage {
  mediaType: string;
  data: string; // base64 without data: prefix
}

export function useAskAssistant() {
  return useMutation({
    mutationFn: async (input: string | { transcript?: string; image?: AssistantImage }): Promise<AssistantResponse> => {
      const body = typeof input === "string" ? { transcript: input } : input;
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Judy couldn't do that");
      return res.json();
    },
  });
}
