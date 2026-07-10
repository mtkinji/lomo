import type { Activity, ActivityStatus } from '../../domain/types';

export type ActivityCompletionUndoSnapshot = {
  status: ActivityStatus;
  completedAt: string | null;
  stepCompletedAtById: Record<string, string | null>;
};

export function buildActivityCompletionUndoSnapshot(
  activity: Activity,
): ActivityCompletionUndoSnapshot {
  return {
    status: activity.status,
    completedAt: activity.completedAt ?? null,
    stepCompletedAtById: Object.fromEntries(
      (activity.steps ?? []).map((step) => [step.id, step.completedAt ?? null]),
    ),
  };
}

export function restoreActivityCompletionFromSnapshot(params: {
  activity: Activity;
  snapshot: ActivityCompletionUndoSnapshot;
  representedCompletedAt: string;
  restoredAt: string;
}): { activity: Activity; didRestore: boolean } {
  const { activity, snapshot, representedCompletedAt, restoredAt } = params;

  if (activity.status !== 'done' || activity.completedAt !== representedCompletedAt) {
    return { activity, didRestore: false };
  }

  return {
    activity: {
      ...activity,
      status: snapshot.status,
      completedAt: snapshot.completedAt,
      steps: activity.steps?.map((step) => {
        if (step.completedAt !== representedCompletedAt) return step;
        if (!Object.prototype.hasOwnProperty.call(snapshot.stepCompletedAtById, step.id)) return step;
        return {
          ...step,
          completedAt: snapshot.stepCompletedAtById[step.id],
        };
      }),
      updatedAt: restoredAt,
    },
    didRestore: true,
  };
}
