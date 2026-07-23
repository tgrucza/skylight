import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { categorize } from "@/lib/groceryCategories";

type Client = SupabaseClient<Database>;

/** Ensure the family has a grocery list; return its id. */
export async function ensureGroceryListId(supabase: Client, familyId: string): Promise<string> {
  const { data: existing } = await supabase.from("lists").select("id").eq("family_id", familyId).eq("kind", "grocery").limit(1).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("lists")
    .insert({ family_id: familyId, name: "Groceries", kind: "grocery" })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Couldn't create the grocery list");
  return created.id;
}

export async function ensureChecklistId(supabase: Client, familyId: string, name = "To-Do"): Promise<string> {
  const { data: existing } = await supabase.from("lists").select("id").eq("family_id", familyId).eq("kind", "checklist").limit(1).maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("lists")
    .insert({ family_id: familyId, name, kind: "checklist" })
    .select("id")
    .single();
  if (error || !created) throw new Error(error?.message ?? "Couldn't create the to-do list");
  return created.id;
}

/**
 * Insert grocery labels, skipping case-insensitive duplicates among unchecked items.
 * Returns how many were added vs skipped.
 */
export async function addGroceryItemsDeduped(
  supabase: Client,
  familyId: string,
  labels: string[],
  addedBy: string | null = null
): Promise<{ added: number; skipped: number; labelsAdded: string[] }> {
  const listId = await ensureGroceryListId(supabase, familyId);
  const normalized = labels.map((l) => l.trim()).filter(Boolean);
  if (normalized.length === 0) return { added: 0, skipped: 0, labelsAdded: [] };

  const { data: existing } = await supabase.from("list_items").select("label").eq("list_id", listId).eq("checked", false);
  const existingSet = new Set((existing ?? []).map((i) => i.label.trim().toLowerCase()));

  const toInsert: string[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const label of normalized) {
    const key = label.toLowerCase();
    if (existingSet.has(key) || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    toInsert.push(label);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("list_items").insert(
      toInsert.map((label) => ({
        list_id: listId,
        label,
        category: categorize(label),
        added_by: addedBy,
      }))
    );
    if (error) throw new Error(error.message);
  }

  return { added: toInsert.length, skipped, labelsAdded: toInsert };
}

export function formatIngredientLabel(ing: { name: string; qty?: string | null }): string {
  const name = ing.name.trim();
  const qty = ing.qty?.trim();
  return qty ? `${qty} ${name}` : name;
}
