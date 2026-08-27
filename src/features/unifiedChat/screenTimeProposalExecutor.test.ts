import type { SupabaseClient } from '@supabase/supabase-js';
import { applyApprovedScreenTimeProposal } from './screenTimeProposalExecutor';
import type { UnifiedChatProposal } from './types';

type Proposal = Extract<UnifiedChatProposal, { capabilityId: 'screenTime' }>;

const base = {
  id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
  capabilityId: 'screenTime' as const, title: 'Review Screen Time', body: 'Review',
  status: 'approved' as const, version: 2, createdAt: 'created', updatedAt: 'updated',
};

const snapshot = (desiredPolicyVersion: number) => ({
  childMembershipId: 'charlie', subjectId: 'subject-charlie', desiredPolicyVersion,
  selections: [], agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
});

function proposal(operation: Proposal['operation']): Proposal {
  return { ...base, operation };
}

describe('screenTimeProposalExecutor remaining reviewed controls', () => {
  it.each([
    ['update_family_screen_time_agreement', true],
    ['deactivate_family_screen_time_agreement', false],
  ] as const)('applies %s through the versioned agreement command', async (type, active) => {
    const rule = { weekdays: [1, 2, 3, 4, 5], startMinute: 900, endMinute: 1140, dailyLimitMinutes: 20 };
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: {
        agreementId: 'agreement-1', childMembershipId: 'charlie', selectionId: 'selection-games',
        rule, active, version: 3, desiredPolicyVersion: 8, operationId: 'op-1',
      }, error: null })
      .mockResolvedValueOnce({ data: snapshot(8), error: null });
    const result = await applyApprovedScreenTimeProposal({
      client: { rpc } as unknown as SupabaseClient,
      proposal: proposal({
        id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'screenTime', type,
        targetId: 'agreement-1', summary: 'Update agreement', idempotencyKey: 'op-1', sequence: 1,
        payload: { childMembershipId: 'charlie', selectionId: 'selection-games', expectedVersion: 2, rule },
      }),
    });
    expect(rpc).toHaveBeenNthCalledWith(1, 'set_kwilt_family_screen_time_agreement', expect.objectContaining({
      p_agreement_id: 'agreement-1', p_active: active,
    }));
    expect(result).toMatchObject({
      resultingObjectType: 'family_screen_time_agreement', resultingObjectId: 'agreement-1',
      resultState: { policyState: 'saved', active, deviceState: 'device_required' },
    });
  });

  it('cancels one active override through the authoritative command', async () => {
    const rpc = jest.fn()
      .mockResolvedValueOnce({ data: {
        overrideId: 'override-1', childMembershipId: 'charlie', status: 'cancelled',
        desiredPolicyVersion: 8, operationId: 'op-2',
      }, error: null })
      .mockResolvedValueOnce({ data: snapshot(8), error: null });
    const result = await applyApprovedScreenTimeProposal({
      client: { rpc } as unknown as SupabaseClient,
      proposal: proposal({
        id: 'operation-2', proposalId: 'proposal-1', capabilityId: 'screenTime',
        type: 'cancel_family_screen_time_override', targetId: 'override-1',
        summary: 'Cancel override', idempotencyKey: 'op-2', sequence: 1,
        payload: { childMembershipId: 'charlie', expectedVersion: 7 },
      }),
    });
    expect(result).toMatchObject({
      resultingObjectType: 'family_screen_time_override', resultingObjectId: 'override-1',
      resultState: { policyState: 'cancelled', deviceState: 'device_required' },
    });
  });

  it('denies a child request without claiming a device mutation', async () => {
    const rpc = jest.fn().mockResolvedValueOnce({ data: {
      requestId: 'request-1', childMembershipId: 'charlie', decision: 'denied', overrideId: null,
      desiredPolicyVersion: 7, operationId: 'op-3',
    }, error: null });
    const result = await applyApprovedScreenTimeProposal({
      client: { rpc } as unknown as SupabaseClient,
      proposal: proposal({
        id: 'operation-3', proposalId: 'proposal-1', capabilityId: 'screenTime',
        type: 'decide_family_screen_time_request', targetId: 'request-1',
        summary: 'Deny request', idempotencyKey: 'op-3', sequence: 1,
        payload: { childMembershipId: 'charlie', decision: 'denied', allowMinutes: null, expectedVersion: 7 },
      }),
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      resultingObjectType: 'family_screen_time_request', resultingObjectId: 'request-1',
      resultState: { decision: 'denied', deviceState: 'not_applicable' },
    });
  });
});
