import { useEffect } from 'react';
import * as ScreenOrientation from 'expo-screen-orientation';

const lockPortrait = () => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);

export function useActiveGameOrientation(active: boolean) {
  useEffect(() => {
    if (active) void ScreenOrientation.unlockAsync();
    else void lockPortrait();

    return () => { void lockPortrait(); };
  }, [active]);
}
