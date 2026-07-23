import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { categorize } from "@/lib/groceryCategories";
import { normalizeStore, parseGroceryPhrase, storeDedupeKey } from "@/lib/groceryStores";

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

export type GroceryItemInput = string | { label: string; store?: string | null };

/**
 * Insert grocery labels, skipping case-insensitive duplicates among unchecked items
 * within the same store section (Any store is its own bucket).
 * Phrase parsing: "milk from Costco" / "Sam's Club: paper towels" when store isn't passed.
 */
export async function addGroceryItemsDeduped(
  supabase: Client,
  familyId: string,
  labels: GroceryItemInput[],
  addedBy: string | null = null,
  defaultStore: string | null = null
): Promise<{ added: number; skipped: number; labelsAdded: string[] }> {
  const listId = await ensureGroceryListId(supabase, familyId);
  const defaultNorm = normalizeStore(defaultStore);

  const parsed = labels
    .map((entry) => {
      if (typeof entry === "string") {
        const p = parseGroceryPhrase(entry);
        return {
          label: p.label.trim(),
          store: p.store ?? defaultNorm,
        };
      }
      const fromLabel = parseGroceryPhrase(entry.label);
      return {
        label: fromLabel.label.trim(),
        store: normalizeStore(entry.store) ?? fromLabel.store ?? defaultNorm,
      };
    })
    .filter((p) => p.label);

  if (parsed.length === 0) return { added: 0, skipped: 0, labelsAdded: [] };

  const { data: existing } = await supabase
    .from("list_items")
    .select("label, store")
    .eq("list_id", listId)
    .eq("checked", false);

  const existingSet = new Set(
    (existing ?? []).map((i) => `${storeDedupeKey(i.store)}::${i.label.trim().toLowerCase()}`)
  );

  const toInsert: { label: string; store: string | null }[] = [];
  let skipped = 0;
  const seen = new Set<string>();
  for (const item of parsed) {
    const key = `${storeDedupeKey(item.store)}::${item.label.toLowerCase()}`;
    if (existingSet.has(key) || seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    toInsert.push({ label: item.label, store: item.store });
  }

  if (toInsert.length > 0) {
    const { count } = await supabase.from("list_items").select("id", { count: "exact", head: true }).eq("list_id", listId);
    const base = count ?? 0;
    const { error } = await supabase.from("list_items").insert(
      toInsert.map((item, i) => ({
        list_id: listId,
        label: item.label,
        store: item.store,
        category: categorize(item.label),
        added_by: addedBy,
        sort_order: base + i,
      }))
    );
    if (error) throw new Error(error.message);
  }

  return { added: toInsert.length, skipped, labelsAdded: toInsert.map((i) => i.label) };
}

export function formatIngredientLabel(ing: { name: string; qty?: string | null }): string {
  const name = ing.name.trim();
  const qty = ing.qty?.trim();
  return qty ? `${qty} ${name}` : name;
}
