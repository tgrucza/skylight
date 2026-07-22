"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { categorize } from "@/lib/groceryCategories";
import type { ListKind } from "@/types/database";

export interface ListDTO {
  id: string;
  name: string;
  kind: ListKind;
  sort_order: number;
}

export interface ListItemDTO {
  id: string;
  list_id: string;
  label: string;
  quantity: string | null;
  category: string | null;
  checked: boolean;
  sort_order: number;
}

export function useLists(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["lists", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<ListDTO[]> => {
      const { data } = await supabase!.from("lists").select("id, name, kind, sort_order").eq("family_id", familyId!).order("sort_order");
      return data ?? [];
    },
  });
}

/** Live-updates via Supabase Realtime so a phone check-off shows instantly on the wall (spec §2.1, §5 M5). */
export function useListItems(listId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const queryKey = ["list-items", listId];

  const query = useQuery({
    queryKey,
    enabled: !!supabase && !!listId,
    queryFn: async (): Promise<ListItemDTO[]> => {
      const { data } = await supabase!
        .from("list_items")
        .select("id, list_id, label, quantity, category, checked, sort_order")
        .eq("list_id", listId!)
        .order("sort_order");
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!supabase || !listId) return;
    const channel = supabase
      .channel(`list-items-${listId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "list_items", filter: `list_id=eq.${listId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ["list-items", listId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, listId, queryClient]);

  return query;
}

export function useAddListItem(listId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ label, addedBy, autoCategory }: { label: string; addedBy: string; autoCategory: boolean }) => {
      if (!supabase || !listId) throw new Error("Not ready");
      const { count } = await supabase.from("list_items").select("id", { count: "exact", head: true }).eq("list_id", listId);
      const { error } = await supabase.from("list_items").insert({
        list_id: listId,
        label,
        added_by: addedBy,
        category: autoCategory ? categorize(label) : null,
        sort_order: count ?? 0,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list-items", listId] }),
  });
}

export function useToggleListItem(listId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, checked }: { id: string; checked: boolean }) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("list_items").update({ checked }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list-items", listId] }),
  });
}

export function useDeleteListItem(listId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("list_items").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["list-items", listId] }),
  });
}

export function useCreateList(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, kind }: { name: string; kind: ListKind }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const { error } = await supabase.from("lists").insert({ family_id: familyId, name, kind });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lists", familyId] }),
  });
}
