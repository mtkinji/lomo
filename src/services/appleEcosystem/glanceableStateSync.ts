import { Platform } from 'react-native';
import { useAppStore } from '../../store/useAppStore';
import { useEntitlementsStore } from '../../store/useEntitlementsStore';
import {
  buildMomentumSnapshot,
  buildNextUpSnapshot,
  buildScheduleSnapshot,
  buildSuggestedSnapshot,
  buildTodaySummarySnapshot,
  mergeGlanceableState,
} from './glanceableState';
import { buildActivitiesWidgetRows } from '../../features/activities/activityViewWidgetData';

let started = false;
let pendingParams:
  | {
      activities: ReturnType<typeof useAppStore.getState>['activities'];
      goals: ReturnType<typeof useAppStore.getState>['goals'];
      arcs: ReturnType<typeof useAppStore.getState>['arcs'];
      contextGoalId: string | null;
      currentShowUpStreak: number;
      currentFocusStreak: number;
      activityViews: ReturnType<typeof useAppStore.getState>['activityViews'];
    }
  | null = null;
let writeTimeout: ReturnType<typeof setTimeout> | null = null;
let lastWriteAtMs = 0;

const WRITE_DEBOUNCE_MS = 1000;
const MIN_WRITE_INTERVAL_MS = 10000;

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
    activityViews: ReturnType<typeof useAppStore.getState>['activityViews'];
  }) => {
    const now = new Date();
    const isPro = Boolean(useEntitlementsStore.getState().isPro);
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

    const activityViews = (params.activityViews ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      isSystem: v.isSystem ?? false,
    }));

    const activitiesWidgetByViewId: Record<string, any> = {};
    for (const view of params.activityViews ?? []) {
      const { rows, totalCount } = buildActivitiesWidgetRows({
        view,
        activities: params.activities,
        isPro,
        now,
        limit: 10,
      });
      activitiesWidgetByViewId[view.id] = {
        viewId: view.id,
        viewName: view.name,
        totalCount,
        rows,
        updatedAtMs: Date.now(),
      };
    }

    void mergeGlanceableState({
      nextUp,
      todaySummary,
      suggested,
      schedule,
      momentum,
      activityViews,
      activitiesWidgetByViewId,
    });
  };

  const scheduleWrite = (params: {
    activities: ReturnType<typeof useAppStore.getState>['activities'];
    goals: ReturnType<typeof useAppStore.getState>['goals'];
    arcs: ReturnType<typeof useAppStore.getState>['arcs'];
    contextGoalId: string | null;
    currentShowUpStreak: number;
    currentFocusStreak: number;
    activityViews: ReturnType<typeof useAppStore.getState>['activityViews'];
  }) => {
    pendingParams = params;
    if (writeTimeout) return;
    const now = Date.now();
    const sinceLast = now - lastWriteAtMs;
    const minDelay = sinceLast >= MIN_WRITE_INTERVAL_MS ? 0 : MIN_WRITE_INTERVAL_MS - sinceLast;
    const delay = Math.max(WRITE_DEBOUNCE_MS, minDelay);
    writeTimeout = setTimeout(() => {
      const next = pendingParams;
      pendingParams = null;
      writeTimeout = null;
      lastWriteAtMs = Date.now();
      if (next) {
        writeFromState(next);
      }
    }, delay);
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
      activityViews: s.activityViews,
    }),
    (next) => {
      scheduleWrite({
        activities: next.activities,
        goals: next.goals,
        arcs: next.arcs,
        contextGoalId: next.contextGoalId ?? null,
        currentShowUpStreak: next.currentShowUpStreak ?? 0,
        currentFocusStreak: next.currentFocusStreak ?? 0,
        activityViews: next.activityViews,
      });
    },
    { fireImmediately: true },
  );
}


