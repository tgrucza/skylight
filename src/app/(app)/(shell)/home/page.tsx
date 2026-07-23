"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  UtensilsCrossed,
  ShoppingCart,
  Monitor,
  Plus,
  ListChecks,
} from "lucide-react";
import { AskJudyButton, VoiceAssistantModal, CaptureForJudyButton } from "@/components/assistant/AskJudyModal";
import { HaButtons } from "@/components/hub/HaButtons";
import { Skeleton } from "@/components/ui/Skeleton";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useFamily } from "@/hooks/useFamily";
import { useChoresToday, useMealsToday, useGroceryPreview } from "@/hooks/useHubWidgets";
import { useLists, useAddListItem } from "@/hooks/useLists";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useClock } from "@/hooks/useClock";
import { EventRemindersBootstrap } from "@/hooks/useEnsureEventReminders";
import { ensureChecklistId, ensureGroceryListId } from "@/lib/groceryList";
import { zonedDayOfWeek, zonedIsoDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/uiStore";

function greetingForHour(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Phone-first home — fast capture for lists, meals, Judy, and docs. Wall tablets stay on /hub. */
export default function PhoneHomePage() {
  const { data: familyData, isLoading } = useFamily();
  const family = familyData?.family;
  const members = familyData?.members ?? [];
  const timezone = family?.timezone ?? "America/New_York";
  const isAdult = members.find((m) => m.id === familyData?.currentMemberId)?.role === "adult";
  const memberId = familyData?.currentMemberId ?? "";

  const now = useClock();
  const todayIso = useMemo(() => zonedIsoDate(now, timezone), [now, timezone]);
  const todayDow = useMemo(() => zonedDayOfWeek(now, timezone), [now, timezone]);
  const hour = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hour12: false, timeZone: timezone }).format(now)
  );

  const { data: chores } = useChoresToday(family?.id, todayIso, todayDow);
  const { data: meals } = useMealsToday(family?.id, todayIso);
  const { data: groceries } = useGroceryPreview(family?.id);
  const { data: lists } = useLists(family?.id);
  const groceryList = lists?.find((l) => l.kind === "grocery");
  const todoList = lists?.find((l) => l.kind === "checklist");
  const addGrocery = useAddListItem(groceryList?.id);
  const addTodo = useAddListItem(todoList?.id);
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const pushToast = useUIStore((s) => s.pushToast);

  const [quickGrocery, setQuickGrocery] = useState("");
  const [quickTodo, setQuickTodo] = useState("");
  const [voiceHint, setVoiceHint] = useState<string | null>(null);
  const [addingGrocery, setAddingGrocery] = useState(false);
  const [addingTodo, setAddingTodo] = useState(false);

  async function handleQuickGrocery() {
    if (!quickGrocery.trim() || !family?.id || !memberId || !supabase) return;
    const label = quickGrocery.trim();
    setAddingGrocery(true);
    try {
      const listId = groceryList?.id ?? (await ensureGroceryListId(supabase, family.id));
      if (!groceryList?.id) {
        void queryClient.invalidateQueries({ queryKey: ["lists", family.id] });
      }
      await addGrocery.mutateAsync({ label, addedBy: memberId, autoCategory: true, listId });
      setQuickGrocery("");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't add item", "danger");
    } finally {
      setAddingGrocery(false);
    }
  }

  async function handleQuickTodo() {
    if (!quickTodo.trim() || !family?.id || !memberId || !supabase) return;
    const label = quickTodo.trim();
    setAddingTodo(true);
    try {
      const listId = todoList?.id ?? (await ensureChecklistId(supabase, family.id));
      if (!todoList?.id) {
        void queryClient.invalidateQueries({ queryKey: ["lists", family.id] });
      }
      await addTodo.mutateAsync({ label, addedBy: memberId, autoCategory: false, listId });
      setQuickTodo("");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't add to-do", "danger");
    } finally {
      setAddingTodo(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton rows={5} />
      </div>
    );
  }

  const dinner = meals?.dinner;
  const groceryLabels = groceries ?? [];

  return (
    <div className="flex flex-col gap-5 max-w-lg mx-auto w-full">
      <EventRemindersBootstrap />

      <header className="flex items-start justify-between gap-3 pt-0.5">
        <div className="min-w-0">
          <p className="text-[11px] font-mono uppercase tracking-[0.1em] text-ink-3">Orbit</p>
          <h1 className="font-serif text-[2rem] leading-tight mt-1 tracking-tight">{greetingForHour(hour)}</h1>
          <p className="text-sm text-ink-2 mt-1.5 leading-snug">Capture groceries and to-dos — the wall hub stays on /hub.</p>
        </div>
        <div className="flex flex-col gap-2 items-end shrink-0">
          <AskJudyButton isAdult={isAdult} />
          <CaptureForJudyButton isAdult={isAdult} />
        </div>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3 shadow-[var(--shadow-e1)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="size-4 text-primary" aria-hidden />
            <h2 className="font-bold text-sm">Groceries</h2>
          </div>
          <Link href="/lists" className="text-xs font-semibold text-primary min-h-9 inline-flex items-center">
            Open list
          </Link>
        </div>
        <div className="flex gap-2">
          <Input
            value={quickGrocery}
            onChange={(e) => setQuickGrocery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleQuickGrocery()}
            placeholder="Milk from Costco…"
            className="min-h-12 text-base"
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoComplete="off"
          />
          <Button
            onClick={() => void handleQuickGrocery()}
            loading={addingGrocery || addGrocery.isPending}
            className="gap-1.5 shrink-0 min-h-12 px-4"
            disabled={!family?.id || !memberId || !quickGrocery.trim()}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
        {groceryLabels.length > 0 && (
          <p className="text-xs text-ink-3 leading-relaxed">
            {groceryLabels.length} open — {groceryLabels.slice(0, 3).join(", ")}
            {groceryLabels.length > 3 ? "…" : ""}
          </p>
        )}
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4 flex flex-col gap-3 shadow-[var(--shadow-e1)]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="size-4 text-primary" aria-hidden />
            <h2 className="font-bold text-sm">To-dos</h2>
          </div>
          <Link href="/lists" className="text-xs font-semibold text-primary min-h-9 inline-flex items-center">
            Open list
          </Link>
        </div>
        <div className="flex gap-2">
          <Input
            value={quickTodo}
            onChange={(e) => setQuickTodo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void handleQuickTodo()}
            placeholder="Call dentist, pack lunches…"
            className="min-h-12 text-base"
            enterKeyHint="done"
            autoCapitalize="sentences"
            autoComplete="off"
          />
          <Button
            onClick={() => void handleQuickTodo()}
            loading={addingTodo || addTodo.isPending}
            className="gap-1.5 shrink-0 min-h-12 px-4"
            disabled={!family?.id || !memberId || !quickTodo.trim()}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => setVoiceHint("The user wants to plan dinner tonight. If they name a meal, add its typical ingredients to groceries.")}
          className="rounded-2xl border border-line bg-surface p-4 text-left cursor-pointer hover:bg-surface-2/50 active:scale-[0.98] transition-transform min-h-[96px]"
        >
          <UtensilsCrossed className="size-5 text-primary mb-2.5" />
          <div className="font-bold text-sm">Plan dinner</div>
          <div className="text-xs text-ink-3 mt-0.5 truncate">{dinner || "Ask Judy"}</div>
        </button>
        <button
          type="button"
          onClick={() => setVoiceHint("The user wants to add item(s) to the grocery list. If they name a store (Costco, Sam's Club, Aldi, etc.), put items in that store section.")}
          className="rounded-2xl border border-line bg-surface p-4 text-left cursor-pointer hover:bg-surface-2/50 active:scale-[0.98] transition-transform min-h-[96px]"
        >
          <ShoppingCart className="size-5 text-primary mb-2.5" />
          <div className="font-bold text-sm">Voice add</div>
          <div className="text-xs text-ink-3 mt-0.5">Groceries by voice</div>
        </button>
        <Link
          href="/chores"
          className="rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2/50 active:scale-[0.98] transition-transform min-h-[96px]"
        >
          <CheckCircle2 className="size-5 text-primary mb-2.5" />
          <div className="font-bold text-sm">Chores</div>
          <div className="text-xs text-ink-3 mt-0.5">{chores?.length ?? 0} today</div>
        </Link>
        <Link
          href="/calendar"
          className="rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2/50 active:scale-[0.98] transition-transform min-h-[96px]"
        >
          <CalendarIcon className="size-5 text-primary mb-2.5" />
          <div className="font-bold text-sm">Calendar</div>
          <div className="text-xs text-ink-3 mt-0.5">Month + day</div>
        </Link>
      </section>

      <HaButtons familyId={family?.id} />

      <Link
        href="/hub"
        className={cn(
          "flex items-center gap-3 rounded-2xl border border-dashed border-line bg-paper px-4 py-3.5 text-sm text-ink-2 hover:bg-surface"
        )}
      >
        <Monitor className="size-5 shrink-0" />
        <span>
          <span className="font-semibold text-ink">Open wall hub</span>
          <span className="block text-xs text-ink-3 mt-0.5">Full schedule + idle photos for a mounted tablet</span>
        </span>
      </Link>

      {voiceHint && <VoiceAssistantModal onClose={() => setVoiceHint(null)} isAdult={isAdult} contextHint={voiceHint} />}
    </div>
  );
}
