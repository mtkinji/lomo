import type { SharedMealCartProjection } from '../../meal-planning/domain/sharedMealCart';
import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import { sharedMealCartContainsRecipeVersion, toggleRecipeInSharedMealCart } from './mealPlanSelection';

const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };

function cart(candidates: SharedMealCartProjection['candidates'] = []): SharedMealCartProjection {
  return {
    planId: 'plan-1', householdId: 'household-1', version: 2, state: 'draft',
    viewer: { personId: 'person-1', role: 'owner', canAdd: true, canSettle: true },
    candidates,
  };
}

describe('shared Meal Cart recipe selection', () => {
  it('appends the first meal without replacing the plan candidate set', async () => {
    const next = cart();
    const repository = { addSharedCandidate: jest.fn(), withdrawSharedCandidate: jest.fn() };
    const result = await toggleRecipeInSharedMealCart({
      cart: null, householdId: 'household-1', projection, servings: 4, candidateId: 'candidate-1',
      repository, reloadCart: jest.fn().mockResolvedValue(next),
    });
    expect(repository.addSharedCandidate).toHaveBeenCalledWith('household-1', expect.objectContaining({ id: 'candidate-1', title: projection.currentVersion.title }));
    expect(repository.withdrawSharedCandidate).not.toHaveBeenCalled();
    expect(result).toEqual({ cart: next, selected: true });
  });

  it('withdraws only the selected candidate when the actor is authorized', async () => {
    const candidate = {
      id: 'candidate-1', kind: 'recipe' as const, title: projection.currentVersion.title,
      recipeSnapshot: { recipeVersionId: projection.currentVersion.id }, position: 0, selected: true,
      contributor: { personId: 'person-1', displayName: 'Maya', avatarUrl: null }, supporters: [],
      viewerReacted: true, canReact: true, canWithdraw: true,
    };
    const next = cart();
    const repository = { addSharedCandidate: jest.fn(), withdrawSharedCandidate: jest.fn() };
    const result = await toggleRecipeInSharedMealCart({
      cart: cart([candidate]), householdId: 'household-1', projection, servings: 4, candidateId: 'unused',
      repository, reloadCart: jest.fn().mockResolvedValue(next),
    });
    expect(repository.withdrawSharedCandidate).toHaveBeenCalledWith('candidate-1');
    expect(repository.addSharedCandidate).not.toHaveBeenCalled();
    expect(result).toEqual({ cart: next, selected: false });
  });

  it('does not treat an unselected historical candidate as in the current plan', () => {
    const historical = {
      id: 'candidate-1', kind: 'recipe' as const, title: projection.currentVersion.title,
      recipeSnapshot: { recipeVersionId: projection.currentVersion.id }, position: 0, selected: false,
      contributor: { personId: 'person-1', displayName: 'Maya', avatarUrl: null }, supporters: [],
      viewerReacted: true, canReact: false, canWithdraw: false,
    };
    expect(sharedMealCartContainsRecipeVersion({ ...cart([historical]), state: 'finalized' }, projection)).toBe(false);
  });
});
