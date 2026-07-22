"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { AddItemBar } from "./AddItemBar";
import { ListItemRow } from "./ListItemRow";
import { EmptyState } from "@/components/ui/EmptyState";
import { ShoppingCart, ListChecks } from "lucide-react";
import { useListItems, useAddListItem, useToggleListItem, useDeleteListItem, type ListDTO } from "@/hooks/useLists";

export function ListView({ list, memberId }: { list: ListDTO; memberId: string }) {
  const { data: items, isLoading } = useListItems(list.id);
  const addItem = useAddListItem(list.id);
  const toggleItem = useToggleListItem(list.id);
  const deleteItem = useDeleteListItem(list.id);
  const [checkedOpen, setCheckedOpen] = useState(false);

  const isGrocery = list.kind === "grocery";
  const unchecked = (items ?? []).filter((i) => !i.checked);
  const checked = (items ?? []).filter((i) => i.checked);

  const groups = useMemo(() => {
    if (!isGrocery) return { Items: unchecked };
    const byCategory: Record<string, typeof unchecked> = {};
    for (const item of unchecked) {
      const cat = item.category ?? "Other";
      byCategory[cat] = [...(byCategory[cat] ?? []), item];
    }
    return byCategory;
  }, [unchecked, isGrocery]);

  if (isLoading) return null;

  return (
    <div className="flex flex-col gap-4">
      <AddItemBar onAdd={(label) => addItem.mutate({ label, addedBy: memberId, autoCategory: isGrocery })} placeholder={`Add to ${list.name}`} />

      {items && items.length === 0 ? (
        <EmptyState
          icon={isGrocery ? ShoppingCart : ListChecks}
          title={`${list.name} is empty`}
          body={isGrocery ? "Add what you need — it'll be here at the store." : "Add your first item above."}
        />
      ) : (
        <div className="rounded-xl border border-line bg-surface p-2">
          {Object.entries(groups).map(([category, categoryItems]) =>
            categoryItems.length === 0 ? null : (
              <div key={category} className="mb-1">
                {isGrocery && <div className="px-3 pt-2 pb-1 text-[11px] font-mono uppercase tracking-[0.08em] text-ink-3">{category}</div>}
                {categoryItems.map((item) => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    onToggle={(c) => toggleItem.mutate({ id: item.id, checked: c })}
                    onDelete={() => deleteItem.mutate(item.id)}
                  />
                ))}
              </div>
            )
          )}

          {checked.length > 0 && (
            <div className="border-t border-line mt-2 pt-2">
              <button
                type="button"
                onClick={() => setCheckedOpen((v) => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-ink-3 cursor-pointer"
              >
                {checkedOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                {checked.length} checked
              </button>
              {checkedOpen &&
                checked.map((item) => (
                  <ListItemRow
                    key={item.id}
                    item={item}
                    onToggle={(c) => toggleItem.mutate({ id: item.id, checked: c })}
                    onDelete={() => deleteItem.mutate(item.id)}
                  />
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
