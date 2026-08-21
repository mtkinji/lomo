import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStructuredIngredientAudit } from './structured-ingredient-audit.mjs';

test('reports reviewed structured coverage without treating authored strings as parsed data', () => {
  const catalog = [{ rosterId: 'BR001', ingredients: ['2 eggs', 'Salt, optional'] }];
  const records = [{
    rosterId: 'BR001',
    review: { sections: { structuredIngredients: 'reviewed' } },
    structuredIngredients: [
      { position: 0, originalText: '2 eggs', quantityMin: 2, quantityMax: 2, unit: null, ingredientConcept: 'egg', preparation: null, optional: false, parseConfidence: 1 },
      { position: 1, originalText: 'Salt, optional', quantityMin: null, quantityMax: null, unit: null, ingredientConcept: 'salt', preparation: null, optional: true, parseConfidence: 0.95 },
    ],
  }];

  assert.deepEqual(buildStructuredIngredientAudit(catalog, records).summary, {
    totalRecipes: 1,
    totalIngredientLines: 2,
    fullyReviewedRecipes: 1,
    reviewedIngredientLines: 2,
    quantityCoverage: 1,
    unitCoverage: 0,
    conceptCoverage: 2,
    preparationCoverage: 0,
    optionalFlags: 1,
    blockingRecipes: 0,
  });
});

test('blocks a reviewed record whose positions or source text drifted', () => {
  const report = buildStructuredIngredientAudit(
    [{ rosterId: 'BR001', ingredients: ['2 eggs'] }],
    [{
      rosterId: 'BR001',
      review: { sections: { structuredIngredients: 'reviewed' } },
      structuredIngredients: [{ position: 1, originalText: '3 eggs', ingredientConcept: 'egg' }],
    }],
  );
  assert.equal(report.summary.blockingRecipes, 1);
  assert.match(report.recipes[0].blockingFindings.join(' '), /position|canonical text/);
});
