"use client";

import { useQuery } from "@tanstack/react-query";

export interface FamilyMemberDTO {
  id: string;
  name: string;
  role: "adult" | "child";
  color_hex: string;
  avatar_url: string | null;
  birthday: string | null;
  invite_email: string | null;
  sort_order: number;
}

export interface FamilySettingsDTO {
  family_id: string;
  idle_timeout_seconds: number;
  ambient_start: string | null;
  ambient_end: string | null;
  slideshow_interval_seconds: number;
  week_starts_on: number;
  default_hub_view: "busy" | "calm";
  latitude: number | null;
  longitude: number | null;
}

interface FamilyResponse {
  family: { id: string; name: string; timezone: string; theme: string } | null;
  members: FamilyMemberDTO[];
  currentMemberId: string;
  settings: FamilySettingsDTO | null;
  pendingInvite: { familyName: string } | null;
}

async function fetchFamily(): Promise<FamilyResponse> {
  const res = await fetch("/api/family");
  if (!res.ok) throw new Error("Failed to load family");
  return (await res.json()) as FamilyResponse;
}

export function useFamily() {
  return useQuery({ queryKey: ["family"], queryFn: fetchFamily, staleTime: 5 * 60_000 });
}
