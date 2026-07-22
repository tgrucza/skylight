import { Info, CheckCircle, AlertTriangle, AlertOctagon, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

const config: Record<AlertTone, { icon: LucideIcon; bg: string; color: string; border: string }> = {
  info: { icon: Info, bg: "bg-info-soft", color: "text-info", border: "border-info" },
  success: { icon: CheckCircle, bg: "bg-success-soft", color: "text-success", border: "border-success" },
  warning: { icon: AlertTriangle, bg: "bg-warning-soft", color: "text-warning", border: "border-warning" },
  danger: { icon: AlertOctagon, bg: "bg-danger-soft", color: "text-danger", border: "border-danger" },
};

export function Alert({
  tone,
  title,
  body,
  onDismiss,
}: {
  tone: AlertTone;
  title: string;
  body?: string;
  onDismiss?: () => void;
}) {
  const { icon: Icon, bg, color, border } = config[tone];
  return (
    <div className={cn("flex items-start gap-3.5 rounded-[14px] border px-4.5 py-4", bg, border)}>
      <Icon className={cn("size-5 shrink-0 mt-px", color)} aria-hidden />
      <div className="flex-1">
        <div className="text-sm font-bold text-ink">{title}</div>
        {body && <div className="text-[13.5px] leading-snug text-ink-2 mt-0.5">{body}</div>}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="text-ink-3 shrink-0 cursor-pointer">
          <X className="size-[17px]" aria-hidden />
        </button>
      )}
    </div>
  );
}
