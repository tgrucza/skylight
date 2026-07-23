"use client";

import { useMemo, useState } from "react";
import { Home, Calendar as CalendarIcon, CheckCircle2, UtensilsCrossed, ShoppingCart, Smartphone, StickyNote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AvatarStack } from "@/components/ui/Avatar";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClockBlock } from "@/components/hub/ClockBlock";
import { ThemeDecor } from "@/components/hub/ThemeDecor";
import { ThemedFrame } from "@/components/hub/ThemedFrame";
import { TodayTimeline } from "@/components/hub/TodayTimeline";
import { ChoresMealsWidget } from "@/components/hub/ChoresMealsWidget";
import { GroceriesWidget } from "@/components/hub/GroceriesWidget";
import { TodosWidget } from "@/components/hub/TodosWidget";
import { MemoriesTile } from "@/components/hub/MemoriesTile";
import { QuickActions } from "@/components/hub/QuickActions";
import { QuickAddItemModal } from "@/components/hub/QuickAddItemModal";
import { IdleScreen } from "@/components/hub/IdleScreen";
import { HaButtons } from "@/components/hub/HaButtons";
import { EventEditor } from "@/components/calendar/EventEditor";
import { ChoreEditor } from "@/components/chores/ChoreEditor";
import { AskJudyButton, CaptureForJudyButton } from "@/components/assistant/AskJudyModal";
import { useFamily } from "@/hooks/useFamily";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { useEvents } from "@/hooks/useEvents";
import { useChoresToday, useMealsToday, useGroceryPreview, useTodoPreview, useSlideshowPhotos } from "@/hooks/useHubWidgets";
import { EventRemindersBootstrap } from "@/hooks/useEnsureEventReminders";
import { useHomeAssistantUrl } from "@/hooks/useIntegrations";
import { useIdle } from "@/hooks/useIdle";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useClock } from "@/hooks/useClock";
import { useUIStore } from "@/stores/uiStore";
import { dayRange, weekRange, monthGridRange, zonedDayOfWeek, zonedIsoDate } from "@/lib/dates";
import { cn } from "@/lib/cn";

type QuickAddKind = "event" | "grocery" | "chore" | "note";

const NAV_ITEMS = [
  { href: "/hub", icon: Home },
  { href: "/calendar", icon: CalendarIcon },
  { href: "/chores", icon: CheckCircle2 },
  { href: "/meals", icon: UtensilsCrossed },
  { href: "/lists", icon: ShoppingCart },
];

export default function HubPage() {
  useWakeLock();

  const { data: familyData, isLoading } = useFamily();
  const family = familyData?.family;
  const members = familyData?.members ?? [];
  const settings = familyData?.settings;
  const timezone = family?.timezone ?? "America/New_York";
  const isAdult = members.find((m) => m.id === familyData?.currentMemberId)?.role === "adult";
  const idleTimeout = settings?.idle_timeout_seconds ?? 15;
  const slideshowInterval = settings?.slideshow_interval_seconds ?? 20;

  const timerIdle = useIdle(idleTimeout);
  const [manualIdle, setManualIdle] = useState(false);
  const idle = timerIdle || manualIdle;
  const now = useClock();
  const pathname = usePathname();

  // Chores/meals always mean today, regardless of what the schedule panel below is showing.
  const todayIso = useMemo(() => zonedIsoDate(now, timezone), [now, timezone]);
  const todayDow = useMemo(() => zonedDayOfWeek(now, timezone), [now, timezone]);

  const calendarView = useUIStore((s) => s.calendarView);
  const setCalendarView = useUIStore((s) => s.setCalendarView);
  const scheduleRange = useMemo(() => {
    if (calendarView === "month") return monthGridRange(now, timezone);
    if (calendarView === "week" || calendarView === "weekend") return weekRange(now, timezone);
    return dayRange(now, timezone);
  }, [calendarView, now, timezone]);

  const { data: avatarUrls } = useAvatarUrls(members);
  const { data: events } = useEvents(scheduleRange.start, scheduleRange.end);
  const { data: chores } = useChoresToday(family?.id, todayIso, todayDow);
  const { data: meals } = useMealsToday(family?.id, todayIso);
  const { data: groceries } = useGroceryPreview(family?.id);
  const { data: todos } = useTodoPreview(family?.id);
  const { data: photos } = useSlideshowPhotos(family?.id);
  const { data: haBaseUrl } = useHomeAssistantUrl(family?.id);

  const [quickAdd, setQuickAdd] = useState<QuickAddKind | null>(null);
  const [quickAddKey, setQuickAddKey] = useState(0);
  const memberId = familyData?.currentMemberId ?? "";

  function openQuickAdd(kind: QuickAddKind) {
    setQuickAddKey((k) => k + 1);
    setQuickAdd(kind);
  }

  const nextEvent = useMemo(() => {
    if (!events || events.length === 0) return null;
    const sorted = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const nowIso = now.toISOString();
    return sorted.find((e) => e.endsAt > nowIso) ?? sorted[sorted.length - 1] ?? null;
  }, [events, now]);

  const statusLine = members.length > 0 ? `Everyone's day is on the wall — ${members.length} in the family` : "";

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper p-6">
        <div className="max-w-md w-full">
          <Skeleton />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-paper overflow-hidden flex flex-col">
      <EventRemindersBootstrap />
      <ThemeDecor />

      {idle && family && (
        // Any tap wakes the hub (spec §6.10); the useIdle timer resets itself on the same
        // pointerdown, so this only needs to clear the manual override from the Memories tile.
        <div className="absolute inset-0 z-20" onPointerDown={() => setManualIdle(false)}>
          <IdleScreen
            timezone={timezone}
            photos={photos ?? []}
            slideshowIntervalSeconds={slideshowInterval}
            nextEvent={nextEvent}
            members={members}
          />
        </div>
      )}

      <header className="relative z-[2] flex items-center gap-3.5 px-7 pt-5 pb-3.5">
        <div className="flex-1 flex items-center">
          <ClockBlock timezone={timezone} latitude={settings?.latitude} longitude={settings?.longitude} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AskJudyButton isAdult={isAdult} />
          <CaptureForJudyButton isAdult={isAdult} label="Scan document" />
        </div>

        <div className="flex-1 flex items-center justify-end gap-3">
          {members.length > 0 && (
            <div className="flex items-center gap-2">
              <AvatarStack members={members.map((m) => ({ id: m.id, name: m.name, color: m.color_hex, src: avatarUrls?.[m.id] }))} />
              <span className="text-[11px] text-ink-2 max-w-[160px] truncate hidden md:inline">{statusLine}</span>
            </div>
          )}
          <nav className="flex gap-1 bg-surface-2 rounded-md p-1" aria-label="Hub">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center justify-center size-8 rounded-sm",
                  pathname === item.href ? "bg-surface text-primary" : "text-ink-2"
                )}
              >
                <item.icon className="size-[18px]" />
              </Link>
            ))}
            <div className="flex items-center justify-center pl-0.5">
              <AccountMenu size={28} />
            </div>
          </nav>
        </div>
      </header>

      <div className="relative z-[1] flex gap-5.5 px-10 pb-4.5 flex-1 min-h-0">
        <TodayTimeline
          events={events ?? []}
          members={members}
          timezone={timezone}
          now={now}
          viewMode={calendarView}
          onChangeView={setCalendarView}
          rangeStart={scheduleRange.start}
          rangeEnd={scheduleRange.end}
        />
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          <ThemedFrame className="rounded-lg overflow-hidden">
            <ChoresMealsWidget chores={chores ?? []} meals={meals} />
          </ThemedFrame>
          <ThemedFrame className="rounded-lg overflow-hidden">
            <GroceriesWidget items={groceries ?? []} />
          </ThemedFrame>
          <ThemedFrame className="rounded-lg overflow-hidden">
            <TodosWidget items={todos ?? []} />
          </ThemedFrame>
          <ThemedFrame className="rounded-lg overflow-hidden flex-1 min-h-0">
            <MemoriesTile photoUrl={photos?.[0]?.url} onTap={() => setManualIdle(true)} />
          </ThemedFrame>
        </div>
      </div>

      <div className="relative z-[1] px-10 pb-4.5 flex flex-col gap-3">
        <ThemedFrame className="rounded-lg">
          <QuickActions
            onAddEvent={() => openQuickAdd("event")}
            onAddGrocery={() => openQuickAdd("grocery")}
            onAddChore={() => openQuickAdd("chore")}
            onAddNote={() => openQuickAdd("note")}
          />
        </ThemedFrame>
        <HaButtons familyId={family?.id} />
        {haBaseUrl && (
          <ThemedFrame className="rounded-lg overflow-hidden">
            <a
              href={haBaseUrl}
              className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4.5 py-3.5 hover:bg-surface-2/50"
            >
              <span
                className="flex items-center justify-center size-9.5 rounded-[11px] shrink-0"
                style={{ background: "var(--info-soft)", color: "var(--info)" }}
              >
                <Home className="size-[19px]" />
              </span>
              <span className="font-bold text-sm truncate">Home Assistant</span>
            </a>
          </ThemedFrame>
        )}
        <Link
          href="/home"
          className="flex items-center gap-3 rounded-lg border border-dashed border-line bg-paper px-4.5 py-3.5 hover:bg-surface text-sm text-ink-2"
        >
          <span
            className="flex items-center justify-center size-9.5 rounded-[11px] shrink-0"
            style={{ background: "var(--secondary-soft)", color: "var(--secondary)" }}
          >
            <Smartphone className="size-[19px]" />
          </span>
          <span>
            <span className="font-bold text-ink block">Open phone home</span>
            <span className="text-xs text-ink-3">Quick grocery adds, scan, and lists</span>
          </span>
        </Link>
      </div>

      {family && (
        <>
          <EventEditor
            key={`event-${quickAddKey}`}
            open={quickAdd === "event"}
            onClose={() => setQuickAdd(null)}
            members={members}
            timezone={timezone}
            initialDate={now}
          />
          <ChoreEditor
            key={`chore-${quickAddKey}`}
            open={quickAdd === "chore"}
            onClose={() => setQuickAdd(null)}
            familyId={family.id}
            members={members}
          />
          {memberId && (
            <>
              <QuickAddItemModal
                key={`grocery-${quickAddKey}`}
                open={quickAdd === "grocery"}
                onClose={() => setQuickAdd(null)}
                icon={ShoppingCart}
                title="Add grocery"
                placeholder="Milk, eggs, bread…"
                listKind="grocery"
                listName="Groceries"
                familyId={family.id}
                memberId={memberId}
              />
              <QuickAddItemModal
                key={`note-${quickAddKey}`}
                open={quickAdd === "note"}
                onClose={() => setQuickAdd(null)}
                icon={StickyNote}
                title="Add note"
                placeholder="Call the dentist, pack lunches…"
                listKind="checklist"
                listName="To-Do"
                familyId={family.id}
                memberId={memberId}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
