"use client";

import { useMemo, useState } from "react";
import { Home, Calendar as CalendarIcon, CheckCircle2, UtensilsCrossed, ShoppingCart, StickyNote } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AvatarStack } from "@/components/ui/Avatar";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { Skeleton } from "@/components/ui/Skeleton";
import { ClockBlock } from "@/components/hub/ClockBlock";
import { TodayTimeline } from "@/components/hub/TodayTimeline";
import { ChoresMealsWidget } from "@/components/hub/ChoresMealsWidget";
import { GroceriesWidget } from "@/components/hub/GroceriesWidget";
import { MemoriesTile } from "@/components/hub/MemoriesTile";
import { QuickActions } from "@/components/hub/QuickActions";
import { IdleScreen } from "@/components/hub/IdleScreen";
import { QuickAddItemModal } from "@/components/hub/QuickAddItemModal";
import { EventEditor } from "@/components/calendar/EventEditor";
import { useFamily } from "@/hooks/useFamily";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { useEvents } from "@/hooks/useEvents";
import { useChoresToday, useMealsToday, useGroceryPreview, useSlideshowPhotos } from "@/hooks/useHubWidgets";
import { useIdle } from "@/hooks/useIdle";
import { useWakeLock } from "@/hooks/useWakeLock";
import { useClock } from "@/hooks/useClock";
import { dayRange } from "@/lib/dates";
import { cn } from "@/lib/cn";

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
  const idleTimeout = settings?.idle_timeout_seconds ?? 15;
  const slideshowInterval = settings?.slideshow_interval_seconds ?? 20;

  const timerIdle = useIdle(idleTimeout);
  const [manualIdle, setManualIdle] = useState(false);
  const idle = timerIdle || manualIdle;
  const now = useClock();
  const pathname = usePathname();
  const router = useRouter();

  const { start, end } = useMemo(() => dayRange(now, timezone), [now, timezone]);
  const todayIso = useMemo(() => start.toISOString().slice(0, 10), [start]);

  const { data: avatarUrls } = useAvatarUrls(members);
  const { data: events } = useEvents(start, end);
  const { data: chores } = useChoresToday(family?.id, todayIso);
  const { data: meals } = useMealsToday(family?.id, todayIso);
  const { data: groceries } = useGroceryPreview(family?.id);
  const { data: photos } = useSlideshowPhotos(family?.id);

  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [groceryModalOpen, setGroceryModalOpen] = useState(false);
  const [noteModalOpen, setNoteModalOpen] = useState(false);

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

      <header className="flex items-center gap-3.5 px-7 pt-5 pb-3.5">
        <ClockBlock timezone={timezone} />
        <div className="ml-auto flex items-center gap-3">
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

      <div className="flex gap-5.5 px-10 pb-4.5 flex-1 min-h-0">
        <TodayTimeline events={events ?? []} members={members} timezone={timezone} now={now} />
        <div className="flex-1 flex flex-col gap-2.5">
          <ChoresMealsWidget chores={chores ?? []} meals={meals} />
          <GroceriesWidget items={groceries ?? []} />
          <MemoriesTile photoUrl={photos?.[0]?.url} onTap={() => setManualIdle(true)} />
        </div>
      </div>

      <div className="px-10 pb-4.5">
        <QuickActions
          onAddEvent={() => setEventEditorOpen(true)}
          onAddGrocery={() => setGroceryModalOpen(true)}
          onAddChore={() => router.push("/chores")}
          onAddNote={() => setNoteModalOpen(true)}
        />
      </div>

      {family && (
        <>
          <EventEditor open={eventEditorOpen} onClose={() => setEventEditorOpen(false)} members={members} timezone={timezone} />
          <QuickAddItemModal
            open={groceryModalOpen}
            onClose={() => setGroceryModalOpen(false)}
            icon={ShoppingCart}
            title="Add a grocery item"
            placeholder="Milk"
            listKind="grocery"
            listName="Groceries"
            familyId={family.id}
            memberId={familyData!.currentMemberId}
          />
          <QuickAddItemModal
            open={noteModalOpen}
            onClose={() => setNoteModalOpen(false)}
            icon={StickyNote}
            title="Add a note"
            placeholder="Remember to..."
            listKind="checklist"
            listName="To-Do"
            familyId={family.id}
            memberId={familyData!.currentMemberId}
          />
        </>
      )}
    </div>
  );
}
