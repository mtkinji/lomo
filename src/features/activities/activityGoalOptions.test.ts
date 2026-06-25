import type { Goal } from '../../domain/types';
import { buildLinkedGoalOptions, isSelectableLinkedGoal } from './activityGoalOptions';

function goal(overrides: Partial<Goal>): Goal {
  return {
    id: overrides.id ?? 'goal-1',
    arcId: null,
    title: overrides.title ?? 'Goal',
    status: overrides.status ?? 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('activity linked goal options', () => {
  it('excludes completed and archived goals from the selector', () => {
    const options = buildLinkedGoalOptions([
      goal({ id: 'planned', title: 'Planned', status: 'planned' }),
      goal({ id: 'completed', title: 'Completed', status: 'completed' }),
      goal({ id: 'archived', title: 'Archived', status: 'archived' }),
      goal({ id: 'active', title: 'Active', status: 'in_progress' }),
    ]);

    expect(options).toEqual([
      { value: 'active', label: 'Active' },
      { value: 'planned', label: 'Planned' },
    ]);
  });

  it('treats planned and in-progress goals as selectable', () => {
    expect(isSelectableLinkedGoal(goal({ status: 'planned' }))).toBe(true);
    expect(isSelectableLinkedGoal(goal({ status: 'in_progress' }))).toBe(true);
  });
});
