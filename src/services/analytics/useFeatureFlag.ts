import { useEffect, useMemo, useState } from 'react';
import { usePostHogSafe } from './usePosthogSafe';

type PosthogFeatureFlagValue = boolean | string | null | undefined;

function coerceFeatureFlagValue(value: PosthogFeatureFlagValue): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return undefined;
  if (['1', 'true', 'on', 'enabled', 'enable', 'yes', 'y'].includes(normalized)) return true;
  if (['0', 'false', 'off', 'disabled', 'disable', 'no', 'n'].includes(normalized)) return false;
  // If a multivariate flag returns a variant key (e.g. "test"), treat it as enabled.
  return true;
}

/**
 * PostHog-backed feature flag hook.
 *
 * - Returns `fallback` when PostHog isn't available.
 * - Updates automatically when PostHog feature flags refresh.
 */
export function useFeatureFlag(flagKey: string, fallback: boolean = false): boolean {
  const posthog = usePostHogSafe();
  const stableKey = useMemo(() => flagKey.trim(), [flagKey]);
  const [enabled, setEnabled] = useState<boolean>(fallback);

  useEffect(() => {
    if (!posthog || !stableKey) {
      setEnabled(fallback);
      return;
    }

    let cancelled = false;

    const read = (): boolean => {
      try {
        const anyPosthog = posthog as any;
        if (typeof anyPosthog.isFeatureEnabled === 'function') {
          const result = anyPosthog.isFeatureEnabled(stableKey);
          if (typeof result === 'boolean') return result;
        }
        if (typeof anyPosthog.getFeatureFlag === 'function') {
          const result = anyPosthog.getFeatureFlag(stableKey) as PosthogFeatureFlagValue;
          const coerced = coerceFeatureFlagValue(result);
          if (typeof coerced === 'boolean') return coerced;
        }
      } catch {
        // Fall through to fallback.
      }
      return fallback;
    };

    setEnabled(read());

    // Best-effort refresh; safe to call even if flags are already loaded.
    try {
      const anyPosthog = posthog as any;
      if (typeof anyPosthog.reloadFeatureFlags === 'function') {
        anyPosthog.reloadFeatureFlags();
      }
    } catch {
      // ignore
    }

    let unsubscribe: undefined | (() => void);
    try {
      const anyPosthog = posthog as any;
      if (typeof anyPosthog.onFeatureFlags === 'function') {
        unsubscribe = anyPosthog.onFeatureFlags(() => {
          if (cancelled) return;
          setEnabled(read());
        });
      }
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
      try {
        unsubscribe?.();
      } catch {
        // ignore
      }
    };
  }, [posthog, stableKey, fallback]);

  return enabled;
}


