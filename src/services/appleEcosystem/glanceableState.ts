import type { Activity, Arc, Goal } from '../../domain/types';
import { getAppGroupString, setAppGroupString } from './appGroup';
import { getSuggestedActivitiesRanked } from '../recommendations/nextStep';

export const KWILT_GLANCEABLE_STATE_KEY = 'kwilt_glanceable_state_v1';

export type GlanceableWidgetItem = {
  activityId: string;
  title: string;
  scheduledAtMs?: number;
  estimateMinutes?: number | null;
};

export type GlanceableSuggested = {
  items: GlanceableWidgetItem[];
};

export type GlanceableSchedule = {
  items: GlanceableWidgetItem[];
};

export type GlanceableMomentum = {
  completedToday: number;
  completedThisWeek: number;
  showUpStreakDays?: number;
  focusStreakDays?: number;
};

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
  suggested?: GlanceableSuggested | null;
  schedule?: GlanceableSchedule | null;
  momentum?: GlanceableMomentum | null;
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
    suggested: prev?.suggested ?? null,
    schedule: prev?.schedule ?? null,
    momentum: prev?.momentum ?? null,
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

function isActionable(activity: Activity): boolean {
  return activity.status !== 'done' && activity.status !== 'cancelled' && activity.status !== 'skipped';
}

export function buildSuggestedSnapshot(params: {
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  now: Date;
  contextGoalId?: string | null;
  limit?: number;
}): GlanceableSuggested | null {
  const { arcs, goals, activities, now, contextGoalId = null, limit = 8 } = params;
  const scoped = contextGoalId ? activities.filter((a) => a.goalId === contextGoalId) : activities;
  const ranked = getSuggestedActivitiesRanked({ arcs, goals, activities: scoped, now, limit });
  if (ranked.length === 0 && contextGoalId) {
    // Fallback to global list if scoped list is empty.
    const fallback = getSuggestedActivitiesRanked({ arcs, goals, activities, now, limit });
    if (fallback.length === 0) return null;
    return {
      items: fallback.map((a) => ({
        activityId: a.id,
        title: a.title,
        scheduledAtMs: a.scheduledAt ? new Date(a.scheduledAt).getTime() : undefined,
        estimateMinutes: a.estimateMinutes ?? null,
      })),
    };
  }
  if (ranked.length === 0) return null;
  return {
    items: ranked.map((a) => ({
      activityId: a.id,
      title: a.title,
      scheduledAtMs: a.scheduledAt ? new Date(a.scheduledAt).getTime() : undefined,
      estimateMinutes: a.estimateMinutes ?? null,
    })),
  };
}

export function buildScheduleSnapshot(params: {
  activities: Activity[];
  now: Date;
  contextGoalId?: string | null;
  limit?: number;
}): GlanceableSchedule | null {
  const { activities, now, contextGoalId = null, limit = 10 } = params;
  const nowMs = now.getTime();
  const todayKey = toLocalDateKey(now);
  const scoped = contextGoalId ? activities.filter((a) => a.goalId === contextGoalId) : activities;
  const actionable = scoped.filter(isActionable);

  const upcomingTimed = actionable
    .map((a) => {
      const ms = a.scheduledAt ? new Date(a.scheduledAt).getTime() : NaN;
      return { activity: a, scheduledAtMs: ms };
    })
    .filter((x) => Number.isFinite(x.scheduledAtMs) && x.scheduledAtMs >= nowMs)
    .sort((a, b) => a.scheduledAtMs - b.scheduledAtMs);

  const anytimeToday = actionable.filter((a) => {
    if (!a.scheduledDate) return false;
    const when = new Date(a.scheduledDate);
    if (Number.isNaN(when.getTime())) return false;
    return toLocalDateKey(when) === todayKey;
  });

  const items: GlanceableWidgetItem[] = [];
  const seen = new Set<string>();

  for (const u of upcomingTimed) {
    if (items.length >= limit) break;
    const a = u.activity;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    items.push({
      activityId: a.id,
      title: a.title,
      scheduledAtMs: u.scheduledAtMs,
      estimateMinutes: a.estimateMinutes ?? null,
    });
  }

  for (const a of anytimeToday) {
    if (items.length >= limit) break;
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    items.push({
      activityId: a.id,
      title: a.title,
      estimateMinutes: a.estimateMinutes ?? null,
    });
  }

  // Fallback: global if scoped yields nothing.
  if (items.length === 0 && contextGoalId) {
    return buildScheduleSnapshot({ activities, now, contextGoalId: null, limit });
  }

  return items.length > 0 ? { items } : null;
}

export function buildMomentumSnapshot(params: {
  activities: Activity[];
  now: Date;
  showUpStreakDays?: number | null;
  focusStreakDays?: number | null;
}): GlanceableMomentum {
  const { activities, now, showUpStreakDays, focusStreakDays } = params;
  const todayKey = toLocalDateKey(now);

  const completedToday = activities.filter((a) => {
    if (a.status !== 'done') return false;
    if (!a.completedAt) return false;
    const when = new Date(a.completedAt);
    if (Number.isNaN(when.getTime())) return false;
    return toLocalDateKey(when) === todayKey;
  }).length;

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfWeekWindow = startOfToday - 6 * 24 * 60 * 60 * 1000;
  const completedThisWeek = activities.filter((a) => {
    if (a.status !== 'done') return false;
    if (!a.completedAt) return false;
    const ms = new Date(a.completedAt).getTime();
    if (!Number.isFinite(ms)) return false;
    return ms >= startOfWeekWindow && ms <= now.getTime();
  }).length;

  return {
    completedToday,
    completedThisWeek,
    showUpStreakDays: typeof showUpStreakDays === 'number' ? showUpStreakDays : undefined,
    focusStreakDays: typeof focusStreakDays === 'number' ? focusStreakDays : undefined,
  };
}


