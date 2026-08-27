import type { Activity, Goal } from '../../../domain/types';
import { activityFixture, goalFixture } from '../../../test/storeFixtures';
import {
  createGoal,
  deleteGoal,
  updateGoal,
  type GoalActionStoreBoundary,
} from './goalActions';

function harness(input: { goals?: Goal[]; activities?: Activity[]; arcIds?: string[] } = {}) {
  let goals = [...(input.goals ?? [])];
  let activities = [...(input.activities ?? [])];
  const store: GoalActionStoreBoundary = {
    getGoals: () => goals,
    getActivities: () => activities,
    getArcIds: () => input.arcIds ?? ['arc-1'],
    addGoal: jest.fn((goal) => { goals = [...goals, goal]; }),
    updateGoal: jest.fn((id, updater) => { goals = goals.map((goal) => goal.id === id ? updater(goal) : goal); }),
    removeGoal: jest.fn((id) => {
      goals = goals.filter((goal) => goal.id !== id);
      activities = activities.filter((activity) => activity.goalId !== id);
    }),
  };
  return { store, goals: () => goals, activities: () => activities };
}

describe('Goal capability actions', () => {
  it('creates through one canonical receipt and validates Arc membership', () => {
    const goal = goalFixture({ id: 'goal-new', arcId: 'arc-1' });
    const state = harness();
    expect(createGoal({ goal }, state.store)).toMatchObject({
      operationId: 'goals.create', status: 'completed',
      resultRefs: [{ kind: 'goal', id: goal.id }], result: goal,
    });
    expect(() => createGoal({ goal: { ...goal, id: 'bad', arcId: 'missing' } }, state.store))
      .toThrow('selected Arc is no longer available');
  });

  it('permits an unassigned Goal and rejects a duplicate overwrite', () => {
    const goal = goalFixture({ id: 'goal-new', arcId: null });
    const { store } = harness();
    createGoal({ goal }, store);
    expect(() => createGoal({ goal: { ...goal, title: 'Replacement' } }, store)).toThrow('already exists');
  });

  it('requires the reviewed version and validates a changed Arc link', () => {
    const goal = goalFixture({ updatedAt: 'before' });
    const { store } = harness({ goals: [goal] });
    expect(() => updateGoal({ goalId: goal.id, expectedUpdatedAt: 'stale', update: (value) => value }, store))
      .toThrow('changed after this action was prepared');
    expect(() => updateGoal({
      goalId: goal.id, expectedUpdatedAt: 'before',
      update: (value) => ({ ...value, arcId: 'missing', updatedAt: 'after' }),
    }, store)).toThrow('selected Arc is no longer available');
  });

  it('returns dependent Activity evidence for reviewed delete', () => {
    const goal = goalFixture({ updatedAt: 'before' });
    const activity = activityFixture({ goalId: goal.id });
    const state = harness({ goals: [goal], activities: [activity] });
    const receipt = deleteGoal({ goalId: goal.id, expectedUpdatedAt: 'before' }, state.store);
    expect(receipt).toMatchObject({
      operationId: 'goals.delete', result: goal, previous: goal,
      affectedRefs: [{ kind: 'activity', id: activity.id }],
    });
    expect(state.goals()).toEqual([]);
    expect(state.activities()).toEqual([]);
  });
});
