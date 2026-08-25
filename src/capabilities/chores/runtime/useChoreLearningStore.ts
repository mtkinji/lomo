import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  approveChoreOccurrence,
  completeChoreOccurrence,
  cancelChoreTokenRedemption,
  createChoreLearningRecord,
  normalizeChoreLearningRecord,
  leaveEarlierChoreCompletionMissed,
  reconcileRecurringChoreOccurrences,
  requestChoreTokenRedemption,
  requestEarlierChoreCompletions,
  releaseChoreOccurrence,
  reopenChoreOccurrence,
  returnChoreOccurrenceForAnotherPass,
  setChoreRewardExchangeRate,
  setChoreTokensEnabled,
  settleChoreRewardPayout,
  settleChoreRewardPayouts,
  setChoreEvidencePhoto,
  takeChoreOccurrence,
  type ChoreLearningRecord,
} from '../domain/choreLearning';
import {
  addChoreDraftToLearningRecord,
  deleteChoreSeriesFromLearningRecord,
  restoreDeletedChoreSeriesToLearningRecord,
  updateChoreSeriesInLearningRecord,
  type ChoreDraft,
  type ChoreSeriesDeleteSnapshot,
} from '../domain/choreCreation';

type ChoreLearningState = {
  record: ChoreLearningRecord;
  selectMember: (memberId: string) => void;
  take: (activityOccurrenceId: string) => void;
  release: (activityOccurrenceId: string) => void;
  complete: (activityOccurrenceId: string, performedAtIso: string) => void;
  reopen: (activityOccurrenceId: string) => void;
  setTokensEnabled: (enabled: boolean) => void;
  setRewardExchangeRate: (exchangeRateCentsPerToken: number) => void;
  requestRedemption: (tokenAmount: number, requestedAtIso: string, idSeed: string) => void;
  cancelRedemption: (payoutId: string, cancelledAtIso: string) => void;
  settlePayout: (payoutId: string, settledAtIso: string) => void;
  settlePayouts: (payoutIds: string[], settledAtIso: string) => void;
  setEvidencePhoto: (activityOccurrenceId: string, evidencePhotoUri: string | null) => void;
  approve: (activityOccurrenceId: string, reviewedAtIso: string) => void;
  requestAnotherPass: (
    activityOccurrenceId: string,
    reviewedAtIso: string,
    note: string | null,
  ) => void;
  requestEarlierCompletions: (activityOccurrenceIds: string[], requestedAtIso: string) => void;
  leaveEarlierCompletionMissed: (activityOccurrenceId: string, reviewedAtIso: string) => void;
  addChore: (draft: ChoreDraft, createdAtIso: string, idSeed: string) => void;
  updateChore: (activitySeriesId: string, draft: ChoreDraft) => void;
  deleteChore: (activitySeriesId: string) => void;
  restoreChore: (snapshot: ChoreSeriesDeleteSnapshot) => void;
  reconcileRecurrence: (nowIso: string) => void;
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
      setRewardExchangeRate: (exchangeRateCentsPerToken) => set((state) => ({
        record: setChoreRewardExchangeRate(
          state.record,
          exchangeRateCentsPerToken,
          state.record.activeMemberId,
        ),
      })),
      requestRedemption: (tokenAmount, requestedAtIso, idSeed) => set((state) => ({
        record: requestChoreTokenRedemption(
          state.record,
          state.record.activeMemberId,
          tokenAmount,
          requestedAtIso,
          idSeed,
        ),
      })),
      cancelRedemption: (payoutId, cancelledAtIso) => set((state) => ({
        record: cancelChoreTokenRedemption(
          state.record,
          state.record.activeMemberId,
          payoutId,
          cancelledAtIso,
        ),
      })),
      settlePayout: (payoutId, settledAtIso) => set((state) => ({
        record: settleChoreRewardPayout(
          state.record,
          state.record.activeMemberId,
          payoutId,
          settledAtIso,
        ),
      })),
      settlePayouts: (payoutIds, settledAtIso) => set((state) => ({
        record: settleChoreRewardPayouts(
          state.record,
          state.record.activeMemberId,
          payoutIds,
          settledAtIso,
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
      requestEarlierCompletions: (activityOccurrenceIds, requestedAtIso) => set((state) => ({
        record: requestEarlierChoreCompletions(
          state.record,
          activityOccurrenceIds,
          state.record.activeMemberId,
          requestedAtIso,
        ),
      })),
      leaveEarlierCompletionMissed: (activityOccurrenceId, reviewedAtIso) => set((state) => ({
        record: leaveEarlierChoreCompletionMissed(
          state.record,
          activityOccurrenceId,
          state.record.activeMemberId,
          reviewedAtIso,
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
      updateChore: (activitySeriesId, draft) => set((state) => ({
        record: updateChoreSeriesInLearningRecord(
          state.record,
          draft,
          state.record.activeMemberId,
          activitySeriesId,
        ),
      })),
      deleteChore: (activitySeriesId) => set((state) => ({
        record: deleteChoreSeriesFromLearningRecord(
          state.record,
          state.record.activeMemberId,
          activitySeriesId,
        ),
      })),
      restoreChore: (snapshot) => set((state) => ({
        record: restoreDeletedChoreSeriesToLearningRecord(
          state.record,
          state.record.activeMemberId,
          snapshot,
        ),
      })),
      reconcileRecurrence: (nowIso) => set((state) => ({
        record: reconcileRecurringChoreOccurrences(state.record, nowIso),
      })),
      reset: () => set({ record: createChoreLearningRecord() }),
    }),
    {
      name: CHORE_LEARNING_STORAGE_KEY,
      version: 13,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ record }) => ({ record }),
      migrate: (persisted) => ({
        record: normalizeChoreLearningRecord(
          (persisted as Partial<ChoreLearningState> | undefined)?.record,
        ),
      }),
      merge: (persisted, current) => ({
        ...current,
        record: reconcileRecurringChoreOccurrences(
          normalizeChoreLearningRecord(
            (persisted as Partial<ChoreLearningState> | undefined)?.record,
          ),
          new Date().toISOString(),
        ),
      }),
    },
  ),
);

export function resetChoreLearningStoreForTests(): void {
  useChoreLearningStore.setState({ record: createChoreLearningRecord() });
}
