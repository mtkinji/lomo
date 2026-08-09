import { getActiveMealPlan, getCommittedMealPlan } from './mealPlanPresentation';
import type { MealPlanProjection } from '../data/mealPlanningRepository';

function plan(id: string, state: MealPlanProjection['state'], updatedAt: string): MealPlanProjection {
  return {
    id, householdId: 'household-1', version: 1, state, updatedAt,
    horizon: { kind: 'open' }, candidates: [], entries: [], occasions: [], activeRound: null,
  };
}

describe('Meal Plan presentation selection', () => {
  it('keeps the draft cart separate from the committed Next meals batch', () => {
    const plans = [
      plan('cart', 'draft', '2026-08-08T12:00:00.000Z'),
      plan('committed', 'finalized', '2026-08-08T11:00:00.000Z'),
    ];

    expect(getActiveMealPlan(plans)?.id).toBe('cart');
    expect(getCommittedMealPlan(plans)?.id).toBe('committed');
  });

  it('returns no committed batch when only cart work exists', () => {
    expect(getCommittedMealPlan([plan('cart', 'draft', '2026-08-08T12:00:00.000Z')])).toBeNull();
  });
});
