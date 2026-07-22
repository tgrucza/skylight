"use client";

import { withAlpha } from "@/lib/colors";
import { formatTime } from "@/lib/dates";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

function memberFor(members: FamilyMemberDTO[], memberId: string | null) {
  return members.find((m) => m.id === memberId);
}

/** Compact single-line event pill for month grid cells. */
export function EventPill({
  event,
  members,
  onClick,
}: {
  event: EventInstanceDTO;
  members: FamilyMemberDTO[];
  onClick?: () => void;
}) {
  const member = memberFor(members, event.memberId);
  const color = member?.color_hex ?? "#9C9388";

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className="w-full flex items-center gap-1.5 rounded-xs px-1.5 py-0.5 text-left cursor-pointer overflow-hidden"
      style={{ background: withAlpha(color, 0.16), borderLeft: `3px solid ${color}` }}
    >
      <span className="truncate text-[11px] font-semibold text-ink">{event.title}</span>
    </button>
  );
}

/** Fuller event card for week/day views and agenda lists. */
export function EventCard({
  event,
  members,
  timezone,
  onClick,
}: {
  event: EventInstanceDTO;
  members: FamilyMemberDTO[];
  timezone: string;
  onClick?: () => void;
}) {
  const member = memberFor(members, event.memberId);
  const color = member?.color_hex ?? "#9C9388";

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex flex-col gap-0.5 rounded-xs px-2.5 py-1.5 text-left cursor-pointer"
      style={{ background: withAlpha(color, 0.14), borderLeft: `3px solid ${color}` }}
    >
      <span className="text-[12.5px] font-bold text-ink truncate">{event.title}</span>
      <span className="text-[11px] text-ink-2 truncate">
        {member ? `${member.name} · ` : ""}
        {event.allDay ? "All day" : formatTime(new Date(event.startsAt), timezone)}
      </span>
    </button>
  );
}
