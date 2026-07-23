"use client";

import {
  Zap,
  Lightbulb,
  Lamp,
  Power,
  Home,
  DoorOpen,
  Lock,
  Unlock,
  Moon,
  Sun,
  Film,
  Music,
  Fan,
  Thermometer,
  Car,
  Shield,
  Coffee,
  Bed,
  Tv,
  Speaker,
  type LucideIcon,
} from "lucide-react";
import { useHaButtons, useInvokeHaButton, type HaButtonDTO } from "@/hooks/useHaButtons";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/cn";

const ICON_MAP: Record<string, LucideIcon> = {
  zap: Zap,
  lightbulb: Lightbulb,
  lamp: Lamp,
  power: Power,
  home: Home,
  "door-open": DoorOpen,
  lock: Lock,
  unlock: Unlock,
  moon: Moon,
  sun: Sun,
  film: Film,
  music: Music,
  fan: Fan,
  thermometer: Thermometer,
  car: Car,
  shield: Shield,
  coffee: Coffee,
  bed: Bed,
  tv: Tv,
  speaker: Speaker,
};

function HaButtonTile({ button }: { button: HaButtonDTO }) {
  const invoke = useInvokeHaButton();
  const pushToast = useUIStore((s) => s.pushToast);
  const Icon = ICON_MAP[button.icon] ?? Zap;

  async function handleClick() {
    try {
      await invoke.mutateAsync(button);
      pushToast(`${button.label} ✓`, "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't reach Home Assistant", "danger");
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      disabled={invoke.isPending}
      className={cn(
        "flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3.5 hover:bg-surface-2/50 cursor-pointer text-left min-h-[52px]",
        invoke.isPending && "opacity-60"
      )}
    >
      <span
        className="flex items-center justify-center size-9.5 rounded-[11px] shrink-0"
        style={{ background: "var(--secondary-soft)", color: "var(--secondary)" }}
      >
        <Icon className="size-[19px]" />
      </span>
      <span className="font-bold text-sm truncate">{button.label}</span>
    </button>
  );
}

/** Wall/phone row of Home Assistant quick actions. */
export function HaButtons({ familyId, className }: { familyId: string | undefined; className?: string }) {
  const { data: buttons } = useHaButtons(familyId);
  if (!buttons || buttons.length === 0) return null;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="text-[11px] font-mono uppercase tracking-[0.08em] text-ink-3 px-0.5">Home</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {buttons.map((b) => (
          <HaButtonTile key={b.id} button={b} />
        ))}
      </div>
    </div>
  );
}
