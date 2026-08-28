import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  DisconnectMoneyConnectionError,
  disconnectMoneyConnection,
  type DisconnectMoneyConnectionDependencies,
} from '../disconnectMoneyConnection.ts';

function dependencies(): DisconnectMoneyConnectionDependencies & Record<string, unknown> {
  return {
    loadOwnedConnection: async () => ({ id: 'connection-1', updatedAt: '2026-08-27T12:00:00.000Z', accountCount: 2 }),
    loadAccessToken: async () => 'private-token',
    removeProviderItem: async () => undefined,
    markDisconnected: async () => ({ confirmedAt: '2026-08-27T12:01:00.000Z' }),
  };
}

Deno.test('disconnect confirms provider removal before recording local completion', async () => {
  const order: string[] = [];
  const deps = dependencies();
  deps.removeProviderItem = async () => { order.push('provider'); };
  deps.markDisconnected = async () => { order.push('local'); return { confirmedAt: '2026-08-27T12:01:00.000Z' }; };
  const receipt = await disconnectMoneyConnection({
    userId: 'user-1', connectionId: 'connection-1', expectedUpdatedAt: '2026-08-27T12:00:00.000Z',
  }, deps);
  assertEquals(order, ['provider', 'local']);
  assertEquals(receipt.disconnectedAccountCount, 2);
});

Deno.test('provider failure never records or reports local success', async () => {
  let localWrites = 0;
  const deps = dependencies();
  deps.removeProviderItem = async () => { throw new Error('Plaid unavailable'); };
  deps.markDisconnected = async () => { localWrites += 1; return { confirmedAt: new Date().toISOString() }; };
  await assertRejects(() => disconnectMoneyConnection({
    userId: 'user-1', connectionId: 'connection-1', expectedUpdatedAt: '2026-08-27T12:00:00.000Z',
  }, deps), Error, 'Plaid unavailable');
  assertEquals(localWrites, 0);
});

Deno.test('stale connection is rejected before its provider token is read', async () => {
  let tokenReads = 0;
  const deps = dependencies();
  deps.loadAccessToken = async () => { tokenReads += 1; return 'private-token'; };
  await assertRejects(() => disconnectMoneyConnection({
    userId: 'user-1', connectionId: 'connection-1', expectedUpdatedAt: '2026-08-27T11:00:00.000Z',
  }, deps), DisconnectMoneyConnectionError, 'changed');
  assertEquals(tokenReads, 0);
});
