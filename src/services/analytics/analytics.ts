import { Platform } from 'react-native';
import type { PostHog } from 'posthog-react-native';
import { getEnvVar } from '../../utils/getEnv';
import type { AnalyticsEventName } from './events';

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

type PosthogProps = Record<string, string | number | boolean | null>;

const SENSITIVE_KEY = /(?:^|_)(?:access_?token|audio|balance|calendar|coordinate|description|email|error|grocery|health|ingredient|invite_(?:code|token)|latitude|location|longitude|merchant|message|narrative|notes?|path|prompt|recipe|secret|text|title|transaction|transcript)(?:$|_)/i;
const SENSITIVE_CAMEL_KEY = /(?:accessToken|calendarEvent|coachContext|fullName|groceryItem|healthSummary|inviteCode|inviteToken|messageBody|precisePath|recipeText)/;
const SENSITIVE_AMOUNT_KEY = /(?:amount|income|expense)(?:_|[A-Z]|$)/;

const SAFE_STRING_KEY = /^(?:action|app_env|capability|capability_id|channel|code|error_code|event_name|job_intent|kind|method|mode|next_status|outcome|platform|product_id|provider|reason|route_name|source|source_kind|source_type|sourceType|state|status|store|surface|target_route|trigger|type|variant|visibilityContract|visibility_contract)$/;
const SAFE_IDENTIFIER_KEY = /(?:_id|Id)$/;
const SAFE_HASH_KEY = /(?:_hash|Hash)$/;

function isSensitiveAnalyticsKey(key: string): boolean {
  if (key === 'error_code') return false;

  return (
    SENSITIVE_KEY.test(key) ||
    SENSITIVE_CAMEL_KEY.test(key) ||
    SENSITIVE_AMOUNT_KEY.test(key)
  );
}

export function sanitizeAnalyticsProps(
  props: AnalyticsProps | undefined,
): PosthogProps | undefined {
  if (!props) return undefined;
  const next: PosthogProps = {};

  for (const [key, value] of Object.entries(props)) {
    if (!key) continue;
    if (isSensitiveAnalyticsKey(key)) continue;
    if (value === undefined) continue;

    if (typeof value === 'string') {
      if (value.length > 120) continue;
      if (
        !SAFE_STRING_KEY.test(key) &&
        !SAFE_IDENTIFIER_KEY.test(key) &&
        !SAFE_HASH_KEY.test(key)
      ) {
        continue;
      }
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
      ...(sanitizeAnalyticsProps(props) ?? {}),
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
    posthog.identify(distinctId, sanitizeAnalyticsProps(props));
  } catch (error) {
    if (__DEV__) {
      console.warn('[analytics] posthog identify failed', error);
    }
  }
}
