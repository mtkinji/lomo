import { Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { indexActivitiesForSpotlight } from './spotlight';

let started = false;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function startSpotlightIndexSync(): void {
  if (started) return;
  started = true;
  if (Platform.OS !== 'ios') return;

  const schedule = (activities: ReturnType<typeof useAppStore.getState>['activities']) => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      void indexActivitiesForSpotlight(activities);
    }, 1000);
  };

  useAppStore.subscribe(
    (s) => s.activities,
    (activities) => {
      schedule(activities);
    },
    { fireImmediately: true },
  );
}


