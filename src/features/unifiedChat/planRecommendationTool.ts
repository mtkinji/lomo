import type {
  Activity,
  ActivityArea,
  Arc,
  Goal,
  UserProfile,
} from '../../domain/types';
import {
  proposeDailyPlan,
  type PlanUnplacedPriorityReason,
} from '../../services/plan/planScheduling';
import type { BusyInterval } from '../../services/scheduling/schedulingEngine';
import { sortActivitiesByPriorityRanking } from '@kwilt/plan-core';
import { toLocalDateKey } from '../../services/plan/planDates';

export type PlanRecommendation = {
  activityId: string;
  expectedUpdatedAt: string;
  title: string;
  goalTitle: string | null;
  priorityPosition: number;
  placement:
    | { status: 'placed'; startDate: string; endDate: string; calendarId: string }
    | { status: 'unplaced'; reason: PlanUnplacedPriorityReason };
};

export type PlanRecommendationResult = {
  targetDate: string;
  scheduledItems?: PlanScheduledItem[];
  recommendations: PlanRecommendation[];
};

export type PlanScheduledItem = {
  activityId: string;
  title: string;
  goalTitle: string | null;
  placement: 'calendar' | 'day';
  startDate: string | null;
  endDate: string | null;
};

export function resolvePlanTargetDate(
  referenceDate: Date,
  relativeDay: 'today' | 'tomorrow',
): Date {
  const target = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    12,
    0,
    0,
    0,
  );
  if (relativeDay === 'tomorrow') target.setDate(target.getDate() + 1);
  return target;
}

export function buildPlanRecommendations(input: {
  activities: Activity[];
  goals: Goal[];
  arcs: Arc[];
  userProfile: UserProfile | null;
  targetDate: Date;
  busyIntervals: BusyInterval[];
  writeCalendarId: string | null;
  maxItems?: number;
  dismissedActivityIds?: string[] | Set<string>;
  activityAreas?: ActivityArea[];
}): PlanRecommendationResult {
  const activityById = new Map(input.activities.map((activity) => [activity.id, activity]));
  const goalById = new Map(input.goals.map((goal) => [goal.id, goal]));
  const targetDateKey = toLocalDateKey(input.targetDate);
  const openActivities = input.activities.filter((activity) =>
    activity.status !== 'done' && activity.status !== 'skipped' && activity.status !== 'cancelled');
  const calendarActivities = openActivities
    .filter((activity) => {
      if (!activity.scheduledAt) return false;
      const start = new Date(activity.scheduledAt);
      return !Number.isNaN(start.getTime()) && toLocalDateKey(start) === targetDateKey;
    })
    .sort((left, right) => new Date(left.scheduledAt!).getTime() - new Date(right.scheduledAt!).getTime());
  const calendarIds = new Set(calendarActivities.map((activity) => activity.id));
  const dayActivities = sortActivitiesByPriorityRanking({
    activities: openActivities.filter((activity) =>
      !calendarIds.has(activity.id) && activity.scheduledDate === targetDateKey),
    goals: input.goals,
    now: input.targetDate,
  });
  const scheduledItems: PlanScheduledItem[] = [
    ...calendarActivities.map((activity): PlanScheduledItem => {
      const start = new Date(activity.scheduledAt!);
      const end = new Date(start.getTime() + Math.max(10, activity.estimateMinutes ?? 30) * 60_000);
      return {
        activityId: activity.id,
        title: activity.title,
        goalTitle: activity.goalId ? goalById.get(activity.goalId)?.title ?? null : null,
        placement: 'calendar',
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      };
    }),
    ...dayActivities.map((activity): PlanScheduledItem => ({
      activityId: activity.id,
      title: activity.title,
      goalTitle: activity.goalId ? goalById.get(activity.goalId)?.title ?? null : null,
      placement: 'day',
      startDate: null,
      endDate: null,
    })),
  ];
  const scheduledIds = new Set(scheduledItems.map((item) => item.activityId));
  const proposalResult = proposeDailyPlan({
    ...input,
    activities: input.activities.filter((activity) => !scheduledIds.has(activity.id)),
  });

  const recommendations: PlanRecommendation[] = [
    ...proposalResult.proposals.map((proposal): PlanRecommendation => {
      const activity = activityById.get(proposal.activityId);
      const goal = activity?.goalId ? goalById.get(activity.goalId) : null;
      return {
        activityId: proposal.activityId,
        expectedUpdatedAt: activity?.updatedAt ?? '',
        title: activity?.title ?? proposal.title,
        goalTitle: goal?.title ?? null,
        priorityPosition: proposal.priorityPosition ?? 0,
        placement: {
          status: 'placed',
          startDate: proposal.startDate,
          endDate: proposal.endDate,
          calendarId: proposal.calendarId,
        },
      };
    }),
    ...proposalResult.unplacedPriorityCandidates.map((candidate): PlanRecommendation => {
      const activity = activityById.get(candidate.activityId);
      const goal = activity?.goalId ? goalById.get(activity.goalId) : null;
      return {
        activityId: candidate.activityId,
        expectedUpdatedAt: activity?.updatedAt ?? '',
        title: activity?.title ?? 'Untitled Activity',
        goalTitle: goal?.title ?? null,
        priorityPosition: candidate.priorityPosition,
        placement: { status: 'unplaced', reason: candidate.reason },
      };
    }),
  ].filter((item) => !scheduledIds.has(item.activityId))
    .sort((left, right) => left.priorityPosition - right.priorityPosition);

  return {
    targetDate: input.targetDate.toISOString(),
    scheduledItems,
    recommendations,
  };
}
