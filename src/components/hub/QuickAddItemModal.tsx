"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/uiStore";

interface QuickAddItemModalProps {
  open: boolean;
  onClose: () => void;
  icon: LucideIcon;
  title: string;
  placeholder: string;
  listKind: "grocery" | "checklist";
  listName: string;
  familyId: string;
  memberId: string;
}

/** Quick-add a single item to the family's Groceries or To-Do list — used by the Hub's "Add grocery" / "Add note" quick actions. Full list management lands in M5. */
export function QuickAddItemModal({ open, onClose, icon, title, placeholder, listKind, listName, familyId, memberId }: QuickAddItemModalProps) {
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const pushToast = useUIStore((s) => s.pushToast);

  async function handleSave() {
    if (!label.trim() || !supabase) return;
    setBusy(true);
    try {
      let { data: list } = await supabase.from("lists").select("id").eq("family_id", familyId).eq("kind", listKind).limit(1).maybeSingle();
      if (!list) {
        const { data: created, error } = await supabase.from("lists").insert({ family_id: familyId, name: listName, kind: listKind }).select("id").single();
        if (error || !created) throw new Error(error?.message ?? "Couldn't create list");
        list = created;
      }
      const { error } = await supabase.from("list_items").insert({ list_id: list.id, label: label.trim(), added_by: memberId });
      if (error) throw new Error(error.message);

      pushToast(`Added to ${listName}`, "success");
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      setLabel("");
      onClose();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Something went wrong", "danger");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={icon}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleSave} loading={busy}>
            Add
          </Button>
        </>
      }
    >
      <Label htmlFor="quick-add-label">{title}</Label>
      <Input
        id="quick-add-label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={placeholder}
        autoFocus
        onKeyDown={(e) => e.key === "Enter" && handleSave()}
      />
    </Modal>
  );
}
