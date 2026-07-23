"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DictationButton } from "@/components/ui/DictationButton";
import {
  getLastUsedStore,
  normalizeStore,
  parseGroceryPhrase,
  storePickerOptions,
} from "@/lib/groceryStores";

export function AddItemBar({
  onAdd,
  placeholder = "Add an item",
  showStorePicker = false,
  knownStores = [],
}: {
  onAdd: (label: string, store?: string | null) => void;
  placeholder?: string;
  /** Grocery lists only — store section picker. */
  showStorePicker?: boolean;
  /** Extra store names already on the list (custom stores). */
  knownStores?: string[];
}) {
  const [value, setValue] = useState("");
  const [storeValue, setStoreValue] = useState("");
  const [customStore, setCustomStore] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    if (!showStorePicker) return;
    const last = getLastUsedStore();
    if (last) setStoreValue(last);
  }, [showStorePicker]);

  const options = useMemo(() => storePickerOptions(knownStores), [knownStores]);

  function resolveStore(): string | null {
    if (!showStorePicker) return null;
    if (showCustom || storeValue === "__custom__") return normalizeStore(customStore);
    return normalizeStore(storeValue);
  }

  function submit() {
    if (!value.trim()) return;
    const parsed = showStorePicker ? parseGroceryPhrase(value.trim()) : { label: value.trim(), store: null as string | null };
    const store = parsed.store ?? resolveStore();
    if (parsed.store) {
      setStoreValue(parsed.store);
      setShowCustom(false);
      setCustomStore("");
    }
    onAdd(parsed.label, store);
    setValue("");
  }

  function applyDictation(text: string) {
    const combined = value.trim() ? `${value.trim()} ${text}` : text;
    if (showStorePicker) {
      const parsed = parseGroceryPhrase(combined);
      if (parsed.store) {
        setStoreValue(parsed.store);
        setShowCustom(false);
        setCustomStore("");
        setValue(parsed.label);
        return;
      }
    }
    setValue(combined);
  }

  return (
    <div className="flex flex-col gap-2 sticky top-0 z-[2] bg-paper/95 backdrop-blur-sm py-1 -mx-0.5 px-0.5">
      {showStorePicker && (
        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[160px] flex-1 max-w-xs [&_.relative]:min-w-0">
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
          </div>
          {showCustom && (
            <div className="flex-1 min-w-[140px]">
              <Input
                value={customStore}
                onChange={(e) => setCustomStore(e.target.value)}
                placeholder="Store name"
                className="min-h-12 text-base"
                autoCapitalize="words"
                autoComplete="off"
              />
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder={showStorePicker ? `${placeholder} — or “milk from Costco”` : placeholder}
            className="min-h-12 text-base"
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoComplete="off"
          />
        </div>
        <DictationButton onTranscript={applyDictation} size="lg" className="shrink-0" />
        <Button onClick={submit} className="gap-2 shrink-0 min-h-12 px-4" disabled={!value.trim()}>
          <Plus className="size-[18px]" strokeWidth={2.5} />
          Add
        </Button>
      </div>
    </div>
  );
}
