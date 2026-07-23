"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { WeekMealGrid } from "@/components/meals/WeekMealGrid";
import { RecipesPanel } from "@/components/meals/RecipesPanel";
import { useFamily } from "@/hooks/useFamily";
import { useMealPlan, useSetMealEntry } from "@/hooks/useMeals";
import { weekRange, nextWeek, prevWeek, formatMonthTitle } from "@/lib/dates";
import type { MealSlot } from "@/types/database";

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function MealsPage() {
  const { data: familyData, isLoading: familyLoading } = useFamily();
  const family = familyData?.family;
  const timezone = family?.timezone ?? "America/New_York";

  const [anchor, setAnchor] = useState(() => new Date());
  const { start } = useMemo(() => weekRange(anchor, timezone), [anchor, timezone]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000)), [start]);
  const startIso = toIsoDate(days[0]!);
  const endIso = toIsoDate(days[6]!);

  const { data: entries, isLoading } = useMealPlan(family?.id, startIso, endIso);
  const setMealEntry = useSetMealEntry(family?.id);

  function handleSave(date: string, slot: MealSlot, title: string) {
    setMealEntry.mutate({ date, slot, title });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-line bg-surface p-3.5 flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="icon" size="sm" aria-label="Previous week" onClick={() => setAnchor((d) => prevWeek(d))}>
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="icon" size="sm" aria-label="Next week" onClick={() => setAnchor((d) => nextWeek(d))}>
            <ChevronRight className="size-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            This week
          </Button>
        </div>
        <h1 className="font-serif text-2xl">{formatMonthTitle(anchor, timezone)}</h1>
      </div>

      {familyLoading || isLoading ? <Skeleton rows={4} /> : <WeekMealGrid days={days} timezone={timezone} entries={entries ?? []} onSave={handleSave} />}

      {family?.id && <RecipesPanel familyId={family.id} />}
    </div>
  );
}
