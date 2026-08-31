import type { CompleteHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import { executeHouseholdProposalDecision } from './executeHouseholdProposalDecision';
import type { UnifiedChatMutationReceipt, UnifiedChatProposal } from './types';

const updatedAt = '2026-08-27T18:00:00.000Z';
const snapshot = {
  household: { id: 'household-1', name: 'Watanabe Household' }, currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult' as const, role: 'owner' as const, updatedAt },
    { id: 'child-1', personId: 'person-2', displayName: 'Charlie', kind: 'dependent' as const, role: 'child' as const, updatedAt },
  ], activations: [], grants: [],
};
const device = { id: 'device-1', householdId: 'household-1', kind: 'personal_child' as const,
  childMembershipId: 'child-1', assignedCaregiverMembershipId: null, installId: 'install-1',
  label: "Charlie's iPhone", platform: 'ios' as const, status: 'needs_attention' as const,
  memberIds: [], updatedAt };

function proposal(type: 'household.member.update' | 'household.device.reconcile'): Extract<UnifiedChatProposal, { capabilityId: 'household' }> {
  const targetId = type === 'household.member.update' ? 'child-1' : 'device-1';
  return {
    id: 'proposal-1', threadId: 'thread-1', runId: 'run-1', messageId: 'message-1',
    capabilityId: 'household', title: 'Reviewed Household change', body: 'Review it.',
    status: 'pending', version: 1, createdAt: updatedAt, updatedAt,
    operation: { id: 'operation-1', proposalId: 'proposal-1', capabilityId: 'household',
      type, targetId, summary: 'Reviewed Household change', idempotencyKey: 'household-key', sequence: 1,
      payload: type === 'household.member.update'
        ? { householdId: 'household-1', expectedUpdatedAt: updatedAt, fields: { displayName: 'Charles' } }
        : { householdId: 'household-1', expectedUpdatedAt: updatedAt } },
  };
}

function repository() {
  const storedReceipt: UnifiedChatMutationReceipt = {
    id: 'receipt-1', proposalId: 'proposal-1', operationId: 'operation-1', capabilityId: 'household',
    idempotencyKey: 'household-key', status: 'reserved', resultingObjectType: 'household_subject',
    resultingObjectId: 'child-1', resultState: {}, returnTarget: null, undoOperation: null,
    canUndo: false, appliedAt: null, undoneAt: null,
  };
  return {
    decideProposal: jest.fn(async () => ({ id: 'proposal-1', status: 'approved' as const, version: 2 })),
    transitionProposalStatus: jest.fn(async ({ toStatus }: { toStatus: UnifiedChatProposal['status'] }) => ({ status: toStatus, version: toStatus === 'applying' ? 3 : 4 })),
    persistMutationReceipt: jest.fn(async () => storedReceipt),
    finalizeMutationReceipt: jest.fn(async (_id: string, input: Record<string, unknown>) => ({
      ...storedReceipt, ...input,
    }) as UnifiedChatMutationReceipt),
  };
}

function boundary(): CompleteHouseholdActionBoundary {
  return {
    read: jest.fn(async () => snapshot), updateMember: jest.fn(async () => ({
      ...snapshot, members: snapshot.members.map((member) => member.id === 'child-1'
        ? { ...member, displayName: 'Charles', updatedAt: '2026-08-27T18:01:00.000Z' } : member),
    })),
    previewMemberRemoval: jest.fn(), removeMember: jest.fn(), listDevices: jest.fn(async () => [device]),
    updateDevice: jest.fn(), revokeDevice: jest.fn(), reconcileDevice: jest.fn(async () => ({ device, requiresNativeCleanup: true })),
    addDependent: jest.fn(), createInvitation: jest.fn(), findPendingInvitation: jest.fn(),
    previewInvitation: jest.fn(), acceptInvitation: jest.fn(), acceptPendingInvitation: jest.fn(),
    setChildCapability: jest.fn(), setCaregiverGrant: jest.fn(),
  };
}

test('applies one approved exact member update and finalizes its durable receipt', async () => {
  const repo = repository();
  const store = boundary();
  await expect(executeHouseholdProposalDecision({
    proposal: proposal('household.member.update'), action: 'approve', repository: repo, boundary: store,
  })).resolves.toMatchObject({ status: 'completed' });
  expect(store.updateMember).toHaveBeenCalledWith({
    membershipId: 'child-1', expectedUpdatedAt: updatedAt, fields: { displayName: 'Charles' },
  });
  expect(repo.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
    capabilityId: 'household', resultingObjectType: 'household_member', resultingObjectId: 'child-1',
    undoOperation: expect.objectContaining({ type: 'household.member.update' }),
  }));
});

test('records device-local cleanup as pending_client_action without claiming completion', async () => {
  const repo = repository();
  const result = await executeHouseholdProposalDecision({
    proposal: proposal('household.device.reconcile'), action: 'approve', repository: repo, boundary: boundary(),
  });
  expect(result).toMatchObject({ status: 'pending_client_action' });
  expect(repo.finalizeMutationReceipt).toHaveBeenCalledWith('receipt-1', expect.objectContaining({
    resultState: expect.objectContaining({ completionStatus: 'pending_client_action' }),
    returnTarget: expect.objectContaining({ screen: 'HouseholdDevices' }),
  }));
});
