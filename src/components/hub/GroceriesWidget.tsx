"use client";

import { ShoppingCart } from "lucide-react";

export interface ReminderData {
  badgeLabel: string;
  badgeColor: string;
  text: string;
}

/** Groceries + reminder chip combined card (spec §7.3). */
export function GroceriesWidget({ items, reminder }: { items: string[]; reminder?: ReminderData }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center gap-1.5 flex-wrap">
        <ShoppingCart className="size-[13px] text-info shrink-0" />
        <span className="font-bold text-xs shrink-0">Groceries</span>
        {items.length === 0 ? (
          <span className="text-[11px] text-ink-2">Fully stocked</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 ml-1">
            {items.map((label) => (
              <span key={label} className="bg-info-soft text-info rounded-pill px-2 py-0.5 text-[10.5px] font-semibold">
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
      {reminder && (
        <div className="flex items-center gap-1.5">
          <span
            className="flex items-center justify-center size-5 rounded-full text-white font-bold text-[9.5px] shrink-0"
            style={{ background: reminder.badgeColor }}
          >
            {reminder.badgeLabel}
          </span>
          <span className="text-[11px] text-ink truncate">{reminder.text}</span>
        </div>
      )}
    </div>
  );
}
