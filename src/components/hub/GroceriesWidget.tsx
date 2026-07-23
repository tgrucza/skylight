"use client";

import { ShoppingCart } from "lucide-react";

export interface ReminderData {
  badgeLabel: string;
  badgeColor: string;
  text: string;
}

/** Groceries + reminder chip combined card (spec §7.3). */
export function GroceriesWidget({
  items,
  reminder,
  onOpen,
}: {
  items: string[];
  reminder?: ReminderData;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <ShoppingCart className="size-[13px] text-info shrink-0" aria-hidden />
        <span className="font-bold text-xs shrink-0">Groceries</span>
        {items.length === 0 ? (
          <span className="text-[11px] text-ink-2">Fully stocked</span>
        ) : (
          <div className="flex flex-wrap gap-1.5 ml-1">
            {items.map((label, i) => (
              <span key={`${label}-${i}`} className="bg-info-soft text-info rounded-pill px-2 py-0.5 text-[10.5px] font-semibold">
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
    </>
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
          aria-label="Open groceries"
          className="w-full text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-surface-2/80 cursor-pointer"
        >
          {body}
        </button>
      </div>
    );
  }

  return <div className="rounded-lg border border-line bg-surface px-4 py-3 flex flex-col gap-2">{body}</div>;
}
