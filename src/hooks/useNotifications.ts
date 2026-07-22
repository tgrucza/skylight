"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import type { NotificationKind } from "@/types/database";

export interface NotificationDTO {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
}

/** Bell + badge feed (spec §1.5 MVP "In-app notifications feed"). Realtime so a new notification (e.g. from a cron digest) appears without a refresh. */
export function useNotifications(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const queryKey = ["notifications", familyId];

  const query = useQuery({
    queryKey,
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<NotificationDTO[]> => {
      const { data } = await supabase!
        .from("notifications")
        .select("id, kind, title, body, read_at, created_at")
        .eq("family_id", familyId!)
        .order("created_at", { ascending: false })
        .limit(30);
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!supabase || !familyId) return;
    const channel = supabase
      .channel(`notifications-${familyId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `family_id=eq.${familyId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["notifications", familyId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, familyId, queryClient]);

  return query;
}

export function useMarkNotificationRead(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", familyId] }),
  });
}

export function useMarkAllNotificationsRead(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (unreadIds: string[]) => {
      if (!supabase || unreadIds.length === 0) return;
      const { error } = await supabase.from("notifications").update({ read_at: new Date().toISOString() }).in("id", unreadIds);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications", familyId] }),
  });
}
