import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';
import { executePlanProposalDecision } from './executePlanProposalDecision';

type PlanProposal = Extract<UnifiedChatProposal, { capabilityId: 'plan' }>;

const proposal: PlanProposal = {
  id: 'proposal-plan', threadId: 'thread-1', runId: 'run-1', messageId: 'message-2',
  capabilityId: 'plan', title: 'Call school', body: 'Fri at 9:00 AM', status: 'pending', version: 1,
  createdAt: '2026-07-23T12:00:00.000Z', updatedAt: '2026-07-23T12:00:00.000Z',
  operation: {
    id: 'operation-plan', proposalId: 'proposal-plan', capabilityId: 'plan', type: 'schedule_activity',
    targetId: 'activity-school', summary: 'Add Call school to Plan', sequence: 1,
    idempotencyKey: 'unified-chat:run-1:plan:activity-school',
    payload: {
      activityId: 'activity-school', expectedUpdatedAt: '2026-07-23T10:00:00.000Z',
      startDate: '2026-07-24T15:00:00.000Z', endDate: '2026-07-24T15:30:00.000Z',
      targetDateKey: '2026-07-24',
      writeCalendarRef: { provider: 'google', accountId: 'account-1', calendarId: 'primary' },
    },
  },
};

function receipt(status: UnifiedChatMutationReceipt['status']): UnifiedChatMutationReceipt {
  return {
    id: 'receipt-plan', proposalId: proposal.id, operationId: proposal.operation.id,
    capabilityId: 'plan', idempotencyKey: proposal.operation.idempotencyKey, status,
    resultingObjectType: 'activity', resultingObjectId: 'activity-school', resultState: {},
    returnTarget: null, undoOperation: null, canUndo: false, appliedAt: null, undoneAt: null,
  };
}

describe('executePlanProposalDecision', () => {
  test('reserves, applies, finalizes, and transitions one approved Plan proposal', async () => {
    const order: string[] = [];
    const repository = {
      decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
      transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => {
        order.push(toStatus);
        return { status: toStatus, version: expectedVersion + 1 };
      }),
      persistMutationReceipt: jest.fn(async () => { order.push('reserved'); return receipt('reserved'); }),
      finalizeMutationReceipt: jest.fn(async () => { order.push('finalized'); return receipt('applied'); }),
      failMutationReceipt: jest.fn(),
    };
    const apply = jest.fn(async () => ({
      proposalId: proposal.id, operationId: proposal.operation.id,
      idempotencyKey: proposal.operation.idempotencyKey, resultingObjectId: 'activity-school',
      resultState: { title: 'Call school', scheduledAt: '2026-07-24T15:00:00.000Z', targetDateKey: '2026-07-24', eventId: 'event-1', provider: 'google' as const, accountId: 'account-1', calendarId: 'primary', updatedAt: 'now' },
      returnTarget: { capabilityId: 'plan' }, appliedAt: 'now',
      undoOperation: {
        type: 'delete_created_plan_event' as const,
        previousActivity: {
          id: 'activity-school', goalId: null, title: 'Call school', type: 'task' as const,
          tags: [], status: 'planned' as const, forceActual: {}, createdAt: 'before', updatedAt: 'before',
        },
        eventRef: { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary', eventId: 'event-1' },
        targetDateKey: '2026-07-24', expectedUpdatedAt: 'now',
      },
    }));

    await executePlanProposalDecision({ proposal, action: 'approve', repository, apply });

    expect(order).toEqual(['applying', 'reserved', 'finalized', 'applied']);
    expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'plan', status: 'reserved', undoOperation: null,
    }));
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith(
      'receipt-plan',
      expect.objectContaining({
        undoOperation: expect.objectContaining({ type: 'delete_created_plan_event' }),
      }),
    );
  });

  test('marks the reserved receipt and proposal failed when calendar apply is unconfirmed', async () => {
    const repository = {
      decideProposal: jest.fn(async () => ({ id: proposal.id, status: 'approved' as const, version: 2 })),
      transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
      persistMutationReceipt: jest.fn(async () => receipt('reserved')),
      finalizeMutationReceipt: jest.fn(),
      failMutationReceipt: jest.fn(async () => receipt('failed')),
    };

    await expect(executePlanProposalDecision({
      proposal, action: 'approve', repository,
      apply: async () => { throw new Error('Kwilt could not confirm the calendar block.'); },
    })).rejects.toThrow('confirm the calendar block');

    expect(repository.failMutationReceipt).toHaveBeenCalledWith(
      'receipt-plan', 'plan_apply_unconfirmed', 'Kwilt could not confirm the calendar block.',
    );
    expect(repository.transitionProposalStatus).toHaveBeenLastCalledWith(expect.objectContaining({ toStatus: 'failed' }));
  });

  test('persists an independent receipt for one approved chunk proposal', async () => {
    if (proposal.operation.type !== 'schedule_activity') throw new Error('Expected schedule fixture.');
    const baseOperation = proposal.operation;
    const chunkProposal: PlanProposal = {
      ...proposal,
      id: 'proposal-chunk-1', title: 'Deep work, part 1', body: 'Chunk 1 of 2.',
      operation: {
        ...baseOperation,
        id: 'operation-chunk-1', proposalId: 'proposal-chunk-1', type: 'schedule_activity_chunk',
        idempotencyKey: 'unified-chat:run-1:plan-chunks:call-1:chunk-1',
        payload: {
          ...baseOperation.payload,
          groupId: 'plan-chunks:call-1', chunkId: 'chunk-1', title: 'Deep work, part 1',
        },
      },
    };
    const repository = {
      decideProposal: jest.fn(async () => ({ id: chunkProposal.id, status: 'approved' as const, version: 2 })),
      transitionProposalStatus: jest.fn(async ({ toStatus, expectedVersion }: { toStatus: UnifiedChatProposal['status']; expectedVersion: number }) => ({ status: toStatus, version: expectedVersion + 1 })),
      persistMutationReceipt: jest.fn(async () => ({ ...receipt('reserved'), id: 'receipt-chunk-1', proposalId: chunkProposal.id, operationId: chunkProposal.operation.id })),
      finalizeMutationReceipt: jest.fn(async () => ({ ...receipt('applied'), id: 'receipt-chunk-1', proposalId: chunkProposal.id, operationId: chunkProposal.operation.id })),
      failMutationReceipt: jest.fn(),
    };
    const apply = jest.fn(async () => ({
      proposalId: chunkProposal.id, operationId: chunkProposal.operation.id,
      idempotencyKey: chunkProposal.operation.idempotencyKey, resultingObjectId: 'activity-school',
      resultState: {
        title: 'Deep work, part 1', scheduledAt: '2026-07-24T15:00:00.000Z',
        targetDateKey: '2026-07-24', eventId: 'event-chunk-1', provider: 'google' as const,
        accountId: 'account-1', calendarId: 'primary', updatedAt: 'now',
      },
      returnTarget: { capabilityId: 'plan' }, appliedAt: 'now',
      undoOperation: {
        type: 'delete_created_plan_chunk' as const, groupId: 'plan-chunks:call-1', chunkId: 'chunk-1',
        eventRef: { provider: 'google' as const, accountId: 'account-1', calendarId: 'primary', eventId: 'event-chunk-1' },
        targetDateKey: '2026-07-24', expectedUpdatedAt: 'now',
      },
    }));

    await executePlanProposalDecision({ proposal: chunkProposal, action: 'approve', repository, apply });

    expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
      proposalId: chunkProposal.id, operationId: chunkProposal.operation.id,
      idempotencyKey: chunkProposal.operation.idempotencyKey,
    }));
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-chunk-1', expect.objectContaining({
      undoOperation: expect.objectContaining({ type: 'delete_created_plan_chunk', chunkId: 'chunk-1' }),
    }));
  });
});
