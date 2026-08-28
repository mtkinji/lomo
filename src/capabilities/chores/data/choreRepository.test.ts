import { createChoreRepository, type ChoreRepositoryOperation } from './choreRepository';

function client(results: Array<{ data: unknown; error: unknown }>) {
  const rpc = jest.fn(async () => results.shift() ?? { data: null, error: null });
  return { rpc } as never;
}

describe('choreRepository', () => {
  it('reads only the server-authorized chore projection', async () => {
    const rpcClient = client([{ data: {
      household: { id: 'household-1', name: 'Home' }, actor: { membershipId: 'member-1', displayName: 'A', role: 'caregiver' },
      members: [], definitions: [], occurrences: [], reward: { enabled: false, centsPerToken: 50, version: 'v1', balances: [], reservations: [] },
      observedAt: '2026-08-27T18:00:00.000Z',
    }, error: null }]);
    const repository = createChoreRepository(rpcClient);
    await expect(repository.read()).resolves.toMatchObject({ actor: { membershipId: 'member-1' } });
    expect((rpcClient as never as { rpc: jest.Mock }).rpc).toHaveBeenCalledWith('get_kwilt_chore_snapshot', {
      p_actor_membership_id: null, p_install_id: null,
    });
  });

  it('binds Household Mode actor context to the verified device instead of impersonating by label', async () => {
    const rpcClient = client([{ data: {
      household: { id: 'household-1', name: 'Home' }, actor: { membershipId: 'child-1', displayName: 'Child', role: 'child' },
      members: [], definitions: [], occurrences: [], reward: { enabled: false, centsPerToken: 50, version: 'v1', balances: [], reservations: [] },
      observedAt: '2026-08-27T18:00:00.000Z',
    }, error: null }]);
    const repository = createChoreRepository(rpcClient, undefined, async () => ({ actorMembershipId: 'child-1', installId: 'install-123' }));
    await repository.read();
    expect((rpcClient as never as { rpc: jest.Mock }).rpc).toHaveBeenCalledWith('get_kwilt_chore_snapshot', {
      p_actor_membership_id: 'child-1', p_install_id: 'install-123',
    });
  });

  it('queues a replay-safe write when transport is offline', async () => {
    const rpcClient = client([{ data: null, error: { message: 'network request failed' } }]);
    const queued: unknown[] = [];
    const repository = createChoreRepository(rpcClient, {
      load: async () => queued as never,
      save: async (items) => { queued.splice(0, queued.length, ...items); },
    });
    const result = await repository.execute({ requestId: 'request-1', operationId: 'chores.definition.pause',
      targetId: 'chore-1', expectedVersion: 'v1', payload: {} });
    expect(result).toMatchObject({ status: 'queued_offline' });
    expect(queued).toHaveLength(1);
  });

  it('replays an offline Household Mode action with its captured actor and device context', async () => {
    const rpcClient = client([
      { data: null, error: { message: 'network request failed' } },
      { data: { operationId: 'chores.occurrence.claim', status: 'completed' }, error: null },
    ]);
    const queued: ChoreRepositoryOperation[] = [];
    let actor = { actorMembershipId: 'child-1', installId: 'install-123' };
    const repository = createChoreRepository(rpcClient, {
      load: async () => queued,
      save: async (items) => { queued.splice(0, queued.length, ...items); },
    }, async () => actor);
    await repository.execute({ requestId: 'claim-offline', operationId: 'chores.occurrence.claim',
      targetId: 'occurrence-1', expectedVersion: 'v1', payload: {} });
    actor = { actorMembershipId: 'caregiver-1', installId: 'install-123' };
    await repository.replayOutbox();
    expect((rpcClient as never as { rpc: jest.Mock }).rpc).toHaveBeenLastCalledWith('execute_kwilt_chore_action', expect.objectContaining({
      p_actor_membership_id: 'child-1', p_install_id: 'install-123',
    }));
  });
});
