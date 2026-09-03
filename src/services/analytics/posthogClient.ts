import PostHog from 'posthog-react-native';
import type { PostHog as PostHogType } from 'posthog-react-native';
import { isPosthogEnabled, posthogApiKey, posthogHost } from './posthog';
import { createAnalyticsConsentRuntime } from './analyticsConsentRuntime';

const runtime = createAnalyticsConsentRuntime<PostHogType>(() =>
  new PostHog(posthogApiKey!, {
        ...(posthogHost ? { host: posthogHost } : {}),
        defaultOptIn: false,
        preloadFeatureFlags: false,
        // The SDK's Application Opened event may include the raw initial URL.
        // Kwilt emits lifecycle events manually with bounded, URL-free props.
        captureAppLifecycleEvents: false,
      }),
);

export let posthogClient: PostHogType | undefined;

export async function applyPosthogConsent(enabled: boolean): Promise<void> {
  const shouldEnable = Boolean(isPosthogEnabled && posthogApiKey && enabled);
  if (!shouldEnable) posthogClient = undefined;
  await runtime.apply(shouldEnable);
  posthogClient = runtime.getClient();
}

/** Clear the signed-in person's analytics identity without changing consent. */
export function clearPosthogIdentity(): void {
  posthogClient?.reset();
}
