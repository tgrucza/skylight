"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DictationButton } from "@/components/ui/DictationButton";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/uiStore";
import { ensureChecklistId, ensureGroceryListId } from "@/lib/groceryList";
import { categorize } from "@/lib/groceryCategories";
import {
  getLastUsedStore,
  normalizeStore,
  parseGroceryPhrase,
  setLastUsedStore,
  storePickerOptions,
} from "@/lib/groceryStores";

interface QuickAddItemModalProps {
  open: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  placeholder: string;
  listKind: "grocery" | "checklist";
  listName: string;
  familyId: string;
  memberId: string;
}

/** Quick-add a single item to Groceries or the To-Do checklist — Hub "Add grocery" / "Add to do". */
export function QuickAddItemModal({ open, onClose, icon, title, placeholder, listKind, listName, familyId, memberId }: QuickAddItemModalProps) {
  const [label, setLabel] = useState("");
  const [storeValue, setStoreValue] = useState(() => getLastUsedStore() ?? "");
  const [customStore, setCustomStore] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [busy, setBusy] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const pushToast = useUIStore((s) => s.pushToast);
  const isGrocery = listKind === "grocery";
  const options = useMemo(() => storePickerOptions(), []);

  // Reset form when the modal opens (React "adjust state when prop changes" pattern).
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setLabel("");
      setStoreValue(isGrocery ? (getLastUsedStore() ?? "") : "");
      setShowCustom(false);
      setCustomStore("");
    }
  }

  function resolveStore(): string | null {
    if (!isGrocery) return null;
    if (showCustom || storeValue === "__custom__") return normalizeStore(customStore);
    return normalizeStore(storeValue);
  }

  async function handleSave() {
    if (!label.trim() || !supabase) return;
    setBusy(true);
    try {
      const listId =
        listKind === "grocery"
          ? await ensureGroceryListId(supabase, familyId)
          : await ensureChecklistId(supabase, familyId, listName);

      let trimmed = label.trim();
      let store: string | null = null;
      if (isGrocery) {
        const parsed = parseGroceryPhrase(trimmed);
        trimmed = parsed.label;
        store = parsed.store ?? resolveStore();
        setLastUsedStore(store);
      }

      const { count } = await supabase.from("list_items").select("id", { count: "exact", head: true }).eq("list_id", listId);
      const { error } = await supabase.from("list_items").insert({
        list_id: listId,
        label: trimmed,
        added_by: memberId,
        category: isGrocery ? categorize(trimmed) : null,
        store: isGrocery ? store : null,
        sort_order: count ?? 0,
      });
      if (error) throw new Error(error.message);

      pushToast(store ? `Added to ${listName} · ${store}` : `Added to ${listName}`, "success");
      void queryClient.invalidateQueries({ queryKey: ["lists", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["list-items", listId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-todos"] });
      setLabel("");
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Something went wrong", "danger");
    } finally {
      setBusy(false);
    }
  }

  function applyDictation(text: string) {
    setLabel((prev) => {
      const next = prev.trim() ? `${prev.trim()} ${text}` : text;
      if (!isGrocery) return next;
      const parsed = parseGroceryPhrase(next);
      if (parsed.store) {
        setStoreValue(parsed.store);
        setShowCustom(false);
        setCustomStore("");
        return parsed.label;
      }
      return next;
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={icon}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={busy}>
            Add
          </Button>
        </>
      }
    >
      {isGrocery && (
        <div className="mb-3 flex flex-col gap-2">
          <Select
            label="Store"
            value={showCustom ? "__custom__" : storeValue}
            options={options}
            onChange={(v) => {
              if (v === "__custom__") {
                setShowCustom(true);
                setStoreValue("__custom__");
              } else {
                setShowCustom(false);
                setCustomStore("");
                setStoreValue(v);
              }
            }}
          />
          {showCustom && (
            <Input
              value={customStore}
              onChange={(e) => setCustomStore(e.target.value)}
              placeholder="Custom store name"
              autoCapitalize="words"
              autoComplete="off"
            />
          )}
        </div>
      )}
      <Label htmlFor="quick-add-label">{title}</Label>
      <div className="flex gap-2 items-start">
        <div className="flex-1 min-w-0">
          <Input
            id="quick-add-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isGrocery ? `${placeholder} — or “from Costco”` : placeholder}
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        <DictationButton onTranscript={applyDictation} disabled={busy} />
      </div>
      <p className="text-[12px] text-ink-3 mt-2">
        {isGrocery ? "Pick a store, or say “paper towels from Sam’s Club”. Mic works too." : "Type it in, or tap the mic to dictate."}
      </p>
    </Modal>
  );
}
