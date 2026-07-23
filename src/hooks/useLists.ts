"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { categorize } from "@/lib/groceryCategories";
import { normalizeStore, parseGroceryPhrase, setLastUsedStore } from "@/lib/groceryStores";
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
  /** Grocery store section; null = Any store. Unused for checklists. */
  store: string | null;
  checked: boolean;
  sort_order: number;
  created_at: string;
}

/** Stable display order: sort_order only (never by checked). created_at breaks ties. */
export function compareListItems(a: ListItemDTO, b: ListItemDTO): number {
  if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
  return a.created_at.localeCompare(b.created_at);
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
        .select("id, list_id, label, quantity, category, store, checked, sort_order, created_at")
        .eq("list_id", listId!)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      // Never order/filter by checked — keep positions stable.
      return [...(data ?? [])].sort(compareListItems);
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
    mutationFn: async ({
      label,
      addedBy,
      autoCategory,
      store,
      listId: overrideListId,
    }: {
      label: string;
      addedBy: string;
      autoCategory: boolean;
      /** Grocery store section; null/omit = Any store. Ignored when autoCategory is false. */
      store?: string | null;
      /** When creating a grocery list on first add, pass the new id here. */
      listId?: string;
    }) => {
      const id = overrideListId ?? listId;
      if (!supabase || !id) throw new Error("Not ready");

      let finalLabel = label.trim();
      let finalStore: string | null = null;
      if (autoCategory) {
        const parsed = parseGroceryPhrase(finalLabel);
        finalLabel = parsed.label;
        finalStore = normalizeStore(store) ?? parsed.store;
        setLastUsedStore(finalStore);
      }

      const { count } = await supabase.from("list_items").select("id", { count: "exact", head: true }).eq("list_id", id);
      const { error } = await supabase.from("list_items").insert({
        list_id: id,
        label: finalLabel,
        added_by: addedBy,
        category: autoCategory ? categorize(finalLabel) : null,
        store: autoCategory ? finalStore : null,
        sort_order: count ?? 0,
      });
      if (error) throw new Error(error.message);
      return id;
    },
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: ["list-items", id] });
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-todos"] });
    },
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
    onMutate: async ({ id, checked }) => {
      const queryKey = ["list-items", listId] as const;
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ListItemDTO[]>(queryKey);
      // Flip checked in place — do not re-sort or move the row.
      if (previous) {
        queryClient.setQueryData<ListItemDTO[]>(
          queryKey,
          previous.map((item) => (item.id === id ? { ...item, checked } : item))
        );
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(["list-items", listId], ctx.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["list-items", listId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-todos"] });
    },
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["list-items", listId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-todos"] });
    },
  });
}

export function useRenameListItem(listId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      if (!supabase) throw new Error("Not ready");
      const trimmed = label.trim();
      if (!trimmed) throw new Error("Label can't be empty");
      const { error } = await supabase.from("list_items").update({ label: trimmed }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["list-items", listId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-todos"] });
    },
  });
}

export function useCreateList(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, kind }: { name: string; kind: ListKind }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const { data, error } = await supabase.from("lists").insert({ family_id: familyId, name, kind }).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Couldn't create list");
      return data.id as string;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lists", familyId] }),
  });
}
