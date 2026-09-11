import type { Activity, KanbanGroupBy } from '../../domain/types';

export type KanbanDestination = {
  groupBy: KanbanGroupBy;
  toColumnId: string;
};

export type KanbanMoveUndoSnapshot = Pick<
  Activity,
  'goalId' | 'phase' | 'priority' | 'status' | 'completedAt' | 'orderIndex'
>;

export function getKanbanColumnIdForActivity(
  activity: Activity,
  groupBy: KanbanGroupBy,
): string {
  switch (groupBy) {
    case 'status':
      return activity.status;
    case 'priority':
      return activity.priority === 1 ? 'starred' : 'normal';
    case 'goal':
      return activity.goalId ?? 'no-goal';
    case 'phase':
      return activity.phase ?? 'no-phase';
    default:
      return activity.status;
  }
}

export function applyKanbanDestination({
  activity,
  destination,
  validGoalIds,
  atIso,
  nextOrderIndex,
}: {
  activity: Activity;
  destination: KanbanDestination;
  validGoalIds: ReadonlySet<string>;
  atIso: string;
  nextOrderIndex: number;
}): { activity: Activity; didMove: boolean } {
  const { groupBy, toColumnId } = destination;
  if (getKanbanColumnIdForActivity(activity, groupBy) === toColumnId) {
    return { activity, didMove: false };
  }

  const patch: Partial<Activity> = {};
  if (groupBy === 'status') {
    patch.status = toColumnId as Activity['status'];
    if (toColumnId === 'done') {
      patch.completedAt = activity.completedAt ?? atIso;
    } else if (activity.status === 'done') {
      patch.completedAt = null;
    }
  } else if (groupBy === 'priority') {
    patch.priority = toColumnId === 'starred' ? 1 : undefined;
  } else if (groupBy === 'goal') {
    if (toColumnId === 'no-goal') {
      patch.goalId = null;
    } else if (validGoalIds.has(toColumnId)) {
      patch.goalId = toColumnId;
    } else {
      return { activity, didMove: false };
    }
  } else if (groupBy === 'phase') {
    patch.phase = toColumnId === 'no-phase' ? null : toColumnId;
  }

  return {
    didMove: true,
    activity: {
      ...activity,
      ...patch,
      orderIndex: nextOrderIndex,
      updatedAt: atIso,
    },
  };
}

export function buildKanbanMoveUndoSnapshot(activity: Activity): KanbanMoveUndoSnapshot {
  return {
    goalId: activity.goalId,
    phase: activity.phase,
    priority: activity.priority,
    status: activity.status,
    completedAt: activity.completedAt,
    orderIndex: activity.orderIndex,
  };
}

export function restoreKanbanMoveUndoSnapshot(
  activity: Activity,
  snapshot: KanbanMoveUndoSnapshot,
  atIso: string,
): Activity {
  return {
    ...activity,
    ...snapshot,
    updatedAt: atIso,
  };
}
