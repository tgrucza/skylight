"use client";

import Link from "next/link";
import { StickyNote } from "lucide-react";

/** Compact To-Do / notes preview under groceries on the Hub (open checklist items). */
export function TodosWidget({ items }: { items: string[] }) {
  return (
    <Link
      href="/lists"
      className="rounded-lg border border-line bg-surface px-4 py-3 flex flex-col gap-2 hover:bg-surface-2 transition-colors"
    >
      <div className="flex items-center gap-1.5 flex-wrap">
        <StickyNote className="size-[13px] text-primary shrink-0" />
        <span className="font-bold text-xs shrink-0">To-Dos</span>
        {items.length === 0 ? (
          <span className="text-[11px] text-ink-2">Nothing open</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 ml-1">
            {items.map((label) => (
              <span key={label} className="bg-primary-soft text-primary rounded-pill px-2 py-0.5 text-[10.5px] font-semibold">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
