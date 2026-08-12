import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

const restorePortrait = () =>
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

export function useActiveFocusOrientation(active: boolean) {
  useEffect(() => {
    if (active) void ScreenOrientation.unlockAsync();
    else void restorePortrait();

    return () => { void restorePortrait(); };
  }, [active]);
}
