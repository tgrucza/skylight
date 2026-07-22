"use client";

import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";
import type { ListItemDTO } from "@/hooks/useLists";

export function ListItemRow({ item, onToggle, onDelete }: { item: ListItemDTO; onToggle: (checked: boolean) => void; onDelete: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-md px-3 py-2.5 hover:bg-surface-2 group">
      <Checkbox checked={item.checked} onChange={onToggle} />
      <span className={cn("flex-1 text-sm font-medium", item.checked && "text-ink-3 line-through")}>{item.label}</span>
      {item.quantity && <span className="text-xs text-ink-3">{item.quantity}</span>}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${item.label}`}
        className="text-ink-3 hover:text-danger cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
