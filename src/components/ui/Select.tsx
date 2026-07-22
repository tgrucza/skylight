"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

function useClickOutside(onOutside: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onOutside]);
  return ref;
}

export interface SelectOption {
  value: string;
  label: string;
}

export function Select({
  label,
  value,
  options,
  onChange,
}: {
  label?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const current = options.find((o) => o.value === value);

  return (
    <div className="relative min-w-[190px]" ref={ref}>
      {label && <div className="text-[13px] font-semibold mb-2">{label}</div>}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full flex items-center justify-between gap-2.5 rounded-md border-[1.5px] bg-paper px-4 py-3.5 text-sm font-semibold text-ink cursor-pointer",
          open ? "border-primary" : "border-line"
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {current?.label ?? "Select…"}
        <ChevronDown className="size-[17px] text-ink-3" aria-hidden />
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute top-[calc(100%+8px)] left-0 right-0 z-20 rounded-2xl border border-line bg-surface p-1.5 shadow-dropdown animate-fade-up"
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className="flex items-center justify-between rounded-[9px] px-3 py-2.5 text-sm font-medium text-ink cursor-pointer hover:bg-surface-2"
            >
              {opt.label}
              {opt.value === value && <Check className="size-4 text-primary" strokeWidth={3} aria-hidden />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export interface MenuItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  destructive?: boolean;
}

export function DropdownMenu({ trigger, items }: { trigger: React.ReactNode; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
        {trigger}
      </button>
      {open && (
        <div role="menu" className="absolute top-[calc(100%+8px)] left-0 z-20 w-[200px] rounded-2xl border border-line bg-surface p-1.5 shadow-dropdown animate-fade-up">
          {items.map((item) => (
            <div
              key={item.label}
              role="menuitem"
              onClick={() => {
                item.onSelect();
                setOpen(false);
              }}
              className={cn(
                "flex items-center gap-[11px] rounded-[9px] px-3 py-2.5 text-sm font-medium cursor-pointer hover:bg-surface-2",
                item.destructive ? "text-danger" : "text-ink"
              )}
            >
              {item.icon && <item.icon className="size-[17px]" />}
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
