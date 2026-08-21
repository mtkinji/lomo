import assert from 'node:assert/strict';
import test from 'node:test';

import { candidateCountFromEnv, nextQaSweepState, rosterIdsFromEnv } from './pipeline.mjs';

test('keeps three image candidates by default', () => {
  assert.equal(candidateCountFromEnv(undefined), 3);
});

test('supports a two-candidate first pass for adaptive image review', () => {
  assert.equal(candidateCountFromEnv('2'), 2);
});

test('rejects image candidate counts outside the supported review range', () => {
  assert.throws(() => candidateCountFromEnv('1'), /between 2 and 3/);
  assert.throws(() => candidateCountFromEnv('4'), /between 2 and 3/);
});

test('can target an adaptive third candidate to only the Recipes that need it', () => {
  assert.equal(rosterIdsFromEnv(undefined), null);
  assert.deepEqual([...rosterIdsFromEnv('BR058, BR061,BR058')], ['BR058', 'BR061']);
});

test('rejects malformed adaptive Recipe ids', () => {
  assert.throws(() => rosterIdsFromEnv('BR058,not-a-roster-id'), /valid canonical Recipe ids/);
});

test('allows one idle QA sweep so an expired lease recovered by the database can be claimed', () => {
  assert.deepEqual(nextQaSweepState({ consecutiveIdleCalls: 0, considered: 0, allFailed: false }), {
    consecutiveIdleCalls: 1,
    shouldContinue: true,
  });
  assert.deepEqual(nextQaSweepState({ consecutiveIdleCalls: 1, considered: 0, allFailed: false }), {
    consecutiveIdleCalls: 2,
    shouldContinue: false,
  });
});

test('resets the idle QA count after work and stops when every attempted check failed', () => {
  assert.deepEqual(nextQaSweepState({ consecutiveIdleCalls: 1, considered: 2, allFailed: false }), {
    consecutiveIdleCalls: 0,
    shouldContinue: true,
  });
  assert.deepEqual(nextQaSweepState({ consecutiveIdleCalls: 0, considered: 1, allFailed: true }), {
    consecutiveIdleCalls: 0,
    shouldContinue: false,
  });
});
