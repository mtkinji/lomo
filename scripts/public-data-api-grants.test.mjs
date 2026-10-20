import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';

const sql = readFileSync(new URL('../supabase/migrations/20261020145812_explicit_public_data_api_grants.sql', import.meta.url), 'utf8');
const grants = [...sql.matchAll(/^grant ([a-z, ]+) on (table|sequence) public\.(\w+) to (\w+);$/gm)];
const permissions = (name, role) => grants
  .filter(([, , , table, grantee]) => table === name && grantee === role)
  .flatMap(([, privileges]) => privileges.split(', '));

test('fresh databases explicitly allow push registration and server Plaid work', () => {
  assert.ok(permissions('kwilt_push_tokens', 'authenticated').includes('insert'));
  assert.ok(permissions('budget_plaid_jobs', 'service_role').includes('update'));
});

test('friendship and token internals keep their protected access paths', () => {
  for (const role of ['anon', 'authenticated']) {
    assert.deepEqual(permissions('kwilt_friendships', role), []);
    assert.deepEqual(permissions('budget_plaid_jobs', role), []);
    assert.deepEqual(permissions('kwilt_external_oauth_tokens', role), []);
  }
  for (const role of ['anon', 'authenticated', 'service_role']) {
    assert.deepEqual(permissions('kwilt_friend_invite_preview_budgets', role), []);
  }
});

test('Money clients retain read-only bank data access', () => {
  assert.deepEqual(permissions('budget_transactions', 'authenticated'), ['select']);
  assert.deepEqual(permissions('budget_transactions', 'anon'), []);
});

test('server identity sequences work without exposing them to clients', () => {
  assert.deepEqual(permissions('kwilt_conversational_control_audit_id_seq', 'service_role'), ['usage', 'select']);
  assert.deepEqual(permissions('kwilt_conversational_control_audit_id_seq', 'authenticated'), []);
});

test('service-side action persistence can read and upsert receipts and handoffs', () => {
  const creation = readFileSync(new URL('../supabase/migrations/20260827181938_conversational_action_handoffs.sql', import.meta.url), 'utf8');
  for (const table of ['kwilt_conversational_action_receipts', 'kwilt_conversational_action_handoffs']) {
    assert.ok(creation.includes(`grant select, insert, update on table public.${table} to service_role;`));
  }
});

test('compatibility migration cannot restore broad defaults or change existing policy', () => {
  const executable = sql.replace(/--[^\n]*/g, '').trim();
  assert.ok(grants.length > 0);
  assert.equal(executable.split(';').filter(s => s.trim()).length, grants.length);
  assert.doesNotMatch(executable, /alter default privileges|on all tables|revoke|create policy|disable row level security/i);
  assert.ok(grants.every(([, , , , role]) => ['anon', 'authenticated', 'service_role'].includes(role)));
});

test('future public tables declare access for every API role in their creation migration', () => {
  const directory = new URL('../supabase/migrations/', import.meta.url);
  for (const file of readdirSync(directory).filter(name => name.endsWith('.sql') && name > '20261020145812_explicit_public_data_api_grants.sql')) {
    const source = readFileSync(new URL(file, directory), 'utf8').replace(/--[^\n]*/g, '').toLowerCase();
    const tables = [...source.matchAll(/\bcreate\s+table\s+(?:if\s+not\s+exists\s+)?public\.(\w+)/g)];
    const decisions = [...source.matchAll(/\b(?:grant|revoke)\s+[^;]+;/g)].map(([statement]) => statement);
    for (const [, table] of tables) {
      for (const role of ['anon', 'authenticated', 'service_role']) {
        assert.ok(decisions.some(statement =>
          new RegExp(`\\bon\\s+(?:table\\s+)?[^;]*\\bpublic\\.${table}\\b[^;]*\\b(?:to|from)\\s+[^;]*\\b${role}\\b`).test(statement)),
        `${file}: declare GRANT or REVOKE for public.${table} and ${role}`);
      }
    }
  }
});
