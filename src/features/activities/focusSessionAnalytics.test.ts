import { buildFocusSessionAnalyticsProps, focusDurationBucket } from './focusSessionAnalytics';
import { STANDALONE_FOCUS_ACTIVITY_ID } from './focusSessionLifecycle';

describe('focus session analytics', () => {
  it.each([[5, 'up_to_5m'], [15, '6_to_15m'], [30, '16_to_30m'], [60, '31_to_60m'], [90, 'over_60m']])(
    'buckets %s minutes as %s',
    (minutes, expected) => expect(focusDurationBucket(minutes)).toBe(expected),
  );

  it('uses only bounded session metadata', () => {
    expect(buildFocusSessionAnalyticsProps({
      activityId: STANDALONE_FOCUS_ACTIVITY_ID,
      durationMinutes: 25,
    }, 'completed')).toEqual({
      session_kind: 'standalone',
      duration_bucket: '16_to_30m',
      outcome: 'completed',
    });
  });
});
