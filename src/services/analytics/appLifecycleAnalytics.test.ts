import { trackApplicationOpened, trackAppStateTransition } from './appLifecycleAnalytics';
import { AnalyticsEvent } from './events';
import type { PostHog } from 'posthog-react-native';

describe('manual app lifecycle analytics', () => {
  it('captures open and transitions without accepting a URL', () => {
    const capture = jest.fn();
    const posthog = { capture } as unknown as PostHog;
    trackApplicationOpened(posthog);
    trackAppStateTransition(posthog, 'background', 'active');
    trackAppStateTransition(posthog, 'active', 'background');

    expect(capture.mock.calls.map((call: unknown[]) => call[0])).toEqual([
      AnalyticsEvent.ApplicationOpened,
      AnalyticsEvent.ApplicationBecameActive,
      AnalyticsEvent.ApplicationBackgrounded,
    ]);
    for (const [, props] of capture.mock.calls as Array<[string, Record<string, unknown>]>) {
      expect(props).not.toHaveProperty('url');
      expect(props).not.toHaveProperty('$screen_url');
    }
  });
});
