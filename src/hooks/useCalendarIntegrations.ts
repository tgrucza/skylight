"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";

export interface CalendarIntegrationDTO {
  id: string;
  member_id: string;
  google_calendar_id: string;
  status: string;
}

/** Adult-only per RLS (calendar_integrations_adult) — tokens are ciphertext anyway, but the row itself is restricted. */
export function useCalendarIntegrations(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["calendar-integrations", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<CalendarIntegrationDTO[]> => {
      const { data } = await supabase!
        .from("calendar_integrations")
        .select("id, member_id, google_calendar_id, status")
        .eq("family_id", familyId!);
      return data ?? [];
    },
  });
}

export function useUnlinkCalendar(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (integrationId: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("calendar_integrations").delete().eq("id", integrationId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar-integrations", familyId] }),
  });
}
