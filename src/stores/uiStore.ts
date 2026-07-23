import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_APP_THEME, type AppThemeId } from "@/lib/themes";

export type CalendarViewMode = "month" | "week" | "weekend" | "day";
export type ToastTone = "success" | "info" | "danger";
/** auto = pick from viewport; wall = mounted tablet hub; phone = capture / lists first. */
export type DeviceModePreference = "auto" | "wall" | "phone";

export interface Toast {
  id: string;
  message: string;
  tone: ToastTone;
}

interface UIState {
  calendarView: CalendarViewMode;
  setCalendarView: (mode: CalendarViewMode) => void;

  deviceMode: DeviceModePreference;
  setDeviceMode: (mode: DeviceModePreference) => void;

  /** Per-device chrome theme (`data-theme` on `<html>`). Wall tablet can differ from phone. */
  appTheme: AppThemeId;
  setAppTheme: (theme: AppThemeId) => void;

  selectedMemberIds: string[];
  toggleMemberFilter: (memberId: string) => void;
  clearMemberFilter: () => void;

  hubMode: "busy" | "calm";
  setHubMode: (mode: "busy" | "calm") => void;

  toasts: Toast[];
  pushToast: (message: string, tone?: ToastTone) => void;
  dismissToast: (id: string) => void;

  /** Count of currently-open dropdowns/modals — while > 0, the hub's idle/ambient screen must not take over and hide them (see useIdle). */
  openOverlaysCount: number;
  pushOverlay: () => void;
  popOverlay: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // Per-device, not per-user (spec §4): the wall hub wants week view and
      // stays there; a phone wants day view. Only this field is persisted —
      // see `partialize` below.
      calendarView: "week",
      setCalendarView: (mode) => set({ calendarView: mode }),

      deviceMode: "auto",
      setDeviceMode: (mode) => set({ deviceMode: mode }),

      appTheme: DEFAULT_APP_THEME,
      setAppTheme: (theme) => set({ appTheme: theme }),

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

      openOverlaysCount: 0,
      pushOverlay: () => set((s) => ({ openOverlaysCount: s.openOverlaysCount + 1 })),
      popOverlay: () => set((s) => ({ openOverlaysCount: Math.max(0, s.openOverlaysCount - 1) })),
    }),
    {
      name: "hub-calendar-view",
      partialize: (state) => ({
        calendarView: state.calendarView,
        deviceMode: state.deviceMode,
        appTheme: state.appTheme,
      }),
    }
  )
);

/** Registers `open` against the shared overlay counter so useIdle knows not to cover an open dropdown/modal with the ambient screen. */
export function useOverlayPresence(open: boolean) {
  const pushOverlay = useUIStore((s) => s.pushOverlay);
  const popOverlay = useUIStore((s) => s.popOverlay);
  useEffect(() => {
    if (!open) return;
    pushOverlay();
    return () => popOverlay();
  }, [open, pushOverlay, popOverlay]);
}
