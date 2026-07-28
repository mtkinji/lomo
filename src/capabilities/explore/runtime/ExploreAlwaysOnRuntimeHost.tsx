import { useEffect } from 'react';
import * as Location from 'expo-location';
import {
  isExploreLocationServiceStarted,
  startExploreBackgroundUpdates,
  stopExploreBackgroundUpdates,
} from './exploreLocationUpdates';
import { useExploreStore } from './useExploreStore';

export function ExploreAlwaysOnRuntimeHost() {
  useEffect(() => {
    let cancelled = false;
    const reconcile = async () => {
      const state = useExploreStore.getState();
      if (state.preferences.recording !== 'automatic') return;
      const [foreground, background, started] = await Promise.all([
        Location.getForegroundPermissionsAsync().catch(() => null),
        Location.getBackgroundPermissionsAsync().catch(() => null),
        isExploreLocationServiceStarted(),
      ]);
      if (cancelled || foreground?.status !== 'granted' || background?.status !== 'granted') return;
      const current = useExploreStore.getState();
      if (current.preferences.recording !== 'automatic') return;
      const needsSession = !current.activeSession;
      if (needsSession) current.startSession(undefined, undefined, 'ambient');
      if (!started || needsSession) await startExploreBackgroundUpdates('automatic');
    };
    if (useExploreStore.persist.hasHydrated()) void reconcile();
    const unsubscribe = useExploreStore.persist.onFinishHydration(() => { void reconcile(); });
    return () => {
      cancelled = true;
      unsubscribe();
      void stopExploreBackgroundUpdates();
    };
  }, []);
  return null;
}
