import { Platform } from 'react-native';
import type { PostHog } from 'posthog-react-native';
import { getEnvVar } from '../../utils/getEnv';
import type { AnalyticsEventName } from './events';

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

const REDACT_KEYS = new Set([
  'prompt',
  'message',
  'messages',
  'text',
  'description',
  'narrative',
  'notes',
  'coachContextRaw',
  'coachContextSummary',
  'identitySummary',
  'email',
  'fullName',
]);

function sanitizeProps(props: AnalyticsProps | undefined): AnalyticsProps | undefined {
  if (!props) return undefined;
  const next: AnalyticsProps = {};

  for (const [key, value] of Object.entries(props)) {
    if (!key) continue;
    if (REDACT_KEYS.has(key)) continue;
    if (value === undefined) continue;

    if (typeof value === 'string') {
      // Avoid shipping user-entered free-form text. Keep only short identifiers.
      if (value.length > 120) continue;
      next[key] = value;
      continue;
    }

    next[key] = value;
  }

  return next;
}

export function track(
  posthog: PostHog | undefined,
  event: AnalyticsEventName,
  props?: AnalyticsProps,
): void {
  if (!posthog) return;

  const environment = getEnvVar<string>('environment');
  const baseProps: AnalyticsProps = {
    app_env: environment ?? 'unknown',
    platform: Platform.OS,
  };

  try {
    posthog.capture(event, {
      ...baseProps,
      ...(sanitizeProps(props) ?? {}),
    });
  } catch (error) {
    if (__DEV__) {
      console.warn('[analytics] posthog capture failed', event, error);
    }
  }
}

export function identify(
  posthog: PostHog | undefined,
  distinctId: string,
  props?: AnalyticsProps,
): void {
  if (!posthog) return;

  try {
    posthog.identify(distinctId, sanitizeProps(props));
  } catch (error) {
    if (__DEV__) {
      console.warn('[analytics] posthog identify failed', error);
    }
  }
}


