import { Alert } from 'react-native';
import type { AnalyticsProps } from '../../services/analytics/analytics';
import { AnalyticsEvent, type AnalyticsEventName } from '../../services/analytics/events';
import { useCheckinDraftStore } from '../../store/useCheckinDraftStore';
import { useCheckinNudgeStore } from '../../store/useCheckinNudgeStore';
import { useToastStore } from '../../store/useToastStore';
import type { GoalCheckinDeliveryDependencies } from './goalCheckinDeliveryController';

type GoalCheckinDeliveryRuntimeInput = {
  capture: (event: AnalyticsEventName, props?: AnalyticsProps) => void;
  setBusy: (busy: boolean) => void;
  refreshFeed: () => void;
};

export function createGoalCheckinDeliveryDependencies({
  capture,
  setBusy,
  refreshFeed,
}: GoalCheckinDeliveryRuntimeInput): GoalCheckinDeliveryDependencies {
  return {
    setBusy,
    submit: async ({ goalId, text }) => {
      const { submitCheckin } = await import('../../services/checkins');
      await submitCheckin({ goalId, preset: null, text });
    },
    recordSuccess: ({ goalId, itemCount }) => {
      capture(AnalyticsEvent.CheckinDraftSent, { goalId, itemCount });
    },
    markDraftSent: (goalId) => useCheckinDraftStore.getState().markSent(goalId),
    recordCheckin: (goalId) => useCheckinNudgeStore.getState().recordCheckin(goalId),
    refreshFeed,
    showSuccess: () =>
      useToastStore.getState().showToast({
        message: 'Check-in sent',
        variant: 'success',
        durationMs: 2200,
      }),
    recordFailure: ({ goalId, error }) => {
      capture(AnalyticsEvent.SharedGoalCheckinFailed, { goalId, error });
    },
    showFailure: (message) => Alert.alert('Unable to send', message),
  };
}
