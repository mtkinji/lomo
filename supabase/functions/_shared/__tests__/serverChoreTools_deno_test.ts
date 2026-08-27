import { executeServerChoreTool } from '../serverChoreTools.ts';

const snapshot = {
  household: { id: 'household-1', name: 'Home' }, actor: { membershipId: 'caregiver-1', displayName: 'A', role: 'caregiver' },
  members: [], definitions: [], occurrences: [], reward: { enabled: false, centsPerToken: 50, version: 'v1', balances: [], reservations: [] },
  observedAt: '2026-08-27T18:00:00.000Z',
};

Deno.test('server Chores reads only the authorized projection', async () => {
  const calls: unknown[] = [];
  const result = await executeServerChoreTool({
    client: { rpc: async (name, args) => { calls.push([name, args]); return { data: snapshot, error: null }; } },
    userId: 'user-1', call: { id: 'call-1', toolId: 'chores.list', arguments: {} },
    stageProposal: async () => { throw new Error('unexpected proposal'); },
    stageDeviceAction: async () => { throw new Error('unexpected handoff'); },
  });
  if (result?.status !== 'completed') throw new Error('authorized chore list failed');
  if (JSON.stringify(calls) !== JSON.stringify([['get_kwilt_agent_chore_snapshot', { p_user_id: 'user-1' }]])) throw new Error('wrong chore snapshot RPC');
});

Deno.test('server Chores stages writes and keeps photo capture native', async () => {
  let proposals = 0; let handoffs = 0;
  const common = {
    client: { rpc: async () => ({ data: snapshot, error: null }) }, userId: 'user-1',
    stageProposal: async () => { proposals += 1; return { id: 'proposal-1', status: 'pending' as const, version: 1, replayed: false }; },
    stageDeviceAction: async () => { handoffs += 1; },
  };
  const staged = await executeServerChoreTool({ ...common,
    call: { id: 'call-2', toolId: 'chores.definition.create', arguments: { fields: { title: 'Feed Scout' } } } });
  if (staged?.status !== 'proposed' || proposals !== 1) throw new Error('chore proposal not staged');
  const handoff = await executeServerChoreTool({ ...common,
    call: { id: 'call-3', toolId: 'chores.evidence.add', arguments: { occurrenceId: 'occurrence-1' } } });
  if (handoff?.status !== 'pending_client_action' || handoffs !== 1) throw new Error('evidence did not stay native');
});

Deno.test('server Chores refuses unavailable Household authority', async () => {
  const result = await executeServerChoreTool({
    client: { rpc: async () => ({ data: null, error: { message: 'household_required' } }) },
    userId: 'user-1', call: { id: 'call-4', toolId: 'chores.list', arguments: {} },
    stageProposal: async () => { throw new Error('unexpected proposal'); },
    stageDeviceAction: async () => { throw new Error('unexpected handoff'); },
  });
  if (result?.status !== 'refused') throw new Error('missing Household authority was not refused');
});

Deno.test('server Chores refuses stale targets and child actions against another member', async () => {
  const governed = {
    ...snapshot,
    actor: { membershipId: 'child-1', displayName: 'Child', role: 'child' },
    definitions: [{ id: 'chore-1', updatedAt: 'definition-v2' }],
    occurrences: [{ id: 'occurrence-1', updatedAt: 'occurrence-v2' }],
    reward: { ...snapshot.reward, enabled: true, version: 'reward-v2',
      balances: [{ membershipId: 'child-1', availableTokens: 4, reservedTokens: 0 }] },
  };
  const common = {
    client: { rpc: async () => ({ data: governed, error: null }) }, userId: 'user-1',
    stageProposal: async () => { throw new Error('unexpected proposal'); },
  };
  const stale = await executeServerChoreTool({ ...common,
    call: { id: 'call-stale', toolId: 'chores.occurrence.complete', arguments: { occurrenceId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1', evidenceRefIds: [] } } });
  if (stale?.status !== 'refused') throw new Error('stale occurrence was proposed');
  const other = await executeServerChoreTool({ ...common,
    call: { id: 'call-other', toolId: 'chores.reward.reserve', arguments: { membershipId: 'child-2', tokenCount: 1, expectedVersion: 'reward-v2' } } });
  if (other?.status !== 'refused') throw new Error('child reserved another member reward');
});
