import type { SharedMealCartProjection } from '../../meal-planning/domain/sharedMealCart';
import type { MealPlanCandidateDraft } from '../../meal-planning/data/mealPlanningRepository';
import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import {
  addRecipeRecommendationsToSharedMealCart,
  sharedMealCartContainsRecipeVersion,
  toggleRecipeInSharedMealCart,
  withdrawMealCandidatesFromSharedMealCart,
} from './mealPlanSelection';

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
    const repository = { addMealCandidate: jest.fn(), withdrawMealCandidate: jest.fn() };
    const result = await toggleRecipeInSharedMealCart({
      cart: null, householdId: 'household-1', projection, recipeScaleMultiplier: 2, plannedPortions: 4, candidateId: 'candidate-1',
      repository, reloadCart: jest.fn().mockResolvedValue(next),
    });
    expect(repository.addMealCandidate).toHaveBeenCalledWith('household-1', expect.objectContaining({ id: 'candidate-1', title: projection.currentVersion.title }));
    expect(repository.addMealCandidate).toHaveBeenCalledWith('household-1', expect.objectContaining({
      recipeSnapshot: expect.objectContaining({ recipeScaleMultiplier: 2, plannedPortions: 4, selectedServings: 4 }),
    }));
    expect(repository.withdrawMealCandidate).not.toHaveBeenCalled();
    expect(result).toEqual({ cart: next, selected: true });
  });

  it('withdraws only the selected candidate when the actor is authorized', async () => {
    const selectedCandidate = candidate();
    const next = cart();
    const repository = { addMealCandidate: jest.fn(), withdrawMealCandidate: jest.fn() };
    const result = await toggleRecipeInSharedMealCart({
      cart: cart([selectedCandidate]), householdId: 'household-1', projection, recipeScaleMultiplier: 1, plannedPortions: 4, candidateId: 'unused',
      repository, reloadCart: jest.fn().mockResolvedValue(next),
    });
    expect(repository.withdrawMealCandidate).toHaveBeenCalledWith('household-1', 'candidate-1');
    expect(repository.addMealCandidate).not.toHaveBeenCalled();
    expect(result).toEqual({ cart: next, selected: false });
  });

  it('keeps a sent recipe in the active Plan and directs removal through the drawer', async () => {
    const sent = candidate({ lifecycle: 'sent', sentAt: '2026-08-11T13:00:00.000Z', canMarkMade: true });
    const repository = { addMealCandidate: jest.fn(), withdrawMealCandidate: jest.fn() };

    expect(sharedMealCartContainsRecipeVersion(cart([sent]), projection)).toBe(true);
    await expect(toggleRecipeInSharedMealCart({
      cart: cart([sent]), householdId: 'household-1', projection, recipeScaleMultiplier: 1, plannedPortions: 4, candidateId: 'unused',
      repository, reloadCart: jest.fn(),
    })).rejects.toThrow('Open Plan');
    expect(repository.withdrawMealCandidate).not.toHaveBeenCalled();
  });

  it('adds recommendation results sequentially and returns their candidate ids for Undo', async () => {
    const secondProjection = {
      recipe: { ...projection.recipe, id: 'recipe-2' },
      currentVersion: { ...projection.currentVersion, id: 'version-2', recipeId: 'recipe-2', title: 'Second recipe' },
    };
    const repository = {
      addMealCandidate: jest.fn(async (_householdId: string | null, _draft: MealPlanCandidateDraft) => undefined),
      withdrawMealCandidate: jest.fn(),
    };
    const reloadCart = jest.fn().mockResolvedValue(cart());
    const createCandidateId = jest.fn()
      .mockReturnValueOnce('recommended-1')
      .mockReturnValueOnce('recommended-2');

    const result = await addRecipeRecommendationsToSharedMealCart({
      householdId: 'household-1',
      projections: [projection, secondProjection],
      plannedPortions: 5,
      createCandidateId,
      repository,
      reloadCart,
    });

    expect(repository.addMealCandidate.mock.calls.map(([, draft]) => ({
      id: draft.id,
      recipeVersionId: draft.recipeSnapshot?.recipeVersionId,
      plannedPortions: draft.recipeSnapshot?.plannedPortions,
    }))).toEqual([
      { id: 'recommended-1', recipeVersionId: projection.currentVersion.id, plannedPortions: 5 },
      { id: 'recommended-2', recipeVersionId: 'version-2', plannedPortions: 5 },
    ]);
    expect(reloadCart).toHaveBeenCalledTimes(1);
    expect(result.candidateIds).toEqual(['recommended-1', 'recommended-2']);
  });

  it('withdraws an added recommendation batch sequentially before reloading the Plan', async () => {
    const repository = {
      withdrawMealCandidate: jest.fn(async () => undefined),
    };
    const reloadCart = jest.fn().mockResolvedValue(cart());

    await withdrawMealCandidatesFromSharedMealCart({
      householdId: null,
      candidateIds: ['recommended-1', 'recommended-2'],
      repository,
      reloadCart,
    });

    expect(repository.withdrawMealCandidate.mock.calls).toEqual([
      [null, 'recommended-1'],
      [null, 'recommended-2'],
    ]);
    expect(reloadCart).toHaveBeenCalledTimes(1);
  });
});
