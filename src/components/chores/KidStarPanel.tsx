"use client";

import { Star, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ChoreDTO, ChoreCompletionDTO } from "@/hooks/useChores";

/** Kid-friendly summary: remaining chores, stars each is worth, total earned. */
export function KidStarPanel({
  memberName,
  chores,
  completions,
  todayIso,
  todayDow,
  memberId,
  allTimeCompletions,
}: {
  memberName: string;
  chores: ChoreDTO[];
  completions: ChoreCompletionDTO[];
  todayIso: string;
  todayDow: number;
  memberId: string;
  allTimeCompletions: ChoreCompletionDTO[];
}) {
  const mine = chores.filter(
    (c) =>
      c.assignedMemberIds.includes(memberId) &&
      (c.schedule_days.length === 0 || c.schedule_days.includes(todayDow))
  );
  const remaining = mine.filter(
    (c) => !completions.some((x) => x.chore_id === c.id && x.member_id === memberId && x.completed_on === todayIso)
  );
  const doneCount = mine.length - remaining.length;
  const starsAvailableToday = remaining.reduce((sum, c) => sum + c.star_value, 0);
  const totalEarned = allTimeCompletions
    .filter((c) => c.member_id === memberId)
    .reduce((sum, c) => sum + c.stars, 0);

  return (
    <div className="rounded-2xl border border-warning-soft bg-warning-soft/35 p-5 flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="flex size-11 items-center justify-center rounded-xl bg-warning text-white shrink-0">
          <Sparkles className="size-5" />
        </span>
        <div className="min-w-0">
          <div className="font-serif text-2xl leading-tight">{memberName}&apos;s stars</div>
          <p className="text-sm text-ink-2 mt-0.5">
            {remaining.length === 0
              ? mine.length === 0
                ? "No chores for you today — nice!"
                : "All done for today — you rock!"
              : `${remaining.length} chore${remaining.length === 1 ? "" : "s"} left · up to ${starsAvailableToday} ★ today`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2.5">
        <Stat label="Left today" value={String(remaining.length)} />
        <Stat label="Done today" value={`${doneCount}/${mine.length || 0}`} />
        <Stat
          label="Stars earned"
          value={String(totalEarned)}
          accent
        />
      </div>

      {remaining.length > 0 && (
        <ul className="flex flex-col gap-2">
          {remaining.map((chore) => (
            <li
              key={chore.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
            >
              <span className="font-semibold text-sm truncate">{chore.title}</span>
              <span className="flex items-center gap-1 shrink-0 text-warning font-bold text-sm">
                <Star className="size-3.5 fill-warning" />
                {chore.star_value}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-xl border border-line bg-surface px-3 py-3 text-center", accent && "border-warning-soft")}>
      <div className={cn("font-bold text-xl tabular-nums", accent && "text-warning")}>{value}</div>
      <div className="text-[11px] font-semibold text-ink-3 mt-0.5">{label}</div>
    </div>
  );
}
