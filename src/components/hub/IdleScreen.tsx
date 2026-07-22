"use client";

import { useEffect, useState } from "react";
import { formatInTimeZone } from "date-fns-tz";
import { useClock } from "@/hooks/useClock";
import type { SlideshowPhoto } from "@/hooks/useHubWidgets";
import type { EventInstanceDTO } from "@/types/events";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import { formatTime } from "@/lib/dates";

export function IdleScreen({
  timezone,
  photos,
  slideshowIntervalSeconds,
  nextEvent,
  members,
}: {
  timezone: string;
  photos: SlideshowPhoto[];
  slideshowIntervalSeconds: number;
  nextEvent: EventInstanceDTO | null;
  members: FamilyMemberDTO[];
}) {
  const now = useClock();
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (photos.length < 2) return;
    const id = setInterval(() => setPhotoIndex((i) => (i + 1) % photos.length), slideshowIntervalSeconds * 1000);
    return () => clearInterval(id);
  }, [photos.length, slideshowIntervalSeconds]);

  const time = formatInTimeZone(now, timezone, "h:mm");
  const ampm = formatInTimeZone(now, timezone, "a");
  const dateLabel = formatInTimeZone(now, timezone, "EEEE, MMM d");
  const currentPhoto = photos[photoIndex];
  const member = nextEvent ? members.find((m) => m.id === nextEvent.memberId) : undefined;
  const isFuture = nextEvent ? nextEvent.startsAt > now.toISOString() : false;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className="absolute -inset-[6%] animate-[hh-pan_22s_ease-in-out_infinite_alternate]"
        style={{
          backgroundImage: currentPhoto
            ? `url(${currentPhoto.url})`
            : "repeating-linear-gradient(115deg, #3a3226, #3a3226 22px, #2c2620 22px, #2c2620 44px)",
          backgroundColor: "#231e18",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(20,17,13,0.05)_0%,rgba(20,17,13,0.15)_55%,rgba(20,17,13,0.72)_100%)]" />

      <span className="absolute top-8.5 left-11 font-mono text-xs tracking-[0.18em] text-[rgba(243,236,224,0.55)]">HEARTH</span>

      <div className="absolute left-14 bottom-30">
        <div className="flex items-baseline">
          <span className="font-sans font-light text-[96px] leading-none tracking-[-0.02em] text-[#F3ECE0]">{time}</span>
          <span className="text-[36px] font-normal ml-2.5 text-[rgba(243,236,224,0.6)]">{ampm}</span>
        </div>
        <div className="font-serif text-2xl mt-2.5 text-[rgba(243,236,224,0.85)]">{dateLabel}</div>
      </div>

      {nextEvent && (
        <div className="absolute left-14 bottom-11 inline-flex items-center gap-3 rounded-pill bg-[rgba(20,17,13,0.5)] border border-[rgba(243,236,224,0.14)] px-5 py-3 pl-3.5 backdrop-blur">
          <span className="size-3 rounded-full shrink-0" style={{ background: member?.color_hex ?? "#9C9388" }} />
          <div>
            <div className="font-mono text-[11px] tracking-[0.08em] text-[rgba(243,236,224,0.55)]">{isFuture ? "NEXT UP" : "LAST TODAY"}</div>
            <div className="font-bold text-[15px] text-[#F3ECE0]">{nextEvent.title}</div>
          </div>
          <div className="font-mono text-[12.5px] text-[rgba(243,236,224,0.7)]">{formatTime(new Date(nextEvent.startsAt), timezone)}</div>
        </div>
      )}

      {photos.length > 1 && (
        <div className="absolute right-14 bottom-11 flex gap-2">
          {photos.slice(0, 6).map((p, i) => (
            <span
              key={p.id}
              className="h-[7px] rounded-sm bg-[#F3ECE0] transition-all"
              style={{ width: i === photoIndex ? 22 : 7, opacity: i === photoIndex ? 0.9 : 0.35 }}
            />
          ))}
        </div>
      )}

      <span className="absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] tracking-[0.14em] text-[rgba(243,236,224,0.4)] animate-pulse-soft">
        TAP TO WAKE
      </span>
    </div>
  );
}
