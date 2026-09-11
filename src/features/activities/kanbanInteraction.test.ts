import type { Activity } from '../../domain/types';
import {
  applyKanbanDestination,
  buildKanbanMoveUndoSnapshot,
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
