"use client";

import { useMemo, useState } from "react";
import { Plus, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProfileSwitcher } from "@/components/chores/ProfileSwitcher";
import { ChoreChart } from "@/components/chores/ChoreChart";
import { ChoreEditor } from "@/components/chores/ChoreEditor";
import { KidStarPanel } from "@/components/chores/KidStarPanel";
import { StarTotals } from "@/components/chores/StarTotal";
import { RewardShelf } from "@/components/chores/RewardShelf";
import { useFamily } from "@/hooks/useFamily";
import { useChores, useChoreCompletions, useToggleChoreCompletion, type ChoreDTO } from "@/hooks/useChores";
import { useWallProfileStore } from "@/stores/wallProfileStore";
import { weekRange, zonedDayOfWeek, zonedIsoDate } from "@/lib/dates";

export default function ChoresPage() {
  const { data: familyData, isLoading: familyLoading } = useFamily();
  const family = familyData?.family;
  const members = familyData?.members ?? [];
  const timezone = family?.timezone ?? "America/New_York";
  const currentUserMemberId = familyData?.currentMemberId ?? "";
  const activeMemberId = useWallProfileStore((s) => s.activeMemberId) ?? currentUserMemberId;
  const activeMember = members.find((m) => m.id === activeMemberId);
  const isAdult = activeMember?.role === "adult";

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreDTO | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  // Computed once per mount (not on every render) to satisfy React's purity rule around Date.now()/new Date().
  const [now] = useState(() => new Date());
  const todayIso = useMemo(() => zonedIsoDate(now, timezone), [now, timezone]);
  const todayDow = useMemo(() => zonedDayOfWeek(now, timezone), [now, timezone]);
  const weekStartIso = useMemo(() => zonedIsoDate(weekRange(now, timezone).start, timezone), [now, timezone]);
  const yearAgoIso = useMemo(() => zonedIsoDate(new Date(now.getTime() - 365 * 86400000), timezone), [now, timezone]);

  const { data: chores, isLoading: choresLoading } = useChores(family?.id);
  const { data: weekCompletions } = useChoreCompletions(family?.id, weekStartIso, todayIso);
  const { data: allTimeCompletions } = useChoreCompletions(family?.id, yearAgoIso, todayIso);
  const toggleCompletion = useToggleChoreCompletion(family?.id);

  function openNew() {
    setEditingChore(null);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }
  function openEdit(chore: ChoreDTO) {
    setEditingChore(chore);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }

  if (familyLoading || choresLoading) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-3xl">Chores</h1>
        {isAdult && (
          <Button onClick={openNew} className="ml-auto gap-2">
            <Plus className="size-[18px]" strokeWidth={2.5} />
            New chore
          </Button>
        )}
      </div>

      <ProfileSwitcher members={members} currentUserMemberId={currentUserMemberId} />

      {!isAdult && activeMember && chores && (
        <KidStarPanel
          memberName={activeMember.name}
          chores={chores}
          completions={weekCompletions ?? []}
          todayIso={todayIso}
          todayDow={todayDow}
          memberId={activeMemberId}
          allTimeCompletions={allTimeCompletions ?? []}
        />
      )}

      {!chores || chores.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="No chores yet"
          body="Add a chore, assign it, and no one has to be nagged again."
          actionLabel={isAdult ? "Add a chore" : undefined}
          onAction={isAdult ? openNew : undefined}
        />
      ) : (
        <ChoreChart
          chores={chores}
          members={members}
          completions={weekCompletions ?? []}
          todayIso={todayIso}
          todayDow={todayDow}
          activeMemberId={activeMemberId}
          isAdult={isAdult}
          onToggle={(choreId, memberId, done, stars) => toggleCompletion.mutate({ choreId, memberId, dateIso: todayIso, done, stars })}
          onEdit={openEdit}
        />
      )}

      {!isAdult && <StarTotals members={members} completions={weekCompletions ?? []} />}

      {family && activeMemberId && (
        <div>
          <h2 className="font-serif text-2xl mb-3">Rewards</h2>
          <RewardShelf
            familyId={family.id}
            activeMemberId={activeMemberId}
            isAdult={isAdult}
            showKidStars={!isAdult}
            allTimeCompletions={allTimeCompletions ?? []}
          />
        </div>
      )}

      {family && (
        <ChoreEditor key={editorKey} open={editorOpen} onClose={() => setEditorOpen(false)} familyId={family.id} members={members} chore={editingChore} />
      )}
    </div>
  );
}
