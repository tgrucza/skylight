"use client";

import { Check, Pencil } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import type { ChoreDTO, ChoreCompletionDTO } from "@/hooks/useChores";

interface ChoreChartProps {
  chores: ChoreDTO[];
  members: FamilyMemberDTO[];
  completions: ChoreCompletionDTO[];
  todayIso: string;
  activeMemberId: string;
  isAdult: boolean;
  onToggle: (choreId: string, memberId: string, done: boolean, stars: number) => void;
  onEdit: (chore: ChoreDTO) => void;
}

/** Today's chore chart, grouped by assigned member — tap a chip to complete (spec §6.6). */
export function ChoreChart({ chores, members, completions, todayIso, activeMemberId, isAdult, onToggle, onEdit }: ChoreChartProps) {
  const { data: avatarUrls } = useAvatarUrls(members);
  const todayDow = new Date(todayIso).getDay();
  const dueToday = chores.filter((c) => c.schedule_days.length === 0 || c.schedule_days.includes(todayDow));

  if (dueToday.length === 0) {
    return <p className="text-sm text-ink-2 py-8 text-center">No chores scheduled today.</p>;
  }

  const byMember = members
    .map((member) => ({
      member,
      chores: dueToday.filter((c) => c.assignedMemberIds.includes(member.id)),
    }))
    .filter((g) => g.chores.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {byMember.map(({ member, chores: memberChores }) => (
        <div key={member.id} className="rounded-xl border border-line bg-surface p-5">
          <div className="flex items-center gap-2.5 mb-3.5">
            <Avatar name={member.name} color={member.color_hex} src={avatarUrls?.[member.id]} size={32} />
            <span className="font-bold text-[15px]">{member.name}</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {memberChores.map((chore) => {
              const done = completions.some((c) => c.chore_id === chore.id && c.member_id === member.id && c.completed_on === todayIso);
              const canToggle = activeMemberId === member.id || isAdult;
              return (
                <div key={chore.id} className="relative group">
                  <button
                    type="button"
                    disabled={!canToggle}
                    onClick={() => onToggle(chore.id, member.id, !done, chore.star_value)}
                    className={cn(
                      "flex items-center gap-2.5 rounded-xl border-[1.5px] px-4 py-3 min-h-[52px] transition-all",
                      canToggle ? "cursor-pointer" : "cursor-not-allowed opacity-60",
                      done ? "bg-success-soft border-success" : "bg-paper border-line"
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center size-6 rounded-full border-2 shrink-0",
                        done ? "bg-success border-success" : "border-ink-3"
                      )}
                    >
                      {done && <Check className="size-4 text-white" strokeWidth={3.5} />}
                    </span>
                    <span className={cn("font-semibold text-sm", done && "text-ink-3 line-through")}>{chore.title}</span>
                  </button>
                  {isAdult && (
                    <button
                      type="button"
                      onClick={() => onEdit(chore)}
                      aria-label={`Edit ${chore.title}`}
                      className="absolute -top-1.5 -right-1.5 size-6 rounded-full bg-surface-2 border border-line flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <Pencil className="size-3 text-ink-2" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
