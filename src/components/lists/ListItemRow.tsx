"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Checkbox } from "@/components/ui/Toggle";
import { cn } from "@/lib/cn";
import type { ListItemDTO } from "@/hooks/useLists";

export function ListItemRow({
  item,
  onToggle,
  onDelete,
  onRename,
}: {
  item: ListItemDTO;
  onToggle: (checked: boolean) => void;
  onDelete: () => void;
  onRename?: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!editing) setDraft(item.label);
  }, [item.label, editing]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === item.label) {
      setDraft(item.label);
      return;
    }
    onRename?.(next);
  }

  function cancel() {
    setDraft(item.label);
    setEditing(false);
  }

  return (
    <div className="flex items-center gap-2.5 rounded-md px-2.5 min-h-11 hover:bg-surface-2 group">
      <Checkbox
        checked={item.checked}
        onChange={onToggle}
        aria-label={item.checked ? `Uncheck ${item.label}` : `Check ${item.label}`}
      />
      {editing && onRename ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commit();
            }
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className="flex-1 min-w-0 bg-paper border border-primary rounded-md px-2.5 py-2 text-[15px] font-medium text-ink outline-none shadow-[0_0_0_3px_var(--primary-soft)]"
          aria-label={`Edit ${item.label}`}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            if (onRename) setEditing(true);
          }}
          className={cn(
            "flex-1 min-w-0 text-left text-[15px] font-medium py-2.5 rounded-sm",
            onRename && "cursor-text",
            item.checked && "text-ink-3 line-through"
          )}
        >
          {item.label}
        </button>
      )}
      {item.quantity && <span className="text-xs text-ink-3 shrink-0">{item.quantity}</span>}
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Remove ${item.label}`}
        className="text-ink-3 hover:text-danger cursor-pointer opacity-100 md:opacity-0 md:group-hover:opacity-100 shrink-0 min-h-11 min-w-11 inline-flex items-center justify-center"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
