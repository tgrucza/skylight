import { useState } from "react";
import { cn } from "@/lib/cn";
import { initials, readableTextOn } from "@/lib/colors";

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  ring?: "paper" | "select" | "none";
  className?: string;
  src?: string | null;
}

/** Member avatar: a photo when `src` resolves, otherwise a filled circle in the member's color with initials (also the loading/error fallback). */
export function Avatar({ name, color, size = 38, ring = "none", className, src }: AvatarProps) {
  const [failed, setFailed] = useState(false);
  const boxShadow =
    ring === "paper" ? "0 0 0 2.5px var(--paper)" : ring === "select" ? "0 0 0 2px var(--surface), 0 0 0 3.5px " + color : undefined;

  if (src && !failed) {
    return (
      <span
        className={cn("inline-flex items-center justify-center rounded-full shrink-0 overflow-hidden", className)}
        style={{ width: size, height: size, boxShadow }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase URLs, not a static asset */}
        <img src={src} alt={name} className="w-full h-full object-cover" onError={() => setFailed(true)} />
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-bold shrink-0", className)}
      style={{
        width: size,
        height: size,
        background: color,
        color: readableTextOn(color),
        fontSize: Math.max(10, size * 0.4),
        boxShadow,
      }}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping stack of member avatars, as used in the Hub header. */
export function AvatarStack({ members }: { members: { id: string; name: string; color: string; src?: string | null }[] }) {
  return (
    <div className="flex items-center">
      {members.map((m, i) => (
        <Avatar key={m.id} name={m.name} color={m.color} src={m.src} size={28} ring="paper" className={i > 0 ? "-ml-[9px]" : undefined} />
      ))}
    </div>
  );
}
