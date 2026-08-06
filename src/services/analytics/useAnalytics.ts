import { useCallback } from 'react';
import type { AnalyticsEventName } from './events';
import type { AnalyticsProps } from './analytics';
import { identify, track } from './analytics';
import { usePostHogSafe } from './usePosthogSafe';
import { assertSafeFoodAnalytics, FOOD_ANALYTICS_EVENTS } from './foodAnalyticsContracts';

export function useAnalytics() {
  const posthog = usePostHogSafe();

  const capture = useCallback(
    (event: AnalyticsEventName, props?: AnalyticsProps) => {
      const safeProps = (FOOD_ANALYTICS_EVENTS as readonly string[]).includes(event)
        ? assertSafeFoodAnalytics(event, props ?? {})
        : props;
      track(posthog, event, safeProps as AnalyticsProps | undefined);
    },
    [posthog],
  );

  const identifyUser = useCallback(
    (distinctId: string, props?: AnalyticsProps) => {
      identify(posthog, distinctId, props);
    },
    [posthog],
  );

  return { posthog, capture, identifyUser };
}
