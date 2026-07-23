import { type HTMLAttributes } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/cn";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
}

export function Card({ elevated, className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "hearth-card rounded-xl border border-line bg-surface p-[22px]",
        elevated
          ? "shadow-e3 transition-transform duration-[var(--duration-standard)] hover:-translate-y-[3px]"
          : "shadow-e1",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AddCard({ label = "Add", onClick }: { label?: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-[120px] w-full rounded-xl border-[1.5px] border-dashed border-line flex flex-col items-center justify-center gap-2 text-ink-3 hover:border-primary hover:text-primary transition-colors cursor-pointer"
    >
      <Plus className="size-[26px]" aria-hidden />
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
