import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';
import { runProviderFeasibility } from './food-provider-feasibility.mjs';
import { runRecipeImportCorpus } from './food-recipe-import-corpus.mjs';

const workspace = resolve(import.meta.dirname, '..');

test('provider fixture mode emits only deterministic redacted summaries', async () => {
  const temp = await mkdtemp(resolve(tmpdir(), 'kwilt-food-provider-'));
  try {
    const output = resolve(temp, 'provider.json');
    const report = await runProviderFeasibility({
      'fixture-dir': resolve(workspace, 'scripts/fixtures/food-providers'), output,
    });
    assert.equal(report.observations.length, 5);
    const serialized = await readFile(output, 'utf8');
    for (const forbidden of ['must not escape', 'example.invalid', 'productName', 'retailerNames', 'secret', 'token=']) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }
    assert.deepEqual(Object.keys(report.observations[0]).sort(), [
      'capabilityFlags', 'counts', 'errorClass', 'latencyBucket', 'operation', 'provider', 'status',
    ]);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('recipe corpus reports structure without recipe text or source names', async () => {
  const temp = await mkdtemp(resolve(tmpdir(), 'kwilt-food-import-'));
  try {
    const output = resolve(temp, 'import.json');
    const report = await runRecipeImportCorpus({
      'fixture-dir': resolve(workspace, 'scripts/fixtures/recipe-import'), output,
    });
    assert.equal(report.observations.length, 2);
    assert.equal(report.observations[0].status, 'parsed');
    const serialized = await readFile(output, 'utf8');
    assert.equal(serialized.includes('Synthetic Test Recipe'), false);
    assert.equal(serialized.includes('complete.html'), false);
    assert.equal(serialized.includes('recipeIngredient'), false);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('live provider mode refuses output outside the evidence boundary', async () => {
  await assert.rejects(
    runProviderFeasibility({ output: resolve(tmpdir(), 'kwilt-food-live.json') }),
    /must be under docs\/delivery-evidence\/food\/feasibility/,
  );
});
