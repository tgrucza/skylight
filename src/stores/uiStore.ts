import { create } from "zustand";

export type CalendarViewMode = "month" | "week" | "day";
export type ToastTone = "success" | "info" | "danger";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface UIState {
  calendarView: CalendarViewMode;
  setCalendarView: (mode: CalendarViewMode) => void;

  selectedMemberIds: string[];
  toggleMemberFilter: (memberId: string) => void;
  clearMemberFilter: () => void;

  hubMode: "busy" | "calm";
  setHubMode: (mode: "busy" | "calm") => void;

  toasts: Toast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  calendarView: "month",
  setCalendarView: (mode) => set({ calendarView: mode }),

  selectedMemberIds: [],
  toggleMemberFilter: (memberId) =>
    set((s) => ({
      selectedMemberIds: s.selectedMemberIds.includes(memberId)
        ? s.selectedMemberIds.filter((id) => id !== memberId)
        : [...s.selectedMemberIds, memberId],
    })),
  clearMemberFilter: () => set({ selectedMemberIds: [] }),

  hubMode: "busy",
  setHubMode: (mode) => set({ hubMode: mode }),

  toasts: [],
  pushToast: (message, tone = "info") =>
    set((s) => ({
      toasts: [...s.toasts, { id: crypto.randomUUID(), message, tone }],
    })),
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));
