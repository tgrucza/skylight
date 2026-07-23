"use client";

import { useState } from "react";
import { Gift, Plus, Star, Check, Pencil, Trash2, X } from "lucide-react";
import { Card, AddCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import {
  useRewards,
  useCreateReward,
  useUpdateReward,
  useDeleteReward,
  useRedeemReward,
  useApproveRedemption,
  useCancelRedemption,
  useRedemptions,
  type RewardDTO,
} from "@/hooks/useRewards";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/cn";
import type { ChoreCompletionDTO } from "@/hooks/useChores";

export function RewardShelf({
  familyId,
  activeMemberId,
  isAdult,
  showKidStars = !isAdult,
  allTimeCompletions,
}: {
  familyId: string;
  activeMemberId: string;
  isAdult: boolean;
  /** Kid-facing star balance / earn UX — hide when wall profile is an adult. */
  showKidStars?: boolean;
  allTimeCompletions: ChoreCompletionDTO[];
}) {
  const { data: rewards } = useRewards(familyId);
  const { data: redemptions } = useRedemptions(familyId);
  const createReward = useCreateReward(familyId);
  const updateReward = useUpdateReward(familyId);
  const deleteReward = useDeleteReward(familyId);
  const redeemReward = useRedeemReward(familyId);
  const approveRedemption = useApproveRedemption(familyId);
  const cancelRedemption = useCancelRedemption(familyId);
  const pushToast = useUIStore((s) => s.pushToast);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<RewardDTO | null>(null);
  const [title, setTitle] = useState("");
  const [starCost, setStarCost] = useState(5);

  const earned = allTimeCompletions.filter((c) => c.member_id === activeMemberId).reduce((sum, c) => sum + c.stars, 0);
  const spent = (redemptions ?? [])
    .filter((r) => r.member_id === activeMemberId && r.approved_by)
    .reduce((sum, r) => sum + (rewards?.find((rw) => rw.id === r.reward_id)?.star_cost ?? 0), 0);
  const balance = earned - spent;
  const busy = createReward.isPending || updateReward.isPending || deleteReward.isPending;

  function openCreate() {
    setEditing(null);
    setTitle("");
    setStarCost(5);
    setEditorOpen(true);
  }

  function openEdit(reward: RewardDTO) {
    setEditing(reward);
    setTitle(reward.title);
    setStarCost(reward.star_cost);
    setEditorOpen(true);
  }

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setTitle("");
    setStarCost(5);
  }

  async function handleSave() {
    if (!title.trim()) return;
    const cost = Math.max(1, Math.round(Number(starCost) || 1));
    try {
      if (editing) {
        await updateReward.mutateAsync({ id: editing.id, title, starCost: cost });
        pushToast("Reward updated", "success");
      } else {
        await createReward.mutateAsync({ title, starCost: cost });
        pushToast("Reward added", "success");
      }
      closeEditor();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Something went wrong", "danger");
    }
  }

  async function handleDelete() {
    if (!editing) return;
    try {
      await deleteReward.mutateAsync(editing.id);
      pushToast("Reward removed", "info");
      closeEditor();
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't remove reward", "danger");
    }
  }

  async function handleRedeem(rewardId: string) {
    try {
      await redeemReward.mutateAsync({ rewardId, memberId: activeMemberId });
      pushToast("Redemption requested — ask an adult to approve", "info");
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Couldn't redeem", "danger");
    }
  }

  const pendingApprovals = (redemptions ?? []).filter((r) => !r.approved_by);

  return (
    <div className="flex flex-col gap-4">
      {showKidStars && (
        <div className="flex items-center gap-2 text-warning font-bold">
          <Star className="size-5 fill-warning" />
          {balance} stars available
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(rewards ?? []).map((reward) => (
          <Card key={reward.id} className="relative">
            {isAdult && (
              <button
                type="button"
                onClick={() => openEdit(reward)}
                aria-label={`Edit ${reward.title}`}
                className="absolute top-2.5 right-2.5 size-8 rounded-md border border-line bg-paper flex items-center justify-center text-ink-2 hover:text-ink cursor-pointer"
              >
                <Pencil className="size-3.5" />
              </button>
            )}
            {(showKidStars || isAdult) && (
              <div className={cn("flex items-center gap-2 mb-2 font-bold text-sm pr-8", showKidStars ? "text-warning" : "text-ink-3")}>
                {showKidStars ? <Star className="size-4 fill-warning" /> : null}
                {showKidStars ? reward.star_cost : `${reward.star_cost} stars`}
              </div>
            )}
            <div className="font-bold text-sm mb-3">{reward.title}</div>
            {showKidStars ? (
              <Button size="sm" variant="outline" disabled={balance < reward.star_cost} onClick={() => handleRedeem(reward.id)} className="w-full">
                Redeem
              </Button>
            ) : isAdult ? (
              <p className="text-[12px] text-ink-3">Kids redeem with stars they earn</p>
            ) : null}
          </Card>
        ))}
        {isAdult && <AddCard label="Add reward" onClick={openCreate} />}
      </div>

      {pendingApprovals.length > 0 && (
        <div className="rounded-xl border border-warning-soft bg-warning-soft/40 p-4">
          <div className="font-bold text-sm mb-2.5">Pending approvals</div>
          <div className="flex flex-col gap-2">
            {pendingApprovals.map((r) => {
              const reward = rewards?.find((rw) => rw.id === r.reward_id);
              const canCancel = isAdult || r.member_id === activeMemberId;
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{reward?.title ?? "Reward"}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {canCancel && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          cancelRedemption.mutate(r.id, {
                            onSuccess: () => pushToast("Redemption cancelled", "info"),
                            onError: (err) => pushToast(err instanceof Error ? err.message : "Couldn't cancel", "danger"),
                          })
                        }
                        className="gap-1.5 !text-danger"
                      >
                        <X className="size-3.5" />
                        Cancel
                      </Button>
                    )}
                    {isAdult && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => approveRedemption.mutate({ redemptionId: r.id, approverId: activeMemberId })}
                        className="gap-1.5"
                      >
                        <Check className="size-3.5" />
                        Approve
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={editorOpen}
        onClose={closeEditor}
        icon={Gift}
        title={editing ? "Edit reward" : "New reward"}
        footer={
          <>
            {editing && (
              <Button variant="ghost" onClick={handleDelete} disabled={busy} className="mr-auto !text-danger gap-2">
                <Trash2 className="size-4" />
                Remove
              </Button>
            )}
            <Button variant="ghost" onClick={closeEditor} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={busy} className="gap-2">
              {!editing && <Plus className="size-4" />}
              {editing ? "Save" : "Add"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="reward-title">Reward</Label>
            <Input id="reward-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Extra screen time" autoFocus />
          </div>
          <div>
            <Label htmlFor="reward-cost">Star cost</Label>
            <Input
              id="reward-cost"
              type="number"
              min={1}
              step={1}
              value={starCost}
              onChange={(e) => setStarCost(Number(e.target.value))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
