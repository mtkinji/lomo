import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type HouseholdModeMember = {
  id: string;
  displayName: string;
  capabilityIds: string[];
};

export type HouseholdModeSession = {
  deviceId: string;
  householdId: string;
  assignedCaregiverUserId: string;
  assignedCaregiverName: string;
  members: HouseholdModeMember[];
  activeMemberId: string | null;
  requiresCaregiverReauthentication: boolean;
  verification: 'current' | 'unavailable';
};

type HouseholdModeStore = {
  session: HouseholdModeSession | null;
  hydrated: boolean;
  enter: (input: Omit<HouseholdModeSession, 'activeMemberId' | 'requiresCaregiverReauthentication' | 'verification'>) => void;
  selectMember: (memberId: string | null) => void;
  requestCaregiverReauthentication: () => void;
  canFinishCaregiverReauthentication: (userId: string | null | undefined) => boolean;
  finishCaregiverReauthentication: (userId: string) => boolean;
  reset: () => void;
  replaceSession: (session: HouseholdModeSession) => void;
  markUnavailable: () => void;
  setHydrated: (hydrated: boolean) => void;
};

export const useHouseholdModeStore = create<HouseholdModeStore>()(persist(
  (set, get) => ({
    session: null,
    hydrated: false,
    enter: (input) => set({
      session: {
        ...input, activeMemberId: null, requiresCaregiverReauthentication: false, verification: 'current',
      },
    }),
    selectMember: (memberId) => set((state) => {
      if (!state.session) return state;
      const valid = memberId === null || state.session.members.some((member) => member.id === memberId);
      return valid ? { session: { ...state.session, activeMemberId: memberId } } : state;
    }),
    requestCaregiverReauthentication: () => set((state) => state.session ? ({
      session: { ...state.session, activeMemberId: null, requiresCaregiverReauthentication: true },
    }) : state),
    canFinishCaregiverReauthentication: (userId) => {
      const session = get().session;
      return Boolean(session?.requiresCaregiverReauthentication
        && userId && userId === session.assignedCaregiverUserId);
    },
    finishCaregiverReauthentication: (userId) => {
      if (!get().canFinishCaregiverReauthentication(userId)) return false;
      set({ session: null });
      return true;
    },
    reset: () => set({ session: null }),
    replaceSession: (session) => set({ session }),
    markUnavailable: () => set((state) => state.session ? ({
      session: {
        ...state.session, activeMemberId: null, members: [], verification: 'unavailable',
      },
    }) : state),
    setHydrated: (hydrated) => set({ hydrated }),
  }),
  {
    name: 'kwilt-household-mode-v1',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({ session: state.session }),
    onRehydrateStorage: () => (state) => {
      state?.markUnavailable();
      state?.setHydrated(true);
    },
  },
));
