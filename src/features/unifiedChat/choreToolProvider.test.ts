import type { ChoreControlSnapshot, ChoreRepository } from '../../capabilities/chores/data/choreRepository';
import { createChoreActions } from '../../capabilities/chores/domain/choreActions';
import { createChoreToolProvider } from './choreToolProvider';

const snapshot: ChoreControlSnapshot = {
  household: { id: 'household-1', name: 'Home' },
  actor: { membershipId: 'caregiver-1', displayName: 'A', role: 'caregiver' },
  members: [{ membershipId: 'caregiver-1', displayName: 'A', role: 'caregiver' }, { membershipId: 'child-1', displayName: 'C', role: 'child' }],
  definitions: [{ id: 'chore-1', activitySeriesId: 'series-1', title: 'Feed Scout', definitionOfDone: 'Food and water', status: 'active', participation: 'assigned', assignedMembershipId: 'child-1', repeatRule: 'daily', repeatCustom: null, repeatBasis: 'scheduled', photoPolicy: 'optional', reviewPolicy: 'trusted', tokenValue: 2, updatedAt: 'chore-v1' }],
  occurrences: [{ id: 'occurrence-1', definitionId: 'chore-1', activityId: 'activity-1', scheduledDate: '2026-08-27', title: 'Feed Scout', status: 'ready', assignedMembershipId: 'child-1', performedByMembershipId: null, performedAt: null, evidenceRefs: [], reviewNote: null, tokenCredited: false, updatedAt: 'occurrence-v1' }],
  reward: { enabled: true, centsPerToken: 50, version: 'reward-v1', balances: [{ membershipId: 'child-1', availableTokens: 8, reservedTokens: 0 }], reservations: [] },
  observedAt: '2026-08-27T18:00:00.000Z',
};

const tool = (id: string) => ({ id, capabilityId: 'chores', effect: id.endsWith('.list') ? 'read' : 'write' }) as never;
const call = (toolId: string, args: Record<string, unknown> = {}) => ({ id: `call-${toolId}`, toolId, arguments: args }) as never;

function setup(value = snapshot) {
  const repository: jest.Mocked<ChoreRepository> = { read: jest.fn(async () => value), execute: jest.fn(), replayOutbox: jest.fn(), uploadEvidence: jest.fn() };
  return { repository, provider: createChoreToolProvider({ actions: createChoreActions(repository) }) };
}

describe('choreToolProvider', () => {
  it('returns actor-bounded inventory without fixture household data', async () => {
    const { provider } = setup();
    const result = await provider.execute(call('chores.list'), tool('chores.list'));
    expect(result).toMatchObject({ status: 'completed', output: { actor: { membershipId: 'caregiver-1' } } });
  });

  it('stages an exact reviewed occurrence completion', async () => {
    const { provider } = setup({ ...snapshot, actor: snapshot.members[1] });
    const result = await provider.execute(call('chores.occurrence.complete', { occurrenceId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1', evidenceRefIds: [] }), tool('chores.occurrence.complete'));
    expect(result).toMatchObject({ status: 'proposed' });
    expect(provider.proposals()[0]).toMatchObject({ capabilityId: 'chores', operation: { type: 'chores.occurrence.complete', targetId: 'occurrence-1', expectedUpdatedAt: 'occurrence-v1' } });
  });

  it('returns a durable native handoff for photo evidence', async () => {
    const { provider } = setup({ ...snapshot, actor: snapshot.members[1] });
    const result = await provider.execute(call('chores.evidence.add', { occurrenceId: 'occurrence-1' }), tool('chores.evidence.add'));
    expect(result).toMatchObject({ status: 'pending_client_action', provider: 'device', request: { actionType: 'open_chore_evidence_picker', targetId: 'occurrence-1' } });
  });

  it('stages exact open-pool claim and earlier-day correction operations', async () => {
    const child = snapshot.members[1];
    const available = { ...snapshot.occurrences[0], status: 'available' as const, assignedMembershipId: null };
    const claim = setup({ ...snapshot, actor: child, occurrences: [available] });
    await expect(claim.provider.execute(call('chores.occurrence.claim', {
      occurrenceId: available.id, expectedUpdatedAt: available.updatedAt,
    }), tool('chores.occurrence.claim'))).resolves.toMatchObject({ status: 'proposed' });

    const missed = { ...snapshot.occurrences[0], status: 'missed' as const };
    const correction = setup({ ...snapshot, actor: child, occurrences: [missed] });
    await expect(correction.provider.execute(call('chores.occurrence.report_earlier', {
      items: [{ occurrenceId: missed.id, expectedUpdatedAt: missed.updatedAt }],
    }), tool('chores.occurrence.report_earlier'))).resolves.toMatchObject({ status: 'proposed' });
  });
});
