import { prepareMealCandidates, selectMealPlanStarterCandidates } from './mealCandidatePreparation';

describe('Meal candidate preparation', () => {
  const recipes = [{ id: 'r1', versionId: 'rv1', title: 'Bean tacos', requiredConcepts: ['beans','tortillas'], estimatedGapCostCents: { min: 0, max: 400 }, lastCookedAt: null, useSoonConcepts: [] }, { id: 'r2', versionId: 'rv2', title: 'Broccoli pasta', requiredConcepts: ['broccoli','pasta'], estimatedGapCostCents: { min: 500, max: 900 }, lastCookedAt: '2026-08-01T00:00:00.000Z', useSoonConcepts: ['broccoli'] }];
  it('explains make-now and almost-there results from authorized stock evidence', () => {
    const result = prepareMealCandidates({ query: 'best_use', recipes, stock: [{ concept: 'beans', state: 'confirmed' }, { concept: 'tortillas', state: 'likely' }, { concept: 'pasta', state: 'confirmed' }], tripTargetCents: 1000, evidence: [{ capabilityId: 'recipes', authorized: true, fresh: true }, { capabilityId: 'groceries', authorized: true, fresh: true }] });
    expect(result[0]).toMatchObject({ recipeVersionId: 'rv1', qualification: 'almost_there', needsStockConfirmation: true, reason: expect.stringContaining('likely') });
    expect(result.every((item) => item.evidence.every((evidence) => evidence.authorized))).toBe(true);
  });
  it('does not use unauthorized or stale evidence as current truth', () => {
    expect(() => prepareMealCandidates({ query: 'stay_near_target', recipes, stock: [], tripTargetCents: 1000, evidence: [{ capabilityId: 'money', authorized: false, fresh: true }] })).toThrow(expect.objectContaining({ code: 'meal_candidate.evidence_unauthorized' }));
    const result = prepareMealCandidates({ query: 'make_now', recipes, stock: [{ concept: 'beans', state: 'confirmed' }, { concept: 'tortillas', state: 'confirmed' }], tripTargetCents: null, evidence: [{ capabilityId: 'groceries', authorized: true, fresh: false }] });
    expect(result).toEqual([]);
  });

  it('prepares a small editable starting set sized to the chosen horizon', () => {
    const prepared = Array.from({ length: 10 }, (_, index) => ({
      recipeId: `r${index}`,
      recipeVersionId: `rv${index}`,
      title: `Recipe ${index}`,
      qualification: 'best_use' as const,
      reason: 'A saved recipe to consider.',
      needsStockConfirmation: false,
      confirmedConcepts: [],
      likelyConcepts: [],
      missingConcepts: [],
      estimatedGapCostCents: { min: 0, max: 0 },
      evidence: [{ capabilityId: 'recipes', authorized: true, fresh: true }],
    }));

    expect(selectMealPlanStarterCandidates(prepared, { kind: 'meal_count', count: 3 })).toHaveLength(3);
    expect(selectMealPlanStarterCandidates(prepared, { kind: 'next_shop', shopBy: null })).toHaveLength(5);
    expect(selectMealPlanStarterCandidates(prepared.slice(0, 2), { kind: 'open' })).toHaveLength(2);
    expect(prepared).toHaveLength(10);
  });

  it('does not call an unnormalized catalog recipe confirmed on hand', () => {
    const result = prepareMealCandidates({
      query: 'best_use',
      recipes: [{ id: 'catalog-1', versionId: 'catalog-v1', title: 'Catalog meal', requiredConcepts: [], estimatedGapCostCents: { min: 0, max: 0 }, lastCookedAt: null, useSoonConcepts: [] }],
      stock: [],
      tripTargetCents: null,
      evidence: [{ capabilityId: 'recipes', authorized: true, fresh: true }, { capabilityId: 'groceries', authorized: true, fresh: true }],
    });

    expect(result[0]).toMatchObject({
      qualification: 'best_use',
      reason: 'Ingredient stock is not matched for this recipe yet.',
    });
  });

  it('preserves the curated recipe order when the available evidence does not distinguish candidates', () => {
    const result = prepareMealCandidates({
      query: 'best_use',
      recipes: [
        { id: 'curated-first', versionId: 'v-first', title: 'Ziti', requiredConcepts: [], estimatedGapCostCents: { min: 0, max: 0 }, lastCookedAt: null, useSoonConcepts: [] },
        { id: 'curated-second', versionId: 'v-second', title: 'Apple crisp', requiredConcepts: [], estimatedGapCostCents: { min: 0, max: 0 }, lastCookedAt: null, useSoonConcepts: [] },
      ],
      stock: [],
      tripTargetCents: null,
      evidence: [{ capabilityId: 'recipes', authorized: true, fresh: true }],
    });

    expect(result.map((candidate) => candidate.recipeId)).toEqual(['curated-first', 'curated-second']);
  });
});
