import type { PostHog } from 'posthog-react-native';
import { posthogClient } from './posthogClient';

export function usePostHogSafe(): PostHog | undefined {
  // App.tsx provides this same singleton when analytics is enabled. Reading it
  // directly keeps the intentional opt-out path quiet when no provider exists.
  return posthogClient;
}

