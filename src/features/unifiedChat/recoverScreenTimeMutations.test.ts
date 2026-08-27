import type { SupabaseClient } from '@supabase/supabase-js';
import { recoverScreenTimeMutations } from './recoverScreenTimeMutations';
import type { UnifiedChatThreadAggregate } from './types';

const aggregate: UnifiedChatThreadAggregate = {
  thread: { id: 'thread-1', title: 'Chat', titleSource: 'default', status: 'active', archivedAt: null, createdAt: 'created', updatedAt: 'updated' },
  messages: [], runs: [], evidence: [], contextRefs: [], clientActions: [], artifacts: [],
  proposals: [{
    id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: null,
    capabilityId: 'screenTime', title: 'Deny request', body: 'Charlie · no temporary allowance',
    status: 'applying', version: 3, createdAt: 'created', updatedAt: 'updated',
    operation: {
      id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'screenTime',
      type: 'decide_family_screen_time_request', targetId: 'request-1',
      summary: 'Deny request', idempotencyKey: 'chat:screen-time:request-1', sequence: 1,
      payload: { childMembershipId: 'charlie', decision: 'denied', allowMinutes: null, expectedVersion: 7 },
    },
  }],
  receipts: [{
    id: 'receipt-1', proposalId: 'proposal-1', operationId: 'operation-1', capabilityId: 'screenTime',
    idempotencyKey: 'chat:screen-time:request-1', status: 'reserved', resultingObjectType: 'family_screen_time_request',
    resultingObjectId: 'request-1', resultState: { decision: 'pending', deviceState: 'not_checked' },
    returnTarget: null, undoOperation: null, canUndo: false, appliedAt: '2026-08-27T14:00:00.000Z', undoneAt: null,
  }],
};

test('replays an idempotent Screen Time RPC and finalizes a reserved mutation after reload', async () => {
  const rpc = jest.fn()
    .mockResolvedValueOnce({ data: {
      requestId: 'request-1', childMembershipId: 'charlie', decision: 'denied', allowMinutes: null,
      overrideId: null, desiredPolicyVersion: 7, operationId: 'chat:screen-time:request-1',
    }, error: null })
    .mockResolvedValueOnce({ data: {
      childMembershipId: 'charlie', subjectId: 'subject-1', desiredPolicyVersion: 7,
      selections: [], agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
    }, error: null });
  const loaded = { ...aggregate, proposals: [] } as UnifiedChatThreadAggregate;
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => undefined), failMutationReceipt: jest.fn(async () => undefined),
    transitionProposalStatus: jest.fn(async () => undefined), loadThread: jest.fn(async () => loaded),
  };

  await expect(recoverScreenTimeMutations({
    aggregate, repository: repository as never, client: { rpc } as unknown as SupabaseClient,
  })).resolves.toBe(loaded);

  expect(rpc).toHaveBeenNthCalledWith(1, 'decide_kwilt_family_screen_time_access_request', expect.objectContaining({
    p_operation_id: 'chat:screen-time:request-1', p_decision: 'denied',
  }));
  expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
    resultState: expect.objectContaining({ decision: 'denied', deviceState: 'not_applicable' }),
  }));
  expect(repository.transitionProposalStatus).toHaveBeenCalledWith(expect.objectContaining({ toStatus: 'applied' }));
});

test('keeps an unconfirmed recovery reserved and retryable instead of reporting a false failure', async () => {
  const repository = {
    finalizeMutationReceipt: jest.fn(async () => undefined), failMutationReceipt: jest.fn(async () => undefined),
    transitionProposalStatus: jest.fn(async () => undefined), loadThread: jest.fn(async () => aggregate),
  };
  const rpc = jest.fn(async () => ({ data: null, error: { message: 'offline' } }));
  await recoverScreenTimeMutations({
    aggregate, repository: repository as never, client: { rpc } as unknown as SupabaseClient,
  });
  expect(repository.failMutationReceipt).not.toHaveBeenCalled();
  expect(repository.transitionProposalStatus).not.toHaveBeenCalled();
  expect(repository.loadThread).not.toHaveBeenCalled();
});
