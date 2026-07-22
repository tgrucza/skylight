"use client";

import { useState } from "react";
import { Calendar as CalendarIcon, MapPin, Trash2 } from "lucide-react";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { TitleInput, Input, Label } from "@/components/ui/Input";
import { Toggle } from "@/components/ui/Toggle";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { RecurrencePicker } from "./RecurrencePicker";
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { useUIStore } from "@/stores/uiStore";
import type { FamilyMemberDTO } from "@/hooks/useFamily";
import type { EventInstanceDTO } from "@/types/events";

interface EventEditorProps {
  open: boolean;
  onClose: () => void;
  members: FamilyMemberDTO[];
  timezone: string;
  /** A default start time (new event) or the event being edited. */
  initialDate?: Date;
  event?: EventInstanceDTO | null;
}

function splitZoned(date: Date, timezone: string) {
  const zoned = toZonedTime(date, timezone);
  return { dateStr: format(zoned, "yyyy-MM-dd"), timeStr: format(zoned, "HH:mm") };
}

function combineToUtc(dateStr: string, timeStr: string, timezone: string): string {
  const zoned = new Date(`${dateStr}T${timeStr}:00`);
  return fromZonedTime(zoned, timezone).toISOString();
}

interface FormState {
  title: string;
  memberId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  rrule: string | null;
}

/**
 * Computed once as this component's lazy initial state (see the `key` the
 * parent passes on open — CalendarPage remounts EventEditor with a fresh key
 * per open, so this never needs to re-derive from props via an effect).
 */
function initialFormState(members: FamilyMemberDTO[], timezone: string, initialDate?: Date, event?: EventInstanceDTO | null): FormState {
  if (event) {
    const start = splitZoned(new Date(event.startsAt), timezone);
    const end = splitZoned(new Date(event.endsAt), timezone);
    return {
      title: event.title,
      memberId: event.memberId,
      date: start.dateStr,
      startTime: start.timeStr,
      endTime: end.timeStr,
      allDay: event.allDay,
      location: event.location ?? "",
      rrule: null,
    };
  }
  const start = splitZoned(initialDate ?? new Date(), timezone);
  return {
    title: "",
    memberId: members[0]?.id ?? null,
    date: start.dateStr,
    startTime: "09:00",
    endTime: "10:00",
    allDay: false,
    location: "",
    rrule: null,
  };
}

export function EventEditor({ open, onClose, members, timezone, initialDate, event }: EventEditorProps) {
  const isEditing = !!event;
  const [form, setForm] = useState<FormState>(() => initialFormState(members, timezone, initialDate, event));
  const { title, memberId, date, startTime, endTime, allDay, location, rrule } = form;
  const setTitle = (v: string) => setForm((f) => ({ ...f, title: v }));
  const setMemberId = (v: string | null) => setForm((f) => ({ ...f, memberId: v }));
  const setDate = (v: string) => setForm((f) => ({ ...f, date: v }));
  const setStartTime = (v: string) => setForm((f) => ({ ...f, startTime: v }));
  const setEndTime = (v: string) => setForm((f) => ({ ...f, endTime: v }));
  const setAllDay = (v: boolean) => setForm((f) => ({ ...f, allDay: v }));
  const setLocation = (v: string) => setForm((f) => ({ ...f, location: v }));
  const setRrule = (v: string | null) => setForm((f) => ({ ...f, rrule: v }));

  const { data: avatarUrls } = useAvatarUrls(members);
  const pushToast = useUIStore((s) => s.pushToast);
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();
  const busy = createEvent.isPending || updateEvent.isPending || deleteEvent.isPending;

  async function handleSave() {
    if (!title.trim()) return;
    const startsAt = combineToUtc(date, allDay ? "00:00" : startTime, timezone);
    const endsAt = combineToUtc(date, allDay ? "23:59" : endTime, timezone);

    try {
      if (isEditing && event) {
        await updateEvent.mutateAsync({
          id: event.id,
          title,
          location: location || null,
          startsAt,
          endsAt,
          allDay,
          scope: "all",
        });
        pushToast("Event updated", "success");
      } else {
        await createEvent.mutateAsync({ title, memberId, location, startsAt, endsAt, allDay, rrule: rrule ?? undefined });
        pushToast("Added to the calendar", "success");
      }
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Something went wrong", "danger");
    }
  }

  async function handleDelete() {
    if (!event) return;
    try {
      await deleteEvent.mutateAsync({ id: event.id, scope: "all" });
      pushToast("Event deleted", "info");
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to delete", "danger");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={CalendarIcon}
      title={isEditing ? "Edit event" : "New event"}
      subtitle={isEditing ? undefined : "Add to the family calendar"}
      footer={
        <>
          {isEditing && (
            <Button variant="ghost" onClick={handleDelete} disabled={busy} className="mr-auto !text-danger gap-2">
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <TitleInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Soccer practice" autoFocus />

        <div>
          <Label>Who</Label>
          <div className="flex flex-wrap gap-2.5">
            {members.map((m) => (
              <button key={m.id} type="button" onClick={() => setMemberId(m.id)} className="cursor-pointer">
                <Avatar name={m.name} color={m.color_hex} src={avatarUrls?.[m.id]} size={34} ring={memberId === m.id ? "select" : "none"} />
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="ev-date">Date</Label>
            <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div className="flex items-end pb-3.5">
            <Toggle checked={allDay} onChange={setAllDay} label="All day" />
          </div>
        </div>

        {!allDay && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="ev-start">Starts</Label>
              <Input id="ev-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="ev-end">Ends</Label>
              <Input id="ev-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="ev-location">Location</Label>
          <Input id="ev-location" icon={MapPin} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Add location" />
        </div>

        {!isEditing && <RecurrencePicker value={rrule} onChange={setRrule} />}
      </div>
    </Modal>
  );
}
