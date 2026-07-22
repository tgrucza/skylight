"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EventInstanceDTO } from "@/types/events";

export interface CreateEventInput {
  title: string;
  memberId?: string | null;
  location?: string;
  notes?: string;
  startsAt: string;
  endsAt: string;
  allDay?: boolean;
  rrule?: string;
}

export interface UpdateEventInput {
  id: string;
  title?: string;
  location?: string | null;
  notes?: string | null;
  startsAt?: string;
  endsAt?: string;
  allDay?: boolean;
  scope?: "all" | "this";
}

function rangeKey(start: string, end: string) {
  return ["events", start, end] as const;
}

export function useEvents(start: Date, end: Date) {
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  return useQuery({
    queryKey: rangeKey(startIso, endIso),
    queryFn: async (): Promise<EventInstanceDTO[]> => {
      const res = await fetch(`/api/events?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`);
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      return data.events;
    },
    staleTime: 30_000,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateEventInput) => {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create event");
      return data.event;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateEventInput) => {
      const res = await fetch(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update event");
      return data.event;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, scope = "all" }: { id: string; scope?: "all" | "this" }) => {
      const res = await fetch(`/api/events/${id}?scope=${scope}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to delete event");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["events"] }),
  });
}
