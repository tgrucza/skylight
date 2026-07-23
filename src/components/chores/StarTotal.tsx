"use client";

import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import type { ChoreCompletionDTO } from "@/hooks/useChores";

/** Kid-facing weekly star leaderboard — only render when wall profile is a child. */
export function StarTotals({ members, completions }: { members: FamilyMemberDTO[]; completions: ChoreCompletionDTO[] }) {
  const { data: avatarUrls } = useAvatarUrls(members);
  const kids = members.filter((m) => m.role === "child");
  const rows = kids.length > 0 ? kids : members;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 flex flex-wrap gap-5">
      {rows.map((m) => {
        const total = completions.filter((c) => c.member_id === m.id).reduce((sum, c) => sum + c.stars, 0);
        return (
          <div key={m.id} className="flex items-center gap-3">
            <Avatar name={m.name} color={m.color_hex} src={avatarUrls?.[m.id]} size={40} />
            <div>
              <div className="font-bold text-sm">{m.name}</div>
              <div className="flex items-center gap-1 text-warning font-bold text-[13px]">
                <Star className="size-3.5 fill-warning" />
                {total} this week
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
