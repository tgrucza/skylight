"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchOpenMeteoWeather } from "@/lib/weather";

const STALE_MS = 30 * 60_000;

export function useWeather(latitude: number | null | undefined, longitude: number | null | undefined) {
  const ready =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);

  return useQuery({
    queryKey: ["weather", latitude, longitude],
    queryFn: () => fetchOpenMeteoWeather(latitude!, longitude!),
    enabled: ready,
    staleTime: STALE_MS,
    gcTime: STALE_MS * 2,
    refetchOnWindowFocus: false,
  });
}
