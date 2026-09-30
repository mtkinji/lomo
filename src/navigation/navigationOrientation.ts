import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

const followDeviceDuringFocus = () => Platform.OS === 'ios'
  ? ScreenOrientation.lockPlatformAsync({
      screenOrientationArrayIOS: [
        ScreenOrientation.Orientation.PORTRAIT_UP,
        ScreenOrientation.Orientation.LANDSCAPE_LEFT,
        ScreenOrientation.Orientation.LANDSCAPE_RIGHT,
      ],
    })
  : ScreenOrientation.unlockAsync();

export function applyNavigationOrientation(
  routeName: string | undefined,
  context: { focusActive?: boolean } = {},
) {
  if (context.focusActive) return followDeviceDuringFocus();
  return routeName === 'Food' || routeName === 'RecipeCookMode'
    ? ScreenOrientation.unlockAsync()
    : ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
}

type NavigationOrientationPolicy = {
  ready: boolean;
  routeName: string | undefined;
  focusActive: boolean;
};

/**
 * The root navigator is the sole JavaScript owner of app orientation.
 * Requests are serialized so a slower, older native lock cannot finish after
 * a newer policy change (for example, ending Focus while landscape activates).
 */
export function useNavigationOrientationPolicy({
  ready,
  routeName,
  focusActive,
}: NavigationOrientationPolicy) {
  const pendingRequestRef = useRef<Promise<void>>(Promise.resolve());
  const hasRequestedRef = useRef(false);

  useEffect(() => {
    if (!ready) return;

    const applyPolicy = () => applyNavigationOrientation(routeName, { focusActive })
      .catch(() => undefined);

    if (!hasRequestedRef.current) {
      hasRequestedRef.current = true;
      pendingRequestRef.current = applyPolicy();
      return;
    }

    pendingRequestRef.current = pendingRequestRef.current.then(applyPolicy, applyPolicy);
  }, [focusActive, ready, routeName]);
}
