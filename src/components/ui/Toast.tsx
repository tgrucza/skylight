"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Check, Info, X, AlertCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useUIStore, type Toast as ToastType, type ToastTone } from "@/stores/uiStore";

const toneIcon: Record<ToastTone, LucideIcon> = {
  success: Check,
  info: Info,
  danger: AlertCircle,
};

const toneColor: Record<ToastTone, string> = {
  success: "var(--success)",
  info: "var(--info)",
  danger: "var(--danger)",
};

function ToastItem({ toast }: { toast: ToastType }) {
  const dismiss = useUIStore((s) => s.dismissToast);
  const Icon = toneIcon[toast.tone];

  useEffect(() => {
    const t = setTimeout(() => dismiss(toast.id), 3600);
    return () => clearTimeout(t);
  }, [toast.id, dismiss]);

  return (
    <div className="flex min-w-[260px] items-center gap-3 rounded-[14px] bg-ink px-4.5 py-3.5 text-[#F3ECE0] shadow-toast animate-toast-in">
      <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full" style={{ background: toneColor[toast.tone] }}>
        <Icon className="size-[15px] text-white" strokeWidth={3} aria-hidden />
      </span>
      <span className="flex-1 text-sm font-semibold">{toast.message}</span>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className={cn("text-[rgba(243,236,224,0.5)] cursor-pointer")}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/** Mount once near the app root. Renders the live toast stack via a portal. */
export function ToastStack() {
  const toasts = useUIStore((s) => s.toasts);
  const mounted = useHasMounted();
  if (!mounted) return null;

  return createPortal(
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-[120] flex -translate-x-1/2 flex-col items-center gap-2.5"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>,
    document.body
  );
}
