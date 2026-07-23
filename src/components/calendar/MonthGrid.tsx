"use client";

import { monthGridRange, formatWeekdayShort, formatDayNumber, isSameZonedDay } from "@/lib/dates";
import { EventPill } from "./EventCard";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import { cn } from "@/lib/cn";

const MAX_VISIBLE = 3;
const MAX_VISIBLE_DENSE = 2;
const MAX_DOTS = 4;

export function MonthGrid({
  anchor,
  timezone,
  events,
  members,
  onSelectEvent,
  onSelectDay,
  compact = false,
  dense = false,
  phone = false,
  selectedDay,
  className,
}: {
  anchor: Date;
  timezone: string;
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  onSelectEvent: (event: EventInstanceDTO) => void;
  onSelectDay: (day: Date) => void;
  /** Phone / tiny cells: date number + colored dots instead of event pills. */
  compact?: boolean;
  /** Hub wall panel: event pills in tighter cells than the full calendar page. */
  dense?: boolean;
  /** Phone month: Apple/Google-style touch grid (dots + selected day). Desktop pills unchanged. */
  phone?: boolean;
  /** Highlighted day (month + agenda pattern). */
  selectedDay?: Date | null;
  className?: string;
}) {
  const { start, end } = monthGridRange(anchor, timezone);
  const days: Date[] = [];
  for (let d = new Date(start); d <= end; d = new Date(d.getTime() + 86400000)) days.push(d);

  const weekdayLabels = days.slice(0, 7).map((d) => formatWeekdayShort(d, timezone));
  const today = new Date();
  const anchorMonth = anchor.getMonth();
  const useDots = compact || phone;
  const maxVisible = dense ? MAX_VISIBLE_DENSE : MAX_VISIBLE;

  return (
    <div className={cn("rounded-xl border border-line bg-surface overflow-hidden", className)}>
      <div className="grid grid-cols-7 border-b border-line">
        {weekdayLabels.map((label, i) => (
          <div
            key={`${label}-${i}`}
            className={cn(
              "text-center font-mono tracking-[0.05em] text-ink-3",
              phone ? "py-2 text-[10px]" : dense ? "py-1.5 text-[10px]" : compact ? "py-1.5 text-[10px]" : "py-2.5 text-[11px]"
            )}
          >
            {phone ? label.slice(0, 1) : label}
          </div>
        ))}
      </div>
      <div className={cn("grid grid-cols-7", phone ? "auto-rows-[minmax(48px,1fr)]" : "auto-rows-fr")}>
        {days.map((day) => {
          const dayEvents = events.filter((e) => isSameZonedDay(new Date(e.startsAt), day, timezone));
          const isToday = isSameZonedDay(day, today, timezone);
          const inMonth = day.getMonth() === anchorMonth;
          const isSelected = !!selectedDay && isSameZonedDay(day, selectedDay, timezone);

          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "border-b border-r border-line last:border-r-0 text-left cursor-pointer flex flex-col hover:bg-surface-2/40",
                phone
                  ? "min-h-[48px] items-center justify-start pt-1.5 pb-1 px-0.5 gap-0.5"
                  : dense
                    ? "min-h-[86px] p-1 gap-0.5"
                    : compact
                      ? "min-h-[72px] p-1 gap-0.5"
                      : "min-h-[110px] p-1.5 gap-1",
                isSelected && !isToday && (phone ? "bg-primary-soft/50" : "bg-primary-soft/35")
              )}
            >
              <span
                className={cn(
                  "flex items-center justify-center rounded-full font-bold",
                  phone ? "size-8 text-sm" : dense || compact ? "size-6 text-xs self-start" : "size-7 text-sm self-start",
                  isToday
                    ? "bg-primary text-primary-ink"
                    : isSelected
                      ? "bg-ink text-paper"
                      : inMonth
                        ? "text-ink-2"
                        : "text-ink-3/50"
                )}
              >
                {formatDayNumber(day, timezone)}
              </span>
              {useDots ? (
                <div
                  className={cn(
                    "flex flex-wrap gap-0.5",
                    phone ? "justify-center min-h-[6px]" : "mt-auto px-0.5 pb-0.5"
                  )}
                >
                  {dayEvents.slice(0, MAX_DOTS).map((event) => {
                    const member = members.find((m) => m.id === event.memberId);
                    const color = member?.color_hex ?? "#9C9388";
                    return (
                      <span
                        key={event.id}
                        className={cn("rounded-full shrink-0", phone ? "size-1" : "size-1.5")}
                        style={{ background: color }}
                        title={event.title}
                      />
                    );
                  })}
                  {!phone && dayEvents.length > MAX_DOTS && (
                    <span className="text-[9px] font-bold text-ink-3 leading-none">+{dayEvents.length - MAX_DOTS}</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-0.5 min-w-0">
                  {dayEvents.slice(0, maxVisible).map((event) => (
                    <EventPill key={event.id} event={event} members={members} onClick={() => onSelectEvent(event)} />
                  ))}
                  {dayEvents.length > maxVisible && (
                    <span className={cn("font-semibold text-ink-3 px-1", dense ? "text-[9px]" : "text-[10.5px] px-1.5")}>
                      +{dayEvents.length - maxVisible} more
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
