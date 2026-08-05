import { createSharedHomeRepository } from './sharedHomeRepository';

const row = {
  id: 'delivery-1',
  event_kind: 'goal_invitation',
  source_capability: 'goals',
  source_entity_type: 'goal_invite',
  source_entity_id: 'invite-1',
  actor_display_name: 'David',
  title: 'Goal invitation',
  body: 'David invited you to support a Goal.',
  destination: { kind: 'goal_invite', inviteCode: 'CODE1' },
  state: 'pending',
  settled_reason: null,
  created_at: '2026-08-05T10:00:00.000Z',
  updated_at: '2026-08-05T10:00:00.000Z',
  settled_at: null,
  expires_at: '2026-08-19T10:00:00.000Z',
  retain_until: '2026-09-04T10:00:00.000Z',
};

function createClient(result = { data: [row, { id: 'invalid' }], error: null as null | { message: string } }) {
  const calls: Array<[string, ...unknown[]]> = [];
  const query = {
    select(columns: string) { calls.push(['select', columns]); return this; },
    gt(column: string, value: string) { calls.push(['gt', column, value]); return this; },
    order(column: string, options: unknown) { calls.push(['order', column, options]); return this; },
    limit(value: number) { calls.push(['limit', value]); return Promise.resolve(result); },
  };
  const channel = {
    on(type: string, config: unknown, callback: () => void) {
      calls.push(['on', type, config, callback]);
      return this;
    },
    subscribe() { calls.push(['subscribe']); return this; },
  };
  const client = {
    from(table: string) { calls.push(['from', table]); return query; },
    channel(name: string) { calls.push(['channel', name]); return channel; },
    removeChannel(value: unknown) { calls.push(['removeChannel', value]); return Promise.resolve('ok'); },
  };
  return { client, calls, channel };
}

describe('Shared Home repository', () => {
  it('loads retained deliveries newest first and rejects malformed rows', async () => {
    const { client, calls } = createClient();
    const repository = createSharedHomeRepository(client as never);
    const items = await repository.list(new Date('2026-08-05T12:00:00.000Z'));

    expect(items).toHaveLength(1);
    expect(items[0]?.id).toBe('delivery-1');
    expect(calls).toContainEqual(['from', 'kwilt_shared_deliveries']);
    expect(calls).toContainEqual(['gt', 'retain_until', '2026-08-05T12:00:00.000Z']);
    expect(calls).toContainEqual(['order', 'created_at', { ascending: false }]);
    expect(calls).toContainEqual(['limit', 100]);
  });

  it('surfaces query errors', async () => {
    const { client } = createClient({ data: [], error: { message: 'offline' } });
    const repository = createSharedHomeRepository(client as never);
    await expect(repository.list()).rejects.toThrow('offline');
  });

  it('subscribes only to the recipient and removes the channel on cleanup', async () => {
    const { client, calls, channel } = createClient();
    const onInvalidate = jest.fn();
    const stop = createSharedHomeRepository(client as never).subscribe('user-1', onInvalidate);
    const onCall = calls.find(([name]) => name === 'on');
    expect(onCall?.[2]).toMatchObject({
      event: '*',
      schema: 'public',
      table: 'kwilt_shared_deliveries',
      filter: 'recipient_user_id=eq.user-1',
    });
    (onCall?.[3] as () => void)();
    expect(onInvalidate).toHaveBeenCalledTimes(1);
    await stop();
    expect(calls).toContainEqual(['removeChannel', channel]);
  });
});
