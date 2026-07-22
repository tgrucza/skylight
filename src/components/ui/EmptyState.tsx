import { RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "./Button";

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface px-6 py-7.5 text-center">
      <span className="mx-auto mb-3 flex size-16 items-center justify-center rounded-[20px] bg-secondary-soft text-secondary">
        <Icon className="size-7" aria-hidden />
      </span>
      <div className="font-serif text-xl mb-1.5">{title}</div>
      <p className="text-[13.5px] leading-snug text-ink-2 mb-4">{body}</p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="mx-auto">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", body, onRetry }: { title?: string; body: string; onRetry?: () => void }) {
  return (
    <div className="rounded-xl border border-danger-soft bg-surface px-6 py-7.5 text-center">
      <span className="mx-auto mb-3 flex size-16 items-center justify-center rounded-[20px] bg-danger-soft text-danger">
        <RefreshCw className="size-7" aria-hidden />
      </span>
      <div className="font-serif text-xl mb-1.5">{title}</div>
      <p className="text-[13.5px] leading-snug text-ink-2 mb-4">{body}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry} className="mx-auto gap-2">
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </Button>
      )}
    </div>
  );
}
