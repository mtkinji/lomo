import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('./mcp-smoke.mjs', import.meta.url), 'utf8');

test('smoke client requests capability scopes and rejects the retired broad scope vocabulary', () => {
  for (const scope of [
    'life.read',
    'life.write',
    'household.read',
    'household.write',
    'money.read',
    'money.write',
    'food.read',
    'food.write',
  ]) {
    assert.match(source, new RegExp(`['\"]${scope.replace('.', '\\.') }['\"]`));
  }

  assert.match(source, /writeSmoke \? 'life\.read life\.write' : 'life\.read'/);
  assert.doesNotMatch(source, /writeSmoke \? 'read write' : 'read'/);
  assert.doesNotMatch(source, /includes\('read'\)|includes\('write'\)/);
});

test('write smoke describes the scoped grant accurately', () => {
  assert.match(source, /write tools for life\.read life\.write scope/);
});

test('write smoke proves safe completion, replay, and reviewed-write boundaries', () => {
  assert.match(source, /name: 'capture_activity'/);
  assert.match(source, /idempotent_replay/);
  assert.match(source, /same_result/);
  assert.match(source, /name: 'create_goal'/);
  assert.match(source, /status !== 'proposed'/);
  assert.match(source, /confirmation\?\.state !== 'pending'/);
  assert.doesNotMatch(source, /createArc\.structuredContent\?\.arc_id/);
  assert.doesNotMatch(source, /delete smoke objects ok/);
});
