"use client";

import { useState } from "react";
import { Plus, Users, Trash2, Calendar as CalendarIcon, X } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { LinkCalendarModal } from "@/components/family/LinkCalendarModal";
import { EditMemberModal } from "@/components/family/EditMemberModal";
import { MEMBER_COLORS } from "@/lib/colors";
import { useFamily } from "@/hooks/useFamily";
import { useDeleteMember } from "@/hooks/useFamilyMembers";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { useCalendarIntegrations, useUnlinkCalendar } from "@/hooks/useCalendarIntegrations";
import { useUIStore } from "@/stores/uiStore";
import { useQueryClient } from "@tanstack/react-query";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

export default function FamilyPage() {
  const { data, isLoading } = useFamily();
  const queryClient = useQueryClient();
  const pushToast = useUIStore((s) => s.pushToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"adult" | "child">("child");
  const [colorHex, setColorHex] = useState<string>(MEMBER_COLORS[0].hex);
  const [pin, setPin] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const [removeTarget, setRemoveTarget] = useState<FamilyMemberDTO | null>(null);
  const [linkCalendarOpen, setLinkCalendarOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<FamilyMemberDTO | null>(null);

  const isAdult = data?.members.find((m) => m.id === data.currentMemberId)?.role === "adult";
  const deleteMember = useDeleteMember(data?.family?.id);
  const { data: integrations } = useCalendarIntegrations(data?.family?.id);
  const unlinkCalendar = useUnlinkCalendar(data?.family?.id);
  const { data: avatarUrls } = useAvatarUrls(data?.members);

  async function handleAdd() {
    if (!name.trim() || !data?.family) return;
    if (role === "child" && pin && !/^\d{4}$/.test(pin)) {
      pushToast("PIN must be exactly 4 digits", "danger");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/onboarding/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId: data.family.id,
          members: [
            {
              name: name.trim(),
              role,
              colorHex,
              pin: role === "child" && pin ? pin : undefined,
              inviteEmail: role === "adult" && inviteEmail.trim() ? inviteEmail.trim().toLowerCase() : undefined,
            },
          ],
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't add member");
      pushToast(`${name} added to the family`, "success");
      void queryClient.invalidateQueries({ queryKey: ["family"] });
      setModalOpen(false);
      setName("");
      setPin("");
      setInviteEmail("");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't add member", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!removeTarget) return;
    try {
      await deleteMember.mutateAsync(removeTarget.id);
      pushToast(`${removeTarget.name} removed from the family`, "info");
      setRemoveTarget(null);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't remove member", "danger");
    }
  }

  if (isLoading) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <h1 className="font-serif text-3xl">{data?.family?.name ?? "Family"}</h1>
        {isAdult && (
          <Button onClick={() => setModalOpen(true)} className="ml-auto gap-2">
            <Plus className="size-[18px]" strokeWidth={2.5} />
            Add member
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
        {(data?.members ?? []).map((m) => {
          const isSelf = m.id === data?.currentMemberId;
          const memberIntegrations = (integrations ?? []).filter((i) => i.member_id === m.id);

          return (
            <Card
              key={m.id}
              className={`flex flex-col items-center text-center gap-2.5 relative ${isAdult ? "cursor-pointer" : ""}`}
              onClick={isAdult ? () => setEditTarget(m) : undefined}
            >
              {isAdult && !isSelf && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setRemoveTarget(m);
                  }}
                  aria-label={`Remove ${m.name}`}
                  className="absolute top-3 right-3 text-ink-3 hover:text-danger cursor-pointer"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              <Avatar name={m.name} color={m.color_hex} src={avatarUrls?.[m.id]} size={56} />
              <div className="font-bold text-sm">{m.name}</div>
              <Badge tone={m.role === "adult" ? "info" : "neutral"}>{m.role === "adult" ? "Adult" : "Child"}</Badge>

              {m.role === "adult" && (
                <div
                  className="w-full pt-2 border-t border-line mt-1 flex flex-col gap-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  {memberIntegrations.length === 0 ? (
                    <span className="text-xs text-ink-3">No calendar linked</span>
                  ) : (
                    memberIntegrations.map((integ) => (
                      <div key={integ.id} className="flex items-center gap-1.5 text-xs text-ink-2 justify-center">
                        <CalendarIcon className="size-3" />
                        <span className="truncate max-w-[110px]">{integ.google_calendar_id}</span>
                        {isSelf && (
                          <button
                            type="button"
                            onClick={() => unlinkCalendar.mutate(integ.id)}
                            aria-label="Unlink calendar"
                            className="text-ink-3 hover:text-danger cursor-pointer shrink-0"
                          >
                            <X className="size-3" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                  {isSelf && (
                    <Button variant="ghost" size="sm" onClick={() => setLinkCalendarOpen(true)} className="gap-1.5 !text-xs !h-8 mt-1">
                      <CalendarIcon className="size-3.5" />
                      {memberIntegrations.length > 0 ? "Link another" : "Link Google Calendar"}
                    </Button>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        icon={Users}
        title="Add a family member"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleAdd} loading={busy}>
              Add
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="member-name">Name</Label>
            <Input id="member-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Leo" autoFocus />
          </div>
          <div>
            <Label>Role</Label>
            <div className="flex gap-2">
              {(["adult", "child"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 rounded-md px-3 py-2.5 text-sm font-semibold cursor-pointer ${role === r ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2"}`}
                >
                  {r === "adult" ? "Adult" : "Child"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  aria-label={c.name}
                  onClick={() => setColorHex(c.hex)}
                  className="size-8 rounded-full cursor-pointer"
                  style={{ background: c.hex, boxShadow: colorHex === c.hex ? `0 0 0 2px var(--surface), 0 0 0 3.5px ${c.hex}` : undefined }}
                />
              ))}
            </div>
          </div>
          {role === "child" && (
            <div>
              <Label htmlFor="member-pin">4-digit PIN (optional — can be set later)</Label>
              <Input
                id="member-pin"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                inputMode="numeric"
                placeholder="1234"
              />
            </div>
          )}
          {role === "adult" && (
            <div>
              <Label htmlFor="member-invite">Their Google email (optional — links them in when they sign in)</Label>
              <Input
                id="member-invite"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@gmail.com"
              />
            </div>
          )}
        </div>
      </Modal>

      <EditMemberModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        familyId={data?.family?.id}
        member={editTarget}
        isSelf={editTarget?.id === data?.currentMemberId}
      />

      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        icon={Trash2}
        title={`Remove ${removeTarget?.name ?? "this member"}?`}
        subtitle="Their chore history, list additions, and photos stay — just no longer attributed to them."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRemoveTarget(null)} disabled={deleteMember.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} loading={deleteMember.isPending}>
              Remove
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-2">
          {removeTarget?.name} will lose access to Hearth and their linked calendar (if any) will be unlinked.
        </p>
      </Modal>

      {data?.family && (
        <LinkCalendarModal
          open={linkCalendarOpen}
          onClose={() => setLinkCalendarOpen(false)}
          familyId={data.family.id}
          memberId={data.currentMemberId}
        />
      )}
    </div>
  );
}
