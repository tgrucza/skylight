"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, type LucideIcon } from "lucide-react";
import { useHasMounted } from "@/hooks/useHasMounted";
import { useOverlayPresence } from "@/stores/uiStore";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, icon: Icon, title, subtitle, children, footer }: ModalProps) {
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
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[rgba(30,26,22,0.42)] backdrop-blur-[3px] animate-fade-up"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="w-full max-w-[440px] overflow-hidden rounded-2xl bg-surface shadow-modal">
        <div className="flex justify-between px-6.5 pt-6.5">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="flex size-11 items-center justify-center rounded-[13px] bg-primary-soft text-primary shrink-0">
                <Icon className="size-[22px]" aria-hidden />
              </span>
            )}
            <div>
              <div id="modal-title" className="text-lg font-bold">
                {title}
              </div>
              {subtitle && <div className="text-[12.5px] text-ink-3 mt-0.5">{subtitle}</div>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="size-9 rounded-[10px] bg-surface-2 flex items-center justify-center text-ink-2 cursor-pointer shrink-0 h-fit"
          >
            <X className="size-[18px]" aria-hidden />
          </button>
        </div>
        <div className="px-6.5 py-5.5">{children}</div>
        {footer && <div className="flex justify-end gap-3 bg-paper px-6.5 py-4.5">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
