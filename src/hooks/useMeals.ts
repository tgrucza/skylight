"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import type { MealSlot } from "@/types/database";

export interface MealEntryDTO {
  id: string;
  date: string;
  slot: MealSlot;
  title: string | null;
  recipe_id: string | null;
}

export function useMealPlan(familyId: string | undefined, startIso: string, endIso: string) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["meal-plan", familyId, startIso, endIso],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<MealEntryDTO[]> => {
      const { data } = await supabase!
        .from("meal_plan_entries")
        .select("id, date, slot, title, recipe_id")
        .eq("family_id", familyId!)
        .gte("date", startIso)
        .lte("date", endIso);
      return data ?? [];
    },
  });
}

export function useSetMealEntry(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ date, slot, title }: { date: string; slot: MealSlot; title: string }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      if (!title.trim()) {
        const { error } = await supabase.from("meal_plan_entries").delete().eq("family_id", familyId).eq("date", date).eq("slot", slot);
        if (error) throw new Error(error.message);
        return;
      }
      const { error } = await supabase
        .from("meal_plan_entries")
        .upsert({ family_id: familyId, date, slot, title: title.trim() }, { onConflict: "family_id,date,slot" });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["meal-plan", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-meals-today"] });
    },
  });
}
