"use client";

import { useState } from "react";
import { CheckCircle2, Star, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { cn } from "@/lib/cn";
import { useSaveChore, useDeleteChore, type ChoreDTO } from "@/hooks/useChores";
import { useUIStore } from "@/stores/uiStore";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

interface ChoreEditorProps {
  open: boolean;
  onClose: () => void;
  familyId: string;
  members: FamilyMemberDTO[];
  chore?: ChoreDTO | null;
}

export function ChoreEditor({ open, onClose, familyId, members, chore }: ChoreEditorProps) {
  const [title, setTitle] = useState(chore?.title ?? "");
  const [starValue, setStarValue] = useState(chore?.star_value ?? 1);
  const [scheduleDays, setScheduleDays] = useState<number[]>(chore?.schedule_days ?? []);
  const [assignedMemberIds, setAssignedMemberIds] = useState<string[]>(chore?.assignedMemberIds ?? []);

  const { data: avatarUrls } = useAvatarUrls(members);
  const saveChore = useSaveChore(familyId);
  const deleteChore = useDeleteChore(familyId);
  const pushToast = useUIStore((s) => s.pushToast);
  const busy = saveChore.isPending || deleteChore.isPending;

  function toggleDay(day: number) {
    setScheduleDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));
  }
  function toggleMember(id: string) {
    setAssignedMemberIds((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));
  }

  async function handleSave() {
    if (!title.trim()) return;
    if (assignedMemberIds.length === 0) {
      pushToast("Assign the chore to at least one person", "danger");
      return;
    }
    try {
      await saveChore.mutateAsync({ id: chore?.id, title, starValue, scheduleDays, assignedMemberIds });
      pushToast(chore ? "Chore updated" : "Chore added", "success");
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Something went wrong", "danger");
    }
  }

  async function handleDelete() {
    if (!chore) return;
    try {
      await deleteChore.mutateAsync(chore.id);
      pushToast("Chore removed", "info");
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Failed to remove chore", "danger");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={CheckCircle2}
      title={chore ? "Edit chore" : "New chore"}
      footer={
        <>
          {chore && (
            <Button variant="ghost" onClick={handleDelete} disabled={busy} className="mr-auto !text-danger gap-2">
              <Trash2 className="size-4" />
              Remove
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
        <div>
          <Label htmlFor="chore-title">Title</Label>
          <Input id="chore-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Unload dishwasher" autoFocus />
        </div>

        <div>
          <Label>Stars</Label>
          <div className="flex gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setStarValue(n)}
                className={cn(
                  "flex items-center gap-1 rounded-md px-3 py-2 text-sm font-bold cursor-pointer",
                  starValue === n ? "bg-warning-soft text-warning" : "bg-surface-2 text-ink-2"
                )}
              >
                <Star className="size-4" fill={starValue === n ? "currentColor" : "none"} />
                {n}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Repeat on</Label>
          <div className="flex gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                className={cn(
                  "size-9 rounded-full text-xs font-bold cursor-pointer",
                  scheduleDays.includes(day) ? "bg-primary text-primary-ink" : "bg-surface-2 text-ink-2"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-3 mt-1.5">Leave all unselected for a one-off chore.</p>
        </div>

        <div>
          <Label>Assign to</Label>
          <div className="flex flex-wrap gap-2.5">
            {members.map((m) => (
              <button key={m.id} type="button" onClick={() => toggleMember(m.id)} className="cursor-pointer">
                <Avatar name={m.name} color={m.color_hex} src={avatarUrls?.[m.id]} size={36} ring={assignedMemberIds.includes(m.id) ? "select" : "none"} />
              </button>
            ))}
          </div>
          <p className="text-xs text-ink-3 mt-1.5">Pick at least one person, or the chore won&apos;t show up anywhere.</p>
        </div>
      </div>
    </Modal>
  );
}
