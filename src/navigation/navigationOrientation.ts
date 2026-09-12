import { useEffect, useRef } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

export function applyNavigationOrientation(
  routeName: string | undefined,
  context: { focusVideoActive?: boolean } = {},
) {
  if (context.focusVideoActive) {
    return ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }
  return routeName === 'Food' || routeName === 'RecipeCookMode'
    ? ScreenOrientation.unlockAsync()
    : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

type NavigationOrientationPolicy = {
  ready: boolean;
  routeName: string | undefined;
  focusVideoActive: boolean;
};

/**
 * The root navigator is the sole JavaScript owner of app orientation.
 * Requests are serialized so a slower, older native lock cannot finish after
 * a newer policy change (for example, ending Focus while landscape activates).
 */
export function useNavigationOrientationPolicy({
  ready,
  routeName,
  focusVideoActive,
}: NavigationOrientationPolicy) {
  const pendingRequestRef = useRef<Promise<void>>(Promise.resolve());
  const hasRequestedRef = useRef(false);
  const readyAtRef = useRef<number | undefined>(undefined);

  if (ready && readyAtRef.current === undefined) readyAtRef.current = Date.now();

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    const applyPolicy = () => applyNavigationOrientation(routeName, { focusVideoActive })
      .catch(() => undefined);

    const enqueuePolicy = () => {
      if (cancelled) return;
      if (!hasRequestedRef.current) {
        hasRequestedRef.current = true;
        pendingRequestRef.current = applyPolicy();
        return;
      }

      pendingRequestRef.current = pendingRequestRef.current.then(applyPolicy, applyPolicy);
    };

    // On a cold launch with a persisted Focus session, iOS can receive the first
    // landscape request before the window scene has finished attaching. The mask
    // changes, but the portrait canvas stays in place and renders the app sideways.
    // Avoid issuing that premature lock at all. Persisted state can hydrate just
    // after the root's first portrait policy, so use the launch window rather
    // than whether another policy was already requested.
    const launchElapsed = Date.now() - (readyAtRef.current ?? Date.now());
    const launchDelay = Math.max(0, 1200 - launchElapsed);
    const deferLaunchLandscape = focusVideoActive && launchDelay > 0;
    if (!deferLaunchLandscape) enqueuePolicy();

    const launchRetry = deferLaunchLandscape
      ? setTimeout(enqueuePolicy, launchDelay)
      : undefined;

    return () => {
      cancelled = true;
      if (launchRetry !== undefined) clearTimeout(launchRetry);
    };
  }, [focusVideoActive, ready, routeName]);
}
