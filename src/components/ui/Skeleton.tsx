import { cn } from "@/lib/cn";

function ShimmerBar({ width, height = 11 }: { width: string; height?: number }) {
  return (
    <div
      className="rounded-md bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--line)_37%,var(--surface-2)_63%)] bg-[length:600px_100%] animate-shimmer"
      style={{ width, height }}
    />
  );
}

/** Skeleton loading state for list/card rows — matches design system §06.18. */
export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  const widths = [
    ["70%", "45%"],
    ["55%", "35%"],
    ["80%", "50%"],
  ];
  return (
    <div className={cn("rounded-xl border border-line bg-surface p-6", className)} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => {
        const [title, subtitle] = widths[i % widths.length]!;
        return (
          <div key={i} className="flex items-center gap-3 py-2.5">
            <div className="size-[38px] shrink-0 rounded-full bg-[linear-gradient(90deg,var(--surface-2)_25%,var(--line)_37%,var(--surface-2)_63%)] bg-[length:600px_100%] animate-shimmer" />
            <div className="flex-1 flex flex-col gap-2">
              <ShimmerBar width={title} height={11} />
              <ShimmerBar width={subtitle} height={9} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
