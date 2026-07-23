"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useOverlayPresence } from "@/stores/uiStore";

/** Near full-screen sheet over the hub — stays on `/hub`, tablet + phone friendly. */
export function HubOverlay({
  open,
  onClose,
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const mounted = useHasMounted();
  useOverlayPresence(open);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-stretch justify-center bg-[rgba(30,26,22,0.42)] backdrop-blur-[3px] p-0 sm:p-4 md:p-6 animate-fade-up"
      onClick={(e) => {
        // Use click (not mousedown) so opening from a hub widget tap can't immediately
        // dismiss via a compatibility mouse event landing on the scrim.
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-overlay-title"
    >
      <div
        className="flex flex-col w-full h-full sm:h-auto sm:max-h-[min(920px,calc(100dvh-2rem))] sm:my-auto sm:max-w-2xl sm:rounded-2xl bg-paper shadow-modal overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 sm:px-6 sm:pt-6 border-b border-line shrink-0 bg-surface">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="flex size-11 items-center justify-center rounded-[13px] bg-primary-soft text-primary shrink-0">
                <Icon className="size-[22px]" aria-hidden />
              </span>
            )}
            <div className="min-w-0">
              <div id="hub-overlay-title" className="text-lg font-bold truncate">
                {title}
              </div>
              {subtitle && <div className="text-[12.5px] text-ink-3 mt-0.5">{subtitle}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-11 rounded-[10px] bg-surface-2 flex items-center justify-center text-ink-2 cursor-pointer shrink-0"
          >
            <X className="size-[18px]" aria-hidden />
          </button>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
}
