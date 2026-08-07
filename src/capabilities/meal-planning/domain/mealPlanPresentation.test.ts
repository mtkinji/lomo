import type { MealPlanProjection } from '../data/mealPlanningRepository';
import { getActiveMealPlanCount } from './mealPlanPresentation';

function plan(
  state: MealPlanProjection['state'],
  candidates: number,
  entries: number,
): MealPlanProjection {
  return {
    id: `plan-${state}`,
    householdId: 'household-1',
    version: 1,
    state,
    horizon: { kind: 'next_shop', shopBy: null },
    candidates: Array.from({ length: candidates }, (_, index) => ({
      id: `candidate-${index}`,
      kind: 'meal_note',
      title: `Meal ${index + 1}`,
      recipeSnapshot: null,
    })),
    entries: Array.from({ length: entries }, (_, index) => ({
      id: `entry-${index}`,
      candidateId: `candidate-${index}`,
      title: `Meal ${index + 1}`,
      servings: 4,
      placementDate: null,
      occasionId: null,
      dinerPersonIds: [],
    })),
    occasions: [],
    activeRound: null,
    updatedAt: '2026-08-06T12:00:00.000Z',
  };
}

describe('Meal Plan presentation', () => {
  it('counts proposed meals until the plan is finalized', () => {
    expect(getActiveMealPlanCount([plan('draft', 5, 0)])).toBe(5);
  });

  it('counts decided meals after finalization', () => {
    expect(getActiveMealPlanCount([plan('finalized', 5, 3)])).toBe(3);
  });

  it('does not present an archived plan as active', () => {
    expect(getActiveMealPlanCount([plan('archived', 5, 3)])).toBe(0);
  });
});
