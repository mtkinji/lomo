import type { Activity } from '../../domain/types';
import {
  applyKanbanDestination,
  buildKanbanManualOrder,
  buildKanbanMoveUndoSnapshot,
  getKanbanDestinationStripIndex,
  getKanbanManualOrderIndex,
  getKanbanOrderIndexUpdates,
  getKanbanAutoScrollDelta,
  getKanbanDropMode,
  resolveKanbanDropCommitColumnId,
  resolveKanbanDropPlacement,
  resolveKanbanDropSettleTarget,
  restoreKanbanMoveUndoSnapshot,
} from './kanbanInteraction';

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'activity-1',
    goalId: null,
    title: 'Take the next honest step',
    type: 'task',
    tags: [],
    steps: [],
    reminderAt: null,
    priority: undefined,
    estimateMinutes: null,
    creationSource: 'manual',
    planGroupId: null,
    scheduledDate: null,
    orderIndex: 3,
    phase: null,
    status: 'planned',
    actualMinutes: null,
    startedAt: null,
    completedAt: null,
    forceActual: { spirituality: 0, mastery: 0, activity: 0, connection: 0 },
    createdAt: '2026-09-10T10:00:00.000Z',
    updatedAt: '2026-09-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('Kanban interaction semantics', () => {
  it('ramps auto-scroll only inside the viewport edge zones', () => {
    expect(getKanbanAutoScrollDelta({
      pointer: 220,
      viewportStart: 100,
      viewportEnd: 500,
      edgeSize: 80,
      maxStep: 24,
    })).toBe(0);
    expect(getKanbanAutoScrollDelta({
      pointer: 120,
      viewportStart: 100,
      viewportEnd: 500,
      edgeSize: 80,
      maxStep: 24,
    })).toBe(-18);
    expect(getKanbanAutoScrollDelta({
      pointer: 480,
      viewportStart: 100,
      viewportEnd: 500,
      edgeSize: 80,
      maxStep: 24,
    })).toBe(18);
    expect(getKanbanAutoScrollDelta({
      pointer: 520,
      viewportStart: 100,
      viewportEnd: 500,
      edgeSize: 80,
      maxStep: 24,
    })).toBe(0);
  });

  it('settles the lifted card into the measured insertion slot', () => {
    const measurements = [{
      columnId: 'planned',
      x: 20,
      y: 100,
      width: 280,
      height: 500,
      contentX: 28,
      contentY: 144,
      contentWidth: 264,
      contentHeight: 420,
      items: [
        { activityId: 'a', x: 28, width: 264, top: 152, bottom: 232 },
        { activityId: 'b', x: 28, width: 264, top: 240, bottom: 320 },
      ],
    }];

    expect(resolveKanbanDropSettleTarget({
      placement: { columnId: 'planned', beforeActivityId: 'b' },
      measurements,
      itemGap: 8,
    })).toEqual({ x: 28, y: 240, width: 264 });
    expect(resolveKanbanDropSettleTarget({
      placement: { columnId: 'planned', beforeActivityId: null },
      measurements,
      itemGap: 8,
    })).toEqual({ x: 28, y: 328, width: 264 });
    expect(resolveKanbanDropSettleTarget({
      placement: { columnId: 'planned' },
      measurements,
      itemGap: 8,
    })).toBeNull();
  });

  it('distinguishes a sorted column move from an unavailable same-column reorder', () => {
    expect(getKanbanDropMode({
      canReorder: false,
      sourceColumnId: 'planned',
      destinationColumnId: 'planned',
    })).toBe('reorder-unavailable');
    expect(getKanbanDropMode({
      canReorder: false,
      sourceColumnId: 'planned',
      destinationColumnId: 'done',
    })).toBe('sorted-column-move');
    expect(getKanbanDropMode({
      canReorder: true,
      sourceColumnId: 'planned',
      destinationColumnId: 'planned',
    })).toBe('exact-placement');
  });

  it('cancels outside the measured board even when the gesture last crossed a column', () => {
    expect(resolveKanbanDropCommitColumnId({
      measuredPlacement: null,
      gestureColumnId: 'skipped',
    })).toBeNull();
    expect(resolveKanbanDropCommitColumnId({
      measuredPlacement: { columnId: 'in_progress', beforeActivityId: null },
      gestureColumnId: 'skipped',
    })).toBe('in_progress');
  });

  it('assigns one sparse order index between the exact neighboring cards', () => {
    const activities = [
      makeActivity({ id: 'a', orderIndex: 0, status: 'planned' }),
      makeActivity({ id: 'b', orderIndex: 1, status: 'planned' }),
      makeActivity({ id: 'c', orderIndex: 2, status: 'planned' }),
      makeActivity({ id: 'done', orderIndex: 3, status: 'done' }),
    ];

    expect(getKanbanManualOrderIndex({
      activities,
      activityId: 'a',
      groupBy: 'status',
      toColumnId: 'planned',
      beforeActivityId: 'c',
    })).toBe(1.5);
  });

  it('places a cross-column card without renumbering unrelated activities', () => {
    const activities = [
      makeActivity({ id: 'todo', orderIndex: 0, status: 'planned' }),
      makeActivity({ id: 'doing-1', orderIndex: 10, status: 'in_progress' }),
      makeActivity({ id: 'unrelated', orderIndex: 15, status: 'done' }),
      makeActivity({ id: 'doing-2', orderIndex: 20, status: 'in_progress' }),
    ];

    expect(getKanbanManualOrderIndex({
      activities,
      activityId: 'todo',
      groupBy: 'status',
      toColumnId: 'in_progress',
      beforeActivityId: 'doing-2',
    })).toBe(17.5);
    expect(activities.map((activity) => activity.orderIndex)).toEqual([0, 10, 15, 20]);
  });

  it('requests normalization only when equal neighboring indices leave no insertion gap', () => {
    const activities = [
      makeActivity({ id: 'a', orderIndex: 0, status: 'planned' }),
      makeActivity({ id: 'b', orderIndex: 1, status: 'planned' }),
      makeActivity({ id: 'c', orderIndex: 1, status: 'planned' }),
    ];

    expect(getKanbanManualOrderIndex({
      activities,
      activityId: 'a',
      groupBy: 'status',
      toColumnId: 'planned',
      beforeActivityId: 'c',
    })).toBeNull();
  });

  it('repairs only the tied insertion neighborhood instead of renumbering the board', () => {
    const activities = [
      makeActivity({ id: 'before-gap', orderIndex: -1, status: 'planned' }),
      makeActivity({ id: 'a', orderIndex: 0, status: 'planned' }),
      makeActivity({ id: 'b', orderIndex: 0, status: 'planned' }),
      makeActivity({ id: 'after-gap', orderIndex: 1, status: 'planned' }),
      makeActivity({ id: 'dragged', orderIndex: 50, status: 'planned' }),
      makeActivity({ id: 'unrelated', orderIndex: 100, status: 'done' }),
    ];

    expect(getKanbanOrderIndexUpdates({
      activities,
      activityId: 'dragged',
      groupBy: 'status',
      toColumnId: 'planned',
      beforeActivityId: 'b',
    })).toEqual([
      { activityId: 'a', orderIndex: -0.5 },
      { activityId: 'dragged', orderIndex: 0 },
      { activityId: 'b', orderIndex: 0.5 },
    ]);
  });

  it('reorders a card within its current column before the indicated card', () => {
    const activities = [
      makeActivity({ id: 'a', orderIndex: 0, status: 'planned' }),
      makeActivity({ id: 'b', orderIndex: 1, status: 'planned' }),
      makeActivity({ id: 'c', orderIndex: 2, status: 'planned' }),
      makeActivity({ id: 'done', orderIndex: 3, status: 'done' }),
    ];

    expect(buildKanbanManualOrder({
      activities,
      activityId: 'a',
      groupBy: 'status',
      toColumnId: 'planned',
      beforeActivityId: 'c',
    })).toEqual(['b', 'a', 'c', 'done']);
  });

  it('places a cross-column card at an exact insertion point without disturbing other work', () => {
    const activities = [
      makeActivity({ id: 'todo-1', orderIndex: 0, status: 'planned' }),
      makeActivity({ id: 'doing-1', orderIndex: 1, status: 'in_progress' }),
      makeActivity({ id: 'doing-2', orderIndex: 2, status: 'in_progress' }),
      makeActivity({ id: 'done-1', orderIndex: 3, status: 'done' }),
    ];

    expect(buildKanbanManualOrder({
      activities,
      activityId: 'todo-1',
      groupBy: 'status',
      toColumnId: 'in_progress',
      beforeActivityId: 'doing-2',
    })).toEqual(['doing-1', 'todo-1', 'doing-2', 'done-1']);
  });

  it('appends to an empty destination while retaining stable manual order', () => {
    const activities = [
      makeActivity({ id: 'todo-1', orderIndex: 2, status: 'planned' }),
      makeActivity({ id: 'doing-1', orderIndex: 0, status: 'in_progress' }),
      makeActivity({ id: 'doing-2', orderIndex: 1, status: 'in_progress' }),
    ];

    expect(buildKanbanManualOrder({
      activities,
      activityId: 'doing-1',
      groupBy: 'status',
      toColumnId: 'done',
      beforeActivityId: null,
    })).toEqual(['doing-2', 'todo-1', 'doing-1']);
  });

  it('resolves the exact insertion slot from visible card geometry', () => {
    expect(resolveKanbanDropPlacement({
      absoluteX: 140,
      absoluteY: 300,
      activityId: 'a',
      canReorder: true,
      columns: [{ id: 'planned', activityIds: ['a', 'b', 'c', 'd'] }],
      measurements: [{
        columnId: 'planned',
        x: 20,
        y: 100,
        width: 280,
        height: 600,
        items: [
          { activityId: 'a', top: 130, bottom: 210 },
          { activityId: 'b', top: 218, bottom: 298 },
          { activityId: 'c', top: 306, bottom: 386 },
        ],
      }],
      destinationStrip: null,
    })).toEqual({ columnId: 'planned', beforeActivityId: 'c' });
  });

  it('uses the destination strip for an offscreen column and appends there', () => {
    expect(resolveKanbanDropPlacement({
      absoluteX: 330,
      absoluteY: 730,
      activityId: 'a',
      canReorder: true,
      columns: [
        { id: 'planned', activityIds: ['a'] },
        { id: 'in_progress', activityIds: ['b'] },
        { id: 'done', activityIds: ['c'] },
      ],
      measurements: [],
      destinationStrip: {
        x: 20,
        y: 700,
        width: 350,
        height: 60,
      },
    })).toEqual({ columnId: 'done', beforeActivityId: null });
  });

  it('maps the visible destination strip across every column and rejects outside drops', () => {
    const strip = { stripX: 20, stripY: 700, stripWidth: 350, stripHeight: 60, destinationCount: 5 };

    expect(getKanbanDestinationStripIndex({ ...strip, absoluteX: 21, absoluteY: 720 })).toBe(0);
    expect(getKanbanDestinationStripIndex({ ...strip, absoluteX: 195, absoluteY: 720 })).toBe(2);
    expect(getKanbanDestinationStripIndex({ ...strip, absoluteX: 369, absoluteY: 720 })).toBe(4);
    expect(getKanbanDestinationStripIndex({ ...strip, absoluteX: 195, absoluteY: 680 })).toBeNull();
  });

  it('keeps status and completion timestamps consistent when a card moves', () => {
    const movedToDone = applyKanbanDestination({
      activity: makeActivity(),
      destination: { groupBy: 'status', toColumnId: 'done' },
      validGoalIds: new Set(),
      atIso: '2026-09-10T11:00:00.000Z',
      nextOrderIndex: 8,
    });

    expect(movedToDone.didMove).toBe(true);
    expect(movedToDone.activity).toMatchObject({
      status: 'done',
      completedAt: '2026-09-10T11:00:00.000Z',
      orderIndex: 8,
    });

    const movedBack = applyKanbanDestination({
      activity: movedToDone.activity,
      destination: { groupBy: 'status', toColumnId: 'in_progress' },
      validGoalIds: new Set(),
      atIso: '2026-09-10T12:00:00.000Z',
      nextOrderIndex: 2,
    });

    expect(movedBack.activity).toMatchObject({
      status: 'in_progress',
      completedAt: null,
      orderIndex: 2,
    });
  });

  it.each([
    [{ groupBy: 'priority' as const, toColumnId: 'starred' }, { priority: 1 }],
    [{ groupBy: 'goal' as const, toColumnId: 'goal-1' }, { goalId: 'goal-1' }],
    [{ groupBy: 'phase' as const, toColumnId: 'Research' }, { phase: 'Research' }],
  ])('applies a column destination to newly captured work', (destination, expected) => {
    const result = applyKanbanDestination({
      activity: makeActivity(),
      destination,
      validGoalIds: new Set(['goal-1']),
      atIso: '2026-09-10T11:00:00.000Z',
      nextOrderIndex: 4,
    });

    expect(result.didMove).toBe(true);
    expect(result.activity).toMatchObject(expected);
  });

  it('ignores a stale goal destination', () => {
    const original = makeActivity();
    const result = applyKanbanDestination({
      activity: original,
      destination: { groupBy: 'goal', toColumnId: 'missing-goal' },
      validGoalIds: new Set(['goal-1']),
      atIso: '2026-09-10T11:00:00.000Z',
      nextOrderIndex: 4,
    });

    expect(result).toEqual({ activity: original, didMove: false });
  });

  it('restores the prior grouping state when a move is undone', () => {
    const original = makeActivity({
      goalId: 'goal-1',
      phase: 'Research',
      priority: 1,
      status: 'in_progress',
      orderIndex: 6,
    });
    const snapshot = buildKanbanMoveUndoSnapshot(original);
    const changed = makeActivity({
      goalId: 'goal-2',
      phase: 'Build',
      priority: undefined,
      status: 'done',
      completedAt: '2026-09-10T11:00:00.000Z',
      orderIndex: 20,
    });

    expect(
      restoreKanbanMoveUndoSnapshot(changed, snapshot, '2026-09-10T12:00:00.000Z'),
    ).toMatchObject({
      goalId: 'goal-1',
      phase: 'Research',
      priority: 1,
      status: 'in_progress',
      completedAt: null,
      orderIndex: 6,
      updatedAt: '2026-09-10T12:00:00.000Z',
    });
  });
});
