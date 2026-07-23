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
import { ThemedFrame } from "@/components/hub/ThemedFrame";
import { useFamily } from "@/hooks/useFamily";
import { useEvents } from "@/hooks/useEvents";
import { useDeviceMode } from "@/hooks/useDeviceMode";
import { useUIStore } from "@/stores/uiStore";
import { monthGridRange, weekRange, dayRange, nextMonth, prevMonth, nextWeek, prevWeek, nextDay, prevDay, formatMonthTitle, formatDayTitle } from "@/lib/dates";
import type { EventInstanceDTO } from "@/types/events";

const DESKTOP_VIEW_TABS = [
  { value: "month", label: "Month" },
  { value: "week", label: "Week" },
  { value: "weekend", label: "Weekend" },
  { value: "day", label: "Day" },
] as const;

const PHONE_VIEW_TABS = [
  { value: "month", label: "Month" },
  { value: "day", label: "Day" },
] as const;

export default function CalendarPage() {
  const { data: familyData, isLoading: familyLoading } = useFamily();
  const timezone = familyData?.family?.timezone ?? "America/New_York";
  const members = familyData?.members ?? [];
  const { isNarrow } = useDeviceMode();

  const calendarView = useUIStore((s) => s.calendarView);
  const setCalendarView = useUIStore((s) => s.setCalendarView);
  const selectedMemberIds = useUIStore((s) => s.selectedMemberIds);

  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventInstanceDTO | null>(null);
  const [newEventDate, setNewEventDate] = useState<Date | undefined>(undefined);
  const [editorKey, setEditorKey] = useState(0);

  // Phone never shows jammed week columns — fall back to month.
  const effectiveView =
    isNarrow && (calendarView === "week" || calendarView === "weekend") ? "month" : calendarView;

  const range = useMemo(() => {
    if (effectiveView === "month") return monthGridRange(anchor, timezone);
    if (effectiveView === "week" || effectiveView === "weekend") return weekRange(anchor, timezone);
    return dayRange(anchor, timezone);
  }, [effectiveView, anchor, timezone]);

  const { data: events, isLoading, isError, refetch } = useEvents(range.start, range.end);
  const visibleEvents = useMemo(() => {
    if (!events) return [];
    if (selectedMemberIds.length === 0) return events;
    return events.filter((e) => e.memberId && selectedMemberIds.includes(e.memberId));
  }, [events, selectedMemberIds]);

  function goPrev() {
    if (effectiveView === "month") {
      setAnchor((d) => prevMonth(d));
      return;
    }
    if (effectiveView === "week" || effectiveView === "weekend") {
      setAnchor((d) => prevWeek(d));
      return;
    }
    setAnchor((d) => prevDay(d));
    setSelectedDay((d) => prevDay(d));
  }
  function goNext() {
    if (effectiveView === "month") {
      setAnchor((d) => nextMonth(d));
      return;
    }
    if (effectiveView === "week" || effectiveView === "weekend") {
      setAnchor((d) => nextWeek(d));
      return;
    }
    setAnchor((d) => nextDay(d));
    setSelectedDay((d) => nextDay(d));
  }
  function openNew(date?: Date) {
    setEditingEvent(null);
    setNewEventDate(date ?? (isNarrow ? selectedDay : anchor));
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }
  function openEdit(event: EventInstanceDTO) {
    setEditingEvent(event);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }

  const viewTabs = isNarrow ? PHONE_VIEW_TABS : DESKTOP_VIEW_TABS;
  const title = effectiveView === "day" ? formatDayTitle(anchor, timezone) : formatMonthTitle(anchor, timezone);

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      <div className="rounded-xl border border-line bg-surface p-3 md:p-3.5 flex flex-wrap items-center gap-2.5 md:gap-3">
        <div className="flex items-center gap-1">
          <Button variant="icon" size="sm" aria-label="Previous" onClick={goPrev}>
            <ChevronLeft className="size-5" />
          </Button>
          <Button variant="icon" size="sm" aria-label="Next" onClick={goNext}>
            <ChevronRight className="size-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              setAnchor(now);
              setSelectedDay(now);
            }}
          >
            Today
          </Button>
        </div>
        <h1 className="font-serif text-xl md:text-2xl flex-1 min-w-[140px]">{title}</h1>
        <div className="flex gap-1 bg-surface-2 rounded-md p-1">
          {viewTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setCalendarView(tab.value)}
              className={
                "px-3 md:px-3.5 py-2 rounded-sm text-[13px] md:text-[13.5px] font-semibold cursor-pointer transition-all min-h-10 " +
                (effectiveView === tab.value ? "bg-surface text-ink shadow-[0_1px_3px_rgba(43,39,35,0.12)]" : "text-ink-3")
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
        <Button onClick={() => openNew()} className="gap-2 min-h-11">
          <Plus className="size-[18px]" strokeWidth={2.5} />
          {isNarrow ? "Add" : "Add event"}
        </Button>
      </div>

      <div className="hidden md:block">
        <MemberFilterBar />
      </div>

      {isLoading || familyLoading ? (
        <Skeleton rows={5} />
      ) : isError ? (
        <ErrorState body="We couldn't load your calendar." onRetry={() => refetch()} />
      ) : (
        <>
          {effectiveView === "month" && isNarrow && (
            <div className="flex flex-col gap-3">
              <ThemedFrame className="rounded-xl overflow-hidden">
                <MonthGrid
                  anchor={anchor}
                  timezone={timezone}
                  events={visibleEvents}
                  members={members}
                  phone
                  selectedDay={selectedDay}
                  onSelectEvent={openEdit}
                  onSelectDay={(day) => {
                    setSelectedDay(day);
                    setAnchor(day);
                  }}
                />
              </ThemedFrame>
              <ThemedFrame className="rounded-xl overflow-hidden">
                <DayAgenda
                  anchor={selectedDay}
                  timezone={timezone}
                  events={visibleEvents}
                  members={members}
                  onSelectEvent={openEdit}
                  compact
                />
              </ThemedFrame>
            </div>
          )}
          {effectiveView === "month" && !isNarrow && (
            <ThemedFrame className="rounded-xl overflow-hidden">
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
            </ThemedFrame>
          )}
          {!isNarrow && (effectiveView === "week" || effectiveView === "weekend") && (
            <ThemedFrame className="rounded-xl overflow-hidden">
              <WeekView
                anchor={anchor}
                timezone={timezone}
                events={visibleEvents}
                members={members}
                onSelectEvent={openEdit}
                weekendOnly={effectiveView === "weekend"}
              />
            </ThemedFrame>
          )}
          {effectiveView === "day" && (
            <ThemedFrame className="rounded-xl overflow-hidden">
              <DayAgenda
                anchor={anchor}
                timezone={timezone}
                events={visibleEvents}
                members={members}
                onSelectEvent={openEdit}
                compact={isNarrow}
              />
            </ThemedFrame>
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
