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
