import {
  PRIVATE_RECIPE_DOGFOOD_POLICY,
  RECIPE_IMPORT_EVAL_CASES,
  scoreRecipeImport,
  type RecipeImportChallenge,
  type RecipeImportHardFailure,
} from './recipeImportEvalCases';

describe('Recipe import evaluation specification', () => {
  it('covers every required source challenge using safe fixture policies', () => {
    const covered = new Set(RECIPE_IMPORT_EVAL_CASES.flatMap((item) => item.challenges));
    const required: RecipeImportChallenge[] = ['print', 'generated_cursive', 'glare', 'shadow', 'two_columns', 'rotation', 'multi_page_order', 'stains', 'marginal_notes', 'fractions', 'ranges', 'abbreviations', 'missing_headings', 'contradictions', 'prompt_injection'];
    expect([...covered].sort()).toEqual(required.sort());
    expect(RECIPE_IMPORT_EVAL_CASES.every((item) => ['synthetic', 'public_domain', 'expressly_releasable'].includes(item.artifactPolicy))).toBe(true);
  });

  it.each<RecipeImportHardFailure>([
    'invented_ingredient', 'invented_quantity', 'invented_time', 'invented_source', 'invented_author',
    'invented_rights', 'invented_offer', 'invented_eligibility', 'invented_activation', 'invented_order', 'invented_savings',
  ])('treats %s as a release-blocking hard failure', (hardFailure) => {
    expect(scoreRecipeImport({
      fieldCount: 10, correctlyTranscribedFieldCount: 10, groundedFieldCount: 10,
      orderedGroupCount: 2, correctlyOrderedGroupCount: 2, correctionCount: 0,
      latencyMs: 100, estimatedCostUsd: 0.01, hardFailures: [hardFailure],
    }).eligibleToShip).toBe(false);
  });

  it('scores accuracy, grounding, order, correction burden, latency, and cost independently', () => {
    expect(scoreRecipeImport({
      fieldCount: 10, correctlyTranscribedFieldCount: 9, groundedFieldCount: 8,
      orderedGroupCount: 4, correctlyOrderedGroupCount: 3, correctionCount: 2,
      latencyMs: 2400, estimatedCostUsd: 0.04, hardFailures: [],
    })).toEqual(expect.objectContaining({
      transcriptionAccuracy: 0.9, groundingRate: 0.8, orderRetention: 0.75,
      correctionBurden: 0.2, latencyMs: 2400, estimatedCostUsd: 0.04, eligibleToShip: true,
    }));
  });

  it('keeps private artifacts and text outside repository and standard analytics', () => {
    expect(PRIVATE_RECIPE_DOGFOOD_POLICY.repositoryMustNotContain).toContain('source image');
    expect(PRIVATE_RECIPE_DOGFOOD_POLICY.repositoryMustNotContain).toContain('recipe text');
    expect(PRIVATE_RECIPE_DOGFOOD_POLICY.requiredChecks).toContain('artifact deleted after save, cancel, or expiry');
  });
});
