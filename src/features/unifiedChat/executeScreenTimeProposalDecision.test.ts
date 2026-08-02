import type { SupabaseClient } from '@supabase/supabase-js';
import { executeScreenTimeProposalDecision } from './executeScreenTimeProposalDecision';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

const proposal: Extract<UnifiedChatProposal, { capabilityId: 'screenTime' }> = {
  id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
  capabilityId: 'screenTime', title: 'Block Brawl Stars', body: 'Charlie · until 1:00 PM',
  status: 'pending', version: 1, createdAt: 'created', updatedAt: 'updated',
  operation: {
    id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'screenTime',
    type: 'block_family_screen_time_selection', targetId: null,
    summary: 'Block Brawl Stars', idempotencyKey: 'chat:run-1:1', sequence: 1,
    payload: {
      targets: [{ childMembershipId: 'charlie', selectionId: 'selection-charlie', expectedVersion: 7 }],
      timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
    },
  },
};

describe('executeScreenTimeProposalDecision', () => {
  it('reserves, saves the exact confirmed policy, and reports device delivery separately', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: { operationId: 'chat:run-1:1', overrides: [{
        overrideId: 'override-1', childMembershipId: 'charlie', selectionId: 'selection-charlie',
        action: 'block', timeBasis: 'wall_clock', startsAt: '2026-07-30T10:00:00.000Z',
        expiresAt: '2026-07-30T13:00:00.000Z', policyVersion: 8,
      }] }, error: null })
      .mockResolvedValueOnce({ data: {
        childMembershipId: 'charlie', subjectId: 'subject-charlie', desiredPolicyVersion: 8,
        selections: [], agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
      }, error: null });
    const client = { rpc } as unknown as SupabaseClient;
    const repository = {
      decideProposal: jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'approved', version: 2 }),
      transitionProposalStatus: jest.fn()
        .mockResolvedValueOnce({ status: 'applying', version: 3 })
        .mockResolvedValueOnce({ status: 'applied', version: 4 }),
      persistMutationReceipt: jest.fn().mockResolvedValue({ id: 'receipt-1' } as UnifiedChatMutationReceipt),
      finalizeMutationReceipt: jest.fn().mockImplementation(async (_id, input) => ({ id: 'receipt-1', ...input })),
    };

    await executeScreenTimeProposalDecision({
      proposal, action: 'approve', repository, client,
      now: () => new Date('2026-07-30T10:05:00.000Z'),
    });

    expect(rpc).toHaveBeenNthCalledWith(1, 'apply_kwilt_family_screen_time_override_batch',
      expect.objectContaining({ p_expires_at: '2026-07-30T13:00:00.000Z' }));
    expect(repository.persistMutationReceipt).toHaveBeenCalledWith(expect.objectContaining({
      capabilityId: 'screenTime', status: 'reserved',
      resultState: expect.objectContaining({ policyState: 'pending', deviceState: 'not_checked' }),
    }));
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
      resultState: expect.objectContaining({ policyState: 'saved', deviceState: 'device_required' }),
      undoOperation: null,
    }));
  });

  it('does not write a policy when the caregiver rejects the proposal', async () => {
    const repository = {
      decideProposal: jest.fn().mockResolvedValue({ id: 'proposal-1', status: 'rejected', version: 2 }),
      transitionProposalStatus: jest.fn(), persistMutationReceipt: jest.fn(), finalizeMutationReceipt: jest.fn(),
    };
    const client = { rpc: jest.fn() } as unknown as SupabaseClient;
    await executeScreenTimeProposalDecision({ proposal, action: 'reject', repository, client });
    expect(client.rpc).not.toHaveBeenCalled();
    expect(repository.persistMutationReceipt).not.toHaveBeenCalled();
  });
});
