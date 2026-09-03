import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  removeAccountProviders,
  type ProviderCleanupDependencies,
  type ProviderDeletionTarget,
} from '../accountDeletionProviders.ts';

const targets: ProviderDeletionTarget[] = [
  { kind: 'plaid', id: 'plaid-1' },
  { kind: 'calendar_google', id: 'google-1' },
  { kind: 'calendar_microsoft', id: 'microsoft-1' },
  { kind: 'kroger', id: 'kroger-1' },
  { kind: 'external_oauth', id: 'client-1' },
  { kind: 'phone_agent', id: 'phone-1' },
  { kind: 'push_registration', id: 'user-1' },
  { kind: 'install_identity', id: 'user-1' },
  { kind: 'revenuecat', id: 'user-1' },
  { kind: 'apple_identity', id: 'user-1' },
];

function dependencies() {
  const calls: string[] = [];
  const deps: ProviderCleanupDependencies = {
    listTargets: async () => { calls.push('list'); return targets; },
    revokeRemote: async (target) => { calls.push(`remote:${target.kind}:${target.id}`); },
    removeLocalCredential: async (target) => { calls.push(`local:${target.kind}:${target.id}`); },
    recordOutcome: async (target, outcome) => { calls.push(`receipt:${target.kind}:${outcome}`); },
  };
  return { deps, calls };
}

Deno.test('provider cleanup inventories first and removes credentials after remote revocation', async () => {
  const { deps, calls } = dependencies();
  const count = await removeAccountProviders('user-1', deps);
  assertEquals(count, targets.length);
  assertEquals(calls[0], 'list');
  for (const target of targets) {
    const remote = calls.indexOf(`remote:${target.kind}:${target.id}`);
    const local = calls.indexOf(`local:${target.kind}:${target.id}`);
    const receipt = calls.indexOf(`receipt:${target.kind}:removed`);
    assertEquals(remote < local && local < receipt, true);
  }
});

Deno.test('provider failure preserves its local credential and stops the batch', async () => {
  const { deps, calls } = dependencies();
  deps.revokeRemote = async (target) => {
    calls.push(`remote:${target.kind}:${target.id}`);
    if (target.kind === 'calendar_google') throw new Error('private-token');
  };
  await assertRejects(() => removeAccountProviders('user-1', deps), Error, 'private-token');
  assertEquals(calls.includes('local:calendar_google:google-1'), false);
  assertEquals(calls.some((call) => call.startsWith('remote:calendar_microsoft')), false);
});

Deno.test('already absent provider access is an idempotent terminal outcome', async () => {
  const { deps, calls } = dependencies();
  deps.revokeRemote = async (target) => {
    calls.push(`remote:${target.kind}:${target.id}`);
    return target.kind === 'plaid' ? 'already_absent' : 'removed';
  };
  await removeAccountProviders('user-1', deps);
  assertEquals(calls.includes('receipt:plaid:already_absent'), true);
  assertEquals(calls.includes('local:plaid:plaid-1'), true);
});
