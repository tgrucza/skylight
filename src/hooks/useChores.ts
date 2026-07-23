"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";

export interface ChoreDTO {
  id: string;
  title: string;
  icon: string | null;
  star_value: number;
  schedule_days: number[];
  active: boolean;
  assignedMemberIds: string[];
}

export interface ChoreCompletionDTO {
  chore_id: string;
  member_id: string;
  completed_on: string;
  stars: number;
}

export function useChores(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["chores", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<ChoreDTO[]> => {
      const { data: chores } = await supabase!
        .from("chores")
        .select("id, title, icon, star_value, schedule_days, active")
        .eq("family_id", familyId!)
        .eq("active", true)
        .order("created_at");
      if (!chores || chores.length === 0) return [];

      const { data: assignments } = await supabase!
        .from("chore_assignments")
        .select("chore_id, member_id")
        .in("chore_id", chores.map((c) => c.id));

      return chores.map((c) => ({
        ...c,
        assignedMemberIds: (assignments ?? []).filter((a) => a.chore_id === c.id).map((a) => a.member_id),
      }));
    },
  });
}

export function useChoreCompletions(familyId: string | undefined, startIso: string, endIso: string) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["chore-completions", familyId, startIso, endIso],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<ChoreCompletionDTO[]> => {
      const { data: chores } = await supabase!.from("chores").select("id").eq("family_id", familyId!);
      const choreIds = (chores ?? []).map((c) => c.id);
      if (choreIds.length === 0) return [];

      const { data } = await supabase!
        .from("chore_completions")
        .select("chore_id, member_id, completed_on, stars")
        .in("chore_id", choreIds)
        .gte("completed_on", startIso)
        .lte("completed_on", endIso);
      return data ?? [];
    },
  });
}

export function useSaveChore(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      icon?: string | null;
      starValue: number;
      scheduleDays: number[];
      assignedMemberIds: string[];
    }) => {
      if (!supabase || !familyId) throw new Error("Not ready");

      let choreId = input.id;
      if (choreId) {
        const { error } = await supabase
          .from("chores")
          .update({ title: input.title, icon: input.icon, star_value: input.starValue, schedule_days: input.scheduleDays })
          .eq("id", choreId);
        if (error) throw new Error(error.message);
        await supabase.from("chore_assignments").delete().eq("chore_id", choreId);
      } else {
        const { data, error } = await supabase
          .from("chores")
          .insert({ family_id: familyId, title: input.title, icon: input.icon, star_value: input.starValue, schedule_days: input.scheduleDays })
          .select("id")
          .single();
        if (error || !data) throw new Error(error?.message ?? "Failed to create chore");
        choreId = data.id;
      }

      if (input.assignedMemberIds.length > 0) {
        const { error } = await supabase
          .from("chore_assignments")
          .insert(input.assignedMemberIds.map((memberId) => ({ chore_id: choreId!, member_id: memberId })));
        if (error) throw new Error(error.message);
      }
      return choreId;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chores", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-chores-today"] });
    },
  });
}

export function useDeleteChore(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (choreId: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("chores").update({ active: false }).eq("id", choreId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chores", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-chores-today"] });
    },
  });
}

export function useToggleChoreCompletion(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ choreId, memberId, dateIso, done, stars }: { choreId: string; memberId: string; dateIso: string; done: boolean; stars: number }) => {
      if (!supabase) throw new Error("Not ready");
      if (done) {
        const { error } = await supabase.from("chore_completions").insert({ chore_id: choreId, member_id: memberId, completed_on: dateIso, stars });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("chore_completions")
          .delete()
          .eq("chore_id", choreId)
          .eq("member_id", memberId)
          .eq("completed_on", dateIso);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["chore-completions", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-chores-today"] });
    },
  });
}
