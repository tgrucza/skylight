"use client";

import { CheckCircle2, UtensilsCrossed, Check } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ChoreToday, MealsToday } from "@/hooks/useHubWidgets";

/** Chores + Meals combined card — Home Hub design bundles these two widgets into one card (spec §7.3). */
export function ChoresMealsWidget({
  chores,
  meals,
  onOpenChores,
}: {
  chores: ChoreToday[];
  meals: MealsToday | undefined;
  onOpenChores?: () => void;
}) {
  const mealsLine = [meals?.breakfast, meals?.lunch, meals?.dinner].filter(Boolean).join(" · ");

  const choresRow = (
    <div className="flex items-center gap-1.5 flex-wrap">
      <CheckCircle2 className="size-[13px] text-secondary shrink-0" />
      <span className="font-bold text-xs shrink-0">Chores</span>
      {chores.length === 0 ? (
        <span className="text-[11px] text-ink-3">Nothing scheduled today</span>
      ) : (
        <div className="flex flex-wrap gap-1.5 ml-1">
          {chores.map((c) => (
            <span
              key={c.completionId}
              className={cn(
                "inline-flex items-center gap-1 rounded-pill py-0.5 pl-1 pr-2 text-[11px] font-semibold",
                c.done ? "bg-success-soft text-ink-3 line-through" : "bg-surface-2 text-ink"
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center size-[13px] rounded-[4px] border-[1.6px]",
                  c.done ? "bg-secondary border-secondary" : "border-line bg-transparent"
                )}
              >
                {c.done && <Check className="size-[9px] text-white" strokeWidth={4} />}
              </span>
              {c.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3 flex flex-col gap-2">
      {onOpenChores ? (
        <button
          type="button"
          onClick={onOpenChores}
          className="w-full text-left rounded-md -mx-1 px-1 py-0.5 hover:bg-surface-2/80 cursor-pointer"
        >
          {choresRow}
        </button>
      ) : (
        choresRow
      )}
      <div className="flex items-center gap-1.5">
        <UtensilsCrossed className="size-[13px] text-primary shrink-0" />
        <span className="font-bold text-xs shrink-0">Meals</span>
        <span className="text-[11.5px] text-ink truncate">{mealsLine || "Nothing planned yet"}</span>
      </div>
    </div>
  );
}
