import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { decryptToken, type EncryptedToken } from '../_shared/calendarUtils.ts';
import { assertPlaidEnvironmentAllowedForSupabase, plaidPost } from '../_shared/plaid.ts';
import { AccountDeletionError, deleteKwiltAccount, type AccountDeletionDependencies, type AccountDeletionErrorCode, type AccountDeletionStage } from './accountDeletion.ts';
import { removeAccountProviders, type ProviderCleanupDependencies, type ProviderDeletionOutcome, type ProviderDeletionTarget } from './accountDeletionProviders.ts';
import { removeStorageManifest, type AccountStorageDependencies } from './accountDeletionStorage.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };
const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function requiredEnv(name: string) {
  const value = (Deno.env.get(name) ?? '').trim();
  if (!value) throw new Error(`missing_${name.toLowerCase()}`);
  return value;
}

function getAdmin() {
  return createClient(requiredEnv('SUPABASE_URL'), requiredEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

type AdminClient = ReturnType<typeof getAdmin>;

function bearer(req: Request) {
  return /^Bearer\s+(.+)$/i.exec((req.headers.get('authorization') ?? '').trim())?.[1]?.trim() || null;
}

function assertNoError(error: { message?: string } | null, code: string): void {
  if (error) throw new Error(code);
}

async function subjectHash(userId: string) {
  const value = new TextEncoder().encode(`${requiredEnv('ACCOUNT_DELETION_HASH_SECRET')}:${userId}`);
  const digest = await crypto.subtle.digest('SHA-256', value);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function listProviderTargets(admin: AdminClient, userId: string): Promise<ProviderDeletionTarget[]> {
  const targets: ProviderDeletionTarget[] = [];
  const { data: plaid, error: plaidError } = await admin.from('budget_financial_connections').select('id').eq('user_id', userId);
  assertNoError(plaidError, 'plaid_inventory_failed');
  for (const row of plaid ?? []) targets.push({ kind: 'plaid', id: String(row.id) });

  const { data: calendars, error: calendarError } = await admin.from('kwilt_calendar_accounts').select('id,provider').eq('user_id', userId);
  assertNoError(calendarError, 'calendar_inventory_failed');
  for (const row of calendars ?? []) {
    if (row.provider === 'google' || row.provider === 'microsoft') {
      targets.push({ kind: `calendar_${row.provider}` as 'calendar_google' | 'calendar_microsoft', id: String(row.id) });
    }
  }

  const { data: binding, error: bindingError } = await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id', userId).maybeSingle();
  assertNoError(bindingError, 'person_inventory_failed');
  if (binding?.person_id) {
    const { data: grocery, error: groceryError } = await admin.from('kwilt_grocery_provider_accounts').select('id').eq('owner_person_id', binding.person_id);
    assertNoError(groceryError, 'grocery_provider_inventory_failed');
    for (const row of grocery ?? []) targets.push({ kind: 'kroger', id: String(row.id) });
  }

  const { data: external, error: externalError } = await admin.from('kwilt_external_oauth_tokens').select('id').eq('user_id', userId).is('revoked_at', null);
  assertNoError(externalError, 'external_oauth_inventory_failed');
  for (const row of external ?? []) targets.push({ kind: 'external_oauth', id: String(row.id) });

  const { data: phones, error: phoneError } = await admin.from('kwilt_phone_agent_links').select('id').eq('user_id', userId).neq('status', 'revoked');
  assertNoError(phoneError, 'phone_agent_inventory_failed');
  for (const row of phones ?? []) targets.push({ kind: 'phone_agent', id: String(row.id) });

  const { data: push, error: pushError } = await admin.from('kwilt_push_tokens').select('id').eq('user_id', userId).limit(1);
  assertNoError(pushError, 'push_inventory_failed');
  if ((push ?? []).length) targets.push({ kind: 'push_registration', id: userId });

  const { data: installs, error: installError } = await admin.from('kwilt_install_identities').select('install_id').eq('user_id', userId).limit(1);
  assertNoError(installError, 'install_identity_inventory_failed');
  if ((installs ?? []).length) targets.push({ kind: 'install_identity', id: userId });

  const { data: authUser, error: authUserError } = await admin.auth.admin.getUserById(userId);
  assertNoError(authUserError, 'auth_provider_inventory_failed');
  const authProviders = Array.isArray(authUser?.user?.app_metadata?.providers)
    ? authUser.user.app_metadata.providers
    : [];
  if (authProviders.includes('apple')) targets.push({ kind: 'apple_identity', id: userId });

  targets.push({ kind: 'revenuecat', id: userId });
  return targets;
}

async function revokeGoogle(admin: AdminClient, accountId: string): Promise<ProviderDeletionOutcome> {
  const { data, error } = await admin.from('kwilt_calendar_tokens').select('token_payload').eq('account_id', accountId).maybeSingle();
  assertNoError(error, 'calendar_token_read_failed');
  const payload = data?.token_payload as { access?: EncryptedToken; refresh?: EncryptedToken | null } | null;
  const encrypted = payload?.refresh ?? payload?.access;
  if (!encrypted) return 'already_absent';
  const token = await decryptToken(requiredEnv('CALENDAR_TOKEN_ENCRYPTION_SECRET'), encrypted);
  if (!token) throw new Error('calendar_token_decrypt_failed');
  const response = await fetch('https://oauth2.googleapis.com/revoke', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token }), signal: AbortSignal.timeout(15_000),
  });
  if (response.ok) return 'removed';
  const body = await response.json().catch(() => null);
  if (response.status === 400 && body?.error === 'invalid_token') return 'already_absent';
  throw new Error('google_calendar_revoke_failed');
}

function providerDependencies(admin: AdminClient, deletionUserId: string): ProviderCleanupDependencies {
  return {
    listTargets: (userId) => listProviderTargets(admin, userId),
    async revokeRemote(target) {
      if (target.kind === 'plaid') {
        const { data, error } = await admin.rpc('get_budget_plaid_access_token', { p_connection_id: target.id });
        assertNoError(error, 'plaid_token_read_failed');
        if (typeof data !== 'string' || !data.trim()) return 'already_absent';
        assertPlaidEnvironmentAllowedForSupabase();
        try {
          await plaidPost('/item/remove', { access_token: data });
        } catch (error) {
          const plaidCode = String((error as { plaid?: { error_code?: unknown } })?.plaid?.error_code ?? '');
          if (plaidCode === 'INVALID_ACCESS_TOKEN' || plaidCode === 'ITEM_NOT_FOUND') return 'already_absent';
          throw error;
        }
        return 'removed';
      }
      if (target.kind === 'calendar_google') return revokeGoogle(admin, target.id);
      if (target.kind === 'apple_identity') {
        const { data, error } = await admin.from('kwilt_account_deletion_provider_tokens')
          .select('token_kind,token_payload').eq('user_id', target.id).eq('provider', 'apple').maybeSingle();
        assertNoError(error, 'apple_token_read_failed');
        if (!data?.token_payload || data.token_kind !== 'refresh_token') return 'local_credential_removed';
        const token = await decryptToken(
          requiredEnv('ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET'),
          data.token_payload as EncryptedToken,
        );
        if (!token) throw new Error('apple_token_decrypt_failed');
        const response = await fetch('https://appleid.apple.com/auth/revoke', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: requiredEnv('APPLE_AUTH_CLIENT_ID'),
            client_secret: requiredEnv('APPLE_AUTH_CLIENT_SECRET'),
            token,
            token_type_hint: 'refresh_token',
          }),
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) throw new Error('apple_token_revoke_failed');
        return 'removed';
      }
      if (target.kind === 'revenuecat') {
        const response = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(target.id)}`, {
          method: 'DELETE', headers: { Authorization: `Bearer ${requiredEnv('REVENUECAT_SECRET_API_KEY')}` },
          signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) return 'removed';
        if (response.status === 404) return 'already_absent';
        throw new Error('revenuecat_delete_failed');
      }
      return 'local_credential_removed';
    },
    async removeLocalCredential(target) {
      let table: string | null = null;
      let column = 'id';
      if (target.kind === 'plaid') table = 'budget_financial_connections';
      else if (target.kind === 'calendar_google' || target.kind === 'calendar_microsoft') table = 'kwilt_calendar_accounts';
      else if (target.kind === 'kroger') table = 'kwilt_grocery_provider_accounts';
      else if (target.kind === 'external_oauth') table = 'kwilt_external_oauth_tokens';
      else if (target.kind === 'phone_agent') table = 'kwilt_phone_agent_links';
      else if (target.kind === 'push_registration') { table = 'kwilt_push_tokens'; column = 'user_id'; }
      else if (target.kind === 'install_identity') { table = 'kwilt_install_identities'; column = 'user_id'; }
      else if (target.kind === 'apple_identity') { table = 'kwilt_account_deletion_provider_tokens'; column = 'user_id'; }
      if (!table) return;
      const { error } = await admin.from(table).delete().eq(column, target.id);
      assertNoError(error, `${target.kind}_local_delete_failed`);
    },
    async recordOutcome(target, outcome) {
      const receiptKey = target.kind;
      const { data, error } = await admin.from('kwilt_account_deletion_operations').select('provider_outcomes').eq('user_id', deletionUserId).single();
      assertNoError(error, 'provider_receipt_read_failed');
      const prior = data?.provider_outcomes?.[receiptKey];
      const providerOutcomes = {
        ...(data?.provider_outcomes ?? {}),
        [receiptKey]: prior === undefined ? outcome : Array.isArray(prior) ? [...prior, outcome] : [prior, outcome],
      };
      const { error: updateError } = await admin.from('kwilt_account_deletion_operations').update({ provider_outcomes: providerOutcomes, updated_at: new Date().toISOString() }).eq('user_id', deletionUserId);
      assertNoError(updateError, 'provider_receipt_update_failed');
    },
  };
}

async function removeAccountStorage(admin: AdminClient, userId: string) {
  const { data: binding, error: bindingError } = await admin.from('kwilt_person_auth_bindings').select('person_id').eq('user_id', userId).maybeSingle();
  assertNoError(bindingError, 'storage_person_inventory_failed');

  const storage: AccountStorageDependencies = {
    async listPage(target, offset, limit) {
      const { data, error } = await admin.storage.from(target.bucket).list(target.prefix, { limit, offset });
      assertNoError(error, 'storage_list_failed');
      return (data ?? []).map((item: { name?: unknown; id?: unknown }) => ({
        name: String(item.name),
        isFolder: !item.id,
      }));
    },
    async remove(bucket, paths) {
      const { error } = await admin.storage.from(bucket).remove(paths);
      assertNoError(error, 'storage_remove_failed');
    },
  };
  const targets = [
    { bucket: 'activity_attachments', prefix: userId },
    { bucket: 'hero_images', prefix: userId },
    { bucket: 'household-avatars', prefix: `account/${userId}` },
  ];
  if (binding?.person_id) {
    targets.push({ bucket: 'recipe-import-artifacts', prefix: String(binding.person_id) });
  }
  await removeStorageManifest(targets, storage);
}

function deletionDependencies(admin: AdminClient): AccountDeletionDependencies {
  return {
    async beginOrResume({ userId, operationId }) {
      const hash = await subjectHash(userId);
      const { data: existing, error } = await admin.from('kwilt_account_deletion_operations').select('operation_id,user_id,subject_hash,status,completed_stages,attempt_count').eq('operation_id', operationId).maybeSingle();
      assertNoError(error, 'deletion_operation_read_failed');
      if (existing) {
        if (existing.subject_hash !== hash || (existing.user_id && existing.user_id !== userId)) throw new AccountDeletionError('invalid_request', 403, false, 'Invalid account deletion request.');
        if (existing.status === 'complete') return { completed: ['providers', 'storage', 'database', 'sessions', 'auth_user'] };
        const { error: resumeError } = await admin.from('kwilt_account_deletion_operations').update({ status: 'running', last_error_code: null, attempt_count: Number(existing.attempt_count ?? 0) + 1, updated_at: new Date().toISOString() }).eq('operation_id', operationId);
        assertNoError(resumeError, 'deletion_operation_resume_failed');
        return { completed: existing.completed_stages ?? [] };
      }
      const { data: competing, error: competingError } = await admin.from('kwilt_account_deletion_operations').select('operation_id').eq('user_id', userId).neq('status', 'complete').limit(1);
      assertNoError(competingError, 'deletion_operation_read_failed');
      if ((competing ?? []).length) throw new AccountDeletionError('deletion_in_progress', 409, true, 'Account deletion is already in progress.');
      const { error: insertError } = await admin.from('kwilt_account_deletion_operations').insert({ operation_id: operationId, user_id: userId, subject_hash: hash, status: 'running', attempt_count: 1 });
      assertNoError(insertError, 'deletion_operation_create_failed');
      return { completed: [] };
    },
    removeProviders: (userId) => removeAccountProviders(userId, providerDependencies(admin, userId)).then(() => undefined),
    removeStorage: (userId) => removeAccountStorage(admin, userId),
    async prepareDatabase(userId, operationId) {
      const { error } = await admin.rpc('prepare_kwilt_account_deletion', { p_user_id: userId, p_operation_id: operationId });
      assertNoError(error, 'database_cleanup_failed');
    },
    async revokeSessions(jwt) {
      const { error } = await admin.auth.admin.signOut(jwt, 'global');
      assertNoError(error, 'session_revoke_failed');
    },
    async deleteAuthUser(userId) {
      const { error } = await admin.auth.admin.deleteUser(userId);
      assertNoError(error, 'auth_delete_failed');
    },
    async recordStage(operationId, stage) {
      const { data, error } = await admin.from('kwilt_account_deletion_operations').select('completed_stages').eq('operation_id', operationId).single();
      assertNoError(error, 'deletion_receipt_read_failed');
      const completed = Array.from(new Set<AccountDeletionStage>([...(data?.completed_stages ?? []), stage]));
      const { error: updateError } = await admin.from('kwilt_account_deletion_operations').update({ completed_stages: completed, updated_at: new Date().toISOString() }).eq('operation_id', operationId);
      assertNoError(updateError, 'deletion_receipt_update_failed');
    },
    async recordFailure(operationId, code: AccountDeletionErrorCode) {
      const { error } = await admin.from('kwilt_account_deletion_operations').update({ status: 'retryable_failure', last_error_code: code, updated_at: new Date().toISOString() }).eq('operation_id', operationId);
      assertNoError(error, 'deletion_receipt_update_failed');
    },
    async complete(operationId) {
      const now = new Date().toISOString();
      const { error } = await admin.from('kwilt_account_deletion_operations').update({ user_id: null, status: 'complete', last_error_code: null, completed_at: now, updated_at: now }).eq('operation_id', operationId);
      assertNoError(error, 'deletion_receipt_complete_failed');
    },
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  try {
    const admin = getAdmin();
    const token = bearer(req);
    if (!token) return json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } });
    const { data, error } = await admin.auth.getUser(token);
    if (error || !data?.user?.id) return json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } });
    const body = await req.json().catch(() => null);
    if (body?.confirm !== true || typeof body?.operationId !== 'string') return json(400, { error: { message: 'Missing deletion confirmation', code: 'bad_request' } });
    const providers = Array.isArray(data.user.app_metadata?.providers) ? data.user.app_metadata.providers : [];
    let manualAppleAccessRemovalRequired = false;
    if (providers.includes('apple')) {
      const { data: appleToken, error: appleTokenError } = await admin
        .from('kwilt_account_deletion_provider_tokens').select('user_id')
        .eq('user_id', data.user.id).eq('provider', 'apple').maybeSingle();
      assertNoError(appleTokenError, 'apple_token_inventory_failed');
      manualAppleAccessRemovalRequired = !appleToken;
    }
    const result = await deleteKwiltAccount({ userId: data.user.id, operationId: body.operationId, jwt: token }, deletionDependencies(admin));
    return json(200, {
      ...result,
      manualAppleAccessRemovalRequired,
    });
  } catch (error) {
    if (error instanceof AccountDeletionError) return json(error.status, { error: { message: error.message, code: error.code }, status: error.retryable ? 'retryable_failure' : 'failed' });
    return json(503, { error: { message: 'Account deletion service unavailable', code: 'provider_unavailable' }, status: 'retryable_failure' });
  }
});
