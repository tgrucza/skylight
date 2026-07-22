"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { WeekView } from "@/components/calendar/WeekView";
import { DayAgenda } from "@/components/calendar/DayAgenda";
import { MemberFilterBar } from "@/components/calendar/MemberFilterBar";
import { EventEditor } from "@/components/calendar/EventEditor";
import { useFamily } from "@/hooks/useFamily";
import { useEvents } from "@/hooks/useEvents";
import { useUIStore } from "@/stores/uiStore";
import { monthGridRange, weekRange, dayRange, nextMonth, prevMonth, nextWeek, prevWeek, nextDay, prevDay, formatMonthTitle, formatDayTitle } from "@/lib/dates";
import type { EventInstanceDTO } from "@/types/events";

const VIEW_TABS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "day", label: "Day" },
] as const;

export default function CalendarPage() {
  const { data: familyData, isLoading: familyLoading } = useFamily();
  const timezone = familyData?.family?.timezone ?? "America/New_York";
  const members = familyData?.members ?? [];

  const calendarView = useUIStore((s) => s.calendarView);
  const setCalendarView = useUIStore((s) => s.setCalendarView);
  const selectedMemberIds = useUIStore((s) => s.selectedMemberIds);

  const [anchor, setAnchor] = useState(() => new Date());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventInstanceDTO | null>(null);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);

  const range = useMemo(() => {
    if (calendarView === "month") return monthGridRange(anchor, timezone);
    if (calendarView === "week") return weekRange(anchor, timezone);
    return dayRange(anchor, timezone);
  }, [calendarView, anchor, timezone]);

  const { data: events, isLoading, isError, refetch } = useEvents(range.start, range.end);
  const visibleEvents = useMemo(() => {
    if (!events) return [];
    if (selectedMemberIds.length === 0) return events;
    return events.filter((e) => e.memberId && selectedMemberIds.includes(e.memberId));
  }, [events, selectedMemberIds]);

  function goPrev() {
    setAnchor((d) => (calendarView === "month" ? prevMonth(d) : calendarView === "week" ? prevWeek(d) : prevDay(d)));
  }
  function goNext() {
    setAnchor((d) => (calendarView === "month" ? nextMonth(d) : calendarView === "week" ? nextWeek(d) : nextDay(d)));
  }
  function openNew(date?: Date) {
    setEditingEvent(null);
    setNewEventDate(date ?? anchor);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }
  function openEdit(event: EventInstanceDTO) {
    setEditingEvent(event);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }

  const title = calendarView === "day" ? formatDayTitle(anchor, timezone) : formatMonthTitle(anchor, timezone);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-line bg-surface p-3.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          <Button variant="icon" size="sm" aria-label="Previous" onClick={goPrev}>
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="icon" size="sm" aria-label="Next" onClick={goNext}>
            <ChevronRight className="size-5" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(new Date())}>
            Today
          </Button>
        </div>
        <h1 className="font-serif text-2xl flex-1 min-w-[160px]">{title}</h1>
        <div className="flex gap-1 bg-surface-2 rounded-md p-1">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCalendarView(tab.value)}
              className={
                "px-3.5 py-2 rounded-sm text-[13.5px] font-semibold cursor-pointer transition-all " +
                (calendarView === tab.value ? "bg-surface text-ink shadow-[0_1px_3px_rgba(43,39,35,0.12)]" : "text-ink-3")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button onClick={() => openNew()} className="gap-2">
          <Plus className="size-[18px]" strokeWidth={2.5} />
          Add event
        </Button>
      </div>

      <MemberFilterBar />

      {isLoading || familyLoading ? (
        <Skeleton rows={5} />
      ) : isError ? (
        <ErrorState body="We couldn't load your calendar." onRetry={() => refetch()} />
      ) : (
        <>
          {calendarView === "month" && (
            <MonthGrid
              anchor={anchor}
              timezone={timezone}
              events={visibleEvents}
              members={members}
              onSelectEvent={openEdit}
              onSelectDay={(day) => {
                setAnchor(day);
                setCalendarView("day");
              }}
            />
          )}
          {calendarView === "week" && (
            <WeekView anchor={anchor} timezone={timezone} events={visibleEvents} members={members} onSelectEvent={openEdit} />
          )}
          {calendarView === "day" && (
            <DayAgenda anchor={anchor} timezone={timezone} events={visibleEvents} members={members} onSelectEvent={openEdit} />
          )}
        </>
      )}

      <EventEditor
        key={editorKey}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        members={members}
        timezone={timezone}
        initialDate={newEventDate}
        event={editingEvent}
      />
    </div>
  );
}
