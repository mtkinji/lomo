import { parseReviewedMealPlanOccasions } from './mealPlanFinalization';

const context = { candidateIds: ['candidate-1'], eligiblePersonIds: ['person-1', 'person-2'] };

describe('Meal Plan finalization review', () => {
  test('accepts exact candidates, eligible diners, and explicit timing', () => {
    expect(parseReviewedMealPlanOccasions([{ id: 'occasion-1', title: 'Friday dinner', placementDate: '2026-08-28',
      timing: { kind: 'occasion', date: '2026-08-28', mealPeriod: 'dinner' }, notEatingPersonIds: ['person-2'],
      dishes: [{ id: 'dish-1', candidateId: 'candidate-1', dinerPersonIds: ['person-1'], servings: 2 }],
    }], context)).toEqual([expect.objectContaining({ id: 'occasion-1', dishes: [expect.objectContaining({ candidateId: 'candidate-1' })] })]);
  });

  test('rejects unknown candidates, ineligible diners, duplicate ids, and diner conflicts', () => {
    const base = { id: 'occasion-1', title: null, placementDate: null, timing: { kind: 'flexible' },
      notEatingPersonIds: ['person-2'], dishes: [{ id: 'dish-1', candidateId: 'candidate-1', dinerPersonIds: ['person-1'], servings: null }] };
    expect(parseReviewedMealPlanOccasions([{ ...base, dishes: [{ ...base.dishes[0], candidateId: 'missing' }] }], context)).toBeNull();
    expect(parseReviewedMealPlanOccasions([{ ...base, dishes: [{ ...base.dishes[0], dinerPersonIds: ['person-3'] }] }], context)).toBeNull();
    expect(parseReviewedMealPlanOccasions([{ ...base, dishes: [{ ...base.dishes[0], dinerPersonIds: ['person-2'] }] }], context)).toBeNull();
    expect(parseReviewedMealPlanOccasions([base, base], context)).toBeNull();
  });
});
