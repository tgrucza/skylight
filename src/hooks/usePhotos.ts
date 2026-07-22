"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { resizeImageFile } from "@/lib/imageResize";

export interface PhotoDTO {
  id: string;
  storage_path: string;
  caption: string | null;
  in_slideshow: boolean;
  signedUrl: string;
}

const SIGNED_URL_TTL_SECONDS = 3600;

export function usePhotos(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["photos", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<PhotoDTO[]> => {
      const { data } = await supabase!
        .from("photos")
        .select("id, storage_path, caption, in_slideshow")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false });
      if (!data || data.length === 0) return [];

      const { data: signed } = await supabase!.storage.from("photos").createSignedUrls(
        data.map((p) => p.storage_path),
        SIGNED_URL_TTL_SECONDS
      );

      return data.map((p, i) => ({ ...p, signedUrl: signed?.[i]?.signedUrl ?? "" }));
    },
  });
}

export function useUploadPhoto(familyId: string | undefined, memberId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (file: File) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const resized = await resizeImageFile(file);
      const path = `${familyId}/${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage.from("photos").upload(path, resized, { contentType: "image/jpeg" });
      if (uploadError) throw new Error(uploadError.message);

      const { error } = await supabase.from("photos").insert({ family_id: familyId, storage_path: path, uploaded_by: memberId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["photos", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-photos"] });
    },
  });
}

export function useToggleSlideshow(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, inSlideshow }: { id: string; inSlideshow: boolean }) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("photos").update({ in_slideshow: inSlideshow }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["photos", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-photos"] });
    },
  });
}

export function useDeletePhoto(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (photo: { id: string; storage_path: string }) => {
      if (!supabase) throw new Error("Not ready");
      await supabase.storage.from("photos").remove([photo.storage_path]);
      const { error } = await supabase.from("photos").delete().eq("id", photo.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["photos", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-photos"] });
    },
  });
}
