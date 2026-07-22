"use client";

import { useQuery } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";

export interface ChoreToday {
  completionId: string; // chore_id, used as the row key
  title: string;
  icon: string | null;
  done: boolean;
}

/** Today's chores across the whole family, for the Hub's compact ChoresWidget — full per-member chore management lands in M4. */
export function useChoresToday(familyId: string | undefined, todayIso: string) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["hub-chores-today", familyId, todayIso],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<ChoreToday[]> => {
      const dow = new Date(todayIso).getDay();
      const { data: chores } = await supabase!
        .from("chores")
        .select("id, title, icon, schedule_days, active")
        .eq("family_id", familyId!)
        .eq("active", true);

      const todays = (chores ?? []).filter((c) => c.schedule_days.length === 0 || c.schedule_days.includes(dow));
      if (todays.length === 0) return [];

      const { data: completions } = await supabase!
        .from("chore_completions")
        .select("chore_id")
        .eq("completed_on", todayIso)
        .in("chore_id", todays.map((c) => c.id));

      const doneIds = new Set((completions ?? []).map((c) => c.chore_id));
      return todays.map((c) => ({ completionId: c.id, title: c.title, icon: c.icon, done: doneIds.has(c.id) }));
    },
  });
}

export interface MealsToday {
  breakfast: string | null;
  lunch: string | null;
  dinner: string | null;
}

export function useMealsToday(familyId: string | undefined, todayIso: string) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["hub-meals-today", familyId, todayIso],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<MealsToday> => {
      const { data } = await supabase!.from("meal_plan_entries").select("slot, title").eq("family_id", familyId!).eq("date", todayIso);
      const bySlot = Object.fromEntries((data ?? []).map((m) => [m.slot, m.title]));
      return { breakfast: bySlot.breakfast ?? null, lunch: bySlot.lunch ?? null, dinner: bySlot.dinner ?? null };
    },
  });
}

export function useGroceryPreview(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["hub-groceries", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<string[]> => {
      const { data: list } = await supabase!.from("lists").select("id").eq("family_id", familyId!).eq("kind", "grocery").limit(1).maybeSingle();
      if (!list) return [];
      const { data: items } = await supabase!
        .from("list_items")
        .select("label")
        .eq("list_id", list.id)
        .eq("checked", false)
        .order("sort_order")
        .limit(6);
      return (items ?? []).map((i) => i.label);
    },
  });
}

export interface SlideshowPhoto {
  id: string;
  url: string;
  caption: string | null;
}

export function useSlideshowPhotos(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["hub-photos", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<SlideshowPhoto[]> => {
      const { data } = await supabase!
        .from("photos")
        .select("id, storage_path, caption")
        .eq("family_id", familyId!)
        .eq("in_slideshow", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data || data.length === 0) return [];

      // Bucket is private (spec §2.2 "Signed URLs") — sign each path with a 1h TTL.
      const { data: signed } = await supabase!.storage.from("photos").createSignedUrls(
        data.map((p) => p.storage_path),
        3600
      );

      return data.map((p, i) => ({ id: p.id, url: signed?.[i]?.signedUrl ?? "", caption: p.caption }));
    },
  });
}
