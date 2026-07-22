import { Check } from "lucide-react";
import { cn } from "@/lib/cn";

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      // min-h-11 (44px) keeps the tap target to spec (§6.5) even though the visual track is smaller.
      className="inline-flex items-center gap-3.5 min-h-11 py-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {label && <span className="text-sm font-semibold min-w-[70px] text-left">{label}</span>}
      <span
        className={cn(
          "relative w-13 h-[30px] rounded-pill transition-colors duration-200 shrink-0",
          checked ? "bg-primary" : "bg-surface-2"
        )}
      >
        <span
          className="absolute top-[3px] size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.25)] transition-[left] duration-200"
          style={{ left: checked ? 25 : 3 }}
        />
      </span>
    </button>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label ? undefined : "Checkbox"}
      onClick={() => onChange(!checked)}
      className="inline-flex items-center gap-3 min-h-11 py-2 cursor-pointer"
    >
      <span
        className={cn(
          "size-6 rounded-[7px] border-2 flex items-center justify-center transition-all duration-150 shrink-0",
          checked ? "border-primary bg-primary" : "border-ink-3 bg-transparent"
        )}
      >
        <Check className={cn("size-[15px] text-white", checked ? "opacity-100" : "opacity-0")} strokeWidth={3.5} aria-hidden />
      </span>
      {label && <span className="text-sm font-semibold text-left">{label}</span>}
    </button>
  );
}

export function Radio({ selected, onSelect, label }: { selected: boolean; onSelect: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      aria-label={label ? undefined : "Radio"}
      onClick={onSelect}
      className="inline-flex items-center gap-3 min-h-11 py-2 cursor-pointer"
    >
      <span className={cn("size-6 rounded-full border-2 flex items-center justify-center shrink-0", selected ? "border-primary" : "border-ink-3")}>
        <span className={cn("size-[11px] rounded-full bg-primary transition-opacity duration-150", selected ? "opacity-100" : "opacity-0")} />
      </span>
      {label && <span className="text-sm font-semibold text-left">{label}</span>}
    </button>
  );
}
