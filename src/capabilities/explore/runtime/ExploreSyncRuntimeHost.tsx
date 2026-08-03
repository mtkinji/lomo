import { useEffect } from 'react';
import { AppState } from 'react-native';
import { encodeExploreRecords } from '../domain/exploreSync';
import { syncExploreHistory } from './exploreSyncRepository';
import { useExploreStore } from './useExploreStore';

const SYNC_DEBOUNCE_MS = 1_500;

export function ExploreSyncRuntimeHost({ userId }: { userId: string }) {
  useEffect(() => {
    let cancelled = false;
    let running = false;
    let runAgain = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let lastHistorySignature = JSON.stringify(encodeExploreRecords(useExploreStore.getState(), userId));

    const sync = async () => {
      if (cancelled) return;
      if (running) {
        runAgain = true;
        return;
      }

      running = true;
      try {
        await syncExploreHistory(userId);
      } catch (error) {
        if (__DEV__) console.warn('[Explore sync] History sync failed.', error);
      } finally {
        running = false;
        if (runAgain && !cancelled) {
          runAgain = false;
          void sync();
        }
      }
    };

    const scheduleSync = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        void sync();
      }, SYNC_DEBOUNCE_MS);
    };

    const syncAfterHydration = () => { void sync(); };
    if (useExploreStore.persist.hasHydrated()) syncAfterHydration();
    const unsubscribeHydration = useExploreStore.persist.onFinishHydration(syncAfterHydration);
    const unsubscribeStore = useExploreStore.subscribe((state) => {
      const nextSignature = JSON.stringify(encodeExploreRecords(state, userId));
      if (nextSignature === lastHistorySignature) return;
      lastHistorySignature = nextSignature;
      scheduleSync();
    });
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' || state === 'background') void sync();
    });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      unsubscribeHydration();
      unsubscribeStore();
      appStateSubscription.remove();
    };
  }, [userId]);

  return null;
}
