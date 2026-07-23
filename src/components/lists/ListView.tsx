"use client";

import { useMemo } from "react";
import { AddItemBar } from "./AddItemBar";
import { ListItemRow } from "./ListItemRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingCart, ListChecks } from "lucide-react";
import {
  useListItems,
  useAddListItem,
  useToggleListItem,
  useDeleteListItem,
  useRenameListItem,
  compareListItems,
  type ListDTO,
  type ListItemDTO,
} from "@/hooks/useLists";
import { normalizeStore, orderStoreSections, storeSectionLabel } from "@/lib/groceryStores";

/**
 * Render items in stable sort_order (never by checked).
 * Grocery: group by store section. Checked items stay in their store section.
 */
function buildSections(items: ListItemDTO[], isGrocery: boolean): { key: string; label: string | null; items: ListItemDTO[] }[] {
  const sorted = [...items].sort(compareListItems);
  if (!isGrocery) {
    return [{ key: "all", label: null, items: sorted }];
  }

  const byStore = new Map<string, ListItemDTO[]>();
  for (const item of sorted) {
    const key = normalizeStore(item.store) ?? "";
    if (!byStore.has(key)) byStore.set(key, []);
    byStore.get(key)!.push(item);
  }

  return orderStoreSections([...byStore.keys()]).map((key) => ({
    key: key || "any",
    label: storeSectionLabel(key || null),
    items: byStore.get(key)!,
  }));
}

export function ListView({ list, memberId }: { list: ListDTO; memberId: string }) {
  const { data: items, isLoading } = useListItems(list.id);
  const addItem = useAddListItem(list.id);
  const toggleItem = useToggleListItem(list.id);
  const deleteItem = useDeleteListItem(list.id);
  const renameItem = useRenameListItem(list.id);

  const isGrocery = list.kind === "grocery";
  const sections = useMemo(() => buildSections(items ?? [], isGrocery), [items, isGrocery]);
  const knownStores = useMemo(() => {
    if (!isGrocery || !items) return [];
    return [...new Set(items.map((i) => normalizeStore(i.store)).filter((s): s is string => !!s))];
  }, [items, isGrocery]);

  if (isLoading) return null;

  return (
    <div className="flex flex-col gap-4">
      <AddItemBar
        onAdd={(label, store) => addItem.mutate({ label, addedBy: memberId, autoCategory: isGrocery, store: isGrocery ? store : null })}
        placeholder={`Add to ${list.name}`}
        showStorePicker={isGrocery}
        knownStores={knownStores}
      />

      {items && items.length === 0 ? (
        <EmptyState
          icon={isGrocery ? ShoppingCart : ListChecks}
          title={`${list.name} is empty`}
          body={isGrocery ? "Add what you need — pick a store or say “milk from Costco”." : "Add your first item above."}
        />
      ) : (
        <div className="rounded-xl border border-line bg-surface p-1.5 md:p-2">
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.key} className="mb-1">
                {section.label && (
                  <div className="px-3 pt-2.5 pb-1 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-3">{section.label}</div>
                )}
                {section.items.map((item) => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    onToggle={(c) => toggleItem.mutate({ id: item.id, checked: c })}
                    onDelete={() => deleteItem.mutate(item.id)}
                    onRename={(label) => renameItem.mutate({ id: item.id, label })}
                  />
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
