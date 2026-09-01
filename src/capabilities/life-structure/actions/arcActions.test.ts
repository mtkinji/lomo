import type { Activity, Arc, Goal, GoalDraft } from '../../../domain/types';
import { activityFixture, arcFixture, goalFixture } from '../../../test/storeFixtures';
import {
  createArc,
  deleteArc,
  updateArc,
  type ArcActionStoreBoundary,
} from './arcActions';

function harness(input: { arcs?: Arc[]; goals?: Goal[]; activities?: Activity[]; isPro?: boolean } = {}) {
  let arcs = [...(input.arcs ?? [])];
  let goals = [...(input.goals ?? [])];
  let activities = [...(input.activities ?? [])];
  const recommendations: Record<string, GoalDraft[]> = {};
  const store: ArcActionStoreBoundary = {
    getArcs: () => arcs,
    getGoals: () => goals,
    getActivities: () => activities,
    getGoalRecommendations: (arcId) => recommendations[arcId] ?? [],
    getIsPro: () => input.isPro ?? true,
    addArc: jest.fn((arc) => { arcs = [...arcs, arc]; }),
    updateArc: jest.fn((id, updater) => { arcs = arcs.map((arc) => arc.id === id ? updater(arc) : arc); }),
    removeArc: jest.fn((id) => {
      const removedGoalIds = new Set(goals.filter((goal) => goal.arcId === id).map((goal) => goal.id));
      arcs = arcs.filter((arc) => arc.id !== id);
      goals = goals.filter((goal) => goal.arcId !== id);
      activities = activities.filter((activity) => !removedGoalIds.has(activity.goalId ?? ''));
    }),
  };
  return { store, arcs: () => arcs, goals: () => goals, activities: () => activities };
}

describe('Arc capability actions', () => {
  it('returns the same canonical create receipt for UI and Chat callers', () => {
    const arc = arcFixture({ id: 'arc-new', name: 'Family Stewardship' });
    const ui = harness();
    const chat = harness();

    expect(createArc({ arc }, ui.store)).toEqual(createArc({ arc: { ...arc } }, chat.store));
    expect(ui.arcs()).toEqual([arc]);
  });

  it('allows free users to create additional Arcs', () => {
    const existing = [0, 1, 2].map((index) => arcFixture({ id: `arc-${index}` }));
    const state = harness({ arcs: existing, isPro: false });
    expect(() => createArc({ arc: arcFixture({ id: 'arc-new' }) }, state.store)).not.toThrow();
    expect(state.arcs()).toHaveLength(4);
  });

  it('requires the reviewed version for update', () => {
    const arc = arcFixture({ updatedAt: 'before' });
    const { store } = harness({ arcs: [arc] });
    expect(() => updateArc({ arcId: arc.id, expectedUpdatedAt: 'stale', update: (value) => value }, store))
      .toThrow('changed after this action was prepared');
    const receipt = updateArc({
      arcId: arc.id, expectedUpdatedAt: 'before',
      update: (value) => ({ ...value, name: 'Craft', updatedAt: 'after' }),
    }, store);
    expect(receipt).toMatchObject({ operationId: 'arcs.update', result: { name: 'Craft' }, previous: arc });
  });

  it('returns cascade evidence when deleting an Arc', () => {
    const arc = arcFixture({ updatedAt: 'before' });
    const goal = goalFixture({ arcId: arc.id });
    const activity = activityFixture({ goalId: goal.id });
    const state = harness({ arcs: [arc], goals: [goal], activities: [activity] });
    const receipt = deleteArc({ arcId: arc.id, expectedUpdatedAt: 'before' }, state.store);
    expect(receipt).toMatchObject({
      operationId: 'arcs.delete', result: arc, previous: arc,
      affectedRefs: [{ kind: 'goal', id: goal.id }, { kind: 'activity', id: activity.id }],
    });
    expect(state.arcs()).toEqual([]);
    expect(state.goals()).toEqual([]);
    expect(state.activities()).toEqual([]);
  });
});
