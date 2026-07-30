import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  acknowledgeFamilyScreenTimePolicy,
  activateFamilyScreenTimeAgreement,
  createDefaultFamilyScreenTimeRecord,
  normalizeFamilyScreenTimeRecord,
  prepareSimulatedFamilyScreenTimeDevice,
  updateFamilyScreenTimeAgreement,
  type FamilyScreenTimeRule,
  type FamilyScreenTimeLearningRecord,
} from './familyScreenTimeLearning';

type FamilyScreenTimeLearningState = {
  records: Record<string, FamilyScreenTimeLearningRecord>;
  prepareSimulatedDevice: (key: string) => void;
  updateAgreement: (key: string, rule: FamilyScreenTimeRule) => void;
  activateAgreement: (key: string, activatedAtIso: string) => number;
  acknowledgePolicy: (key: string, policyVersion: number, acknowledgedAtIso: string) => void;
  resetChild: (key: string) => void;
};

export function familyScreenTimeLearningKey(userId: string, childMembershipId: string): string {
  return `${userId}:${childMembershipId}`;
}

export function familyScreenTimeLearningRecord(
  records: Record<string, FamilyScreenTimeLearningRecord>,
  key: string,
): FamilyScreenTimeLearningRecord {
  return normalizeFamilyScreenTimeRecord(records[key]);
}

export const useFamilyScreenTimeLearningStore = create<FamilyScreenTimeLearningState>()(
  persist(
    (set, get) => ({
      records: {},
      prepareSimulatedDevice: (key) => set((state) => ({
        records: {
          ...state.records,
          [key]: prepareSimulatedFamilyScreenTimeDevice(familyScreenTimeLearningRecord(state.records, key)),
        },
      })),
      updateAgreement: (key, rule) => set((state) => ({
        records: {
          ...state.records,
          [key]: updateFamilyScreenTimeAgreement(
            familyScreenTimeLearningRecord(state.records, key),
            rule,
          ),
        },
      })),
      activateAgreement: (key, activatedAtIso) => {
        const next = activateFamilyScreenTimeAgreement(
          familyScreenTimeLearningRecord(get().records, key),
          activatedAtIso,
        );
        set((state) => ({ records: { ...state.records, [key]: next } }));
        return next.desiredPolicyVersion;
      },
      acknowledgePolicy: (key, policyVersion, acknowledgedAtIso) => set((state) => ({
        records: {
          ...state.records,
          [key]: acknowledgeFamilyScreenTimePolicy(
            familyScreenTimeLearningRecord(state.records, key),
            { policyVersion, acknowledgedAtIso },
          ),
        },
      })),
      resetChild: (key) => set((state) => {
        const records = { ...state.records };
        delete records[key];
        return { records };
      }),
    }),
    {
      name: 'kwilt-family-screen-time-learning-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ records }) => ({ records }),
      merge: (persisted, current) => {
        const raw = (persisted as Partial<FamilyScreenTimeLearningState> | undefined)?.records ?? {};
        return {
          ...current,
          records: Object.fromEntries(
            Object.entries(raw).map(([key, value]) => [key, normalizeFamilyScreenTimeRecord(value)]),
          ),
        };
      },
    },
  ),
);

export function resetFamilyScreenTimeLearningStoreForTests(): void {
  useFamilyScreenTimeLearningStore.setState({ records: {} });
}
