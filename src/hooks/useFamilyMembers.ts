"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { resizeImageFile } from "@/lib/imageResize";

export interface UpdateMemberInput {
  memberId: string;
  name?: string;
  role?: "adult" | "child";
  colorHex?: string;
  pin?: string | null;
  birthday?: string | null;
  inviteEmail?: string | null;
  avatarUrl?: string | null;
}

/** PATCH /api/family/members/[id] — adult-only member edits (spec §3.3). */
export function useUpdateMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ memberId, ...rest }: UpdateMemberInput) => {
      const res = await fetch(`/api/family/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.formErrors?.[0] ?? body.error ?? "Couldn't save changes");
      return body.member;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["family"] });
      void queryClient.invalidateQueries({ queryKey: ["avatar-urls"] });
    },
  });
}

/** Uploads a member's avatar to the private photos bucket, then PATCHes `avatar_url` to the stored path (not a signed URL). */
export function useUploadAvatar(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const updateMember = useUpdateMember();

  return useMutation({
    mutationFn: async ({ memberId, file }: { memberId: string; file: File }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const resized = await resizeImageFile(file, 512);
      const path = `${familyId}/avatars/${memberId}.jpg`;

      const { error: uploadError } = await supabase.storage.from("photos").upload(path, resized, { contentType: "image/jpeg", upsert: true });
      if (uploadError) throw new Error(uploadError.message);

      await updateMember.mutateAsync({ memberId, avatarUrl: path });
    },
  });
}

/** Deletes a member's avatar object (best-effort) and nulls `avatar_url`. */
export function useRemoveAvatar() {
  const supabase = useSupabaseClient();
  const updateMember = useUpdateMember();

  return useMutation({
    mutationFn: async ({ memberId, path }: { memberId: string; path: string }) => {
      if (supabase) await supabase.storage.from("photos").remove([path]);
      await updateMember.mutateAsync({ memberId, avatarUrl: null });
    },
  });
}

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

      if (familyId) await supabase.storage.from("photos").remove([`${familyId}/avatars/${memberId}.jpg`]);

      const { error } = await supabase.from("family_members").delete().eq("id", memberId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["family"] });
      void queryClient.invalidateQueries({ queryKey: ["calendar-integrations", familyId] });
    },
  });
}
