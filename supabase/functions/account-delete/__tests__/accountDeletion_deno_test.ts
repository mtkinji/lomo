import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  AccountDeletionError,
  deleteKwiltAccount,
  type AccountDeletionDependencies,
  type AccountDeletionStage,
} from '../accountDeletion.ts';

function dependencies(completed: AccountDeletionStage[] = []) {
  const calls: string[] = [];
  const deps: AccountDeletionDependencies = {
    beginOrResume: async () => ({ completed }),
    removeProviders: async () => { calls.push('providers'); },
    removeStorage: async () => { calls.push('storage'); },
    prepareDatabase: async () => { calls.push('database'); },
    revokeSessions: async () => { calls.push('sessions'); },
    deleteAuthUser: async () => { calls.push('auth_user'); },
    recordStage: async (_operationId, stage) => { calls.push(`record:${stage}`); },
    recordFailure: async (_operationId, code) => { calls.push(`failure:${code}`); },
    complete: async () => { calls.push('complete'); },
  };
  return { deps, calls };
}

const input = {
  userId: '11111111-1111-4111-8111-111111111111',
  operationId: '22222222-2222-4222-8222-222222222222',
  jwt: 'private-jwt',
};

Deno.test('account deletion runs every destructive stage in order', async () => {
  const { deps, calls } = dependencies();
  const result = await deleteKwiltAccount(input, deps);
  assertEquals(result, { ok: true, operationId: input.operationId, status: 'complete' });
  assertEquals(calls, [
    'providers', 'record:providers',
    'storage', 'record:storage',
    'database', 'record:database',
    'sessions', 'record:sessions',
    'auth_user', 'record:auth_user',
    'complete',
  ]);
});

Deno.test('account deletion resumes after the last recorded stage', async () => {
  const { deps, calls } = dependencies(['providers', 'storage']);
  await deleteKwiltAccount(input, deps);
  assertEquals(calls, [
    'database', 'record:database',
    'sessions', 'record:sessions',
    'auth_user', 'record:auth_user',
    'complete',
  ]);
});

Deno.test('provider failure records only a stable code and blocks later deletion', async () => {
  const { deps, calls } = dependencies();
  deps.removeProviders = async () => { throw new Error('access_token=do-not-record'); };
  await assertRejects(
    () => deleteKwiltAccount(input, deps),
    AccountDeletionError,
    'connected services',
  );
  assertEquals(calls, ['failure:provider_cleanup_failed']);
});

Deno.test('invalid identifiers fail before dependencies run', async () => {
  const { deps, calls } = dependencies();
  await assertRejects(
    () => deleteKwiltAccount({ ...input, operationId: 'not-a-uuid' }, deps),
    AccountDeletionError,
    'Invalid account deletion request',
  );
  assertEquals(calls, []);
});
