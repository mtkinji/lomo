import { useCallback } from 'react';
import type { AnalyticsEventName } from './events';
import type { AnalyticsProps } from './analytics';
import { identify, track } from './analytics';
import { usePostHogSafe } from './usePosthogSafe';

export function useAnalytics() {
  const posthog = usePostHogSafe();

  const capture = useCallback(
    (event: AnalyticsEventName, props?: AnalyticsProps) => {
      track(posthog, event, props);
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


