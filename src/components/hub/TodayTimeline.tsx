"use client";

import { ChevronDown } from "lucide-react";
import { withAlpha } from "@/lib/colors";
import { formatTime, formatWeekdayShort, formatDayNumber, formatDayTitle, isSameZonedDay, eachZonedDayBetween } from "@/lib/dates";
import { toZonedTime } from "date-fns-tz";
import { DropdownMenu } from "@/components/ui/Select";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { ThemedFrame } from "@/components/hub/ThemedFrame";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import type { CalendarViewMode } from "@/stores/uiStore";

const VIEW_LABELS: Record<CalendarViewMode, string> = {
  day: "Day",
  week: "Week",
  weekend: "Weekend",
  month: "Month",
};
const VIEW_TITLES: Record<CalendarViewMode, string> = {
  day: "Schedule",
  week: "This Week",
  weekend: "This Weekend",
  month: "This Month",
};

/**
 * Hub schedule panel.
 * - day: flat agenda for the selected day
 * - week / weekend: events grouped by day (scrollable list)
 * - month: calendar grid with event pills + selected-day agenda (matches /calendar month)
 */
export function TodayTimeline({
  events,
  members,
  timezone,
  now,
  viewMode,
  onChangeView,
  rangeStart,
  rangeEnd,
  selectedDay,
  onSelectDay,
}: {
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  timezone: string;
  now: Date;
  viewMode: CalendarViewMode;
  onChangeView: (mode: CalendarViewMode) => void;
  rangeStart: Date;
  rangeEnd: Date;
  selectedDay: Date;
  onSelectDay: (day: Date) => void;
}) {
  const dropdown = (
    <DropdownMenu
      trigger={
        <span className="flex items-center gap-1 rounded-md border border-line bg-paper px-2.5 py-1.5 text-[11px] font-bold text-ink-2">
          {VIEW_LABELS[viewMode]}
          <ChevronDown className="size-3.5" aria-hidden />
        </span>
      }
      items={(["day", "week", "weekend", "month"] as const).map((mode) => ({
        label: VIEW_LABELS[mode],
        onSelect: () => onChangeView(mode),
      }))}
    />
  );

  const dayTitle =
    viewMode === "day"
      ? formatDayTitle(selectedDay, timezone)
      : VIEW_TITLES[viewMode];

  return (
    <ThemedFrame className="flex-[1.55] rounded-2xl border border-line bg-surface p-6 flex flex-col overflow-hidden">
      <div className="flex items-center mb-3 gap-2">
        <h2 className="font-bold text-[17px] truncate">{dayTitle}</h2>
        <span className="ml-auto shrink-0">{dropdown}</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {viewMode === "day" ? (
          <DayList events={events} members={members} timezone={timezone} now={now} day={selectedDay} />
        ) : viewMode === "month" ? (
          <div className="flex flex-col gap-3 min-h-0">
            <MonthGrid
              anchor={selectedDay}
              timezone={timezone}
              events={events}
              members={members}
              dense
              selectedDay={selectedDay}
              className="border-0 rounded-lg"
              onSelectEvent={(event) => onSelectDay(new Date(event.startsAt))}
              onSelectDay={onSelectDay}
            />
            <div className="border-t border-line pt-3">
              <div className="font-mono text-[10.5px] tracking-[0.06em] uppercase text-ink-3 mb-1.5">
                {formatDayTitle(selectedDay, timezone)}
              </div>
              <DayList events={events} members={members} timezone={timezone} now={now} day={selectedDay} />
            </div>
          </div>
        ) : (
          <GroupedList
            events={events}
            members={members}
            timezone={timezone}
            now={now}
            rangeStart={rangeStart}
            rangeEnd={rangeEnd}
            weekendOnly={viewMode === "weekend"}
            onSelectDay={(day) => {
              onSelectDay(day);
              onChangeView("day");
            }}
          />
        )}
      </div>
    </ThemedFrame>
  );
}

function DayList({
  events,
  members,
  timezone,
  now,
  day,
}: {
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  timezone: string;
  now: Date;
  day: Date;
}) {
  const sorted = [...events]
    .filter((e) => isSameZonedDay(new Date(e.startsAt), day, timezone))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const showNow = isSameZonedDay(day, now, timezone);
  const nowIso = now.toISOString();
  const nowMarkerIndex = showNow ? sorted.findIndex((e) => e.startsAt > nowIso) : -2;

  if (sorted.length === 0) {
    return <p className="text-sm text-ink-2 py-6 text-center">Nothing scheduled — enjoy the quiet.</p>;
  }

  return (
    <div className="flex flex-col">
      {sorted.map((event, i) => {
        const member = members.find((m) => m.id === event.memberId);
        const color = member?.color_hex ?? "#9C9388";
        return (
          <div key={event.id}>
            {i === nowMarkerIndex && <NowMarker />}
            <div className="flex gap-2.5 py-1.5">
              <div className="w-[50px] shrink-0 pt-2.5 text-right font-mono text-[10px] text-ink-3">
                {event.allDay ? "" : formatTime(new Date(event.startsAt), timezone)}
              </div>
              <div className="w-1 rounded-sm shrink-0" style={{ background: color }} />
              <div className="flex-1 rounded-sm px-3.5 py-1.5 min-w-0" style={{ background: withAlpha(color, 0.14) }}>
                <div className="text-[13.5px] font-bold text-ink truncate">{event.title}</div>
                <div className="text-[11px] text-ink-2 truncate">
                  {member?.name}
                  {member && !event.allDay ? " · " : ""}
                  {event.allDay ? "All day" : `${formatTime(new Date(event.startsAt), timezone)}–${formatTime(new Date(event.endsAt), timezone)}`}
                </div>
              </div>
            </div>
            {i === sorted.length - 1 && nowMarkerIndex === -1 && <NowMarker />}
          </div>
        );
      })}
    </div>
  );
}

function GroupedList({
  events,
  members,
  timezone,
  now,
  rangeStart,
  rangeEnd,
  weekendOnly,
  onSelectDay,
}: {
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  timezone: string;
  now: Date;
  rangeStart: Date;
  rangeEnd: Date;
  weekendOnly: boolean;
  onSelectDay: (day: Date) => void;
}) {
  const allDays = eachZonedDayBetween(toZonedTime(rangeStart, timezone), toZonedTime(rangeEnd, timezone));
  const days = weekendOnly ? allDays.filter((d) => d.getDay() === 0 || d.getDay() === 6) : allDays;
  const sorted = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  if (sorted.length === 0) return <p className="text-sm text-ink-2 py-8 text-center">Nothing scheduled — enjoy the quiet.</p>;

  return (
    <div className="flex flex-col">
      {days.map((day) => {
        const dayEvents = sorted.filter((e) => isSameZonedDay(new Date(e.startsAt), day, timezone));
        if (dayEvents.length === 0) return null;
        const isToday = isSameZonedDay(day, now, timezone);
        return (
          <div key={day.toISOString()}>
            <button
              type="button"
              onClick={() => onSelectDay(day)}
              className={"font-mono text-[10.5px] tracking-[0.06em] uppercase pt-3 pb-1 cursor-pointer text-left " + (isToday ? "text-primary" : "text-ink-3")}
            >
              {formatWeekdayShort(day, timezone)} {formatDayNumber(day, timezone)}
              {isToday ? " · Today" : ""}
            </button>
            {dayEvents.map((event) => {
              const member = members.find((m) => m.id === event.memberId);
              const color = member?.color_hex ?? "#9C9388";
              return (
                <div key={event.id} className="flex gap-2.5 py-1.5">
                  <div className="w-[50px] shrink-0 pt-2.5 text-right font-mono text-[10px] text-ink-3">
                    {event.allDay ? "" : formatTime(new Date(event.startsAt), timezone)}
                  </div>
                  <div className="w-1 rounded-sm shrink-0" style={{ background: color }} />
                  <div className="flex-1 rounded-sm px-3.5 py-1.5 min-w-0" style={{ background: withAlpha(color, 0.14) }}>
                    <div className="text-[13.5px] font-bold text-ink truncate">{event.title}</div>
                    <div className="text-[11px] text-ink-2 truncate">
                      {member?.name}
                      {member && !event.allDay ? " · " : ""}
                      {event.allDay
                        ? "All day"
                        : `${formatTime(new Date(event.startsAt), timezone)}–${formatTime(new Date(event.endsAt), timezone)}`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function NowMarker() {
  return (
    <div className="flex items-center gap-2 pl-[58px] py-0.5 animate-now">
      <span className="size-2 rounded-full bg-danger shrink-0" />
      <span className="flex-1 h-0.5 bg-danger" />
      <span className="font-mono text-[9.5px] text-danger pr-1">NOW</span>
    </div>
  );
}
