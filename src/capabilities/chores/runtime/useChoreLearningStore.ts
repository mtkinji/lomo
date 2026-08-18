import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  approveChoreOccurrence,
  completeChoreOccurrence,
  createChoreLearningRecord,
  normalizeChoreLearningRecord,
  releaseChoreOccurrence,
  reopenChoreOccurrence,
  returnChoreOccurrenceForAnotherPass,
  setChoreTokensEnabled,
  setChoreEvidencePhoto,
  takeChoreOccurrence,
  type ChoreLearningRecord,
} from '../domain/choreLearning';
import {
  addChoreDraftToLearningRecord,
  type ChoreDraft,
} from '../domain/choreCreation';

type ChoreLearningState = {
  record: ChoreLearningRecord;
  selectMember: (memberId: string) => void;
  take: (activityOccurrenceId: string) => void;
  release: (activityOccurrenceId: string) => void;
  complete: (activityOccurrenceId: string, performedAtIso: string) => void;
  reopen: (activityOccurrenceId: string) => void;
  setTokensEnabled: (enabled: boolean) => void;
  setEvidencePhoto: (activityOccurrenceId: string, evidencePhotoUri: string | null) => void;
  approve: (activityOccurrenceId: string, reviewedAtIso: string) => void;
  requestAnotherPass: (
    activityOccurrenceId: string,
    reviewedAtIso: string,
    note: string | null,
  ) => void;
  addChore: (draft: ChoreDraft, createdAtIso: string, idSeed: string) => void;
  reset: () => void;
};

export const CHORE_LEARNING_STORAGE_KEY = 'kwilt-chores-learning-v1';

export const useChoreLearningStore = create<ChoreLearningState>()(
  persist(
    (set) => ({
      record: createChoreLearningRecord(),
      selectMember: (memberId) => set((state) => {
        if (!state.record.members.some((member) => member.id === memberId)) return state;
        return { record: { ...state.record, activeMemberId: memberId } };
      }),
      take: (activityOccurrenceId) => set((state) => ({
        record: takeChoreOccurrence(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
        ),
      })),
      release: (activityOccurrenceId) => set((state) => ({
        record: releaseChoreOccurrence(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
        ),
      })),
      complete: (activityOccurrenceId, performedAtIso) => set((state) => ({
        record: completeChoreOccurrence(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
          performedAtIso,
        ),
      })),
      reopen: (activityOccurrenceId) => set((state) => ({
        record: reopenChoreOccurrence(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
        ),
      })),
      setTokensEnabled: (enabled) => set((state) => ({
        record: setChoreTokensEnabled(
          state.record,
          enabled,
          state.record.activeMemberId,
        ),
      })),
      setEvidencePhoto: (activityOccurrenceId, evidencePhotoUri) => set((state) => ({
        record: setChoreEvidencePhoto(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
          evidencePhotoUri,
        ),
      })),
      approve: (activityOccurrenceId, reviewedAtIso) => set((state) => ({
        record: approveChoreOccurrence(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
          reviewedAtIso,
        ),
      })),
      requestAnotherPass: (activityOccurrenceId, reviewedAtIso, note) => set((state) => ({
        record: returnChoreOccurrenceForAnotherPass(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
          reviewedAtIso,
          note,
        ),
      })),
      addChore: (draft, createdAtIso, idSeed) => set((state) => ({
        record: addChoreDraftToLearningRecord(
          state.record,
          draft,
          state.record.activeMemberId,
          createdAtIso,
          idSeed,
        ),
      })),
      reset: () => set({ record: createChoreLearningRecord() }),
    }),
    {
      name: CHORE_LEARNING_STORAGE_KEY,
      version: 8,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ record }) => ({ record }),
      migrate: (persisted) => ({
        record: normalizeChoreLearningRecord(
          (persisted as Partial<ChoreLearningState> | undefined)?.record,
        ),
      }),
      merge: (persisted, current) => ({
        ...current,
        record: normalizeChoreLearningRecord(
          (persisted as Partial<ChoreLearningState> | undefined)?.record,
        ),
      }),
    },
  ),
);

export function resetChoreLearningStoreForTests(): void {
  useChoreLearningStore.setState({ record: createChoreLearningRecord() });
}
