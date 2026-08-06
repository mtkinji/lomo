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

const prerequisiteProposal: Extract<UnifiedChatProposal, { capabilityId: 'screenTime' }> = {
  id: 'proposal-prerequisite', threadId: 'thread-1', runId: 'run-1', messageId: 'message-2',
  capabilityId: 'screenTime', title: 'Use Gospel Library before Games',
  body: 'Charlie uses Gospel Library for 5 minutes before Games become available each day.',
  status: 'pending', version: 1, createdAt: 'created', updatedAt: 'updated',
  operation: {
    id: 'operation-prerequisite', proposalId: 'proposal-prerequisite', capabilityId: 'screenTime',
    type: 'create_family_screen_time_prerequisite_agreement', targetId: null,
    summary: 'Use Gospel Library before Games', idempotencyKey: 'chat:run-1:2', sequence: 1,
    payload: {
      childMembershipId: 'charlie', targetSelectionId: 'selection-games', expectedPolicyVersion: 7,
      rule: {
        weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1440,
        dailyLimitMinutes: null,
        prerequisiteActivity: {
          selectionId: 'selection-gospel-library', thresholdMinutes: 5, reset: 'daily',
        },
      },
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

  it('creates the confirmed prerequisite agreement atomically and keeps device delivery distinct', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: {
        agreementId: 'agreement-1', childMembershipId: 'charlie',
        targetSelectionId: 'selection-games', prerequisiteSelectionId: 'selection-gospel-library',
        rule: prerequisiteProposal.operation.type === 'create_family_screen_time_prerequisite_agreement'
          ? prerequisiteProposal.operation.payload.rule
          : null,
        active: true, version: 1, desiredPolicyVersion: 8, operationId: 'chat:run-1:2',
      }, error: null })
      .mockResolvedValueOnce({ data: {
        childMembershipId: 'charlie', subjectId: 'subject-charlie', desiredPolicyVersion: 8,
        selections: [], agreements: [], activeOverrides: [], pendingRequests: [], devices: [],
        latestDeviceReceipt: null,
      }, error: null });
    const client = { rpc } as unknown as SupabaseClient;
    const repository = {
      decideProposal: jest.fn().mockResolvedValue({ id: 'proposal-prerequisite', status: 'approved', version: 2 }),
      transitionProposalStatus: jest.fn()
        .mockResolvedValueOnce({ status: 'applying', version: 3 })
        .mockResolvedValueOnce({ status: 'applied', version: 4 }),
      persistMutationReceipt: jest.fn().mockResolvedValue({ id: 'receipt-prerequisite' } as UnifiedChatMutationReceipt),
      finalizeMutationReceipt: jest.fn().mockImplementation(async (_id, input) => ({ id: 'receipt-prerequisite', ...input })),
    };

    await executeScreenTimeProposalDecision({
      proposal: prerequisiteProposal, action: 'approve', repository, client,
      now: () => new Date('2026-08-05T12:00:00.000Z'),
    });

    expect(rpc).toHaveBeenNthCalledWith(1, 'create_kwilt_family_screen_time_prerequisite_agreement', {
      p_child_membership_id: 'charlie', p_target_selection_id: 'selection-games',
      p_prerequisite_selection_id: 'selection-gospel-library', p_expected_policy_version: 7,
      p_rule: prerequisiteProposal.operation.type === 'create_family_screen_time_prerequisite_agreement'
        ? prerequisiteProposal.operation.payload.rule
        : null,
      p_operation_id: 'chat:run-1:2',
    });
    expect(repository.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-prerequisite', expect.objectContaining({
      resultingObjectType: 'family_screen_time_agreement', resultingObjectId: 'agreement-1',
      resultState: expect.objectContaining({
        policyState: 'saved', deviceState: 'device_required', thresholdMinutes: 5, reset: 'daily',
      }),
    }));
  });
});
