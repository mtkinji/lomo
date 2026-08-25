import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalRecipeHash } from './catalog.mjs';
import { buildSiteExport, preserveExistingPublicRecipes } from './site-export.mjs';

const recipe = {
  rosterId: 'BR001', title: 'Test Breakfast', description: 'A complete test recipe.', category: 'Breakfast & brunch', cuisine: 'American',
  yieldQuantity: 4, yieldUnit: 'servings', prepMinutes: 10, cookMinutes: 15, inactiveMinutes: 0,
  ingredients: ['2 eggs'], instructions: ['Whisk 2 eggs, then cook for 3 minutes until set.'], notes: 'Serve warm.',
};

function completeRecord() {
  return {
    schemaVersion: 2,
    rosterId: recipe.rosterId,
    sourceRecipeHash: canonicalRecipeHash(recipe),
    review: {
      state: 'reviewed', reviewedAt: '2026-08-20', reviewedBy: 'Kwilt Kitchen · Codex',
      sections: { cookingTruth: 'reviewed', structuredIngredients: 'reviewed', originHistory: 'reviewed', equipment: 'reviewed', commerce: 'reviewed', sitePublication: 'published' },
    },
    costTier: '$', difficulty: 'Easy',
    scalingState: 'verified',
    structuredIngredients: [{ position: 0, originalText: '2 eggs', quantityMin: 2, quantityMax: 2, unit: null, ingredientConcept: 'egg', preparation: null, optional: false, parseConfidence: 1, scaleRule: { kind: 'multiply' } }],
    instructionQuantityPhrases: { 0: ['2 eggs'] },
    commerce: { decision: 'no_purchase_needed', needId: null, reviewCategoryId: null, rationale: 'Ordinary cookware is sufficient.', noPurchaseAlternative: null },
    publication: { slug: 'test-breakfast-br001', publishedAt: '2026-08-20T12:00:00Z' },
    equipmentNeeds: [], equipmentAnnotations: [],
    origin: { label: 'United States', region: 'North America', markers: [{ label: 'United States', latitude: 39, longitude: -98 }], map: { center: [-98, 39], scale: 560, highlightedCountryIds: ['840'] } },
    history: { paragraphs: ['First substantive paragraph.', 'Second substantive paragraph.'], sources: [{ title: 'One', publisher: 'Museum', url: 'https://example.test/one' }, { title: 'Two', publisher: 'Archive', url: 'https://example.test/two' }] },
    heroImage: { state: 'published', storageRef: 'https://example.test/hero.webp', altText: 'A test breakfast on a plate.', width: 1536, height: 1024 },
  };
}

test('exports only fully reviewed and published Recipes through one Site projection', () => {
  const output = buildSiteExport([recipe], [completeRecord()], 'abc123');
  assert.equal(output.recipes.length, 1);
  assert.equal(output.blocked.length, 0);
  assert.equal(output.recipes[0].editorial.commerce.decision, 'no_purchase_needed');
  assert.equal(output.recipes[0].structuredIngredients[0].ingredientConcept, 'egg');
  assert.equal(output.recipes[0].scalingState, 'verified');
  assert.deepEqual(output.recipes[0].structuredIngredients[0].scaleRule, { kind: 'multiply' });
});

test('keeps incomplete Recipes out of the public payload and names every missing gate', () => {
  const record = completeRecord();
  record.review.state = 'in_progress';
  record.review.sections.structuredIngredients = 'pending';
  record.heroImage.state = 'editorial_review';
  const output = buildSiteExport([recipe], [record], 'abc123');
  assert.equal(output.recipes.length, 0);
  assert.deepEqual(output.blocked[0].reasons, ['overall_review', 'structured_ingredients', 'hero_image']);
});

test('adds a reviewed batch without withdrawing recipes that are already public', () => {
  const current = buildSiteExport([recipe], [completeRecord()], 'new-commit');
  const existing = {
    schemaVersion: 1,
    sourceCommit: 'old-commit',
    recipes: [{ ...current.recipes[0], rosterId: 'BR099', slug: 'legacy-br099' }],
  };
  const merged = preserveExistingPublicRecipes(current, existing);
  assert.deepEqual(merged.recipes.map(({ rosterId }) => rosterId), ['BR001', 'BR099']);
  assert.equal(merged.preservedExistingRecipes, 1);
});
