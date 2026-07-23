"use client";

import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { HubOverlay } from "@/components/hub/HubOverlay";
import { ChoreChart } from "@/components/chores/ChoreChart";
import { ChoreEditor } from "@/components/chores/ChoreEditor";
import { KidsStarOverview } from "@/components/chores/KidsStarOverview";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useChores, useChoreCompletions, useToggleChoreCompletion, type ChoreDTO } from "@/hooks/useChores";
import { useRewards, useRedemptions } from "@/hooks/useRewards";
import { useClock } from "@/hooks/useClock";
import { zonedDayOfWeek, zonedIsoDate } from "@/lib/dates";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

/** Today's chores interaction over the hub — check off without leaving `/hub`. */
export function HubChoresModal({
  open,
  onClose,
  familyId,
  members,
  timezone,
  activeMemberId,
  isAdult,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string;
  members: FamilyMemberDTO[];
  timezone: string;
  activeMemberId: string;
  isAdult: boolean;
}) {
  const now = useClock();
  const todayIso = useMemo(() => zonedIsoDate(now, timezone), [now, timezone]);
  const todayDow = useMemo(() => zonedDayOfWeek(now, timezone), [now, timezone]);
  const yearAgoIso = useMemo(
    () => zonedIsoDate(new Date(now.getTime() - 365 * 86400000), timezone),
    [now, timezone]
  );

  const { data: chores, isLoading } = useChores(familyId);
  const { data: completions } = useChoreCompletions(familyId, todayIso, todayIso);
  const { data: allTimeCompletions } = useChoreCompletions(familyId, yearAgoIso, todayIso);
  const { data: rewards } = useRewards(familyId);
  const { data: redemptions } = useRedemptions(familyId);
  const toggleCompletion = useToggleChoreCompletion(familyId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreDTO | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  function openEdit(chore: ChoreDTO) {
    setEditingChore(chore);
    setEditorKey((k) => k + 1);
    setEditorOpen(true);
  }

  return (
    <>
      <HubOverlay open={open} onClose={onClose} icon={CheckCircle2} title="Chores today" subtitle="Tap a chore to mark it done">
        {isLoading ? (
          <Skeleton rows={5} />
        ) : (
          <div className="flex flex-col gap-4">
            <KidsStarOverview
              members={members}
              chores={chores ?? []}
              todayCompletions={completions ?? []}
              allTimeCompletions={allTimeCompletions ?? []}
              rewards={rewards}
              redemptions={redemptions}
              todayIso={todayIso}
              todayDow={todayDow}
            />
            {!chores || chores.length === 0 ? (
              <EmptyState icon={CheckCircle2} title="No chores yet" body="Add one from Quick actions below." />
            ) : (
              <ChoreChart
                chores={chores}
                members={members}
                completions={completions ?? []}
                todayIso={todayIso}
                todayDow={todayDow}
                activeMemberId={activeMemberId}
                isAdult={isAdult}
                onToggle={(choreId, memberId, done, stars) =>
                  toggleCompletion.mutate({ choreId, memberId, dateIso: todayIso, done, stars })
                }
                onEdit={openEdit}
              />
            )}
          </div>
        )}
      </HubOverlay>
      <ChoreEditor
        key={editorKey}
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        familyId={familyId}
        members={members}
        chore={editingChore}
      />
    </>
  );
}
