"use client";

import { RECURRENCE_PRESETS } from "@/lib/rrule";
import { cn } from "@/lib/cn";
import { Repeat } from "lucide-react";

const OPTIONS = [{ label: "Doesn't repeat", build: () => null as string | null }, ...RECURRENCE_PRESETS];

export function RecurrencePicker({ value, onChange }: { value: string | null; onChange: (rrule: string | null) => void }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[13px] font-semibold mb-2">
        <Repeat className="size-4 text-ink-3" />
        Repeat
      </div>
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((opt) => {
          const built = opt.build();
          const active = built === value || (built === null && value === null);
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange(built)}
              className={cn(
                "px-3.5 py-2 rounded-pill text-[13px] font-semibold cursor-pointer transition-colors",
                active ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2"
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
