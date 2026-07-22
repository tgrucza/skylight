import { type ButtonHTMLAttributes } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { withAlpha } from "@/lib/colors";

interface MemberChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "member";
  color: string;
  label: string;
  active?: boolean;
}

interface RemovableChipProps {
  variant: "removable";
  label: string;
  onRemove: () => void;
}

interface FilterChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: "filter";
  label: string;
  active?: boolean;
}

export type ChipProps = MemberChipProps | RemovableChipProps | FilterChipProps;

export function Chip(props: ChipProps) {
  if (props.variant === "removable") {
    const { label, onRemove } = props;
    return (
      <span className="inline-flex items-center gap-2 rounded-pill bg-surface-2 py-2 pl-3.5 pr-2 text-[13.5px] font-semibold text-ink">
        {label}
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="text-ink-3 hover:text-ink cursor-pointer">
          <X className="size-4" aria-hidden />
        </button>
      </span>
    );
  }

  if (props.variant === "filter") {
    const { label, active, className, ...rest } = props;
    return (
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-[13.5px] font-semibold transition-colors duration-[var(--duration-micro)]",
          active ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2",
          className
        )}
        {...rest}
      >
        {active && <Check className="size-[15px]" strokeWidth={3} aria-hidden />}
        {label}
      </button>
    );
  }

  const { color, label, active = true, className, ...rest } = props;
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border-[1.5px] py-2 pl-2.5 pr-3.5 text-[13.5px] font-semibold transition-all duration-[var(--duration-standard)]",
        className
      )}
      style={{
        borderColor: active ? color : "var(--line)",
        background: active ? withAlpha(color, 0.13) : "var(--surface)",
        color: active ? "var(--ink)" : "var(--ink)",
      }}
      {...rest}
    >
      <span className="size-3.5 rounded-full" style={{ background: color }} aria-hidden />
      {label}
    </button>
  );
}
