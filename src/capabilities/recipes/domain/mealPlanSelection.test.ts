import type { SharedMealCartProjection } from '../../meal-planning/domain/sharedMealCart';
import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import { sharedMealCartContainsRecipeVersion, toggleRecipeInSharedMealCart } from './mealPlanSelection';

const projection = { recipe: recipeContractFixture(), currentVersion: recipeVersionContractFixture() };

function cart(candidates: SharedMealCartProjection['candidates'] = []): SharedMealCartProjection {
  return {
    planId: 'plan-1', householdId: 'household-1', version: 2, state: 'draft',
    activeCount: candidates.length, groceryListId: null,
    viewer: { personId: 'person-1', role: 'owner', canAdd: true, canManage: true },
    candidates,
  };
}

function candidate(overrides: Partial<SharedMealCartProjection['candidates'][number]> = {}) {
  return {
    id: 'candidate-1', kind: 'recipe' as const, title: projection.currentVersion.title,
    recipeSnapshot: { recipeVersionId: projection.currentVersion.id }, position: 0,
    createdAt: '2026-08-11T12:00:00.000Z', lifecycle: 'idea' as const, sentAt: null,
    missingItemCount: null, voteCount: 0, downvoteCount: 0, hardPassCount: 0,
    requiresHardPassReview: false,
    reactionCounts: { thumbs_up: 0, heart: 0, yum: 0, excited: 0, fire: 0, downvote: 0 },
    contributor: { personId: 'person-1', displayName: 'Maya', avatarUrl: null }, supporters: [],
    viewerReaction: null, viewerReactionReason: null, canReact: true, canRemove: true, canMarkMade: false,
    ...overrides,
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
    const selectedCandidate = candidate();
    const next = cart();
    const repository = { addSharedCandidate: jest.fn(), withdrawSharedCandidate: jest.fn() };
    const result = await toggleRecipeInSharedMealCart({
      cart: cart([selectedCandidate]), householdId: 'household-1', projection, servings: 4, candidateId: 'unused',
      repository, reloadCart: jest.fn().mockResolvedValue(next),
    });
    expect(repository.withdrawSharedCandidate).toHaveBeenCalledWith('candidate-1');
    expect(repository.addSharedCandidate).not.toHaveBeenCalled();
    expect(result).toEqual({ cart: next, selected: false });
  });

  it('keeps a sent recipe in the active Plan and directs removal through the drawer', async () => {
    const sent = candidate({ lifecycle: 'sent', sentAt: '2026-08-11T13:00:00.000Z', canMarkMade: true });
    const repository = { addSharedCandidate: jest.fn(), withdrawSharedCandidate: jest.fn() };

    expect(sharedMealCartContainsRecipeVersion(cart([sent]), projection)).toBe(true);
    await expect(toggleRecipeInSharedMealCart({
      cart: cart([sent]), householdId: 'household-1', projection, servings: 4, candidateId: 'unused',
      repository, reloadCart: jest.fn(),
    })).rejects.toThrow('Open Plan');
    expect(repository.withdrawSharedCandidate).not.toHaveBeenCalled();
  });
});
