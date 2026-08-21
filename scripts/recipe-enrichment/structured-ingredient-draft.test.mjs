import assert from 'node:assert/strict';
import test from 'node:test';

import { buildStructuredIngredientDraft } from './structured-ingredient-draft.mjs';

const parse = (text) => ({
  quantityMin: text.startsWith('2 ') ? 2 : null,
  quantityMax: null,
  unit: text.includes('cups') ? 'cup' : 'count',
  concept: text.replace(/^2 (?:cups )?/, '').split(',')[0].toLowerCase(),
  preparation: text.includes(',') ? text.split(',').slice(1).join(',').trim() : null,
});

test('maps the shared food parser into hash-reviewable structured lines', () => {
  const result = buildStructuredIngredientDraft({ rosterId: 'BR001', ingredients: ['2 cups carrots, chopped', 'Salt, optional'] }, parse);
  assert.deepEqual(result.lines[0], {
    position: 0,
    originalText: '2 cups carrots, chopped',
    quantityMin: 2,
    quantityMax: null,
    unit: 'cup',
    ingredientConcept: 'carrots',
    preparation: 'chopped',
    optional: false,
    parseConfidence: 0.98,
  });
  assert.equal(result.lines[1].optional, true);
  assert.ok(result.reviewFindings.some((finding) => finding.position === 1));
});

test('flags alternatives and package expressions for Codex review', () => {
  const result = buildStructuredIngredientDraft({ rosterId: 'BR001', ingredients: ['2 cans (15 ounces each) beans or chickpeas'] }, parse);
  assert.deepEqual(result.reviewFindings[0].reasons, ['alternative_or_range', 'package_expression']);
  assert.ok(result.lines[0].parseConfidence < 0.9);
});
