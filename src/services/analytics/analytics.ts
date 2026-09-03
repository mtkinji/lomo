import { Platform } from 'react-native';
import type { PostHog } from 'posthog-react-native';
import { getEnvVar } from '../../utils/getEnv';
import type { AnalyticsEventName } from './events';
import { isAllowedStringProperty } from './eventPropertySchemas';

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

type PosthogProps = Record<string, string | number | boolean | null>;

const SENSITIVE_KEY = /(?:^|_)(?:access_?token|audio|balance|calendar|coordinate|description|email|error|grocery|health|ingredient|invite_(?:code|token)|latitude|location|longitude|merchant|message|narrative|notes?|path|prompt|recipe|secret|text|title|transaction|transcript)(?:$|_)/i;
const SENSITIVE_CAMEL_KEY = /(?:accessToken|calendarEvent|coachContext|fullName|groceryItem|healthSummary|inviteCode|inviteToken|messageBody|precisePath|recipeText)/;
const SENSITIVE_AMOUNT_KEY = /(?:amount|income|expense)(?:_|[A-Z]|$)/;

function isSensitiveAnalyticsKey(key: string): boolean {
  if (key === 'error_code') return false;

  return (
    SENSITIVE_KEY.test(key) ||
    SENSITIVE_CAMEL_KEY.test(key) ||
    SENSITIVE_AMOUNT_KEY.test(key)
  );
}

export function sanitizeAnalyticsProps(
  event: AnalyticsEventName,
  props: AnalyticsProps | undefined,
): PosthogProps | undefined {
  if (!props) return undefined;
  const next: PosthogProps = {};

  for (const [key, value] of Object.entries(props)) {
    if (!key) continue;
    const explicitlyAllowedString = isAllowedStringProperty(event, key);
    if (isSensitiveAnalyticsKey(key) && !explicitlyAllowedString) continue;
    if (value === undefined) continue;

    if (typeof value === 'string') {
      if (value.length > 120) continue;
      if (!explicitlyAllowedString) continue;
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
  const baseProps: PosthogProps = {
    app_env: environment ?? 'unknown',
    platform: Platform.OS,
  };

  try {
    posthog.capture(event, {
      ...baseProps,
      ...(sanitizeAnalyticsProps(event, props) ?? {}),
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
    posthog.identify(distinctId, sanitizeIdentityProps(props));
  } catch (error) {
    if (__DEV__) {
      console.warn('[analytics] posthog identify failed', error);
    }
  }
}

function sanitizeIdentityProps(props: AnalyticsProps | undefined): PosthogProps | undefined {
  if (!props) return undefined;
  const next: PosthogProps = {};
  for (const [key, value] of Object.entries(props)) {
    if (!['account_type', 'app_env', 'platform'].includes(key)) continue;
    if (value === undefined || (typeof value === 'string' && value.length > 120)) continue;
    next[key] = value;
  }
  return next;
}

export function resetAnalyticsIdentity(posthog: PostHog | undefined): void {
  if (!posthog) return;
  try {
    posthog.reset();
  } catch (error) {
    if (__DEV__) console.warn('[analytics] posthog reset failed', error);
  }
}

export function trackScreen(posthog: PostHog | undefined, screenName: string): void {
  if (!posthog || !/^[A-Za-z0-9_.:-]{1,80}$/.test(screenName)) return;
  const environment = getEnvVar<string>('environment');
  try {
    posthog.screen(screenName, {
      app_env: environment ?? 'unknown',
      platform: Platform.OS,
    });
  } catch (error) {
    if (__DEV__) console.warn('[analytics] posthog screen failed', error);
  }
}
