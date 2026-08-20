import assert from 'node:assert/strict';
import test from 'node:test';

import seedData from '../../src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json' with { type: 'json' };
import { loadCanonicalCatalog } from './catalog.mjs';
import { buildCoverage, buildEnrichmentManifest, mergeReviewedRecords } from './pipeline.mjs';
import { buildSources } from '../recipe-images/pipeline.mjs';

test('builds one stable research task per canonical Recipe without overwriting reviewed records', async () => {
  const catalog = await loadCanonicalCatalog();
  const manifest = buildEnrichmentManifest(catalog, seedData.recipes);

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.recipes.length, 500);
  assert.equal(new Set(manifest.recipes.map((recipe) => recipe.rosterId)).size, 500);
  assert.deepEqual(
    manifest.recipes.map((recipe) => recipe.rosterId),
    [...manifest.recipes.map((recipe) => recipe.rosterId)].sort(),
  );
  const reviewed = manifest.recipes.find((recipe) => recipe.rosterId === 'BR031');
  assert.equal(reviewed.originHistoryState, 'reviewed');
  assert.equal(reviewed.equipmentState, 'reviewed');
  assert.equal(reviewed.heroImageState, 'published');
  assert.equal(reviewed.researchTask, null);
  const pending = manifest.recipes.find((recipe) => recipe.rosterId === 'BR001');
  assert.equal(pending.originHistoryState, 'pending');
  assert.equal(pending.equipmentState, 'pending');
  assert.equal(pending.heroImageState, 'missing');
  assert.equal(pending.researchTask.sources.length >= 3, true);
  assert.equal(pending.researchTask.instructions.length >= 4, true);
  assert.match(pending.sourceRecipeHash, /^sha256:[a-f0-9]{64}$/);
});

test('reports editorial and imagery proof separately', async () => {
  const catalog = await loadCanonicalCatalog();
  const coverage = buildCoverage(buildEnrichmentManifest(catalog, seedData.recipes));

  assert.deepEqual(coverage, {
    totalRecipes: 500,
    representedRecipes: 500,
    reviewedOriginHistory: 10,
    historyDepthGaps: 5,
    reviewedEquipment: 3,
    pendingEquipment: 497,
    publishedHeroImages: 10,
    pendingOrMissingHeroImages: 490,
  });
});

test('merges only current reviewed records and preserves an existing review by default', async () => {
  const catalog = await loadCanonicalCatalog();
  const existing = seedData.recipes[0];
  assert.throws(
    () => mergeReviewedRecords(catalog, [existing], [{ ...existing, review: { ...existing.review, reviewedBy: 'Replacement' } }]),
    /already has a reviewed record/,
  );
  assert.throws(
    () => mergeReviewedRecords(catalog, [], [{ ...existing, sourceRecipeHash: `sha256:${'0'.repeat(64)}` }]),
    /source hash is stale/,
  );
});

test('shares the canonical source hash and reviewed origin with the image pipeline', async () => {
  const catalog = await loadCanonicalCatalog();
  const byRosterId = new Map(seedData.recipes.map((record) => [record.rosterId, record]));
  const [source] = buildSources([catalog.find((recipe) => recipe.rosterId === 'BR031')], byRosterId);

  assert.equal(source.contentHash, seedData.recipes.find((record) => record.rosterId === 'BR031').sourceRecipeHash);
  assert.deepEqual(source.origin, { label: 'Japan', region: 'East Asia' });
});
