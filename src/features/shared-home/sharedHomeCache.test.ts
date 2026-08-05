import { createSharedHomeCache, sharedHomeCacheKey } from './sharedHomeCache';
import type { SharedHomeDelivery } from './sharedHomeTypes';

function delivery(): SharedHomeDelivery {
  return {
    id: 'delivery-1',
    eventKind: 'goal_invitation',
    sourceCapability: 'goals',
    sourceEntityType: 'goal_invite',
    sourceEntityId: 'invite-1',
    actorDisplayName: 'David',
    title: 'Goal invitation',
    body: 'David invited you to support a Goal.',
    destination: { kind: 'goal_invite', inviteCode: 'CODE1' },
    state: 'pending',
    settledReason: null,
    createdAt: '2026-08-05T10:00:00.000Z',
    updatedAt: '2026-08-05T10:00:00.000Z',
    settledAt: null,
    expiresAt: '2026-08-19T10:00:00.000Z',
    retainUntil: '2026-09-04T10:00:00.000Z',
  };
}

describe('Shared Home cache', () => {
  it('uses a different key for every signed-in user', () => {
    expect(sharedHomeCacheKey('user-a')).not.toBe(sharedHomeCacheKey('user-b'));
  });

  it('never loads another account snapshot', async () => {
    const values = new Map<string, string>();
    const cache = createSharedHomeCache({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    });
    await cache.save('user-a', [delivery()]);
    expect((await cache.load('user-a'))?.items).toHaveLength(1);
    expect(await cache.load('user-b')).toBeNull();
  });

  it('rejects malformed and structurally invalid snapshots', async () => {
    const values = new Map<string, string>([
      [sharedHomeCacheKey('broken-json'), '{'],
      [sharedHomeCacheKey('broken-row'), JSON.stringify({ schemaVersion: 1, savedAt: '2026-08-05T10:00:00.000Z', items: [{ id: 'forged' }] })],
    ]);
    const cache = createSharedHomeCache({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async () => undefined,
      removeItem: async () => undefined,
    });
    expect(await cache.load('broken-json')).toBeNull();
    expect(await cache.load('broken-row')).toBeNull();
  });

  it('removes only the requested account snapshot', async () => {
    const values = new Map<string, string>();
    const cache = createSharedHomeCache({
      getItem: async (key) => values.get(key) ?? null,
      setItem: async (key, value) => { values.set(key, value); },
      removeItem: async (key) => { values.delete(key); },
    });
    await cache.save('user-a', [delivery()]);
    await cache.save('user-b', [delivery()]);
    await cache.remove('user-a');
    expect(await cache.load('user-a')).toBeNull();
    expect((await cache.load('user-b'))?.items).toHaveLength(1);
  });
});
