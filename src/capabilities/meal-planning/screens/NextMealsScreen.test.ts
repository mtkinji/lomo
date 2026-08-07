import type { MealPlanProjection } from '../data/mealPlanningRepository';
import { finalizedOccasionSummaries } from './NextMealsScreen';

it('keeps alternate dishes together under one finalized meal', () => {
  const plan: MealPlanProjection = {
    id: 'plan', householdId: 'household', version: 2, state: 'finalized', horizon: { kind: 'meal_count', count: 1 },
    candidates: [], entries: [], activeRound: null, updatedAt: '2026-08-06T12:00:00.000Z',
    occasions: [{
      id: 'dinner', title: 'Sunday dinner', placementDate: '2026-08-09', notEatingPersonIds: [],
      dishes: [
        { id: 'adult-dish', candidateId: 'a', title: 'Curry', servings: 2, dinerPersonIds: ['a', 'b'] },
        { id: 'kid-dish', candidateId: 'b', title: 'Toast', servings: 3, dinerPersonIds: ['c', 'd', 'e'] },
      ],
    }],
  };

  expect(finalizedOccasionSummaries(plan)).toEqual([expect.objectContaining({
    title: 'Sunday dinner',
    dishes: [
      expect.objectContaining({ label: 'Curry · 2 people · 2 servings' }),
      expect.objectContaining({ label: 'Toast · 3 people · 3 servings' }),
    ],
  })]);
});
