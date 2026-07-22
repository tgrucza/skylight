import { cn } from "@/lib/cn";
import { initials, readableTextOn } from "@/lib/colors";

interface AvatarProps {
  name: string;
  color: string;
  size?: number;
  ring?: "paper" | "select" | "none";
  className?: string;
}

/** Member avatar: a filled circle in the member's color with initials. */
export function Avatar({ name, color, size = 38, ring = "none", className }: AvatarProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-full font-bold shrink-0", className)}
      style={{
        width: size,
        height: size,
        background: color,
        color: readableTextOn(color),
        fontSize: Math.max(10, size * 0.4),
        boxShadow:
          ring === "paper"
            ? "0 0 0 2.5px var(--paper)"
            : ring === "select"
              ? "0 0 0 2px var(--surface), 0 0 0 3.5px " + color
              : undefined,
      }}
    >
      {initials(name)}
    </span>
  );
}

/** Overlapping stack of member avatars, as used in the Hub header. */
export function AvatarStack({ members }: { members: { id: string; name: string; color: string }[] }) {
  return (
    <div className="flex items-center">
      {members.map((m, i) => (
        <Avatar key={m.id} name={m.name} color={m.color} size={28} ring="paper" className={i > 0 ? "-ml-[9px]" : undefined} />
      ))}
    </div>
  );
}
