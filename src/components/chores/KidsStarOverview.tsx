"use client";

import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import type { ChoreDTO, ChoreCompletionDTO } from "@/hooks/useChores";
import type { RewardDTO, RedemptionDTO } from "@/hooks/useRewards";

/** Adult/wall overview: each kid’s spendable star balance plus chores left today. */
export function KidsStarOverview({
  members,
  chores,
  todayCompletions,
  allTimeCompletions,
  rewards,
  redemptions,
  todayIso,
  todayDow,
}: {
  members: FamilyMemberDTO[];
  chores: ChoreDTO[];
  todayCompletions: ChoreCompletionDTO[];
  allTimeCompletions: ChoreCompletionDTO[];
  rewards: RewardDTO[] | undefined;
  redemptions: RedemptionDTO[] | undefined;
  todayIso: string;
  todayDow: number;
}) {
  const kids = members.filter((m) => m.role === "child");
  const { data: avatarUrls } = useAvatarUrls(kids);

  if (kids.length === 0) return null;

  return (
    <div className="rounded-2xl border border-warning-soft bg-warning-soft/35 p-4 flex flex-col gap-3">
      <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-3">Kids&apos; stars</div>
      <ul className="flex flex-col gap-2.5">
        {kids.map((kid) => {
          const earned = allTimeCompletions
            .filter((c) => c.member_id === kid.id)
            .reduce((sum, c) => sum + c.stars, 0);
          const spent = (redemptions ?? [])
            .filter((r) => r.member_id === kid.id && r.approved_by)
            .reduce((sum, r) => sum + (rewards?.find((rw) => rw.id === r.reward_id)?.star_cost ?? 0), 0);
          const balance = earned - spent;

          const mine = chores.filter(
            (c) =>
              c.assignedMemberIds.includes(kid.id) &&
              (c.schedule_days.length === 0 || c.schedule_days.includes(todayDow))
          );
          const remaining = mine.filter(
            (c) =>
              !todayCompletions.some(
                (x) => x.chore_id === c.id && x.member_id === kid.id && x.completed_on === todayIso
              )
          );

          return (
            <li
              key={kid.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-3"
            >
              <Avatar name={kid.name} color={kid.color_hex} src={avatarUrls?.[kid.id]} size={40} />
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm truncate">{kid.name}</div>
                <div className="text-[12.5px] text-ink-2 mt-0.5">
                  {remaining.length === 0
                    ? mine.length === 0
                      ? "No chores today"
                      : "All done today"
                    : `${remaining.length} chore${remaining.length === 1 ? "" : "s"} left`}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 text-warning font-bold tabular-nums">
                <Star className="size-4 fill-warning" aria-hidden />
                <span className="text-lg leading-none">{balance}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
