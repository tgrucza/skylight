"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Avatar } from "@/components/ui/Avatar";
import { PinPad } from "./PinPad";
import { useWallProfileStore } from "@/stores/wallProfileStore";
import { cn } from "@/lib/cn";
import { Users } from "lucide-react";
import type { FamilyMemberDTO } from "@/hooks/useFamily";

/** Row of member avatars — tap to become the "active" profile on this device. Kids need their PIN; adults switch instantly since they're already authenticated. */
export function ProfileSwitcher({ members, currentUserMemberId }: { members: FamilyMemberDTO[]; currentUserMemberId: string }) {
  const activeMemberId = useWallProfileStore((s) => s.activeMemberId) ?? currentUserMemberId;
  const setActiveMember = useWallProfileStore((s) => s.setActiveMember);
  const [pinTarget, setPinTarget] = useState<FamilyMemberDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function select(member: FamilyMemberDTO) {
    if (member.role === "adult") {
      setActiveMember(member.id);
      return;
    }
    setError(null);
    setPinTarget(member);
  }

  async function submitPin(pin: string) {
    if (!pinTarget) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/family/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: pinTarget.id, pin }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Incorrect PIN");
        return;
      }
      setActiveMember(pinTarget.id);
      setPinTarget(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap gap-2.5">
        {members.map((m) => (
          <button key={m.id} type="button" onClick={() => select(m)} className="cursor-pointer flex flex-col items-center gap-1.5">
            <Avatar name={m.name} color={m.color_hex} size={48} ring={activeMemberId === m.id ? "select" : "none"} />
            <span className={cn("text-xs font-semibold", activeMemberId === m.id ? "text-ink" : "text-ink-3")}>{m.name}</span>
          </button>
        ))}
      </div>

      <Modal open={!!pinTarget} onClose={() => setPinTarget(null)} icon={Users} title={`Hi ${pinTarget?.name ?? ""}!`} subtitle="Enter your PIN">
        <div className="py-2">
          <PinPad onSubmit={submitPin} error={error} busy={busy} />
        </div>
      </Modal>
    </>
  );
}
