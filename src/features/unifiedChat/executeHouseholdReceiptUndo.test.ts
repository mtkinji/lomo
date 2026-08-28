import type { CompleteHouseholdActionBoundary } from '../household/data/householdActionBoundary';
import type { UnifiedChatMutationReceipt } from './types';
import { executeHouseholdReceiptUndo } from './executeHouseholdReceiptUndo';

const current = '2026-08-27T18:00:00.000Z';
const next = '2026-08-27T19:00:00.000Z';
const snapshot = {
  household: { id: 'household-1', name: 'Household' }, currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult' as const, role: 'owner' as const, updatedAt: current },
    { id: 'child-1', personId: 'person-2', displayName: 'Charles', kind: 'dependent' as const, role: 'child' as const, updatedAt: next },
  ], activations: [], grants: [],
};

function boundary(): CompleteHouseholdActionBoundary & Record<string, jest.Mock> {
  return {
    read: jest.fn(async () => snapshot), addDependent: jest.fn(), createInvitation: jest.fn(),
    previewInvitation: jest.fn(), acceptInvitation: jest.fn(), setChildCapability: jest.fn(async () => snapshot),
    setCaregiverGrant: jest.fn(async () => snapshot), updateMember: jest.fn(async () => ({
      ...snapshot, members: snapshot.members.map((member) => member.id === 'child-1'
        ? { ...member, displayName: 'Charlie', updatedAt: 'restored' } : member),
    })), previewMemberRemoval: jest.fn(), removeMember: jest.fn(), listDevices: jest.fn(async () => [{
      id: 'device-1', householdId: 'household-1', kind: 'personal_child', childMembershipId: 'child-1',
      assignedCaregiverMembershipId: null, installId: 'secret', label: 'School phone', platform: 'ios',
      status: 'ready', memberIds: [], updatedAt: next,
    }]), updateDevice: jest.fn(async () => ({
      id: 'device-1', householdId: 'household-1', kind: 'personal_child', childMembershipId: 'child-1',
      assignedCaregiverMembershipId: null, installId: 'secret', label: "Charlie's iPhone", platform: 'ios',
      status: 'ready', memberIds: [], updatedAt: 'restored',
    })), revokeDevice: jest.fn(), reconcileDevice: jest.fn(),
  } as unknown as CompleteHouseholdActionBoundary & Record<string, jest.Mock>;
}

function receipt(undoOperation: Record<string, unknown>): UnifiedChatMutationReceipt {
  return {
    id: 'receipt-1', proposalId: 'proposal-1', operationId: 'operation-1', capabilityId: 'household',
    idempotencyKey: 'household-undo-1', status: 'applied', resultingObjectType: 'household_subject',
    resultingObjectId: 'child-1', resultState: {}, returnTarget: null, undoOperation,
    canUndo: true, appliedAt: next, undoneAt: null,
  };
}

test('undoes a member update through the same authoritative versioned action', async () => {
  const store = boundary();
  await expect(executeHouseholdReceiptUndo({
    receipt: receipt({ type: 'household.member.update', householdId: 'household-1',
      membershipId: 'child-1', expectedUpdatedAt: next, fields: { displayName: 'Charlie' } }),
    boundary: store, now: () => 'undone',
  })).resolves.toEqual({ undoneAt: 'undone' });
  expect(store.updateMember).toHaveBeenCalledWith({
    membershipId: 'child-1', expectedUpdatedAt: next, fields: { displayName: 'Charlie' },
  });
});

test('undoes a device update without exposing or relying on its install identifier', async () => {
  const store = boundary();
  await executeHouseholdReceiptUndo({
    receipt: receipt({ type: 'household.device.update', householdId: 'household-1', deviceId: 'device-1',
      expectedUpdatedAt: next, displayName: "Charlie's iPhone", memberIds: [] }), boundary: store,
  });
  expect(store.updateDevice).toHaveBeenCalledWith({
    deviceId: 'device-1', expectedUpdatedAt: next,
    fields: { displayName: "Charlie's iPhone", memberIds: [] },
  });
  expect(JSON.stringify((store.updateDevice as jest.Mock).mock.calls)).not.toContain('secret');
});

test('refuses destructive receipts that do not declare an exact reversible action', async () => {
  await expect(executeHouseholdReceiptUndo({
    receipt: { ...receipt({ type: 'household.member.remove' }), canUndo: false }, boundary: boundary(),
  })).rejects.toThrow('safe undo operation');
});
