import { parseSharedMealCartProjection } from './sharedMealCart';

describe('shared Meal Cart projection', () => {
  it('preserves insertion order and actor-scoped authority without ranking by support', () => {
    const cart = parseSharedMealCartProjection({
      planId: 'plan-1', householdId: 'household-1', version: 3, state: 'draft',
      viewer: { personId: 'person-owner', role: 'owner', canAdd: true, canSettle: true },
      candidates: [
        { id: 'candidate-1', kind: 'recipe', title: 'First', recipeSnapshot: {}, position: 0, contributor: { personId: 'person-2', displayName: 'Sam' }, supporters: [{ personId: 'person-2', displayName: 'Sam' }], canWithdraw: true },
        { id: 'candidate-2', kind: 'meal_note', title: 'Second', recipeSnapshot: null, position: 1, contributor: { personId: 'person-owner', displayName: 'Maya' }, supporters: [{ personId: 'person-owner', displayName: 'Maya' }, { personId: 'person-2', displayName: 'Sam' }], canWithdraw: true },
      ],
    });

    expect(cart?.candidates.map((candidate) => candidate.title)).toEqual(['First', 'Second']);
    expect(cart?.candidates[0]).toMatchObject({ canReact: true, viewerReacted: false });
    expect(cart?.candidates[1]).toMatchObject({ canReact: true, viewerReacted: true });
    expect(cart?.viewer.canSettle).toBe(true);
  });

  it('accepts an eligible empty household before its first add', () => {
    expect(parseSharedMealCartProjection({
      planId: null, householdId: 'household-1', version: null, state: null,
      viewer: { personId: 'person-2', role: 'caregiver', canAdd: true, canSettle: false },
      candidates: [],
    })).toMatchObject({ planId: null, candidates: [], viewer: { canAdd: true, canSettle: false } });
  });

  it('rejects malformed or popularity-shaped projections', () => {
    expect(() => parseSharedMealCartProjection({ householdId: 'household-1', viewer: {}, candidates: [{ id: 'candidate-1', voteCount: 4 }] })).toThrow('Invalid shared Meal Cart projection.');
  });
});
