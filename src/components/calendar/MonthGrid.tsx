"use client";

import { monthGridRange, formatWeekdayShort, formatDayNumber, isSameZonedDay } from "@/lib/dates";
import { EventPill } from "./EventCard";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

const MAX_VISIBLE = 3;

export function MonthGrid({
  anchor,
  timezone,
  events,
  members,
  onSelectEvent,
  onSelectDay,
}: {
  anchor: Date;
  timezone: string;
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  onSelectEvent: (event: EventInstanceDTO) => void;
  onSelectDay: (day: Date) => void;
}) {
  const { start, end } = monthGridRange(anchor, timezone);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) days.push(d);

  const weekdayLabels = days.slice(0, 7).map((d) => formatWeekdayShort(d, timezone));
  const today = new Date();

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line">
        {weekdayLabels.map((label) => (
          <div key={label} className="py-2.5 text-center font-mono text-[11px] tracking-[0.05em] text-ink-3">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameZonedDay(new Date(e.startsAt), day, timezone));
          const isToday = isSameZonedDay(day, today, timezone);
          const inMonth = day.getMonth() === anchor.getMonth();

          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className="min-h-[110px] border-b border-r border-line last:border-r-0 p-1.5 text-left cursor-pointer flex flex-col gap-1 hover:bg-surface-2/40"
            >
              <span
                className={
                  "self-start flex items-center justify-center size-7 rounded-full text-sm font-bold " +
                  (isToday ? "bg-primary text-primary-ink" : inMonth ? "text-ink-2" : "text-ink-3/50")
                }
              >
                {formatDayNumber(day, timezone)}
              </span>
              <div className="flex flex-col gap-1">
                {dayEvents.slice(0, MAX_VISIBLE).map((event) => (
                  <EventPill key={event.id} event={event} members={members} onClick={() => onSelectEvent(event)} />
                ))}
                {dayEvents.length > MAX_VISIBLE && (
                  <span className="text-[10.5px] font-semibold text-ink-3 px-1.5">+{dayEvents.length - MAX_VISIBLE} more</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
