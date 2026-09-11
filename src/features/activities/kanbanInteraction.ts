import type { Activity, KanbanGroupBy } from '../../domain/types';

export type KanbanDestination = {
  groupBy: KanbanGroupBy;
  toColumnId: string;
};

export type KanbanDropZoneMeasurement = {
  columnId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  contentX?: number;
  contentY?: number;
  contentWidth?: number;
  contentHeight?: number;
  items: Array<{
    activityId: string;
    x?: number;
    width?: number;
    top: number;
    bottom: number;
  }>;
};

export type KanbanDropPlacement = {
  columnId: string;
  /** null means append; undefined means the active sort owns position. */
  beforeActivityId?: string | null;
};

export type KanbanDropSettleTarget = {
  x: number;
  y: number;
  width: number;
};

export type KanbanDropMode =
  | 'exact-placement'
  | 'reorder-unavailable'
  | 'sorted-column-move';

/**
 * The worklet's x-only column estimate keeps hover feedback responsive, but it
 * cannot tell whether the finger is still vertically inside the board. Only a
 * measured placement (column surface or destination strip) may authorize a
 * mutation when the gesture ends.
 */
export function resolveKanbanDropCommitColumnId({
  measuredPlacement,
  gestureColumnId: _gestureColumnId,
}: {
  measuredPlacement: KanbanDropPlacement | null;
  gestureColumnId: string | null;
}): string | null {
  return measuredPlacement?.columnId ?? null;
}

export function getKanbanDropMode({
  canReorder,
  sourceColumnId,
  destinationColumnId,
}: {
  canReorder: boolean;
  sourceColumnId: string | null;
  destinationColumnId: string;
}): KanbanDropMode {
  if (canReorder) return 'exact-placement';
  return sourceColumnId === destinationColumnId
    ? 'reorder-unavailable'
    : 'sorted-column-move';
}

export function getKanbanAutoScrollDelta({
  pointer,
  viewportStart,
  viewportEnd,
  edgeSize,
  maxStep,
}: {
  pointer: number;
  viewportStart: number;
  viewportEnd: number;
  edgeSize: number;
  maxStep: number;
}): number {
  if (
    !Number.isFinite(pointer) ||
    !Number.isFinite(viewportStart) ||
    !Number.isFinite(viewportEnd) ||
    viewportEnd <= viewportStart ||
    edgeSize <= 0 ||
    maxStep <= 0 ||
    pointer < viewportStart ||
    pointer > viewportEnd
  ) return 0;

  const effectiveEdge = Math.min(edgeSize, (viewportEnd - viewportStart) / 2);
  const topDistance = pointer - viewportStart;
  if (topDistance < effectiveEdge) {
    return -maxStep * (1 - (topDistance / effectiveEdge));
  }
  const bottomDistance = viewportEnd - pointer;
  if (bottomDistance < effectiveEdge) {
    return maxStep * (1 - (bottomDistance / effectiveEdge));
  }
  return 0;
}

export function resolveKanbanDropSettleTarget({
  placement,
  measurements,
  itemGap,
}: {
  placement: KanbanDropPlacement | null;
  measurements: KanbanDropZoneMeasurement[];
  itemGap: number;
}): KanbanDropSettleTarget | null {
  // `undefined` is deliberately distinct from `null`: null is an exact
  // append slot, while undefined means an active sort owns final placement.
  if (!placement || placement.beforeActivityId === undefined) return null;
  const column = measurements.find((measurement) => measurement.columnId === placement.columnId);
  if (!column) return null;

  const beforeItem = placement.beforeActivityId
    ? column.items.find((item) => item.activityId === placement.beforeActivityId)
    : null;
  const exemplar = beforeItem ?? column.items[0];
  const x = exemplar?.x ?? column.contentX ?? column.x;
  const width = exemplar?.width ?? column.contentWidth ?? column.width;
  const lastItem = column.items.at(-1);
  const y = beforeItem?.top
    ?? (lastItem ? lastItem.bottom + itemGap : column.contentY ?? column.y);

  return width > 0 ? { x, y, width } : null;
}

export type KanbanMoveUndoSnapshot = Pick<
  Activity,
  'goalId' | 'phase' | 'priority' | 'status' | 'completedAt' | 'orderIndex'
>;

export function getKanbanDestinationStripIndex(args: {
  absoluteX: number;
  absoluteY: number;
  stripX: number;
  stripY: number;
  stripWidth: number;
  stripHeight: number;
  destinationCount: number;
}): number | null {
  'worklet';
  const {
    absoluteX,
    absoluteY,
    stripX,
    stripY,
    stripWidth,
    stripHeight,
    destinationCount,
  } = args;

  if (
    destinationCount <= 0 ||
    stripWidth <= 0 ||
    stripHeight <= 0 ||
    absoluteX < stripX ||
    absoluteX > stripX + stripWidth ||
    absoluteY < stripY ||
    absoluteY > stripY + stripHeight
  ) {
    return null;
  }

  const relativeX = Math.max(0, Math.min(stripWidth - 1, absoluteX - stripX));
  return Math.min(destinationCount - 1, Math.floor((relativeX / stripWidth) * destinationCount));
}

export function resolveKanbanDropPlacement({
  absoluteX,
  absoluteY,
  activityId,
  canReorder,
  columns,
  measurements,
  destinationStrip,
}: {
  absoluteX: number;
  absoluteY: number;
  activityId: string;
  canReorder: boolean;
  columns: Array<{ id: string; activityIds: string[] }>;
  measurements: KanbanDropZoneMeasurement[];
  destinationStrip: { x: number; y: number; width: number; height: number } | null;
}): KanbanDropPlacement | null {
  if (destinationStrip) {
    const stripIndex = getKanbanDestinationStripIndex({
      absoluteX,
      absoluteY,
      stripX: destinationStrip.x,
      stripY: destinationStrip.y,
      stripWidth: destinationStrip.width,
      stripHeight: destinationStrip.height,
      destinationCount: columns.length,
    });
    if (stripIndex !== null) {
      const columnId = columns[stripIndex]?.id;
      return columnId
        ? { columnId, beforeActivityId: canReorder ? null : undefined }
        : null;
    }
  }

  const measuredColumn = measurements.find((measurement) =>
    absoluteX >= measurement.x &&
    absoluteX <= measurement.x + measurement.width &&
    absoluteY >= measurement.y &&
    absoluteY <= measurement.y + measurement.height);
  if (!measuredColumn) return null;

  const column = columns.find((candidate) => candidate.id === measuredColumn.columnId);
  if (!column) return null;
  if (!canReorder) return { columnId: column.id };

  const targetActivityIds = column.activityIds.filter((id) => id !== activityId);
  const targetIdSet = new Set(targetActivityIds);
  const measuredItems = measuredColumn.items
    .filter((item) => item.activityId !== activityId && targetIdSet.has(item.activityId))
    .sort((left, right) => left.top - right.top);

  const itemBelowPointer = measuredItems.find(
    (item) => absoluteY < item.top + ((item.bottom - item.top) / 2),
  );
  if (itemBelowPointer) {
    return { columnId: column.id, beforeActivityId: itemBelowPointer.activityId };
  }

  const lastMeasuredId = measuredItems.at(-1)?.activityId;
  if (!lastMeasuredId) return { columnId: column.id, beforeActivityId: null };
  const lastMeasuredIndex = targetActivityIds.indexOf(lastMeasuredId);
  return {
    columnId: column.id,
    beforeActivityId: targetActivityIds[lastMeasuredIndex + 1] ?? null,
  };
}

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

function compareManualOrder(
  left: Activity,
  right: Activity,
  originalIndexById: ReadonlyMap<string, number>,
): number {
  const leftOrder = typeof left.orderIndex === 'number' && Number.isFinite(left.orderIndex)
    ? left.orderIndex
    : Number.POSITIVE_INFINITY;
  const rightOrder = typeof right.orderIndex === 'number' && Number.isFinite(right.orderIndex)
    ? right.orderIndex
    : Number.POSITIVE_INFINITY;
  if (leftOrder !== rightOrder) return leftOrder - rightOrder;
  return (originalIndexById.get(left.id) ?? 0) - (originalIndexById.get(right.id) ?? 0);
}

function getManualInsertionIndex({
  remaining,
  groupBy,
  toColumnId,
  beforeActivityId,
}: {
  remaining: Activity[];
  groupBy: KanbanGroupBy;
  toColumnId: string;
  beforeActivityId: string | null;
}): number {
  if (beforeActivityId) {
    const beforeIndex = remaining.findIndex((activity) => activity.id === beforeActivityId);
    const beforeActivity = beforeIndex >= 0 ? remaining[beforeIndex] : null;
    if (
      beforeActivity &&
      getKanbanColumnIdForActivity(beforeActivity, groupBy) === toColumnId
    ) {
      return beforeIndex;
    }
  }

  const lastTargetIndex = remaining.reduce(
    (lastIndex, activity, index) =>
      getKanbanColumnIdForActivity(activity, groupBy) === toColumnId ? index : lastIndex,
    -1,
  );
  return lastTargetIndex >= 0 ? lastTargetIndex + 1 : remaining.length;
}

/**
 * Finds a single sparse order index for an exact Kanban insertion. Returning
 * null means adjacent activities already share an index, so the caller must
 * fall back to normalization to preserve an exact order.
 */
export function getKanbanManualOrderIndex({
  activities,
  activityId,
  groupBy,
  toColumnId,
  beforeActivityId,
}: {
  activities: Activity[];
  activityId: string;
  groupBy: KanbanGroupBy;
  toColumnId: string;
  beforeActivityId: string | null;
}): number | null {
  const originalIndexById = new Map(activities.map((activity, index) => [activity.id, index]));
  const ordered = [...activities].sort((left, right) =>
    compareManualOrder(left, right, originalIndexById));
  if (!ordered.some((activity) => activity.id === activityId)) return null;

  const remaining = ordered.filter((activity) => activity.id !== activityId);
  const insertionIndex = getManualInsertionIndex({
    remaining,
    groupBy,
    toColumnId,
    beforeActivityId,
  });
  const previousOrder = remaining[insertionIndex - 1]?.orderIndex;
  const nextOrder = remaining[insertionIndex]?.orderIndex;
  const hasPrevious = typeof previousOrder === 'number' && Number.isFinite(previousOrder);
  const hasNext = typeof nextOrder === 'number' && Number.isFinite(nextOrder);

  if (!hasPrevious && !hasNext) return 0;
  if (!hasPrevious) return (nextOrder as number) - 1;
  if (!hasNext) return (previousOrder as number) + 1;
  if ((previousOrder as number) >= (nextOrder as number)) return null;
  return (previousOrder as number) + (((nextOrder as number) - (previousOrder as number)) / 2);
}

/**
 * Produces the smallest exact rank update for a Kanban insertion. Most drops
 * update only the dragged activity. If synced data contains tied ranks, only
 * that tied neighborhood is spread into the surrounding gap.
 */
export function getKanbanOrderIndexUpdates({
  activities,
  activityId,
  groupBy,
  toColumnId,
  beforeActivityId,
}: {
  activities: Activity[];
  activityId: string;
  groupBy: KanbanGroupBy;
  toColumnId: string;
  beforeActivityId: string | null;
}): Array<{ activityId: string; orderIndex: number }> | null {
  const sparseOrderIndex = getKanbanManualOrderIndex({
    activities,
    activityId,
    groupBy,
    toColumnId,
    beforeActivityId,
  });
  if (sparseOrderIndex !== null) return [{ activityId, orderIndex: sparseOrderIndex }];

  const originalIndexById = new Map(activities.map((activity, index) => [activity.id, index]));
  const ordered = [...activities].sort((left, right) =>
    compareManualOrder(left, right, originalIndexById));
  const draggedActivity = ordered.find((activity) => activity.id === activityId);
  if (!draggedActivity) return null;

  const remaining = ordered.filter((activity) => activity.id !== activityId);
  const insertionIndex = getManualInsertionIndex({
    remaining,
    groupBy,
    toColumnId,
    beforeActivityId,
  });
  const tiedOrder = remaining[insertionIndex]?.orderIndex;
  if (typeof tiedOrder !== 'number' || !Number.isFinite(tiedOrder)) return null;

  let tiedStart = insertionIndex;
  while (tiedStart > 0 && remaining[tiedStart - 1]?.orderIndex === tiedOrder) tiedStart -= 1;
  let tiedEnd = insertionIndex;
  while (tiedEnd + 1 < remaining.length && remaining[tiedEnd + 1]?.orderIndex === tiedOrder) {
    tiedEnd += 1;
  }

  const tiedActivities = remaining.slice(tiedStart, tiedEnd + 1);
  const insertionOffset = insertionIndex - tiedStart;
  const exactSequence = [
    ...tiedActivities.slice(0, insertionOffset),
    draggedActivity,
    ...tiedActivities.slice(insertionOffset),
  ];
  const lowerOrder = remaining[tiedStart - 1]?.orderIndex;
  const upperOrder = remaining[tiedEnd + 1]?.orderIndex;
  const hasLower = typeof lowerOrder === 'number' && Number.isFinite(lowerOrder);
  const hasUpper = typeof upperOrder === 'number' && Number.isFinite(upperOrder);

  if (hasLower && hasUpper) {
    const step = ((upperOrder as number) - (lowerOrder as number)) / (exactSequence.length + 1);
    if (!(step > 0)) return null;
    return exactSequence.map((activity, index) => ({
      activityId: activity.id,
      orderIndex: (lowerOrder as number) + (step * (index + 1)),
    }));
  }
  if (hasUpper) {
    return exactSequence.map((activity, index) => ({
      activityId: activity.id,
      orderIndex: (upperOrder as number) - (exactSequence.length - index),
    }));
  }
  const baseOrder = hasLower ? (lowerOrder as number) : -1;
  return exactSequence.map((activity, index) => ({
    activityId: activity.id,
    orderIndex: baseOrder + index + 1,
  }));
}

/**
 * Returns the complete manual activity order after placing one activity at an
 * exact Kanban position. Keeping the full inventory in the result preserves
 * filtered-out activities and avoids duplicate orderIndex values.
 */
export function buildKanbanManualOrder({
  activities,
  activityId,
  groupBy,
  toColumnId,
  beforeActivityId,
}: {
  activities: Activity[];
  activityId: string;
  groupBy: KanbanGroupBy;
  toColumnId: string;
  beforeActivityId: string | null;
}): string[] {
  const originalIndexById = new Map(activities.map((activity, index) => [activity.id, index]));
  const ordered = [...activities].sort((left, right) =>
    compareManualOrder(left, right, originalIndexById));
  const dragged = ordered.find((activity) => activity.id === activityId);
  if (!dragged) return ordered.map((activity) => activity.id);

  const remaining = ordered.filter((activity) => activity.id !== activityId);
  const insertionIndex = getManualInsertionIndex({
    remaining,
    groupBy,
    toColumnId,
    beforeActivityId,
  });

  remaining.splice(insertionIndex, 0, dragged);
  return remaining.map((activity) => activity.id);
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
