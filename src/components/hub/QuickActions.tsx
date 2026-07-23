"use client";

import { CalendarPlus, ShoppingCart, CheckCircle2, StickyNote } from "lucide-react";

export interface QuickAction {
  icon: typeof CalendarPlus;
  label: string;
  bg: string;
  fg: string;
  onClick: () => void;
}

export function QuickActions({ onAddEvent, onAddGrocery, onAddChore, onAddNote }: {
  onAddEvent: () => void;
  onAddGrocery: () => void;
  onAddChore: () => void;
  onAddNote: () => void;
}) {
  const actions: QuickAction[] = [
    { icon: CalendarPlus, label: "Add event", bg: "var(--primary-soft)", fg: "var(--primary)", onClick: onAddEvent },
    { icon: ShoppingCart, label: "Add grocery", bg: "var(--info-soft)", fg: "var(--info)", onClick: onAddGrocery },
    { icon: CheckCircle2, label: "Add chore", bg: "var(--secondary-soft)", fg: "var(--secondary)", onClick: onAddChore },
    { icon: StickyNote, label: "Add note", bg: "var(--warning-soft)", fg: "var(--warning)", onClick: onAddNote },
  ];

  return (
    <div className="quick-actions flex gap-3">
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={action.onClick}
          className="quick-action-btn flex-1 flex items-center gap-3 rounded-lg border border-line bg-surface px-4.5 py-3.5 cursor-pointer hover:bg-surface-2/50"
        >
          <span className="flex items-center justify-center size-9.5 rounded-[11px] shrink-0" style={{ background: action.bg, color: action.fg }}>
            <action.icon className="size-[19px]" />
          </span>
          <span className="font-bold text-sm truncate">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
