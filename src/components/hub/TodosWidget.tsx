"use client";

import { ListChecks } from "lucide-react";

/** Compact To-Do preview under groceries on the Hub (open checklist items). */
export function TodosWidget({ items, onOpen }: { items: string[]; onOpen?: () => void }) {
  const body = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <ListChecks className="size-[13px] text-primary shrink-0" aria-hidden />
      <span className="font-bold text-xs shrink-0">To-Dos</span>
      {items.length === 0 ? (
        <span className="text-[11px] text-ink-2">Nothing open</span>
      ) : (
        <div className="flex flex-wrap gap-1.5 ml-1">
          {items.map((label, i) => (
            <span key={`${label}-${i}`} className="bg-primary-soft text-primary rounded-pill px-2 py-0.5 text-[10.5px] font-semibold">
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  if (onOpen) {
    return (
      <div className="rounded-lg border border-line bg-surface px-4 py-3 flex flex-col gap-2 relative z-[1]">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onOpen();
          }}
          aria-label="Open to-dos"
          className="w-full text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-surface-2/80 cursor-pointer"
        >
          {body}
        </button>
      </div>
    );
  }

  return <div className="rounded-lg border border-line bg-surface px-4 py-3 flex flex-col gap-2">{body}</div>;
}
