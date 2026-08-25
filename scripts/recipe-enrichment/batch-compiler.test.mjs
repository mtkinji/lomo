import assert from 'node:assert/strict';
import test from 'node:test';

import { compileReviewedBatch } from './batch-compiler.mjs';

const recipe = { rosterId: 'BR001', title: 'Test Breakfast', instructions: ['Cook 2 eggs.'], ingredients: ['2 eggs'] };
const batch = { batchId: 'recipe-enrichment-01', manifestHash: 'sha256:batch', recipes: [{ rosterId: 'BR001', sourceRecipeHash: `sha256:${'a'.repeat(64)}` }] };
const draft = { rosterId: 'BR001', lines: [{ position: 0, originalText: '2 eggs', quantityMin: 2, quantityMax: null, unit: 'count', ingredientConcept: 'eggs', preparation: null, optional: false, parseConfidence: 0.98 }], reviewFindings: [{ position: 0, reasons: ['concept_review'] }] };
const authored = {
  rosterId: 'BR001', reviewedAt: '2026-08-20', costTier: '$', difficulty: 'Easy',
  cookingReview: { decision: 'approved', rationale: 'The temperatures and doneness cues are coherent.' },
  ingredientReview: { 0: { patch: { ingredientConcept: 'egg', parseConfidence: 1 } } },
  scalingReview: { 0: { kind: 'multiply' } },
  instructionQuantityPhrases: { 0: ['2 eggs'] },
  equipmentNeeds: [], equipmentAnnotations: [],
  origin: { label: 'United States', region: 'North America', markers: [{ label: 'United States', latitude: 39, longitude: -98 }], map: { center: [-98, 39], scale: 560, highlightedCountryIds: ['840'] } },
  history: { paragraphs: ['A substantial first paragraph.', 'A substantial second paragraph.'], sources: [{ title: 'One', publisher: 'Museum', url: 'https://example.test/one' }, { title: 'Two', publisher: 'Archive', url: 'https://example.test/two' }] },
  commerce: { decision: 'no_purchase_needed', needId: null, reviewCategoryId: null, rationale: 'Ordinary cookware is sufficient.', noPurchaseAlternative: null },
};

test('compiles one explicitly reviewed authoring record without overstating image publication', () => {
  const output = compileReviewedBatch({ batch, catalog: [recipe], structuredDrafts: [draft], authoring: { BR001: authored }, existingRecords: [] });
  assert.equal(output.recipes[0].structuredIngredients[0].ingredientConcept, 'egg');
  assert.equal(output.recipes[0].review.sections.structuredIngredients, 'reviewed');
  assert.equal(output.recipes[0].review.sections.sitePublication, 'pending');
  assert.equal(output.recipes[0].review.state, 'in_progress');
  assert.equal(output.recipes[0].scalingState, 'verified');
  assert.deepEqual(output.recipes[0].structuredIngredients[0].scaleRule, { kind: 'multiply' });
});

test('keeps the canonical slug when authoring supplies only a publication timestamp', () => {
  const published = {
    ...authored,
    publication: { publishedAt: '2026-08-20T21:15:00.000Z' },
    heroImage: { state: 'published', storageRef: 'https://example.test/hero.webp', altText: 'A finished test breakfast on a plate.', width: 1536, height: 1024 },
  };
  const output = compileReviewedBatch({ batch, catalog: [recipe], structuredDrafts: [draft], authoring: { BR001: published }, existingRecords: [] });
  assert.equal(output.recipes[0].publication.slug, 'test-breakfast-br001');
  assert.equal(output.recipes[0].review.sections.sitePublication, 'published');
  assert.equal(output.recipes[0].review.state, 'reviewed');
});

test('refuses to compile when Codex has not resolved every parser finding', () => {
  const incomplete = { ...authored, ingredientReview: {} };
  assert.throws(() => compileReviewedBatch({ batch, catalog: [recipe], structuredDrafts: [draft], authoring: { BR001: incomplete }, existingRecords: [] }), /unresolved ingredient review/);
});

test('requires explicit cooking-truth approval', () => {
  const { cookingReview: _, ...incomplete } = authored;
  assert.throws(() => compileReviewedBatch({ batch, catalog: [recipe], structuredDrafts: [draft], authoring: { BR001: incomplete }, existingRecords: [] }), /explicit cooking-truth approval/);
});

test('rejects missing and extra ingredient scaling positions', () => {
  assert.throws(() => compileReviewedBatch({
    batch, catalog: [recipe], structuredDrafts: [draft],
    authoring: { BR001: { ...authored, scalingReview: {} } }, existingRecords: [],
  }), /scaling review must cover every ingredient/);
  assert.throws(() => compileReviewedBatch({
    batch, catalog: [recipe], structuredDrafts: [draft],
    authoring: { BR001: { ...authored, scalingReview: { 0: { kind: 'multiply' }, 1: { kind: 'multiply' } } } }, existingRecords: [],
  }), /scaling review must cover every ingredient/);
});

test('rejects multiply approval for a low-confidence structured quantity', () => {
  const lowConfidenceDraft = { ...draft, lines: [{ ...draft.lines[0], parseConfidence: 0.79 }] };
  assert.throws(() => compileReviewedBatch({
    batch, catalog: [recipe], structuredDrafts: [lowConfidenceDraft],
    authoring: { BR001: { ...authored, ingredientReview: { 0: { accept: true } } } }, existingRecords: [],
  }), /cannot use multiply below 0.8 confidence/);
});

test('allows an explicitly reviewed unavailable classification without partial rules', () => {
  const unavailable = {
    ...authored,
    scalingReview: undefined,
    scalingState: 'unavailable',
    scalingUnavailableReason: 'Cookware geometry makes a larger batch unreliable.',
  };
  const output = compileReviewedBatch({
    batch, catalog: [recipe], structuredDrafts: [draft],
    authoring: { BR001: unavailable }, existingRecords: [],
  });
  assert.equal(output.recipes[0].scalingState, 'unavailable');
  assert.deepEqual(output.recipes[0].structuredIngredients[0].scaleRule, { kind: 'review_required' });
});
