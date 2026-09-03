import type { AppStateStatus } from 'react-native';
import type { PostHog } from 'posthog-react-native';
import { AnalyticsEvent } from './events';
import { track } from './analytics';

export function trackApplicationOpened(posthog: PostHog | undefined): void {
  track(posthog, AnalyticsEvent.ApplicationOpened);
}

export function trackAppStateTransition(
  posthog: PostHog | undefined,
  previous: AppStateStatus,
  next: AppStateStatus,
): void {
  if (previous === next) return;
  if (next === 'active') {
    track(posthog, AnalyticsEvent.ApplicationBecameActive);
  } else if (next === 'background') {
    track(posthog, AnalyticsEvent.ApplicationBackgrounded);
  }
}
