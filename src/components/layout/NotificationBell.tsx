"use client";

import { useState } from "react";
import { Bell, Calendar, CheckCircle2, ListChecks, Info } from "lucide-react";
import { CountBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/cn";
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from "@/hooks/useNotifications";

const KIND_ICON = { chore_due: CheckCircle2, event_reminder: Calendar, list_note: ListChecks, system: Info } as const;

export function NotificationBell({ familyId }: { familyId: string | undefined }) {
  const [open, setOpen] = useState(false);
  const { data: notifications } = useNotifications(familyId);
  const markRead = useMarkNotificationRead(familyId);
  const markAllRead = useMarkAllNotificationsRead(familyId);

  const unread = (notifications ?? []).filter((n) => !n.read_at);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread.length > 0 ? ` (${unread.length} unread)` : ""}`}
        className="relative flex items-center justify-center size-11 rounded-md bg-surface-2 cursor-pointer"
      >
        <Bell className="size-5 text-ink-2" />
        <CountBadge count={unread.length} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-[calc(100%+8px)] right-0 z-20 w-[320px] max-h-[420px] overflow-y-auto rounded-2xl border border-line bg-surface shadow-dropdown animate-fade-up">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line sticky top-0 bg-surface">
              <span className="font-bold text-sm">Notifications</span>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate(unread.map((n) => n.id))}
                  className="text-xs font-semibold text-primary cursor-pointer"
                >
                  Mark all read
                </button>
              )}
            </div>
            {!notifications || notifications.length === 0 ? (
              <p className="text-sm text-ink-2 text-center py-8">You&apos;re all caught up.</p>
            ) : (
              notifications.map((n) => {
                const Icon = KIND_ICON[n.kind] ?? Info;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => !n.read_at && markRead.mutate(n.id)}
                    className={cn("w-full flex items-start gap-3 px-4 py-3 text-left cursor-pointer hover:bg-surface-2", !n.read_at && "bg-primary-soft/30")}
                  >
                    <Icon className="size-4 text-ink-3 mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold truncate">{n.title}</div>
                      {n.body && <div className="text-xs text-ink-2 line-clamp-2">{n.body}</div>}
                    </div>
                    {!n.read_at && <span className="size-2 rounded-full bg-primary shrink-0 mt-1.5 ml-auto" />}
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
