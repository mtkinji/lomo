import type { UnifiedChatProposal, UnifiedChatThreadAggregate } from './types';
import { recoverPlanMutations } from './recoverPlanMutations';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;

const proposal: PlanProposal = {
  id: 'proposal-plan', threadId: 'thread-1', runId: 'run-1', messageId: null,
  capabilityId: 'plan', title: 'Call school', body: 'Tomorrow at 9:00 AM', status: 'applying', version: 3,
  createdAt: '2026-07-23T12:00:00.000Z', updatedAt: '2026-07-23T12:00:01.000Z',
  operation: {
    id: 'operation-plan', proposalId: 'proposal-plan', capabilityId: 'plan', type: 'schedule_activity',
    targetId: 'activity-school', summary: 'Add Call school to Plan', sequence: 1,
    idempotencyKey: 'run-1:activity-school',
    payload: {
      activityId: 'activity-school', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
      startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z', targetDateKey: '2026-07-24',
      writeCalendarRef: { provider: 'google', accountId: 'account-1', calendarId: 'primary' },
    },
  },
};

function aggregate(receiptStatus: 'reserved' | 'applied' = 'reserved'): UnifiedChatThreadAggregate {
  return {
    thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'now', updatedAt: 'now' },
    messages: [], runs: [], proposals: [proposal],
    receipts: [{
      id: 'receipt-plan', proposalId: proposal.id, operationId: proposal.operation.id,
      capabilityId: 'plan', idempotencyKey: proposal.operation.idempotencyKey, status: receiptStatus,
      resultingObjectType: 'activity', resultingObjectId: 'activity-school', resultState: {},
      returnTarget: null, undoOperation: null, canUndo: false, appliedAt: null, undoneAt: null,
    }],
  };
}

describe('recoverPlanMutations', () => {
  test('reconciles a reserved calendar mutation before marking the proposal applied', async () => {
    const loaded = { ...aggregate('applied'), proposals: [{ ...proposal, status: 'applied' as const, version: 4 }] };
    const repository = {
      finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(async () => ({})),
      transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
    };
    const apply = jest.fn(async () => ({
      resultingObjectId: 'activity-school', resultState: { title: 'Call school' },
      returnTarget: { capabilityId: 'plan' }, appliedAt: 'now',
      undoOperation: { type: 'delete_created_plan_event', expectedUpdatedAt: 'now' },
    }));

    await expect(recoverPlanMutations({ aggregate: aggregate(), repository: repository as never, apply: apply as never }))
      .resolves.toBe(loaded);

    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'approved' }),
      { allowAlreadyApplied: true },
    );
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-plan', expect.objectContaining({
      resultingObjectId: 'activity-school',
      undoOperation: expect.objectContaining({ type: 'delete_created_plan_event' }),
    }));
    expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'applied' }));
  });

  test('records an unconfirmed recovery as an independent failure', async () => {
    const loaded = { ...aggregate(), proposals: [{ ...proposal, status: 'failed' as const, version: 4 }] };
    const repository = {
      finalizeMutationReceipt: jest.fn(), failMutationReceipt: jest.fn(async () => ({})),
      transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
    };

    await expect(recoverPlanMutations({
      aggregate: aggregate(), repository: repository as never,
      apply: async () => { throw new Error('Kwilt could not confirm the calendar block.'); },
    })).resolves.toBe(loaded);

    expect(repository.failMutationReceipt).toHaveBeenCalledWith(
      'receipt-plan', 'plan_recovery_unconfirmed', 'Kwilt could not confirm the calendar block.',
    );
    expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'failed' }));
  });

  test('recovers one reserved chunk independently with its event-specific undo receipt', async () => {
    if (proposal.operation.type !== 'schedule_activity') throw new Error('Expected schedule fixture.');
    const baseOperation = proposal.operation;
    const chunkProposal: PlanProposal = {
      ...proposal,
      id: 'proposal-chunk-1',
      operation: {
        ...baseOperation,
        id: 'operation-chunk-1', proposalId: 'proposal-chunk-1', type: 'schedule_activity_chunk',
        idempotencyKey: 'run-1:chunks:chunk-1',
        payload: {
          ...baseOperation.payload,
          groupId: 'group-1', chunkId: 'chunk-1', title: 'Call school, part 1',
        },
      },
    };
    const reservedReceipt = aggregate().receipts?.[0];
    if (!reservedReceipt) throw new Error('Expected reserved receipt fixture.');
    const pendingAggregate: UnifiedChatThreadAggregate = {
      ...aggregate(), proposals: [chunkProposal],
      receipts: [{
        ...reservedReceipt, proposalId: chunkProposal.id,
        operationId: chunkProposal.operation.id, idempotencyKey: chunkProposal.operation.idempotencyKey,
      }],
    };
    const pendingReceipt = pendingAggregate.receipts?.[0];
    if (!pendingReceipt) throw new Error('Expected pending chunk receipt fixture.');
    const loaded = {
      ...pendingAggregate,
      proposals: [{ ...chunkProposal, status: 'applied' as const, version: 4 }],
      receipts: [{ ...pendingReceipt, status: 'applied' as const }],
    };
    const repository = {
      finalizeMutationReceipt: jest.fn(async () => ({})), failMutationReceipt: jest.fn(async () => ({})),
      transitionProposalStatus: jest.fn(async () => ({})), loadThread: jest.fn(async () => loaded),
    };
    const apply = jest.fn(async () => ({
      resultingObjectId: 'activity-school',
      resultState: {
        title: 'Call school, part 1', scheduledAt: '2026-07-24T15:00:00.000Z',
        targetDateKey: '2026-07-24', eventId: 'event-chunk-1', provider: 'google' as const,
        accountId: 'account-1', calendarId: 'primary', updatedAt: 'now',
      },
      returnTarget: { capabilityId: 'plan' }, appliedAt: 'now',
      undoOperation: {
        type: 'delete_created_plan_chunk' as const, groupId: 'group-1', chunkId: 'chunk-1',
        eventRef: { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary', eventId: 'event-chunk-1' },
        targetDateKey: '2026-07-24', expectedUpdatedAt: 'now',
      },
    }));

    await expect(recoverPlanMutations({
      aggregate: pendingAggregate, repository: repository as never, apply: apply as never,
    })).resolves.toBe(loaded);

    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-plan', expect.objectContaining({
      undoOperation: expect.objectContaining({ type: 'delete_created_plan_chunk', chunkId: 'chunk-1' }),
    }));
  });
});
