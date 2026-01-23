import type { ActivityStatus, ActivityStep } from '../../domain/types';

/**
 * Canonical: derive Activity status + completedAt from step completion state.
 * Extracted from ActivityDetailScreen to keep step-driven completion semantics consistent.
 */
export function deriveStatusFromSteps(args: {
  prevStatus: ActivityStatus;
  prevSteps: ActivityStep[];
  nextSteps: ActivityStep[];
  timestamp: string;
  prevCompletedAt?: string | null;
}): { nextStatus: ActivityStatus; nextCompletedAt: string | null } {
  const { prevStatus, prevSteps, nextSteps, timestamp, prevCompletedAt } = args;
  if (nextSteps.length === 0) {
    return { nextStatus: prevStatus, nextCompletedAt: prevCompletedAt ?? null };
  }

  const prevAllStepsComplete = prevSteps.length > 0 && prevSteps.every((s) => !!s.completedAt);
  const allStepsComplete = nextSteps.length > 0 && nextSteps.every((s) => !!s.completedAt);
  const anyStepComplete = nextSteps.some((s) => !!s.completedAt);

  let nextStatus: ActivityStatus = prevStatus;
  if (allStepsComplete) {
    // Key UX: when a user checks the last step, we auto-mark the activity done once.
    // But if they later un-mark the activity as not done, we should NOT force it back to done
    // just because the steps remain checked.
    if (!prevAllStepsComplete && prevStatus !== 'done') {
      nextStatus = 'done';
    } else if (prevStatus === 'done') {
      nextStatus = 'done';
    } else {
      nextStatus = 'in_progress';
    }
  } else if (anyStepComplete) {
    nextStatus = 'in_progress';
  } else {
    nextStatus = 'planned';
  }

  const nextCompletedAt = nextStatus === 'done' ? (prevCompletedAt ?? timestamp) : null;

  return { nextStatus, nextCompletedAt };
}


