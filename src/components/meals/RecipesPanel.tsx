"use client";

import { useState } from "react";
import { BookOpen, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  useRecipes,
  useSaveRecipe,
  useDeleteRecipe,
  useAddRecipeIngredientsToGroceries,
  type RecipeDTO,
  type RecipeIngredient,
} from "@/hooks/useRecipes";
import { useUIStore } from "@/stores/uiStore";

function linesToIngredients(text: string): RecipeIngredient[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const m = line.match(/^([\d./]+\s*(?:cups?|tbsp|tsp|oz|lb|lbs|g|kg|ml|l)?)\s+(.+)$/i);
      if (m) return { qty: m[1]!.trim(), name: m[2]!.trim() };
      return { name: line, qty: "" };
    });
}

function ingredientsToLines(ings: RecipeIngredient[]) {
  return ings.map((i) => (i.qty ? `${i.qty} ${i.name}` : i.name)).join("\n");
}

function RecipeEditorModal({
  familyId,
  recipe,
  onClose,
}: {
  familyId: string;
  recipe: RecipeDTO | null;
  onClose: () => void;
}) {
  const save = useSaveRecipe(familyId);
  const pushToast = useUIStore((s) => s.pushToast);
  const [title, setTitle] = useState(recipe?.title ?? "");
  const [url, setUrl] = useState(recipe?.url ?? "");
  const [notes, setNotes] = useState(recipe?.notes ?? "");
  const [lines, setLines] = useState(recipe ? ingredientsToLines(recipe.ingredients) : "");

  async function handleSave() {
    if (!title.trim()) {
      pushToast("Give the recipe a name", "danger");
      return;
    }
    try {
      await save.mutateAsync({
        id: recipe?.id,
        title,
        url: url || undefined,
        notes: notes || undefined,
        ingredients: linesToIngredients(lines),
      });
      pushToast(recipe ? "Recipe updated" : "Recipe saved", "success");
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save", "danger");
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      icon={BookOpen}
      title={recipe ? "Edit recipe" : "New recipe"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => void handleSave()} loading={save.isPending}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div>
          <Label htmlFor="recipe-title">Name</Label>
          <Input id="recipe-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Taco Night" autoFocus />
        </div>
        <div>
          <Label htmlFor="recipe-ings">Ingredients (one per line)</Label>
          <textarea
            id="recipe-ings"
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            rows={6}
            placeholder={"ground beef\ntortillas\nshredded cheese\nlettuce\ntomato\nsalsa\nsour cream"}
            className="w-full rounded-md border border-line bg-paper px-3.5 py-3 text-sm"
          />
        </div>
        <div>
          <Label htmlFor="recipe-url">URL (optional)</Label>
          <Input id="recipe-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </div>
        <div>
          <Label htmlFor="recipe-notes">Notes (optional)</Label>
          <Input id="recipe-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}

export function RecipesPanel({ familyId }: { familyId: string }) {
  const { data: recipes, isLoading } = useRecipes(familyId);
  const remove = useDeleteRecipe(familyId);
  const addToGroceries = useAddRecipeIngredientsToGroceries(familyId);
  const pushToast = useUIStore((s) => s.pushToast);
  const [editing, setEditing] = useState<RecipeDTO | null | "new">(null);

  async function handleAddIngredients(recipe: RecipeDTO) {
    try {
      const result = await addToGroceries.mutateAsync(recipe.ingredients);
      pushToast(
        result.added > 0 ? `Added ${result.added} items to groceries` : "Those ingredients were already on the list",
        "success"
      );
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't update groceries", "danger");
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold text-sm">Family recipes</h2>
          <p className="text-xs text-ink-3 mt-0.5">Plan a meal and dump the fixings onto groceries.</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => setEditing("new")}>
          <Plus className="size-4" />
          Recipe
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-ink-3">Loading…</p>
      ) : !recipes || recipes.length === 0 ? (
        <p className="text-sm text-ink-2">
          Save Cheeseburgers, Taco Night, and your regulars — or just tell Judy &quot;cheeseburgers tonight.&quot;
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="rounded-lg border border-line bg-paper px-3.5 py-3 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <button type="button" className="text-left cursor-pointer" onClick={() => setEditing(recipe)}>
                  <div className="font-semibold text-sm">{recipe.title}</div>
                  <div className="text-xs text-ink-3 mt-0.5">{recipe.ingredients.length} ingredients</div>
                </button>
                <div className="flex gap-1 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => void handleAddIngredients(recipe)}
                    loading={addToGroceries.isPending}
                  >
                    <ShoppingCart className="size-3.5" />
                    Groceries
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${recipe.title}`}
                    onClick={() => {
                      void remove.mutateAsync(recipe.id).then(
                        () => pushToast("Recipe deleted", "info"),
                        (err: unknown) => pushToast(err instanceof Error ? err.message : "Couldn't delete", "danger")
                      );
                    }}
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <RecipeEditorModal
          familyId={familyId}
          recipe={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
