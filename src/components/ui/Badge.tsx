import { cn } from "@/lib/cn";

export type BadgeTone = "success" | "warning" | "danger" | "info" | "neutral";

const toneClasses: Record<BadgeTone, string> = {
  success: "bg-success text-white",
  warning: "bg-warning-soft text-warning",
  danger: "bg-danger-soft text-danger",
  info: "bg-info-soft text-info",
  neutral: "bg-surface-2 text-ink-2",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-pill px-2.5 py-1 text-xs font-bold", toneClasses[tone], className)}>
      {children}
    </span>
  );
}

/** Small numeric badge anchored to the top-right corner of an icon tile. */
export function CountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 rounded-pill bg-danger text-white text-[11px] font-bold flex items-center justify-center px-1 border-2 border-surface">
      {count}
    </span>
  );
}

export function SyncStatus({ synced = true }: { synced?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-2">
      <span className={cn("size-2.5 rounded-full", synced ? "bg-success" : "bg-ink-3")} aria-hidden />
      {synced ? "Synced" : "Syncing…"}
    </span>
  );
}
