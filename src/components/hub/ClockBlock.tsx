"use client";

import { formatInTimeZone } from "date-fns-tz";
import { useClock } from "@/hooks/useClock";

/** Header day + clock block (Home Hub design §7.2). Weather is a v1.1 fast-follow (spec §1.5 "Should have") — the schema has no family location field yet, so it's omitted rather than faked. */
export function ClockBlock({ timezone }: { timezone: string }) {
  const now = useClock();
  const dayName = formatInTimeZone(now, timezone, "EEEE");
  const dateLabel = formatInTimeZone(now, timezone, "MMM d");
  const time = formatInTimeZone(now, timezone, "h:mm");
  const ampm = formatInTimeZone(now, timezone, "a");

  return (
    <div className="flex items-center gap-3.5">
      <div>
        <div className="font-serif text-[28px] leading-none">{dayName}</div>
        <div className="font-mono text-[11px] tracking-[0.06em] text-ink-3 mt-0.5">{dateLabel.toUpperCase()}</div>
      </div>
      <div className="w-px h-8.5 bg-line" />
      <div className="flex items-baseline">
        <span className="font-bold text-[32px] tracking-[-0.01em]">{time}</span>
        <span className="font-semibold text-sm text-ink-2 ml-1">{ampm}</span>
      </div>
    </div>
  );
}
