"use client";

import { useState } from "react";
import { Gift, Plus, Star, Check } from "lucide-react";
import { Card, AddCard } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Input, Label } from "@/components/ui/Input";
import { useRewards, useCreateReward, useRedeemReward, useApproveRedemption, useRedemptions } from "@/hooks/useRewards";
import { useUIStore } from "@/stores/uiStore";
import type { ChoreCompletionDTO } from "@/hooks/useChores";

export function RewardShelf({
  familyId,
  activeMemberId,
  isAdult,
  allTimeCompletions,
}: {
  familyId: string;
  activeMemberId: string;
  isAdult: boolean;
  allTimeCompletions: ChoreCompletionDTO[];
}) {
  const { data: rewards } = useRewards(familyId);
  const { data: redemptions } = useRedemptions(familyId);
  const createReward = useCreateReward(familyId);
  const redeemReward = useRedeemReward(familyId);
  const approveRedemption = useApproveRedemption(familyId);
  const pushToast = useUIStore((s) => s.pushToast);

  const [newRewardOpen, setNewRewardOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [starCost, setStarCost] = useState(5);

  const earned = allTimeCompletions.filter((c) => c.member_id === activeMemberId).reduce((sum, c) => sum + c.stars, 0);
  const spent = (redemptions ?? [])
    .filter((r) => r.member_id === activeMemberId && r.approved_by)
    .reduce((sum, r) => sum + (rewards?.find((rw) => rw.id === r.reward_id)?.star_cost ?? 0), 0);
  const balance = earned - spent;

  async function handleCreate() {
    if (!title.trim()) return;
    try {
      await createReward.mutateAsync({ title, starCost });
      setNewRewardOpen(false);
      setTitle("");
      setStarCost(5);
    } catch (err) {
      pushToast(err instanceof Error ? err.message : "Something went wrong", "danger");
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
      <div className="flex items-center gap-2 text-warning font-bold">
        <Star className="size-5 fill-warning" />
        {balance} stars available
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {(rewards ?? []).map((reward) => (
          <Card key={reward.id}>
            <div className="flex items-center gap-2 mb-2 text-warning font-bold text-sm">
              <Star className="size-4 fill-warning" />
              {reward.star_cost}
            </div>
            <div className="font-bold text-sm mb-3">{reward.title}</div>
            <Button size="sm" variant="outline" disabled={balance < reward.star_cost} onClick={() => handleRedeem(reward.id)} className="w-full">
              Redeem
            </Button>
          </Card>
        ))}
        {isAdult && <AddCard label="Add reward" onClick={() => setNewRewardOpen(true)} />}
      </div>

      {isAdult && pendingApprovals.length > 0 && (
        <div className="rounded-xl border border-warning-soft bg-warning-soft/40 p-4">
          <div className="font-bold text-sm mb-2.5">Pending approvals</div>
          <div className="flex flex-col gap-2">
            {pendingApprovals.map((r) => {
              const reward = rewards?.find((rw) => rw.id === r.reward_id);
              return (
                <div key={r.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{reward?.title ?? "Reward"}</span>
                  <Button size="sm" variant="outline" onClick={() => approveRedemption.mutate({ redemptionId: r.id, approverId: activeMemberId })} className="gap-1.5">
                    <Check className="size-3.5" />
                    Approve
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={newRewardOpen}
        onClose={() => setNewRewardOpen(false)}
        icon={Gift}
        title="New reward"
        footer={
          <>
            <Button variant="ghost" onClick={() => setNewRewardOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={createReward.isPending} className="gap-2">
              <Plus className="size-4" />
              Add
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
            <Input id="reward-cost" type="number" min={1} value={starCost} onChange={(e) => setStarCost(Number(e.target.value))} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
