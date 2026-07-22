"use client";

import { weekRange, formatWeekdayShort, formatDayNumber, isSameZonedDay } from "@/lib/dates";
import { withAlpha } from "@/lib/colors";
import { formatTime } from "@/lib/dates";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

const START_HOUR = 6;
const END_HOUR = 22;
const HOUR_HEIGHT = 64;

function minutesFromGridStart(date: Date, timezone: string): number {
  const hours = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hour12: false }).format(date));
  const minutes = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, minute: "numeric" }).format(date));
  return (hours - START_HOUR) * 60 + minutes;
}

export function WeekView({
  anchor,
  timezone,
  events,
  members,
  onSelectEvent,
}: {
  anchor: Date;
  timezone: string;
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  onSelectEvent: (event: EventInstanceDTO) => void;
}) {
  const { start } = weekRange(anchor, timezone);
  const days = Array.from({ length: 7 }, (_, i) => new Date(start.getTime() + i * 86400000));
  const hours = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i);
  const today = new Date();
  const nowOffset = minutesFromGridStart(today, timezone) * (HOUR_HEIGHT / 60);
  const showNow = nowOffset >= 0 && nowOffset <= (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  return (
    <div className="rounded-xl border border-line bg-surface overflow-hidden">
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-line">
        <div />
        {days.map((day) => {
          const isToday = isSameZonedDay(day, today, timezone);
          return (
            <div key={day.toISOString()} className="text-center py-2.5">
              <div className="font-mono text-[11px] tracking-[0.05em] text-ink-3">{formatWeekdayShort(day, timezone)}</div>
              <div
                className={
                  "mt-1.5 mx-auto flex items-center justify-center size-8 rounded-full text-[15px] font-bold " +
                  (isToday ? "bg-primary text-primary-ink" : "text-ink-2")
                }
              >
                {formatDayNumber(day, timezone)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-[56px_repeat(7,1fr)] relative max-h-[70vh] overflow-y-auto">
        <div>
          {hours.map((h) => (
            <div key={h} style={{ height: HOUR_HEIGHT }} className="text-right pr-2 -translate-y-2 font-mono text-[10px] text-ink-3">
              {h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`}
            </div>
          ))}
        </div>
        {days.map((day) => {
          const dayEvents = events.filter((e) => !e.allDay && isSameZonedDay(new Date(e.startsAt), day, timezone));
          const isToday = isSameZonedDay(day, today, timezone);
          return (
            <div key={day.toISOString()} className="relative border-l border-line">
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_HEIGHT }} className="border-b border-line/60" />
              ))}
              {isToday && showNow && (
                <div className="absolute left-0 right-0 h-0.5 bg-danger animate-now z-10" style={{ top: nowOffset }}>
                  <span className="absolute -left-[5px] -top-[4px] size-2.5 rounded-full bg-danger" />
                </div>
              )}
              {dayEvents.map((event) => {
                const member = members.find((m) => m.id === event.memberId);
                const color = member?.color_hex ?? "#9C9388";
                const top = minutesFromGridStart(new Date(event.startsAt), timezone) * (HOUR_HEIGHT / 60);
                const durationMin = (new Date(event.endsAt).getTime() - new Date(event.startsAt).getTime()) / 60000;
                const height = Math.max(22, durationMin * (HOUR_HEIGHT / 60));
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelectEvent(event)}
                    className="absolute left-[3px] right-[3px] rounded-xs px-2 py-1 text-left cursor-pointer overflow-hidden"
                    style={{ top, height, background: withAlpha(color, 0.16), borderLeft: `3px solid ${color}` }}
                  >
                    <div className="text-[11.5px] font-bold text-ink truncate leading-tight">{event.title}</div>
                    <div className="text-[10px] text-ink-2 truncate">{formatTime(new Date(event.startsAt), timezone)}</div>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
