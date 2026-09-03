import { isStandaloneFocusSession } from './focusSessionLifecycle';
import type { AnalyticsProps } from '../../services/analytics/analytics';

export function focusDurationBucket(minutes: number): string {
  if (minutes <= 5) return 'up_to_5m';
  if (minutes <= 15) return '6_to_15m';
  if (minutes <= 30) return '16_to_30m';
  if (minutes <= 60) return '31_to_60m';
  return 'over_60m';
}

export function buildFocusSessionAnalyticsProps(
  session: { activityId: string; durationMinutes: number },
  outcome: 'started' | 'completed' | 'ended',
): AnalyticsProps {
  return {
    session_kind: isStandaloneFocusSession(session) ? 'standalone' : 'activity',
    duration_bucket: focusDurationBucket(session.durationMinutes),
    outcome,
  };
}
