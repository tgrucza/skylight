import { create } from "zustand";
import { persist } from "zustand/middleware";

interface WallProfileState {
  /** The family_member id currently "active" on this device — defaults to the signed-in adult, switches when a child enters their PIN (spec §2.2, §6.6). */
  activeMemberId: string | null;
  setActiveMember: (memberId: string | null) => void;
}

export const useWallProfileStore = create<WallProfileState>()(
  persist(
    (set) => ({
      activeMemberId: null,
      setActiveMember: (memberId) => set({ activeMemberId: memberId }),
    }),
    { name: "hearth-wall-profile" }
  )
);
