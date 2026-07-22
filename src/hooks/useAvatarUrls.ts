"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import type { FamilyMemberDTO } from "./useFamily";

const SIGNED_URL_TTL_SECONDS = 3600;

/** Resolves every member's `avatar_url` storage path (photos bucket) to a signed URL in one batch call, cached for the TTL. */
export function useAvatarUrls(members: Pick<FamilyMemberDTO, "id" | "avatar_url">[] | undefined) {
  const supabase = useSupabaseClient();
  const paths = (members ?? []).filter((m) => m.avatar_url).map((m) => ({ id: m.id, path: m.avatar_url! }));

  return useQuery({
    queryKey: ["avatar-urls", paths.map((p) => p.path).sort()],
    enabled: !!supabase && paths.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data } = await supabase!.storage.from("photos").createSignedUrls(
        paths.map((p) => p.path),
        SIGNED_URL_TTL_SECONDS
      );
      const map: Record<string, string> = {};
      paths.forEach((p, i) => {
        const url = data?.[i]?.signedUrl;
        if (url) map[p.id] = url;
      });
      return map;
    },
  });
}
