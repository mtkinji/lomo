import type { AnalyticsProps } from '../../../services/analytics/analytics';
import {
  AnalyticsEvent,
  type AnalyticsEventName,
} from '../../../services/analytics/events';
import type { FamilyScreenTimeLifecycle } from './familyScreenTimePresentation';
import type { FamilyScreenTimeSetupStep } from './familyScreenTimeSetupFlow';

export type FamilyScreenTimeAnalyticsAction =
  | 'viewed'
  | 'setup_opened'
  | 'agreement_activated'
  | 'policy_applied'
  | 'policy_failed';

type FamilyScreenTimeAnalyticsProps = {
  childMembershipId: string;
  entrySurface: 'household' | 'settings' | 'chat';
  step?: FamilyScreenTimeSetupStep;
  lifecycle?: FamilyScreenTimeLifecycle;
  outcome?: 'started' | 'completed' | 'failed';
};

type Capture = (event: AnalyticsEventName, props?: AnalyticsProps) => void;

const eventByAction: Record<FamilyScreenTimeAnalyticsAction, AnalyticsEventName> = {
  viewed: AnalyticsEvent.FamilyScreenTimeViewed,
  setup_opened: AnalyticsEvent.FamilyScreenTimeSetupOpened,
  agreement_activated: AnalyticsEvent.FamilyScreenTimeAgreementActivated,
  policy_applied: AnalyticsEvent.FamilyScreenTimePolicyApplied,
  policy_failed: AnalyticsEvent.FamilyScreenTimePolicyFailed,
};

export function trackFamilyScreenTime(
  capture: Capture,
  action: FamilyScreenTimeAnalyticsAction,
  props: FamilyScreenTimeAnalyticsProps,
): void {
  capture(eventByAction[action], {
    child_membership_id: props.childMembershipId,
    entry_surface: props.entrySurface,
    step: props.step,
    lifecycle: props.lifecycle,
    outcome: props.outcome,
  });
}
