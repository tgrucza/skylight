"use client";

import { formatDayTitle, formatTime, isSameZonedDay } from "@/lib/dates";
import { EventCard } from "./EventCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { CalendarDays } from "lucide-react";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import { cn } from "@/lib/cn";

export function DayAgenda({
  anchor,
  timezone,
  events,
  members,
  onSelectEvent,
  compact = false,
}: {
  anchor: Date;
  timezone: string;
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  onSelectEvent: (event: EventInstanceDTO) => void;
  /** Tighter padding for phone month+agenda stack. */
  compact?: boolean;
}) {
  const dayEvents = events
    .filter((e) => isSameZonedDay(new Date(e.startsAt), anchor, timezone))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  const allDay = dayEvents.filter((e) => e.allDay);
  const timed = dayEvents.filter((e) => !e.allDay);

  return (
    <div className={cn("rounded-xl border border-line bg-surface", compact ? "p-4" : "p-6")}>
      <h2 className={cn("font-serif mb-3", compact ? "text-xl" : "text-2xl mb-4")}>{formatDayTitle(anchor, timezone)}</h2>

      {dayEvents.length === 0 ? (
        <EmptyState icon={CalendarDays} title="Nothing scheduled" body="This day is wide open." />
      ) : (
        <div className="flex flex-col gap-2">
          {allDay.map((event) => (
            <EventCard key={event.id} event={event} members={members} timezone={timezone} onClick={() => onSelectEvent(event)} />
          ))}
          {timed.map((event) => (
            <div key={event.id} className="flex gap-3 items-stretch">
              <div className={cn("shrink-0 text-right pt-2 font-mono text-ink-3", compact ? "w-14 text-[10px]" : "w-16 text-[10.5px]")}>
                {formatTime(new Date(event.startsAt), timezone)}
              </div>
              <div className="flex-1 min-w-0">
                <EventCard event={event} members={members} timezone={timezone} onClick={() => onSelectEvent(event)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
