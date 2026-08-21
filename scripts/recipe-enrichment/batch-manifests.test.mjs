import assert from 'node:assert/strict';
import test from 'node:test';

import { buildBatchManifests } from './batch-manifests.mjs';

test('partitions the canonical catalog into stable hash-pinned batches without omissions', () => {
  const manifest = {
    schemaVersion: 1,
    recipes: Array.from({ length: 53 }, (_, index) => ({
      rosterId: `BR${String(index + 1).padStart(3, '0')}`,
      sourceRecipeHash: `sha256:${String(index + 1).padStart(64, '0')}`,
    })),
  };
  const batches = buildBatchManifests(manifest, 25);
  assert.deepEqual(batches.map((batch) => batch.recipes.length), [25, 25, 3]);
  assert.deepEqual(batches.map((batch) => batch.batchId), ['recipe-enrichment-01', 'recipe-enrichment-02', 'recipe-enrichment-03']);
  assert.equal(new Set(batches.flatMap((batch) => batch.recipes.map((recipe) => recipe.rosterId))).size, 53);
  assert.match(batches[0].manifestHash, /^sha256:[a-f0-9]{64}$/);
});

test('rejects duplicate roster ids before batch work begins', () => {
  assert.throws(() => buildBatchManifests({ recipes: [{ rosterId: 'BR001' }, { rosterId: 'BR001' }] }, 25), /duplicate roster id/);
});
