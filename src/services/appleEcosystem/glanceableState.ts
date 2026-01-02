import type { Activity } from '../../domain/types';
import { getAppGroupString, setAppGroupString } from './appGroup';

export const KWILT_GLANCEABLE_STATE_KEY = 'kwilt_glanceable_state_v1';

export type GlanceableFocusSession = {
  id: string;
  mode: 'running' | 'paused';
  startedAtMs: number;
  /**
   * Present when running.
   */
  endAtMs?: number;
  /**
   * Present when paused.
   */
  remainingMs?: number;
  activityId: string;
  title: string;
};

export type GlanceableNextUp = {
  activityId: string;
  title: string;
  scheduledAtMs?: number;
  estimateMinutes?: number | null;
};

export type GlanceableTodaySummary = {
  top3: Array<{ activityId: string; title: string }>;
  completedCount: number;
};

export type GlanceableStateV1 = {
  version: 1;
  updatedAtMs: number;
  focusSession?: GlanceableFocusSession | null;
  nextUp?: GlanceableNextUp | null;
  todaySummary?: GlanceableTodaySummary | null;
};

function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function readGlanceableState(): Promise<GlanceableStateV1 | null> {
  const raw = await getAppGroupString(KWILT_GLANCEABLE_STATE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as GlanceableStateV1;
    if (!parsed || parsed.version !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeGlanceableState(next: GlanceableStateV1): Promise<boolean> {
  try {
    return await setAppGroupString(KWILT_GLANCEABLE_STATE_KEY, JSON.stringify(next));
  } catch {
    return false;
  }
}

export async function mergeGlanceableState(
  partial: Partial<Omit<GlanceableStateV1, 'version' | 'updatedAtMs'>>,
): Promise<void> {
  const prev = await readGlanceableState();
  const merged: GlanceableStateV1 = {
    version: 1,
    updatedAtMs: Date.now(),
    focusSession: prev?.focusSession ?? null,
    nextUp: prev?.nextUp ?? null,
    todaySummary: prev?.todaySummary ?? null,
    ...partial,
  };
  await writeGlanceableState(merged);
}

export async function setGlanceableFocusSession(
  focusSession: GlanceableFocusSession | null,
): Promise<void> {
  await mergeGlanceableState({ focusSession });
}

export function buildNextUpSnapshot(
  activities: Activity[],
  now: Date,
  params?: { contextGoalId?: string | null },
): GlanceableNextUp | null {
  const nowMs = now.getTime();
  const contextGoalId = params?.contextGoalId ?? null;
  const scoped = contextGoalId ? activities.filter((a) => a.goalId === contextGoalId) : activities;

  const findNext = (list: Activity[]) =>
    list
    .filter((a) => a.status !== 'done' && a.status !== 'cancelled' && a.status !== 'skipped')
    .map((a) => {
      const scheduledAtMs = a.scheduledAt ? new Date(a.scheduledAt).getTime() : NaN;
      return { activity: a, scheduledAtMs };
    })
    .filter(({ scheduledAtMs }) => Number.isFinite(scheduledAtMs) && scheduledAtMs >= nowMs)
    .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs)[0];

  const upcoming = findNext(scoped) ?? (contextGoalId ? findNext(activities) : undefined);
  if (upcoming) {
    const a = upcoming.activity;
    return {
      activityId: a.id,
      title: a.title,
      scheduledAtMs: upcoming.scheduledAtMs,
      estimateMinutes: a.estimateMinutes ?? null,
    };
  }

  // Fallback: "anytime today" activities.
  const todayKey = toLocalDateKey(now);
  const todayAnytime =
    scoped.find((a) => {
      if (!a.scheduledDate) return false;
      if (a.status === 'done' || a.status === 'cancelled' || a.status === 'skipped') return false;
      const key = toLocalDateKey(new Date(a.scheduledDate));
      return key === todayKey;
    }) ??
    (contextGoalId
      ? activities.find((a) => {
    if (!a.scheduledDate) return false;
    if (a.status === 'done' || a.status === 'cancelled' || a.status === 'skipped') return false;
    const key = toLocalDateKey(new Date(a.scheduledDate));
    return key === todayKey;
        })
      : undefined);
  if (!todayAnytime) return null;
  return {
    activityId: todayAnytime.id,
    title: todayAnytime.title,
    estimateMinutes: todayAnytime.estimateMinutes ?? null,
  };
}

export function buildTodaySummarySnapshot(
  activities: Activity[],
  now: Date,
  params?: { contextGoalId?: string | null },
): GlanceableTodaySummary | null {
  const todayKey = toLocalDateKey(now);
  const contextGoalId = params?.contextGoalId ?? null;
  const scoped = contextGoalId ? activities.filter((a) => a.goalId === contextGoalId) : activities;
  const today = scoped.filter((a) => {
    if (!a.scheduledDate) return false;
    const key = toLocalDateKey(new Date(a.scheduledDate));
    return key === todayKey;
  });
  if (today.length === 0) return null;
  const completedCount = today.filter((a) => a.status === 'done').length;
  const top3 = today
    .filter((a) => a.status !== 'done' && a.status !== 'cancelled' && a.status !== 'skipped')
    .slice(0, 3)
    .map((a) => ({ activityId: a.id, title: a.title }));
  return { top3, completedCount };
}


