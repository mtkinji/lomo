import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWeeklyRecipeBatches, rankRecipesByLikelyPopularity } from './popularity.mjs';

function recipe(rosterId, overrides = {}) {
  return {
    rosterId,
    tier: 'discovery',
    prepMinutes: 30,
    cookMinutes: 30,
    research: { sources: [] },
    ...overrides,
  };
}

test('likely popularity favors editorial anchors, then evidence and practicality', () => {
  const ranked = rankRecipesByLikelyPopularity([
    recipe('DI003', { tier: 'discovery', research: { sources: [{ rating: 5, ratingCount: 10000 }] } }),
    recipe('DI002', { tier: 'household-anchor', prepMinutes: 5, cookMinutes: 10 }),
    recipe('DI001', { tier: 'household-anchor', prepMinutes: 80, cookMinutes: 80 }),
  ]);
  assert.deepEqual(ranked.map(({ rosterId }) => rosterId), ['DI002', 'DI001', 'DI003']);
});

test('weekly batches exclude the completed pilot and preserve a short final wave', () => {
  const recipes = Array.from({ length: 12 }, (_, index) => recipe(`DI${String(index + 1).padStart(3, '0')}`));
  const batches = buildWeeklyRecipeBatches(recipes, ['DI001', 'DI002'], 4);
  assert.deepEqual(batches.map((batch) => batch.length), [4, 4, 2]);
  assert.equal(batches.flat().some(({ rosterId }) => rosterId === 'DI001'), false);
});
