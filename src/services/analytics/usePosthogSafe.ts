import { usePostHog as usePostHogRaw } from 'posthog-react-native';
import type { PostHog } from 'posthog-react-native';

export function usePostHogSafe(): PostHog | undefined {
  // The upstream hook's TS signature returns PostHog, but runtime returns
  // undefined when no provider is present.
  return usePostHogRaw() as unknown as PostHog | undefined;
}


