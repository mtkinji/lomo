import type { MealPlanProjection } from '../../meal-planning/data/mealPlanningRepository';
import { recipeContractFixture, recipeVersionContractFixture } from './recipeContractFixtures';
import {
  mealPlanContainsSelectedRecipeVersion,
  removeCandidateFromMealPlan,
  toggleRecipeInMealPlan,
} from './mealPlanSelection';
import { buildMealPlanRecipeCandidate } from './mealPlanRecipeCandidate';

const projection = {
  recipe: recipeContractFixture(),
  currentVersion: recipeVersionContractFixture(),
};

function plan(state: MealPlanProjection['state'], candidates = [
  buildMealPlanRecipeCandidate(projection, { candidateId: 'candidate-1', servings: 4 }),
]): MealPlanProjection {
  return {
    id: 'plan-1',
    householdId: 'household-1',
    version: state === 'draft' ? 4 : 3,
    state,
    horizon: { kind: 'open' },
    candidates,
    entries: candidates.map((candidate, index) => ({
      id: `entry-${index + 1}`,
      candidateId: candidate.id,
      title: candidate.title,
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

describe('implicit Meal Plan selection', () => {
  it('revises an underway plan and then removes its checked meal', async () => {
    const finalized = plan('finalized');
    const revised = plan('draft');
    const updated = plan('draft', []);
    const repository = {
      create: jest.fn(),
      revise: jest.fn().mockResolvedValue({ state: 'draft' }),
      update: jest.fn().mockResolvedValue({ state: 'draft' }),
    };
    const reloadPlan = jest.fn()
      .mockResolvedValueOnce(revised)
      .mockResolvedValueOnce(updated);

    const result = await toggleRecipeInMealPlan({
      plan: finalized,
      projection,
      servings: 4,
      candidateId: 'new-candidate',
      repository,
      reloadPlan,
      resolveHouseholdId: jest.fn(),
    });

    expect(repository.revise).toHaveBeenCalledWith('plan-1', 3);
    expect(repository.update).toHaveBeenCalledWith({
      planId: 'plan-1',
      expectedVersion: 4,
      candidates: [],
    });
    expect(result).toEqual({ plan: updated, selected: false });
  });

  it('creates an open plan on the first selection without asking for a planning mode or horizon', async () => {
    const created = plan('draft');
    const repository = {
      create: jest.fn().mockResolvedValue({ planId: 'plan-1' }),
      revise: jest.fn(),
      update: jest.fn(),
    };
    const reloadPlan = jest.fn().mockResolvedValue(created);

    const result = await toggleRecipeInMealPlan({
      plan: null,
      projection,
      servings: 4,
      candidateId: 'candidate-1',
      repository,
      reloadPlan,
      resolveHouseholdId: jest.fn().mockResolvedValue('household-1'),
    });

    expect(repository.create).toHaveBeenCalledWith({
      householdId: 'household-1',
      horizon: { kind: 'open' },
      candidates: [expect.objectContaining({
        id: 'candidate-1',
        recipeSnapshot: expect.objectContaining({ recipeVersionId: projection.currentVersion.id }),
      })],
    });
    expect(result).toEqual({ plan: created, selected: true });
  });

  it('does not silently rewrite a plan while family choices are open', async () => {
    await expect(toggleRecipeInMealPlan({
      plan: plan('collecting_choices'),
      projection,
      servings: 4,
      candidateId: 'candidate-2',
      repository: { create: jest.fn(), revise: jest.fn(), update: jest.fn() },
      reloadPlan: jest.fn(),
      resolveHouseholdId: jest.fn(),
    })).rejects.toThrow('Family choices are underway');
  });

  it('lets the durable drawer remove a meal from an underway plan through the same implicit revision', async () => {
    const finalized = plan('finalized');
    const revised = plan('draft');
    const updated = plan('draft', []);
    const repository = {
      create: jest.fn(),
      revise: jest.fn().mockResolvedValue({ state: 'draft' }),
      update: jest.fn().mockResolvedValue({ state: 'draft' }),
    };
    const reloadPlan = jest.fn()
      .mockResolvedValueOnce(revised)
      .mockResolvedValueOnce(updated);

    const result = await removeCandidateFromMealPlan({
      plan: finalized,
      candidateId: 'candidate-1',
      repository,
      reloadPlan,
    });

    expect(repository.revise).toHaveBeenCalledWith('plan-1', 3);
    expect(repository.update).toHaveBeenCalledWith({ planId: 'plan-1', expectedVersion: 4, candidates: [] });
    expect(result).toBe(updated);
  });

  it('does not check a historical candidate that was left out of the finalized plan', async () => {
    const otherProjection = {
      recipe: { ...projection.recipe, id: 'recipe-2' },
      currentVersion: { ...projection.currentVersion, id: 'recipe-version-2', recipeId: 'recipe-2', title: 'Another meal' },
    };
    const selectedCandidate = buildMealPlanRecipeCandidate(projection, { candidateId: 'candidate-1', servings: 4 });
    const historicalCandidate = buildMealPlanRecipeCandidate(otherProjection, { candidateId: 'candidate-2', servings: 4 });
    const finalized = {
      ...plan('finalized', [selectedCandidate, historicalCandidate]),
      entries: [{
        id: 'entry-1', candidateId: 'candidate-1', title: selectedCandidate.title,
        servings: 4, placementDate: null, occasionId: null, dinerPersonIds: [],
      }],
    };
    const revised = { ...finalized, version: 4, state: 'draft' as const };
    const updated = plan('draft', [selectedCandidate, historicalCandidate]);
    const repository = {
      create: jest.fn(),
      revise: jest.fn().mockResolvedValue({ state: 'draft' }),
      update: jest.fn().mockResolvedValue({ state: 'draft' }),
    };

    expect(mealPlanContainsSelectedRecipeVersion(finalized, otherProjection)).toBe(false);
    await toggleRecipeInMealPlan({
      plan: finalized,
      projection: otherProjection,
      servings: 4,
      candidateId: 'candidate-new',
      repository,
      reloadPlan: jest.fn().mockResolvedValueOnce(revised).mockResolvedValueOnce(updated),
      resolveHouseholdId: jest.fn(),
    });

    expect(repository.update).toHaveBeenCalledWith({
      planId: 'plan-1',
      expectedVersion: 4,
      candidates: [selectedCandidate, historicalCandidate],
    });
  });
});
