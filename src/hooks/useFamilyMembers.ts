"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";

/**
 * Removes a family member. A few tables reference family_members without
 * ON DELETE CASCADE (reward_redemptions.approved_by, list_items.added_by,
 * photos.uploaded_by) — schema.sql §3 is final for MVP, so rather than add
 * migrations we null those attribution columns first, then delete. Every
 * other reference (chores, events, calendar integrations, notifications...)
 * already cascades or sets null on its own.
 */
export function useDeleteMember(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!supabase) throw new Error("Not ready");

      const cleanup = await Promise.all([
        supabase.from("reward_redemptions").update({ approved_by: null }).eq("approved_by", memberId),
        supabase.from("list_items").update({ added_by: null }).eq("added_by", memberId),
        supabase.from("photos").update({ uploaded_by: null }).eq("uploaded_by", memberId),
      ]);
      const cleanupError = cleanup.find((r) => r.error)?.error;
      if (cleanupError) throw new Error(cleanupError.message);

      const { error } = await supabase.from("family_members").delete().eq("id", memberId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["family"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar-integrations", familyId] });
    },
  });
}
