"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import type { FamilySettingsDTO } from "./useFamily";

export function useUpdateSettings(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<FamilySettingsDTO, "family_id">>) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const { error } = await supabase.from("settings").update(patch).eq("family_id", familyId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family"] }),
  });
}

/** Renames the family / changes its timezone (spec §3.4, H4). RLS's `families_update_adult` policy is the security boundary. */
export function useUpdateFamily(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: { name?: string; timezone?: string }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const { error } = await supabase.from("families").update(patch).eq("id", familyId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["family"] }),
  });
}
