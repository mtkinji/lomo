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
  recommendations: PlanRecommendation[];
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
  const proposalResult = proposeDailyPlan(input);
  const activityById = new Map(input.activities.map((activity) => [activity.id, activity]));
  const goalById = new Map(input.goals.map((goal) => [goal.id, goal]));

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
  ].sort((left, right) => left.priorityPosition - right.priorityPosition);

  return {
    targetDate: input.targetDate.toISOString(),
    recommendations,
  };
}
