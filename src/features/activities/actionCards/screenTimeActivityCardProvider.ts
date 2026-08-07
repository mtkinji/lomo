import type {
  ActivityActionCardProvider,
  ActivityCardReceipt,
} from './activityActionCardTypes';

export type ScreenTimeFocusSetupReturnTarget = {
  screen: 'SettingsScreenTimeProtection';
  params: {
    setupIntent: 'focus_sessions';
    entrySurface: 'focus_drawer';
    returnToActivityId: string;
  };
};

export function screenTimeFocusSetupReturnTarget(activityId: string): ScreenTimeFocusSetupReturnTarget {
  return {
    screen: 'SettingsScreenTimeProtection',
    params: {
      setupIntent: 'focus_sessions',
      entrySurface: 'focus_drawer',
      returnToActivityId: activityId,
    },
  };
}

export function createScreenTimeActivityCardProvider(input: {
  isEligible: (activityId: string) => boolean;
  onSetUp: (target: ScreenTimeFocusSetupReturnTarget) => void | Promise<void>;
  onDismiss: () => void | Promise<void>;
}): ActivityActionCardProvider {
  const provider: ActivityActionCardProvider = {
    id: 'screen_time',
    async resolve(binding, context) {
      if (binding.projectionKind !== 'focus_setup' || binding.resourceRef !== context.activityId) {
        return {
          providerId: provider.id, projectionKind: binding.projectionKind, state: 'unavailable',
          eyebrow: 'Focus', title: 'Screen Time setup is unavailable', detail: null, freshnessLabel: null,
          primaryAction: null, secondaryAction: null,
        };
      }
      const eligible = input.isEligible(context.activityId);
      return {
        providerId: provider.id,
        projectionKind: binding.projectionKind,
        state: eligible ? 'ready' : 'completed',
        eyebrow: 'Focus',
        title: 'Fewer distractions during Focus.',
        detail: 'Block selected apps while Focus runs.',
        freshnessLabel: null,
        primaryAction: eligible
          ? { id: 'set_up', label: 'Set Up', accessibilityLabel: 'Set up Screen Time Controls for Focus' }
          : null,
        secondaryAction: eligible
          ? { id: 'not_now', label: 'Not now', accessibilityLabel: 'Dismiss Screen Time Controls setup' }
          : null,
      };
    },
    async invoke(invocation): Promise<ActivityCardReceipt> {
      if (invocation.actionId === 'set_up') {
        const returnTarget = screenTimeFocusSetupReturnTarget(invocation.context.activityId);
        await input.onSetUp(returnTarget);
        return {
          id: `screen-time:${invocation.idempotencyKey}`, providerId: provider.id,
          actionId: invocation.actionId, idempotencyKey: invocation.idempotencyKey,
          outcome: 'completed', code: null, returnTarget,
        };
      }
      if (invocation.actionId === 'not_now') {
        await input.onDismiss();
        return {
          id: `screen-time:${invocation.idempotencyKey}`, providerId: provider.id,
          actionId: invocation.actionId, idempotencyKey: invocation.idempotencyKey,
          outcome: 'declined', code: null, returnTarget: null,
        };
      }
      return {
        id: `screen-time:${invocation.idempotencyKey}`, providerId: provider.id,
        actionId: invocation.actionId, idempotencyKey: invocation.idempotencyKey,
        outcome: 'rejected', code: 'action_not_offered', returnTarget: null,
      };
    },
  };
  return provider;
}
