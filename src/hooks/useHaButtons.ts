"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { callHaServiceDirect, isPrivateHaUrl } from "@/lib/ha";

export interface HaButtonDTO {
  id: string;
  label: string;
  icon: string;
  entity_id: string;
  service: string;
  sort_order: number;
}

export function useHaButtons(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["ha-buttons", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<HaButtonDTO[]> => {
      const { data, error } = await supabase!
        .from("ha_buttons")
        .select("id, label, icon, entity_id, service, sort_order")
        .eq("family_id", familyId!)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}

export function useUpsertHaButton(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      label: string;
      icon: string;
      entity_id: string;
      service: string;
      sort_order?: number;
    }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      if (input.id) {
        const { error } = await supabase
          .from("ha_buttons")
          .update({
            label: input.label.trim(),
            icon: input.icon,
            entity_id: input.entity_id.trim(),
            service: input.service.trim(),
            sort_order: input.sort_order ?? 0,
          })
          .eq("id", input.id);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase.from("ha_buttons").insert({
        family_id: familyId,
        label: input.label.trim(),
        icon: input.icon,
        entity_id: input.entity_id.trim(),
        service: input.service.trim(),
        sort_order: input.sort_order ?? 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ha-buttons", familyId] }),
  });
}

export function useDeleteHaButton(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("ha_buttons").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["ha-buttons", familyId] }),
  });
}

/** Invoke a saved HA button — LAN goes client-direct; public URL uses the server proxy. */
export function useInvokeHaButton() {
  return useMutation({
    mutationFn: async (button: HaButtonDTO) => {
      const res = await fetch("/api/ha/service", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ buttonId: button.id }),
      });

      if (res.ok) return { label: button.label };

      if (res.status === 409) {
        const tokenRes = await fetch("/api/ha/client-token");
        if (!tokenRes.ok) throw new Error((await tokenRes.json().catch(() => ({})))?.error ?? "Couldn't get HA token");
        const { baseUrl, token } = (await tokenRes.json()) as { baseUrl: string; token: string };
        await callHaServiceDirect({
          baseUrl,
          token,
          service: button.service,
          entityId: button.entity_id,
        });
        return { label: button.label };
      }

      throw new Error((await res.json().catch(() => ({})))?.error ?? "Home Assistant call failed");
    },
  });
}

export function useHaConnection(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["ha-connection", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async () => {
      const res = await fetch("/api/ha/settings");
      if (!res.ok) throw new Error("Failed to load Home Assistant settings");
      return res.json() as Promise<{ baseUrl: string | null; tokenConfigured: boolean; isPrivate: boolean }>;
    },
  });
}

export { isPrivateHaUrl };
