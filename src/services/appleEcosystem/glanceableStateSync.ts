import { Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import {
  buildNextUpSnapshot,
  buildTodaySummarySnapshot,
  mergeGlanceableState,
} from './glanceableState';

let started = false;

export function startGlanceableStateSync(): void {
  if (started) return;
  started = true;
  if (Platform.OS !== 'ios') return;

  const writeFromActivities = (
    activities: ReturnType<typeof useAppStore.getState>['activities'],
    contextGoalId: string | null,
  ) => {
    const now = new Date();
    const nextUp = buildNextUpSnapshot(activities, now, { contextGoalId });
    const todaySummary = buildTodaySummarySnapshot(activities, now, { contextGoalId });
    void mergeGlanceableState({ nextUp, todaySummary });
  };

  // Best-effort: keep the blob up to date as Activities change.
  useAppStore.subscribe(
    (s) => ({ activities: s.activities, contextGoalId: s.focusContextGoalId }),
    ({ activities, contextGoalId }) => {
      writeFromActivities(activities, contextGoalId ?? null);
    },
    { fireImmediately: true },
  );
}


