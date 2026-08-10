import { useCallback, useMemo } from 'react';
import type { AnalyticsProps } from '../../services/analytics/analytics';
import { AnalyticsEvent, type AnalyticsEventName } from '../../services/analytics/events';
import { useCheckinDraftStore } from '../../store/useCheckinDraftStore';
import {
  dismissGoalCheckinApproval,
  removePendingGoalCheckinItem,
  skipPendingGoalCheckin,
} from './goalCheckinLifecycleCommands';

type GoalCheckinLifecycleRuntimeInput = {
  capture: (event: AnalyticsEventName, props?: AnalyticsProps) => void;
  goalId: string | null | undefined;
  itemCount: number;
  setApprovalVisible: (visible: boolean) => void;
};

export function useGoalCheckinLifecycleController({
  capture,
  goalId,
  itemCount,
  setApprovalVisible,
}: GoalCheckinLifecycleRuntimeInput) {
  const dependencies = useMemo(
    () => ({
      recordSkipped: ({ goalId, itemCount }: { goalId: string; itemCount: number }) => {
        capture(AnalyticsEvent.CheckinDraftSkipped, { goalId, itemCount });
      },
      markSkipped: (targetGoalId: string) =>
        useCheckinDraftStore.getState().markSkipped(targetGoalId),
      recordItemRemoved: ({
        goalId: targetGoalId,
        itemId,
      }: {
        goalId: string;
        itemId: string;
      }) => {
        capture(AnalyticsEvent.CheckinDraftItemRemoved, { goalId: targetGoalId, itemId });
      },
      removeItem: ({ goalId: targetGoalId, itemId }: { goalId: string; itemId: string }) => {
        useCheckinDraftStore.getState().removeItem({ goalId: targetGoalId, itemId });
      },
      hideApproval: () => setApprovalVisible(false),
      markDismissed: (targetGoalId: string) =>
        useCheckinDraftStore.getState().markDismissed(targetGoalId),
      recordDismissed: (targetGoalId: string) => {
        capture(AnalyticsEvent.CheckinDraftDismissed, { goalId: targetGoalId });
      },
    }),
    [capture, setApprovalVisible],
  );

  const handleSkipPendingDraft = useCallback(() => {
    skipPendingGoalCheckin({ goalId, itemCount }, dependencies);
  }, [dependencies, goalId, itemCount]);

  const handleRemovePendingDraftItem = useCallback(
    (itemId: string) => removePendingGoalCheckinItem({ goalId, itemId }, dependencies),
    [dependencies, goalId],
  );

  const handleApprovalSheetDismiss = useCallback(() => {
    dismissGoalCheckinApproval(goalId, dependencies);
  }, [dependencies, goalId]);

  return {
    handleSkipPendingDraft,
    handleRemovePendingDraftItem,
    handleApprovalSheetDismiss,
  };
}
