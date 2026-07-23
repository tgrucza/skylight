"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";
import { addGroceryItemsDeduped, formatIngredientLabel } from "@/lib/groceryList";

export interface RecipeIngredient {
  name: string;
  qty: string;
}

export interface RecipeDTO {
  id: string;
  title: string;
  url: string | null;
  notes: string | null;
  ingredients: RecipeIngredient[];
}

export function useRecipes(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["recipes", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<RecipeDTO[]> => {
      const { data, error } = await supabase!
        .from("recipes")
        .select("id, title, url, notes, ingredients")
        .eq("family_id", familyId!)
        .order("title");
      if (error) throw new Error(error.message);
      return (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        url: r.url,
        notes: r.notes,
        ingredients: Array.isArray(r.ingredients) ? (r.ingredients as RecipeIngredient[]) : [],
      }));
    },
  });
}

export function useSaveRecipe(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      title: string;
      url?: string;
      notes?: string;
      ingredients: RecipeIngredient[];
    }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const payload = {
        family_id: familyId,
        title: input.title.trim(),
        url: input.url?.trim() || null,
        notes: input.notes?.trim() || null,
        ingredients: input.ingredients.filter((i) => i.name.trim()),
      };
      if (input.id) {
        const { error } = await supabase.from("recipes").update(payload).eq("id", input.id);
        if (error) throw new Error(error.message);
        return input.id;
      }
      const { data, error } = await supabase.from("recipes").insert(payload).select("id").single();
      if (error || !data) throw new Error(error?.message ?? "Couldn't save recipe");
      return data.id as string;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["recipes", familyId] }),
  });
}

export function useDeleteRecipe(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["recipes", familyId] }),
  });
}

export function useAddRecipeIngredientsToGroceries(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ingredients: RecipeIngredient[]) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const labels = ingredients.map(formatIngredientLabel);
      return addGroceryItemsDeduped(supabase, familyId, labels);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["list-items"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      void queryClient.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}
