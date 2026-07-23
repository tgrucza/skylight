"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { useUIStore } from "@/stores/uiStore";
import { ensureChecklistId, ensureGroceryListId } from "@/lib/groceryList";
import { categorize } from "@/lib/groceryCategories";

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

/** Quick-add a single item to Groceries or the To-Do checklist — Hub "Add grocery" / "Add note". */
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
      const listId =
        listKind === "grocery"
          ? await ensureGroceryListId(supabase, familyId)
          : await ensureChecklistId(supabase, familyId, listName);
      const trimmed = label.trim();
      const { error } = await supabase.from("list_items").insert({
        list_id: listId,
        label: trimmed,
        added_by: memberId,
        category: listKind === "grocery" ? categorize(trimmed) : null,
      });
      if (error) throw new Error(error.message);

      pushToast(`Added to ${listName}`, "success");
      void queryClient.invalidateQueries({ queryKey: ["lists", familyId] });
      void queryClient.invalidateQueries({ queryKey: ["list-items", listId] });
      void queryClient.invalidateQueries({ queryKey: ["hub-groceries"] });
      void queryClient.invalidateQueries({ queryKey: ["hub-todos"] });
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
