"use client";

import { withAlpha } from "@/lib/colors";
import { formatTime } from "@/lib/dates";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

export function TodayTimeline({
  events,
  members,
  timezone,
  now,
}: {
  events: EventInstanceDTO[];
  members: FamilyMemberDTO[];
  timezone: string;
  now: Date;
}) {
  const sorted = [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const nowIso = now.toISOString();
  // Index of the first event that hasn't started yet — the NOW marker renders just before it
  // (or after the last event, if everything today has already started/finished).
  const nowMarkerIndex = sorted.findIndex((e) => e.startsAt > nowIso);

  return (
    <div className="flex-[1.55] rounded-2xl border border-line bg-surface p-6 flex flex-col overflow-hidden">
      <div className="flex items-center mb-3">
        <h2 className="font-bold text-[17px]">Today&apos;s Schedule</h2>
        <span className="ml-auto font-mono text-[11px] text-ink-3">{sorted.length} EVENT{sorted.length === 1 ? "" : "S"}</span>
      </div>

      {sorted.length === 0 ? (
        <p className="text-sm text-ink-2 py-8 text-center">Nothing scheduled today — enjoy the quiet.</p>
      ) : (
        <div className="flex-1 overflow-y-auto flex flex-col">
          {sorted.map((event, i) => {
            const member = members.find((m) => m.id === event.memberId);
            const color = member?.color_hex ?? "#9C9388";

            return (
              <div key={event.id}>
                {i === nowMarkerIndex && <NowMarker />}
                <div className="flex gap-2.5 py-1.5">
                  <div className="w-[50px] shrink-0 pt-2.5 text-right font-mono text-[10px] text-ink-3">
                    {event.allDay ? "" : formatTime(new Date(event.startsAt), timezone)}
                  </div>
                  <div className="w-1 rounded-sm shrink-0" style={{ background: color }} />
                  <div className="flex-1 rounded-sm px-3.5 py-1.5 min-w-0" style={{ background: withAlpha(color, 0.14) }}>
                    <div className="text-[13.5px] font-bold text-ink truncate">{event.title}</div>
                    <div className="text-[11px] text-ink-2 truncate">
                      {member?.name}
                      {member && !event.allDay ? " · " : ""}
                      {event.allDay ? "All day" : `${formatTime(new Date(event.startsAt), timezone)}–${formatTime(new Date(event.endsAt), timezone)}`}
                    </div>
                  </div>
                </div>
                {i === sorted.length - 1 && nowMarkerIndex === -1 && <NowMarker />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NowMarker() {
  return (
    <div className="flex items-center gap-2 pl-[58px] py-0.5 animate-now">
      <span className="size-2 rounded-full bg-danger shrink-0" />
      <span className="flex-1 h-0.5 bg-danger" />
      <span className="font-mono text-[9.5px] text-danger pr-1">NOW</span>
    </div>
  );
}
