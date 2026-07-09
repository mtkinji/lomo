import type { Activity } from '../../domain/types';
import { deriveStatusFromSteps } from '../activities/activityStepStatus';

export type PlanActivityCompletionAction = {
  label: string;
  meta: string;
  completedSteps: number;
  totalSteps: number;
  isDone: boolean;
};

export function getPlanActivityCompletionAction(activity: Activity): PlanActivityCompletionAction {
  const steps = activity.steps ?? [];
  const totalSteps = steps.length;
  const completedSteps = steps.filter((step) => Boolean(step.completedAt)).length;
  const isDone = activity.status === 'done';

  if (isDone) {
    return {
      label: 'Undo completion',
      meta: totalSteps > 0 ? `${completedSteps}/${totalSteps} steps checked` : 'Marked complete',
      completedSteps,
      totalSteps,
      isDone,
    };
  }

  if (totalSteps === 0 || completedSteps === totalSteps) {
    return {
      label: 'Mark complete',
      meta: totalSteps > 0 ? `${completedSteps}/${totalSteps} steps checked` : 'Close the loop from Plan',
      completedSteps,
      totalSteps,
      isDone,
    };
  }

  return {
    label: 'Finish remaining',
    meta: `${completedSteps}/${totalSteps} steps checked`,
    completedSteps,
    totalSteps,
    isDone,
  };
}

export function applyPlanActivityCompletionAction(activity: Activity, timestamp: string): Activity {
  const steps = activity.steps ?? [];

  if (steps.length === 0) {
    const nextIsDone = activity.status !== 'done';
    return {
      ...activity,
      status: nextIsDone ? 'done' : 'planned',
      completedAt: nextIsDone ? timestamp : null,
      updatedAt: timestamp,
    };
  }

  if (activity.status === 'done') {
    return {
      ...activity,
      status: 'in_progress',
      completedAt: null,
      updatedAt: timestamp,
    };
  }

  const allStepsComplete = steps.every((step) => Boolean(step.completedAt));
  if (allStepsComplete) {
    return {
      ...activity,
      status: 'done',
      completedAt: activity.completedAt ?? timestamp,
      updatedAt: timestamp,
    };
  }

  const nextSteps = steps.map((step) =>
    step.completedAt ? step : { ...step, completedAt: timestamp },
  );
  const { nextStatus, nextCompletedAt } = deriveStatusFromSteps({
    prevStatus: activity.status,
    prevSteps: steps,
    nextSteps,
    timestamp,
    prevCompletedAt: activity.completedAt,
  });

  return {
    ...activity,
    steps: nextSteps,
    status: nextStatus,
    completedAt: nextCompletedAt,
    updatedAt: timestamp,
  };
}
