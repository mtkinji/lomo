import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  createCapabilityOnboardingRecord,
  normalizeCapabilityOnboardingRecord,
  reduceCapabilityOnboarding,
  type CapabilityOnboardingAction,
  type CapabilityOnboardingRecord,
} from './capabilityOnboardingState';

export const CAPABILITY_ONBOARDING_STORAGE_KEY = 'kwilt-capability-onboarding-v1';

type CapabilityOnboardingStore = {
  recordsByUserId: Record<string, CapabilityOnboardingRecord>;
  hydrated: boolean;
  recordForUser: (userId: string) => CapabilityOnboardingRecord;
  dispatch: (userId: string, action: CapabilityOnboardingAction) => void;
  resetUser: (userId: string) => void;
  setHydrated: (hydrated: boolean) => void;
};

function normalizeRecords(
  value: unknown,
): CapabilityOnboardingStore['recordsByUserId'] {
  if (!value || typeof value !== 'object') return {};
  const records: CapabilityOnboardingStore['recordsByUserId'] = {};
  for (const [userId, record] of Object.entries(value)) {
    const normalizedUserId = userId.trim();
    if (!normalizedUserId) continue;
    records[normalizedUserId] = normalizeCapabilityOnboardingRecord(record);
  }
  return records;
}

export const useCapabilityOnboardingStore = create<CapabilityOnboardingStore>()(
  persist(
    (set, get) => ({
      recordsByUserId: {},
      hydrated: false,
      recordForUser: (userId) => {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) return createCapabilityOnboardingRecord();
        return normalizeCapabilityOnboardingRecord(
          get().recordsByUserId[normalizedUserId],
        );
      },
      dispatch: (userId, action) => {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) return;
        set((state) => {
          const current = normalizeCapabilityOnboardingRecord(
            state.recordsByUserId[normalizedUserId],
          );
          return {
            recordsByUserId: {
              ...state.recordsByUserId,
              [normalizedUserId]: reduceCapabilityOnboarding(current, action),
            },
          };
        });
      },
      resetUser: (userId) => {
        const normalizedUserId = userId.trim();
        if (!normalizedUserId) return;
        set((state) => {
          const recordsByUserId = { ...state.recordsByUserId };
          delete recordsByUserId[normalizedUserId];
          return { recordsByUserId };
        });
      },
      setHydrated: (hydrated) => set({ hydrated }),
    }),
    {
      name: CAPABILITY_ONBOARDING_STORAGE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ recordsByUserId: state.recordsByUserId }),
      merge: (persisted, current) => {
        const candidate = persisted as Partial<CapabilityOnboardingStore> | undefined;
        return {
          ...current,
          recordsByUserId: normalizeRecords(candidate?.recordsByUserId),
        };
      },
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);

export function resetCapabilityOnboardingForUser(userId: string | null | undefined): void {
  if (!userId?.trim()) return;
  useCapabilityOnboardingStore.getState().resetUser(userId);
}
