import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootDrawerParamList } from './RootNavigator';

/**
 * Navigation container ref used for global navigation (e.g. notifications).
 *
 * IMPORTANT: Keep this in a standalone module to avoid require-cycles like:
 * RootNavigator -> SomeScreen -> RootNavigator.
 */
export const rootNavigationRef = createNavigationContainerRef<RootDrawerParamList>();

/**
 * Best-effort helper for calling `navigate()` from outside React components
 * (deep link handlers, background services, etc.).
 *
 * React Navigation throws/logs an error if you navigate before the
 * NavigationContainer mounts. This helper retries briefly so app-start deep
 * links don't crash the console in dev builds.
 */
export function navigateWhenReady(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...args: any[]
): { ok: true } | { ok: false; reason: 'not_ready' } {
  // React Navigation's `navigate` is overloaded; spreading a generic array into it
  // fails typechecking under TS 5.9+. Invoke through a rest-typed shim instead.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigate = rootNavigationRef.navigate as unknown as (...a: any[]) => void;

  const tryNavigate = (attempt: number) => {
    if (rootNavigationRef.isReady()) {
      try {
        navigate(...args);
      } catch {
        // best-effort
      }
      return;
    }
    if (attempt >= 25) return;
    setTimeout(() => tryNavigate(attempt + 1), 50);
  };

  if (!rootNavigationRef.isReady()) {
    tryNavigate(0);
    return { ok: false, reason: 'not_ready' };
  }

  try {
    navigate(...args);
  } catch {
    // best-effort
  }
  return { ok: true };
}


