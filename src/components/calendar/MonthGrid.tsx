"use client";

import { monthGridRange, formatWeekdayShort, formatDayNumber, isSameZonedDay } from "@/lib/dates";
import { EventPill } from "./EventCard";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import { cn } from "@/lib/cn";

const MAX_VISIBLE = 3;
const MAX_DOTS = 4;

export function MonthGrid({
  anchor,
  timezone,
  events,
  members,
  onSelectEvent,
  onSelectDay,
  compact = false,
  className,
}: {
  anchor: Date;
  timezone: string;
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  onSelectEvent: (event: EventInstanceDTO) => void;
  onSelectDay: (day: Date) => void;
  /** Hub-sized cells: date number + colored dots instead of full event pills. */
  compact?: boolean;
  className?: string;
}) {
  const { start, end } = monthGridRange(anchor, timezone);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) days.push(d);

  const weekdayLabels = days.slice(0, 7).map((d) => formatWeekdayShort(d, timezone));
  const today = new Date();
  const anchorMonth = anchor.getMonth();

  return (
    <div className={cn("rounded-xl border border-line bg-surface overflow-hidden", className)}>
      <div className="grid grid-cols-7 border-b border-line">
        {weekdayLabels.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className={cn(
              "text-center font-mono tracking-[0.05em] text-ink-3",
              compact ? "py-1.5 text-[10px]" : "py-2.5 text-[11px]"
            )}
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 auto-rows-fr">
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameZonedDay(new Date(e.startsAt), day, timezone));
          const isToday = isSameZonedDay(day, today, timezone);
          const inMonth = day.getMonth() === anchorMonth;

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "border-b border-r border-line last:border-r-0 text-left cursor-pointer flex flex-col hover:bg-surface-2/40",
                compact ? "min-h-[72px] p-1 gap-0.5" : "min-h-[110px] p-1.5 gap-1"
              )}
            >
              <span
                className={cn(
                  "self-start flex items-center justify-center rounded-full font-bold",
                  compact ? "size-6 text-xs" : "size-7 text-sm",
                  isToday ? "bg-primary text-primary-ink" : inMonth ? "text-ink-2" : "text-ink-3/50"
                )}
              >
                {formatDayNumber(day, timezone)}
              </span>
              {compact ? (
                <div className="flex flex-wrap gap-0.5 mt-auto px-0.5 pb-0.5">
                  {dayEvents.slice(0, MAX_DOTS).map((event) => {
                    const member = members.find((m) => m.id === event.memberId);
                    const color = member?.color_hex ?? "#9C9388";
                    return (
                      <span
                        key={event.id}
                        className="size-1.5 rounded-full shrink-0"
                        style={{ background: color }}
                        title={event.title}
                      />
                    );
                  })}
                  {dayEvents.length > MAX_DOTS && (
                    <span className="text-[9px] font-bold text-ink-3 leading-none">+{dayEvents.length - MAX_DOTS}</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {dayEvents.slice(0, MAX_VISIBLE).map((event) => (
                    <EventPill key={event.id} event={event} members={members} onClick={() => onSelectEvent(event)} />
                  ))}
                  {dayEvents.length > MAX_VISIBLE && (
                    <span className="text-[10.5px] font-semibold text-ink-3 px-1.5">
                      +{dayEvents.length - MAX_VISIBLE} more
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
