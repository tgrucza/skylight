"use client";

import { formatWeekdayShort, formatDayNumber, isSameZonedDay } from "@/lib/dates";
import { MealCell } from "./MealCell";
import type { MealEntryDTO } from "@/hooks/useMeals";
import type { MealSlot } from "@/types/database";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Dinner-first week grid (spec §1.5): dinner is the primary row, breakfast/lunch are optional secondary lines. */
export function WeekMealGrid({
  days,
  timezone,
  entries,
  onSave,
}: {
  days: Date[];
  timezone: string;
  entries: MealEntryDTO[];
  onSave: (date: string, slot: MealSlot, title: string) => void;
}) {
  const today = new Date();

  function entryFor(date: Date, slot: MealSlot) {
    const iso = toIsoDate(date);
    return entries.find((e) => e.date === iso && e.slot === slot)?.title ?? "";
  }

  return (
    <div className="grid grid-cols-7 gap-2.5">
      {days.map((day) => {
        const isToday = isSameZonedDay(day, today, timezone);
        return (
          <div key={day.toISOString()} className={`rounded-xl border p-3 flex flex-col gap-2 ${isToday ? "border-primary bg-primary-soft/30" : "border-line bg-surface"}`}>
            <div className="text-center mb-1">
              <div className="font-mono text-[10px] tracking-[0.05em] text-ink-3">{formatWeekdayShort(day, timezone)}</div>
              <div className="text-sm font-bold">{formatDayNumber(day, timezone)}</div>
            </div>
            <div className="rounded-lg bg-paper border border-line px-1 py-1">
              <MealCell
                value={entryFor(day, "dinner")}
                placeholder="Dinner"
                emphasized
                onSave={(v) => onSave(toIsoDate(day), "dinner", v)}
              />
            </div>
            <MealCell value={entryFor(day, "lunch")} placeholder="Lunch" onSave={(v) => onSave(toIsoDate(day), "lunch", v)} />
            <MealCell value={entryFor(day, "breakfast")} placeholder="Breakfast" onSave={(v) => onSave(toIsoDate(day), "breakfast", v)} />
          </div>
        );
      })}
    </div>
  );
}
