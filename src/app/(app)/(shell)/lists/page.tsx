"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { ListView } from "@/components/lists/ListView";
import { useFamily } from "@/hooks/useFamily";
import { useLists, useCreateList } from "@/hooks/useLists";
import { cn } from "@/lib/cn";
import { ListPlus } from "lucide-react";
import type { ListKind } from "@/types/database";

export default function ListsPage() {
  const { data: familyData, isLoading: familyLoading } = useFamily();
  const family = familyData?.family;
  const memberId = familyData?.currentMemberId ?? "";

  const { data: lists, isLoading } = useLists(family?.id);
  const createList = useCreateList(family?.id);
  const [activeListId, setActiveListId] = useState<string | null>(null);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [newListKind, setNewListKind] = useState<ListKind>("checklist");

  const activeList = lists?.find((l) => l.id === activeListId) ?? lists?.[0];

  async function handleCreateList() {
    if (!newListName.trim()) return;
    await createList.mutateAsync({ name: newListName, kind: newListKind });
    setNewListName("");
    setNewListOpen(false);
  }

  if (familyLoading || isLoading) return <Skeleton rows={4} />;

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto w-full md:max-w-none md:mx-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="font-serif text-[1.75rem] md:text-3xl mr-2 tracking-tight">Lists</h1>
        <div className="flex gap-1 bg-surface-2 rounded-md p-1 overflow-x-auto max-w-full">
          {(lists ?? []).map((list) => (
            <button
              key={list.id}
              onClick={() => setActiveListId(list.id)}
              className={cn(
                "px-3.5 py-2.5 rounded-sm text-[13.5px] font-semibold cursor-pointer min-h-11 whitespace-nowrap",
                (activeList?.id ?? "") === list.id ? "bg-surface text-ink shadow-[0_1px_3px_rgba(43,39,35,0.12)]" : "text-ink-3"
              )}
            >
              {list.name}
            </button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => setNewListOpen(true)} className="gap-1.5 min-h-11">
          <Plus className="size-4" />
          New list
        </Button>
      </div>

      {activeList ? (
        <ListView list={activeList} memberId={memberId} />
      ) : (
        <p className="text-sm text-ink-2">No lists yet — create one to get started.</p>
      )}

      <Modal
        open={newListOpen}
        onClose={() => setNewListOpen(false)}
        icon={ListPlus}
        title="New list"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewListOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateList} loading={createList.isPending}>
              Create
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="list-name">Name</Label>
            <Input id="list-name" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Camping trip" autoFocus />
          </div>
          <div>
            <Label>Type</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setNewListKind("checklist")}
                className={cn("flex-1 rounded-md px-3 py-2.5 text-sm font-semibold cursor-pointer", newListKind === "checklist" ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2")}
              >
                Checklist
              </button>
              <button
                type="button"
                onClick={() => setNewListKind("grocery")}
                className={cn("flex-1 rounded-md px-3 py-2.5 text-sm font-semibold cursor-pointer", newListKind === "grocery" ? "bg-primary-soft text-primary" : "bg-surface-2 text-ink-2")}
              >
                Grocery
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
