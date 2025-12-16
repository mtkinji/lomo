import PostHog from 'posthog-react-native';
import type { PostHog as PostHogType } from 'posthog-react-native';
import { isPosthogEnabled, posthogApiKey, posthogHost } from './posthog';

export const posthogClient: PostHogType | undefined =
  isPosthogEnabled && posthogApiKey
    ? new PostHog(posthogApiKey, {
        ...(posthogHost ? { host: posthogHost } : {}),
        captureAppLifecycleEvents: true,
      })
    : undefined;


