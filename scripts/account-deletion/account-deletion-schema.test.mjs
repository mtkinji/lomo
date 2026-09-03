import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const migrationsDir = path.resolve('supabase/migrations');

const requiredRepairs = [
  ['kwilt_people', 'created_by_user_id'],
  ['kwilt_households', 'created_by_user_id'],
  ['kwilt_friendships', 'initiated_by'],
  ['kwilt_friendships', 'blocked_by'],
  ['kwilt_family_screen_time_access_requests', 'requested_by_user_id'],
  ['kwilt_family_screen_time_operations', 'actor_user_id'],
  ['kwilt_ugc_reports', 'reporter_user_id'],
  ['kwilt_ugc_reports', 'reported_user_id'],
];

async function migrationText() {
  const files = (await readdir(migrationsDir))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  const entries = await Promise.all(files.map(async (file) => ({
    file,
    sql: await readFile(path.join(migrationsDir, file), 'utf8'),
  })));
  return entries;
}

test('account deletion migration repairs every non-cascading auth.users relationship', async () => {
  const entries = await migrationText();
  const remediation = entries.find(({ file }) => file.endsWith('_account_deletion_integrity.sql'));
  assert.ok(remediation, 'missing account_deletion_integrity migration');

  for (const [table, column] of requiredRepairs) {
    assert.match(
      remediation.sql,
      new RegExp(
        `alter\\s+table\\s+public\\.${table}[\\s\\S]*?${column}[\\s\\S]*?references\\s+auth\\.users\\s*\\(id\\)\\s+on\\s+delete\\s+set\\s+null`,
        'i',
      ),
      `${table}.${column} must end with ON DELETE SET NULL`,
    );
  }
});

test('account deletion operation records are private and the preparation RPC is service-role only', async () => {
  const entries = await migrationText();
  const remediation = entries.find(({ file }) => file.endsWith('_account_deletion_integrity.sql'));
  assert.ok(remediation, 'missing account_deletion_integrity migration');

  assert.match(remediation.sql, /enable\s+row\s+level\s+security/i);
  assert.match(remediation.sql, /revoke\s+all[\s\S]*kwilt_account_deletion_operations[\s\S]*public\s*,\s*anon\s*,\s*authenticated/i);
  assert.match(remediation.sql, /security\s+definer[\s\S]*set\s+search_path\s*=\s*''/i);
  assert.match(remediation.sql, /revoke\s+all[\s\S]*prepare_kwilt_account_deletion[\s\S]*public\s*,\s*anon\s*,\s*authenticated/i);
  assert.match(remediation.sql, /grant\s+execute[\s\S]*prepare_kwilt_account_deletion[\s\S]*service_role/i);
  assert.match(remediation.sql, /kwilt-account-deletion-receipts-prune[\s\S]*expires_at\s*<=\s*now\(\)/i);
  assert.match(remediation.sql, /kwilt_account_deletion_provider_tokens[\s\S]*enable\s+row\s+level\s+security/i);
  assert.match(remediation.sql, /revoke\s+all[\s\S]*kwilt_account_deletion_provider_tokens[\s\S]*public\s*,\s*anon\s*,\s*authenticated/i);
});

test('new direct auth.users references declare a deletion-safe action', async () => {
  const entries = await migrationText();
  const historicalUnsafe = new Set(requiredRepairs.map(([table, column]) => `${table}.${column}`));
  const unreviewed = [];

  for (const { file, sql } of entries) {
    const tablePattern = /create\s+table(?:\s+if\s+not\s+exists)?\s+(?:public\.)?([a-z0-9_]+)\s*\(([\s\S]*?)\);/gi;
    for (const tableMatch of sql.matchAll(tablePattern)) {
      const table = tableMatch[1];
      for (const line of tableMatch[2].split('\n')) {
        const columnMatch = line.match(/^\s*([a-z0-9_]+)[^,]*references\s+auth\.users\s*\(\s*id\s*\)([^,]*)/i);
        if (!columnMatch) continue;
        const key = `${table}.${columnMatch[1]}`;
        const action = columnMatch[2].match(/on\s+delete\s+(cascade|set\s+null|restrict|no\s+action)/i);
        if ((!action || /restrict|no\s+action/i.test(action[1])) && !historicalUnsafe.has(key)) {
          unreviewed.push(`${file}: ${key}`);
        }
      }
    }
  }

  assert.deepEqual(unreviewed, [], `unreviewed auth.users references:\n${unreviewed.join('\n')}`);
});

test('preparation separates surviving shared stewardship from private person cleanup', async () => {
  const entries = await migrationText();
  const remediation = entries.find(({ file }) => file.endsWith('_account_deletion_integrity.sql'));
  assert.ok(remediation, 'missing account_deletion_integrity migration');

  for (const fragment of [
    'organizer_membership_id = v_successor.id',
    'suggested_by_person_id = v_successor.person_id',
    "set state = 'removed'",
    'delete from public.kwilt_grocery_lists where owner_person_id = v_person_id',
    'delete from public.kwilt_food_stock_observations where owner_person_id = v_person_id',
    'delete from public.kwilt_recipe_cook_sessions where owner_person_id = v_person_id',
    'delete from public.kwilt_recipe_import_drafts where owner_person_id = v_person_id',
    'not exists (select 1 from public.kwilt_recipe_publications',
    "set display_name = 'Former member'",
  ]) {
    assert.ok(remediation.sql.includes(fragment), `missing deletion contract fragment: ${fragment}`);
  }
});
