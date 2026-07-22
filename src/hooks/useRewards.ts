"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupabaseClient } from "./useSupabaseClient";

export interface RewardDTO {
  id: string;
  title: string;
  star_cost: number;
  active: boolean;
}

export interface RedemptionDTO {
  id: string;
  reward_id: string;
  member_id: string;
  redeemed_at: string;
  approved_by: string | null;
}

export function useRewards(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["rewards", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<RewardDTO[]> => {
      const { data } = await supabase!.from("rewards").select("id, title, star_cost, active").eq("family_id", familyId!).eq("active", true).order("star_cost");
      return data ?? [];
    },
  });
}

export function useRedemptions(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  return useQuery({
    queryKey: ["redemptions", familyId],
    enabled: !!supabase && !!familyId,
    queryFn: async (): Promise<RedemptionDTO[]> => {
      const { data: rewards } = await supabase!.from("rewards").select("id").eq("family_id", familyId!);
      const rewardIds = (rewards ?? []).map((r) => r.id);
      if (rewardIds.length === 0) return [];
      const { data } = await supabase!.from("reward_redemptions").select("*").in("reward_id", rewardIds);
      return data ?? [];
    },
  });
}

export function useCreateReward(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; starCost: number }) => {
      if (!supabase || !familyId) throw new Error("Not ready");
      const { error } = await supabase.from("rewards").insert({ family_id: familyId, title: input.title, star_cost: input.starCost });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rewards", familyId] }),
  });
}

export function useRedeemReward(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ rewardId, memberId }: { rewardId: string; memberId: string }) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("reward_redemptions").insert({ reward_id: rewardId, member_id: memberId });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["redemptions", familyId] }),
  });
}

export function useApproveRedemption(familyId: string | undefined) {
  const supabase = useSupabaseClient();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ redemptionId, approverId }: { redemptionId: string; approverId: string }) => {
      if (!supabase) throw new Error("Not ready");
      const { error } = await supabase.from("reward_redemptions").update({ approved_by: approverId }).eq("id", redemptionId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["redemptions", familyId] }),
  });
}
