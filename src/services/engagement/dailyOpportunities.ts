import type { Activity, Arc, Goal } from '../../domain/types';
import { rootNavigationRef } from '../../navigation/rootNavigationRef';
import { toLocalDateKey } from '../plan/planDates';
import { getSuggestedNextStep, hasAnyActivitiesScheduledForToday } from '../recommendations/nextStep';

export type NextOpportunity = {
  headline: string;
  subheadline?: string;
  primaryMetric?: { value: string; label?: string };
  ctaLabel: string;
  ctaAction?: () => void;
};

export type DailyUnitProgress = {
  completedActivitiesToday: number;
  focusDoneToday: boolean;
  unitsCompleted: number;
  unitsTarget: number;
};

type OpportunityParams = {
  activities: Activity[];
  goals: Goal[];
  arcs: Arc[];
  now: Date;
  lastCompletedFocusSessionDate: string | null;
};

function isCompletedToday(activity: Activity, todayKey: string): boolean {
  if (activity.status !== 'done') return false;
  if (!activity.completedAt) return false;
  const completedAt = new Date(activity.completedAt);
  if (Number.isNaN(completedAt.getTime())) return false;
  return toLocalDateKey(completedAt) === todayKey;
}

export function getDailyUnitProgress(params: {
  activities: Activity[];
  now: Date;
  lastCompletedFocusSessionDate: string | null;
}): DailyUnitProgress {
  const todayKey = toLocalDateKey(params.now);
  const completedActivitiesToday = params.activities.filter((a) =>
    isCompletedToday(a, todayKey),
  ).length;
  const focusDoneToday = params.lastCompletedFocusSessionDate === todayKey;
  const unitsTarget = 3;
  const unitsCompleted = completedActivitiesToday + (focusDoneToday ? 1 : 0);

  return {
    completedActivitiesToday,
    focusDoneToday,
    unitsCompleted,
    unitsTarget,
  };
}

function navigateToActivityDetail(activityId: string, params?: { openFocus?: boolean }) {
  if (!rootNavigationRef.isReady()) return;
  rootNavigationRef.navigate('MainTabs', {
    screen: 'ActivitiesTab',
    params: {
      screen: 'ActivityDetail',
      params: {
        activityId,
        openFocus: params?.openFocus ? true : undefined,
        source: 'next_opportunity',
      },
    },
  });
}

function navigateToActivitiesList(params?: { openSearch?: boolean }) {
  if (!rootNavigationRef.isReady()) return;
  rootNavigationRef.navigate('MainTabs', {
    screen: 'ActivitiesTab',
    params: {
      screen: 'ActivitiesList',
      params: {
        openSearch: params?.openSearch ? true : undefined,
        source: 'next_opportunity',
      },
    },
  });
}

function navigateToGoalsList() {
  if (!rootNavigationRef.isReady()) return;
  rootNavigationRef.navigate('MainTabs', {
    screen: 'GoalsTab',
    params: {
      screen: 'GoalsList',
      params: {
        openCreateGoal: true,
      },
    },
  });
}

function buildSuggestedCta(params: {
  arcs: Arc[];
  goals: Goal[];
  activities: Activity[];
  now: Date;
  preferFocus?: boolean;
}): { ctaLabel: string; ctaAction?: () => void; subheadline?: string } {
  const suggested = getSuggestedNextStep(params);
  if (!suggested) {
    return {
      ctaLabel: 'Open activities',
      ctaAction: () => navigateToActivitiesList(),
    };
  }

  if (suggested.kind === 'activity') {
    if (params.preferFocus) {
      return {
        ctaLabel: 'Start focus on this activity',
        ctaAction: () => navigateToActivityDetail(suggested.activityId, { openFocus: true }),
      };
    }
    return {
      ctaLabel: 'Open activity',
      ctaAction: () => navigateToActivityDetail(suggested.activityId),
    };
  }

  if (suggested.reason === 'no_goals') {
    return {
      ctaLabel: 'Create a goal',
      ctaAction: navigateToGoalsList,
      subheadline: 'Add a goal to unlock daily wins.',
    };
  }

  return {
    ctaLabel: 'Add an activity',
    ctaAction: () => navigateToActivitiesList({ openSearch: true }),
    subheadline: 'Add one activity to get your day started.',
  };
}

export function getNextOpportunity(params: OpportunityParams): NextOpportunity | null {
  const { activities, goals, arcs, now, lastCompletedFocusSessionDate } = params;
  const { focusDoneToday, unitsCompleted, unitsTarget } = getDailyUnitProgress({
    activities,
    now,
    lastCompletedFocusSessionDate,
  });
  const hasScheduledToday = hasAnyActivitiesScheduledForToday({ activities, now });

  if (!hasScheduledToday) {
    const suggestedCta = buildSuggestedCta({ arcs, goals, activities, now });
    return {
      headline: 'Next up: Daily 3',
      subheadline: suggestedCta.subheadline ?? 'Nothing scheduled today — pick one to get started.',
      ctaLabel: suggestedCta.ctaLabel,
      ctaAction: suggestedCta.ctaAction,
    };
  }

  if (unitsCompleted >= unitsTarget) {
    return null;
  }

  const remaining = Math.max(1, unitsTarget - unitsCompleted);
  const suggestedCta = buildSuggestedCta({
    arcs,
    goals,
    activities,
    now,
    preferFocus: !focusDoneToday,
  });
  const remainingLabel = remaining === 1 ? 'one more activity or focus session' : `${remaining} more activities or focus sessions`;

  return {
    headline: 'Next up: Daily 3',
    subheadline: `You're at ${unitsCompleted}/${unitsTarget} — ${remainingLabel}.`,
    primaryMetric: { value: String(unitsCompleted), label: 'of 3 daily units' },
    ctaLabel: suggestedCta.ctaLabel,
    ctaAction: suggestedCta.ctaAction,
  };
}

