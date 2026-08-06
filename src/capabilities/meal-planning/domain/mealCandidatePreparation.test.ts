import { prepareMealCandidates } from './mealCandidatePreparation';

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
});
