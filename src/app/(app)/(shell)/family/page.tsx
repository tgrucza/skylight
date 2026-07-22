"use client";

import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/Skeleton";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { MEMBER_COLORS } from "@/lib/colors";
import { useFamily } from "@/hooks/useFamily";
import { useUIStore } from "@/stores/uiStore";
import { useQueryClient } from "@tanstack/react-query";

export default function FamilyPage() {
  const { data, isLoading } = useFamily();
  const queryClient = useQueryClient();
  const pushToast = useUIStore((s) => s.pushToast);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<"adult" | "child">("child");
  const [colorHex, setColorHex] = useState<string>(MEMBER_COLORS[0].hex);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);

  const isAdult = data?.members.find((m) => m.id === data.currentMemberId)?.role === "adult";

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
          members: [{ name: name.trim(), role, colorHex, pin: role === "child" && pin ? pin : undefined }],
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't add member");
      pushToast(`${name} added to the family`, "success");
      void queryClient.invalidateQueries({ queryKey: ["family"] });
      setModalOpen(false);
      setName("");
      setPin("");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't add member", "danger");
    } finally {
      setBusy(false);
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
        {(data?.members ?? []).map((m) => (
          <Card key={m.id} className="flex flex-col items-center text-center gap-2.5">
            <Avatar name={m.name} color={m.color_hex} size={56} />
            <div className="font-bold text-sm">{m.name}</div>
            <Badge tone={m.role === "adult" ? "info" : "neutral"}>{m.role === "adult" ? "Adult" : "Child"}</Badge>
          </Card>
        ))}
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
        </div>
      </Modal>
    </div>
  );
}
