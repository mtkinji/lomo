import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function required(name) {
  const value = (process.env[name] ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

if (process.env.KWILT_ALLOW_DESTRUCTIVE_ACCOUNT_DELETION_TEST !== '1') {
  throw new Error('destructive_account_deletion_test_not_authorized');
}
if (process.env.KWILT_ACCOUNT_DELETION_TEST_USER_CONFIRMATION !== 'disposable') {
  throw new Error('disposable_account_confirmation_required');
}

const userId = required('KWILT_ACCOUNT_DELETION_TEST_USER_ID');
const protectedIds = new Set((process.env.KWILT_ACCOUNT_DELETION_PROTECTED_USER_IDS ?? '')
  .split(',').map((value) => value.trim()).filter(Boolean));
if (protectedIds.has(userId)) throw new Error('protected_account_rejected');

const supabaseUrl = required('SUPABASE_URL').replace(/\/$/, '');
const serviceRoleKey = required('SUPABASE_SERVICE_ROLE_KEY');
const accessToken = required('KWILT_ACCOUNT_DELETION_TEST_ACCESS_TOKEN');
const evidenceSalt = required('KWILT_ACCOUNT_DELETION_EVIDENCE_SALT');
const expectedProjectRef = required('KWILT_ACCOUNT_DELETION_EXPECTED_PROJECT_REF');
assert.ok(supabaseUrl.includes(expectedProjectRef), 'target_project_mismatch');

const subjectHash = createHash('sha256').update(`${evidenceSalt}:${userId}`).digest('hex');
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const before = await admin.auth.admin.getUserById(userId);
assert.equal(before.data.user?.id, userId, 'disposable_user_not_found');

const operationId = randomUUID();
const response = await fetch(`${supabaseUrl}/functions/v1/account-delete`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    apikey: serviceRoleKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ confirm: true, operationId }),
});
const body = await response.json().catch(() => null);
assert.equal(response.ok, true, `account_delete_http_${response.status}`);
assert.equal(body?.ok, true, 'account_delete_not_complete');

const after = await admin.auth.admin.getUserById(userId);
assert.equal(after.data.user, null, 'auth_user_still_present');

const residualTables = [
  'kwilt_person_auth_bindings',
  'kwilt_push_tokens',
  'kwilt_install_identities',
  'kwilt_calendar_accounts',
  'budget_financial_connections',
  'kwilt_external_oauth_tokens',
  'kwilt_phone_agent_links',
];
const residualCounts = {};
for (const table of residualTables) {
  const column = table === 'kwilt_person_auth_bindings' ? 'user_id' : 'user_id';
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true }).eq(column, userId);
  if (error) throw new Error(`residual_check_failed_${table}`);
  residualCounts[table] = count ?? 0;
  assert.equal(count ?? 0, 0, `residual_rows_${table}`);
}

const { data: receipt, error: receiptError } = await admin
  .from('kwilt_account_deletion_operations')
  .select('status,user_id,completed_stages,completed_at')
  .eq('operation_id', operationId)
  .single();
if (receiptError) throw new Error('deletion_receipt_check_failed');
assert.equal(receipt.status, 'complete');
assert.equal(receipt.user_id, null);
assert.deepEqual(receipt.completed_stages, ['providers', 'storage', 'database', 'sessions', 'auth_user']);

console.log(JSON.stringify({
  status: 'complete',
  checkedAt: new Date().toISOString(),
  subjectHash,
  operationHash: createHash('sha256').update(`${evidenceSalt}:${operationId}`).digest('hex'),
  completedStages: receipt.completed_stages,
  residualCounts,
}));
