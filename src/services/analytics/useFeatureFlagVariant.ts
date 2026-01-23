import { useEffect, useMemo, useState } from 'react';
import { usePostHogSafe } from './usePosthogSafe';

type PosthogFeatureFlagValue = boolean | string | null | undefined;

function normalizeVariant(value: PosthogFeatureFlagValue): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * PostHog-backed multivariate flag hook.
 *
 * - Returns `fallback` when PostHog isn't available or the flag is not a string variant.
 * - Updates automatically when PostHog feature flags refresh.
 */
export function useFeatureFlagVariant(flagKey: string, fallback?: string): string | undefined {
  const posthog = usePostHogSafe();
  const stableKey = useMemo(() => flagKey.trim(), [flagKey]);
  const [variant, setVariant] = useState<string | undefined>(fallback);

  useEffect(() => {
    if (!posthog || !stableKey) {
      setVariant(fallback);
      return;
    }

    let cancelled = false;

    const read = (): string | undefined => {
      try {
        const anyPosthog = posthog as any;
        if (typeof anyPosthog.getFeatureFlag === 'function') {
          const result = anyPosthog.getFeatureFlag(stableKey) as PosthogFeatureFlagValue;
          const normalized = normalizeVariant(result);
          if (normalized) return normalized;
        }
      } catch {
        // Fall through to fallback.
      }
      return fallback;
    };

    setVariant(read());

    // Best-effort refresh; safe to call even if flags are already loaded.
    try {
      const anyPosthog = posthog as any;
      if (typeof anyPosthog.reloadFeatureFlags === 'function') {
        anyPosthog.reloadFeatureFlags();
      }
    } catch {
      // ignore
    }

    let unsubscribe: undefined | (() => void) | { unsubscribe?: () => void; remove?: () => void };
    try {
      const anyPosthog = posthog as any;
      if (typeof anyPosthog.onFeatureFlags === 'function') {
        unsubscribe = anyPosthog.onFeatureFlags(() => {
          if (cancelled) return;
          setVariant(read());
        });
      }
    } catch {
      // ignore
    }

    return () => {
      cancelled = true;
      try {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        } else if (unsubscribe && typeof unsubscribe.unsubscribe === 'function') {
          unsubscribe.unsubscribe();
        } else if (unsubscribe && typeof unsubscribe.remove === 'function') {
          unsubscribe.remove();
        }
      } catch {
        // ignore
      }
    };
  }, [posthog, stableKey, fallback]);

  return variant;
}


