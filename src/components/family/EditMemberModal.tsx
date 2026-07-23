"use client";

import { useRef, useState } from "react";
import { UserCog, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";
import { MEMBER_COLORS } from "@/lib/colors";
import { useUpdateMember, useUploadAvatar, useRemoveAvatar } from "@/hooks/useFamilyMembers";
import { useAvatarUrls } from "@/hooks/useAvatarUrls";
import { useUIStore } from "@/stores/uiStore";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

export function EditMemberModal({
  open,
  onClose,
  familyId,
  member,
  isSelf,
}: {
  open: boolean;
  onClose: () => void;
  familyId: string | undefined;
  member: FamilyMemberDTO | null;
  isSelf: boolean;
}) {
  const pushToast = useUIStore((s) => s.pushToast);
  const updateMember = useUpdateMember();
  const uploadAvatar = useUploadAvatar(familyId);
  const removeAvatar = useRemoveAvatar();
  const { data: avatarUrls } = useAvatarUrls(member ? [member] : undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(member?.name ?? "");
  const [role, setRole] = useState<"adult" | "child">(member?.role ?? "child");
  const [colorHex, setColorHex] = useState(member?.color_hex ?? MEMBER_COLORS[0].hex);
  const [pin, setPin] = useState("");
  const [birthday, setBirthday] = useState(member?.birthday ?? "");
  const [inviteEmail, setInviteEmail] = useState(member?.invite_email ?? "");
  const [busy, setBusy] = useState(false);

  // Re-derive from the member on open (modal unmounts on close, so this only needs to run once per open).
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  if (open && member && openedFor !== member.id) {
    setOpenedFor(member.id);
    setName(member.name);
    setRole(member.role);
    setColorHex(member.color_hex);
    setPin("");
    setBirthday(member.birthday ?? "");
    setInviteEmail(member.invite_email ?? "");
  }

  if (!member) return null;
  const avatarSrc = avatarUrls?.[member.id];

  async function handleSave() {
    if (!member) return;
    if (!name.trim()) {
      pushToast("Name can't be empty", "danger");
      return;
    }
    if (pin && !/^\d{4}$/.test(pin)) {
      pushToast("PIN must be exactly 4 digits", "danger");
      return;
    }
    setBusy(true);
    try {
      await updateMember.mutateAsync({
        memberId: member.id,
        name: name.trim(),
        role,
        colorHex,
        birthday: birthday || null,
        inviteEmail: role === "adult" ? inviteEmail.trim().toLowerCase() || null : null,
        ...(pin ? { pin } : {}),
      });
      pushToast(`${name} updated`, "success");
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't save changes", "danger");
    } finally {
      setBusy(false);
    }
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !member) return;
    try {
      await uploadAvatar.mutateAsync({ memberId: member.id, file });
      pushToast("Photo updated", "success");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't upload photo", "danger");
    }
  }

  async function handleRemovePhoto() {
    if (!member?.avatar_url) return;
    try {
      await removeAvatar.mutateAsync({ memberId: member.id, path: member.avatar_url });
      pushToast("Photo removed", "info");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't remove photo", "danger");
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={UserCog}
      title={isSelf ? "My profile" : `Edit ${member.name}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={busy}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Avatar name={name || "?"} color={colorHex} src={avatarSrc} size={64} />
          <div className="flex flex-col gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} loading={uploadAvatar.isPending}>
              {member.avatar_url ? "Change photo" : "Add photo"}
            </Button>
            {member.avatar_url && (
              <Button variant="ghost" size="sm" onClick={handleRemovePhoto} loading={removeAvatar.isPending} className="gap-1.5 !text-danger">
                <Trash2 className="size-3.5" />
                Remove photo
              </Button>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="edit-member-name">Name</Label>
          <Input id="edit-member-name" value={name} onChange={(e) => setName(e.target.value)} />
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

        <div>
          <Label htmlFor="edit-member-birthday">Birthday (optional)</Label>
          <Input id="edit-member-birthday" type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} />
        </div>

        {role === "child" && (
          <div>
            <Label htmlFor="edit-member-pin">4-digit PIN {member.role === "child" ? "(leave blank to keep current)" : ""}</Label>
            <Input
              id="edit-member-pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              placeholder="1234"
            />
          </div>
        )}

        {role === "adult" && !isSelf && (
          <div className="flex flex-col gap-2">
            <Label htmlFor="edit-member-invite">Invite email (their Google / Gmail)</Label>
            <Input
              id="edit-member-invite"
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="name@gmail.com"
            />
            <p className="text-xs text-ink-3 leading-snug">
              {member.invite_email
                ? "Waiting for them to sign in with this Google account — they'll join this family automatically. No share link is sent."
                : "They join this family when they sign in with that Google account. No share link is sent; matching is by email only."}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
