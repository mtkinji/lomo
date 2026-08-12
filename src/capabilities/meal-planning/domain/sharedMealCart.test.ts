import { parseSharedMealCartProjection } from './sharedMealCart';

describe('shared household Plan projection', () => {
  it('preserves server lifecycle ordering and actor-scoped authority', () => {
    const cart = parseSharedMealCartProjection({
      planId: 'plan-1', householdId: 'household-1', version: 3, state: 'draft', activeCount: 2, groceryListId: 'list-1',
      viewer: { personId: 'person-owner', role: 'owner', canAdd: true, canManage: true },
      candidates: [
        { id: 'candidate-2', kind: 'meal_note', title: 'Second', recipeSnapshot: null, position: 1, createdAt: '2026-08-11T02:00:00Z', lifecycle: 'sent', sentAt: '2026-08-11T03:00:00Z', missingItemCount: 1, voteCount: 2, contributor: { personId: 'person-owner', displayName: 'Maya' }, supporters: [{ personId: 'person-owner', displayName: 'Maya' }, { personId: 'person-2', displayName: 'Sam' }], viewerReacted: true, canReact: true, canRemove: true, canMarkMade: true },
        { id: 'candidate-1', kind: 'recipe', title: 'First', recipeSnapshot: {}, position: 0, createdAt: '2026-08-11T01:00:00Z', lifecycle: 'idea', sentAt: null, missingItemCount: null, voteCount: 1, contributor: { personId: 'person-2', displayName: 'Sam' }, supporters: [{ personId: 'person-2', displayName: 'Sam' }], viewerReacted: false, canReact: true, canRemove: true, canMarkMade: false },
      ],
    });

    expect(cart?.candidates.map((candidate) => candidate.title)).toEqual(['Second', 'First']);
    expect(cart?.candidates[0]).toMatchObject({ lifecycle: 'sent', voteCount: 2, canMarkMade: true, viewerReacted: true });
    expect(cart?.viewer.canManage).toBe(true);
    expect(cart?.activeCount).toBe(2);
  });

  it('accepts an eligible empty household before its first add', () => {
    expect(parseSharedMealCartProjection({
      planId: null, householdId: 'household-1', version: null, state: null, activeCount: 0, groceryListId: null,
      viewer: { personId: 'person-2', role: 'caregiver', canAdd: true, canManage: true },
      candidates: [],
    })).toMatchObject({ planId: null, candidates: [], viewer: { canAdd: true, canManage: true } });
  });

  it('rejects malformed lifecycle projections', () => {
    expect(() => parseSharedMealCartProjection({ householdId: 'household-1', activeCount: 1, viewer: {}, candidates: [{ id: 'candidate-1', voteCount: 4 }] })).toThrow('Invalid shared Meal Cart projection.');
  });
});
