"use client";

import { useEffect, useState } from "react";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Toggle";
import { useUIStore } from "@/stores/uiStore";
import { useQueryClient } from "@tanstack/react-query";

interface GoogleCalendar {
  id: string;
  summary: string;
  primary: boolean;
}

interface LinkCalendarModalProps {
  open: boolean;
  onClose: () => void;
  familyId: string;
  memberId: string;
}

/** Link (or re-link) the signed-in member's Google calendars — reachable anytime from /family, not just onboarding. */
export function LinkCalendarModal({ open, onClose, familyId, memberId }: LinkCalendarModalProps) {
  const [calendars, setCalendars] = useState<GoogleCalendar[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const loading = open && calendars === null;
  const pushToast = useUIStore((s) => s.pushToast);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!open || calendars !== null) return;
    fetch("/api/google/calendars")
      .then((res) => res.json())
      .then((data: { calendars?: GoogleCalendar[]; error?: string }) => {
        if (data.calendars) {
          setCalendars(data.calendars);
          setSelected(new Set(data.calendars.filter((c) => c.primary).map((c) => c.id)));
        } else {
          setError(data.error ?? "Couldn't load your Google calendars");
          setCalendars([]);
        }
      })
      .catch(() => {
        setError("Couldn't load your Google calendars");
        setCalendars([]);
      });
  }, [open, calendars]);

  async function handleSave() {
    if (selected.size === 0) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/google/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, familyId, calendarIds: Array.from(selected) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't link calendars");
      pushToast("Calendar linked — events will sync shortly", "success");
      void queryClient.invalidateQueries({ queryKey: ["calendar-integrations", familyId] });
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't link calendars", "danger");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={CalendarIcon}
      title="Link your Google Calendars"
      subtitle="Pick the calendars that should sync into Orbit"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={saving} disabled={loading}>
            Link
          </Button>
        </>
      }
    >
      {loading && (
        <div className="flex items-center gap-2 text-ink-2 text-sm py-6 justify-center">
          <Loader2 className="size-4 animate-spin-slow" />
          Loading your calendars…
        </div>
      )}

      {!loading && error && <p className="text-sm text-danger mb-2">{error}</p>}

      {!loading && calendars && calendars.length === 0 && !error && (
        <p className="text-sm text-ink-2">No calendars found for this Google account.</p>
      )}

      {!loading && calendars && calendars.length > 0 && (
        <div className="flex flex-col gap-2">
          {calendars.map((cal) => (
            <label key={cal.id} className="flex items-center gap-3 rounded-md border border-line px-3.5 py-3 cursor-pointer">
              <Checkbox
                checked={selected.has(cal.id)}
                onChange={(next) =>
                  setSelected((prev) => {
                    const nextSet = new Set(prev);
                    if (next) nextSet.add(cal.id);
                    else nextSet.delete(cal.id);
                    return nextSet;
                  })
                }
              />
              <span className="text-sm font-medium">{cal.summary}</span>
              {cal.primary && <span className="ml-auto text-xs text-ink-3 font-mono">PRIMARY</span>}
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
