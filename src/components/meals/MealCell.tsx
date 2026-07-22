"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

interface MealCellProps {
  value: string;
  placeholder: string;
  emphasized?: boolean;
  onSave: (value: string) => void;
}

export function MealCell({ value, placeholder, emphasized, onSave }: MealCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function commit() {
    setEditing(false);
    if (draft !== value) onSave(draft);
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setDraft(value);
            setEditing(false);
          }
        }}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-sm border border-primary bg-paper px-2 py-1.5 outline-none",
          emphasized ? "text-[13px] font-semibold" : "text-[12px]"
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        "w-full text-left rounded-sm px-2 py-1.5 cursor-pointer hover:bg-surface-2 truncate",
        emphasized ? "text-[13px] font-semibold text-ink" : "text-[12px] text-ink-2",
        !value && "text-ink-3 italic"
      )}
    >
      {value || placeholder}
    </button>
  );
}
