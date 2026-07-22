"use client";

import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/cn";

const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "back"] as const;

export function PinPad({ onSubmit, error, busy }: { onSubmit: (pin: string) => void; error?: string | null; busy?: boolean }) {
  const [pin, setPin] = useState("");

  function press(key: string) {
    if (busy) return;
    if (key === "back") {
      setPin((p) => p.slice(0, -1));
      return;
    }
    if (key === "") return;
    const next = (pin + key).slice(0, 4);
    setPin(next);
    if (next.length === 4) {
      onSubmit(next);
      setPin("");
    }
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className={cn("size-3.5 rounded-full border-2 border-primary", i < pin.length ? "bg-primary" : "bg-transparent")} />
        ))}
      </div>
      {error && <span className="text-danger text-sm font-semibold">{error}</span>}
      <div className="grid grid-cols-3 gap-3">
        {DIGITS.map((key, i) =>
          key === "" ? (
            <div key={i} />
          ) : (
            <button
              key={i}
              type="button"
              onClick={() => press(key)}
              disabled={busy}
              className="size-14 rounded-full bg-surface-2 text-xl font-bold flex items-center justify-center cursor-pointer hover:bg-line disabled:opacity-50"
            >
              {key === "back" ? <Delete className="size-5" /> : key}
            </button>
          )
        )}
      </div>
    </div>
  );
}
