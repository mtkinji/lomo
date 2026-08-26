import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const migration = readFileSync(
  new URL('../supabase/migrations/20260826160000_add_external_action_scopes.sql', import.meta.url),
  'utf8',
).toLowerCase();

test('marks existing broad OAuth grants as expiring compatibility grants', () => {
  assert.match(migration, /scope_policy_version/);
  assert.match(migration, /legacy_scope_expires_at/);
  assert.match(migration, /2026-11-30t00:00:00(?:\.000)?z/);
  assert.match(migration, /scope\s+in\s*\(\s*'read'\s*,\s*'write'\s*,\s*'read write'\s*\)/);
});

test('new authorization codes and tokens default to current capability policy', () => {
  for (const table of ['kwilt_external_oauth_authorization_codes', 'kwilt_external_oauth_tokens']) {
    assert.match(migration, new RegExp(`alter table public\\.${table}[\\s\\S]*scope_policy_version`));
  }
  assert.match(migration, /set default 2/);
  assert.match(migration, /set not null/);
});

test('records the complete capability scope vocabulary without a destructive super-scope', () => {
  for (const scope of [
    'life.read', 'life.write', 'household.read', 'household.write',
    'money.read', 'money.write', 'food.read', 'food.write',
  ]) {
    assert.ok(migration.includes(`'${scope}'`), `missing ${scope}`);
  }
  assert.doesNotMatch(migration, /destructive\.(?:read|write)|admin/);
});
