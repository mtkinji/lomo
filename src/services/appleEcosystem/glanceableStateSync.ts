import { Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import {
  buildMomentumSnapshot,
  buildNextUpSnapshot,
  buildScheduleSnapshot,
  buildSuggestedSnapshot,
  buildTodaySummarySnapshot,
  mergeGlanceableState,
} from './glanceableState';

let started = false;

export function startGlanceableStateSync(): void {
  if (started) return;
  started = true;
  if (Platform.OS !== 'ios') return;

  const writeFromState = (params: {
    activities: ReturnType<typeof useAppStore.getState>['activities'];
    goals: ReturnType<typeof useAppStore.getState>['goals'];
    arcs: ReturnType<typeof useAppStore.getState>['arcs'];
    contextGoalId: string | null;
    currentShowUpStreak: number;
    currentFocusStreak: number;
  }) => {
    const now = new Date();
    const nextUp = buildNextUpSnapshot(params.activities, now, { contextGoalId: params.contextGoalId });
    const todaySummary = buildTodaySummarySnapshot(params.activities, now, { contextGoalId: params.contextGoalId });
    const suggested = buildSuggestedSnapshot({
      arcs: params.arcs,
      goals: params.goals,
      activities: params.activities,
      now,
      contextGoalId: params.contextGoalId,
      limit: 8,
    });
    const schedule = buildScheduleSnapshot({
      activities: params.activities,
      now,
      contextGoalId: params.contextGoalId,
      limit: 10,
    });
    const momentum = buildMomentumSnapshot({
      activities: params.activities,
      now,
      showUpStreakDays: params.currentShowUpStreak,
      focusStreakDays: params.currentFocusStreak,
    });
    void mergeGlanceableState({ nextUp, todaySummary, suggested, schedule, momentum });
  };

  // Best-effort: keep the blob up to date as Activities change.
  useAppStore.subscribe(
    (s) => ({
      activities: s.activities,
      goals: s.goals,
      arcs: s.arcs,
      contextGoalId: s.focusContextGoalId,
      currentShowUpStreak: s.currentShowUpStreak,
      currentFocusStreak: s.currentFocusStreak,
    }),
    (next) => {
      writeFromState({
        activities: next.activities,
        goals: next.goals,
        arcs: next.arcs,
        contextGoalId: next.contextGoalId ?? null,
        currentShowUpStreak: next.currentShowUpStreak ?? 0,
        currentFocusStreak: next.currentFocusStreak ?? 0,
      });
    },
    { fireImmediately: true },
  );
}


