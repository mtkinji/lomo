import assert from 'node:assert/strict';
import test from 'node:test';

import { auditRecipe } from './scaling-audit.mjs';

function structured(originalText, parseConfidence) {
  return {
    position: 0,
    originalText,
    quantityMin: 3.5,
    quantityMax: null,
    unit: 'cup',
    ingredientConcept: 'flour',
    preparation: null,
    optional: false,
    parseConfidence,
  };
}

function recipe({ yieldUnit = 'servings', lines }) {
  return {
    rosterId: 'BA001',
    yieldUnit,
    scalingState: 'review_required',
    structuredIngredients: lines,
    instructionQuantityPhrases: {},
  };
}

test('reports low-confidence, parenthetical, and missing-rule hazards separately', () => {
  assert.deepEqual(auditRecipe(recipe({
    yieldUnit: '9-by-5-inch loaf',
    lines: [structured('3 1/2 cups (420 grams) flour', 0.78)],
  })).reasons, ['low_confidence_quantity', 'parenthetical_equivalent_unreviewed', 'scaling_rule_missing']);
});

test('routes vessel quantities to review without silently approving them', () => {
  assert.deepEqual(auditRecipe(recipe({
    lines: [structured('6 cups neutral oil, for frying', 0.98)],
  })).reasons, ['vessel_quantity_unreviewed', 'scaling_rule_missing']);
});

test('treats an explicit unavailable classification as complete and safe at one batch', () => {
  assert.deepEqual(auditRecipe({
    ...recipe({ lines: [structured('6 cups neutral oil, for frying', 0.98)] }),
    scalingState: 'unavailable',
  }), { reasons: [], rows: [] });
});
