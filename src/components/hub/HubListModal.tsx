"use client";

import { useEffect, useState } from "react";
import { ShoppingCart, ListChecks } from "lucide-react";
import { HubOverlay } from "@/components/hub/HubOverlay";
import { ListView } from "@/components/lists/ListView";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSupabaseClient } from "@/hooks/useSupabaseClient";
import { useLists } from "@/hooks/useLists";
import { ensureChecklistId, ensureGroceryListId } from "@/lib/groceryList";
import { useQueryClient } from "@tanstack/react-query";
import type { ListKind } from "@/types/database";

/** Full-screen grocery or to-do list over the hub (add / check / edit). */
export function HubListModal({
  open,
  onClose,
  kind,
  familyId,
  memberId,
}: {
  open: boolean;
  onClose: () => void;
  kind: Extract<ListKind, "grocery" | "checklist">;
  familyId: string;
  memberId: string;
}) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  const { data: lists, isLoading } = useLists(familyId);
  const [ensuredId, setEnsuredId] = useState<string | null>(null);

  const existing = lists?.find((l) => l.kind === kind) ?? null;
  const listId = existing?.id ?? ensuredId;

  useEffect(() => {
    if (!open) {
      setEnsuredId(null);
      return;
    }
    if (!supabase || existing?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const id =
          kind === "grocery" ? await ensureGroceryListId(supabase, familyId) : await ensureChecklistId(supabase, familyId);
        if (cancelled) return;
        setEnsuredId(id);
        void queryClient.invalidateQueries({ queryKey: ["lists", familyId] });
      } catch {
        // Skeleton / empty state covers missing list.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, supabase, existing?.id, kind, familyId, queryClient]);

  const list =
    existing ??
    (listId
      ? { id: listId, name: kind === "grocery" ? "Groceries" : "To-Do", kind, sort_order: 0 }
      : null);
  const icon = kind === "grocery" ? ShoppingCart : ListChecks;
  const title = kind === "grocery" ? "Groceries" : "To-Dos";

  return (
    <HubOverlay open={open} onClose={onClose} icon={icon} title={title} subtitle="Check items off · tap a label to edit">
      {isLoading || !list ? (
        <Skeleton rows={6} />
      ) : (
        <ListView list={list} memberId={memberId} />
      )}
    </HubOverlay>
  );
}
