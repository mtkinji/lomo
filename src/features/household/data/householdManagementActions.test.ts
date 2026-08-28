import type { HouseholdSnapshot } from './household';
import type { HouseholdDevice } from './householdDeviceParticipation';
import {
  HouseholdManagementAuthorizationError,
  HouseholdManagementStaleTargetError,
  previewHouseholdMemberRemoval,
  readHouseholdDevices,
  reconcileHouseholdDevice,
  removeHouseholdMemberReviewed,
  revokeHouseholdDeviceReviewed,
  updateHouseholdDevice,
  updateHouseholdMember,
  type HouseholdManagementBoundary,
} from './householdManagementActions';

const owner = { id: 'owner-1', personId: 'person-owner', displayName: 'Andrew', kind: 'adult' as const, role: 'owner' as const, updatedAt: '2026-08-27T18:00:00.000Z' };
const caregiver = { id: 'caregiver-1', personId: 'person-caregiver', displayName: 'Caregiver', kind: 'adult' as const, role: 'caregiver' as const, updatedAt: '2026-08-27T18:00:00.000Z' };
const child = { id: 'child-1', personId: 'person-child', displayName: 'Charlie', kind: 'dependent' as const, role: 'child' as const, updatedAt: '2026-08-27T18:00:00.000Z' };

function snapshot(currentMembershipId = owner.id): HouseholdSnapshot {
  return {
    household: { id: 'household-1', name: 'Watanabe Household' }, currentMembershipId,
    members: [owner, caregiver, child], activations: [], grants: [],
  };
}

const device: HouseholdDevice = {
  id: 'device-1', householdId: 'household-1', kind: 'personal_child', childMembershipId: child.id,
  assignedCaregiverMembershipId: null, installId: 'install-123', label: "Charlie's iPhone",
  platform: 'ios', status: 'ready', memberIds: [], updatedAt: '2026-08-27T18:00:00.000Z',
};

function boundary(currentMembershipId = owner.id): HouseholdManagementBoundary & Record<string, jest.Mock> {
  const current = snapshot(currentMembershipId);
  return {
    read: jest.fn(async () => current),
    updateMember: jest.fn(async () => ({ ...current, members: current.members.map((member) => (
      member.id === child.id ? { ...member, displayName: 'Charles', updatedAt: '2026-08-27T18:01:00.000Z' } : member
    )) })),
    previewMemberRemoval: jest.fn(async () => ({
      membershipId: child.id, expectedUpdatedAt: child.updatedAt, displayName: child.displayName,
      capabilityGrants: 2, deviceAssignments: [{ id: device.id, label: device.label }],
      sharedObjects: [{ kind: 'goal', count: 1 }],
      recovery: 'The member can be invited back. Screen Time cleanup may require the child device.',
    })),
    removeMember: jest.fn(async () => ({ ...current, members: current.members.filter((member) => member.id !== child.id) })),
    listDevices: jest.fn(async () => [device]),
    updateDevice: jest.fn(async () => ({ ...device, label: 'School iPhone', updatedAt: '2026-08-27T18:01:00.000Z' })),
    revokeDevice: jest.fn(async () => ({ ...device, status: 'revoked' as const, updatedAt: '2026-08-27T18:01:00.000Z' })),
    reconcileDevice: jest.fn(async () => ({ device: { ...device, status: 'needs_attention' as const }, requiresNativeCleanup: true })),
  } as HouseholdManagementBoundary & Record<string, jest.Mock>;
}

describe('household management actions', () => {
  test('updates exact reviewed member fields with actor authority and a stable receipt', async () => {
    const store = boundary();
    await expect(updateHouseholdMember({
      householdId: 'household-1', membershipId: child.id, expectedUpdatedAt: child.updatedAt,
      fields: { displayName: ' Charles ' }, confirmed: true,
    }, store)).resolves.toMatchObject({
      operationId: 'household.member.update', status: 'completed',
      resultRefs: [{ kind: 'household_member', id: child.id }], reversible: true,
    });
    expect(store.updateMember).toHaveBeenCalledWith({
      membershipId: child.id, expectedUpdatedAt: child.updatedAt, fields: { displayName: 'Charles' },
    });
  });

  test('allows a caregiver to update a child but refuses child, removed, and wrong-household actors', async () => {
    await expect(updateHouseholdMember({
      householdId: 'household-1', membershipId: child.id, expectedUpdatedAt: child.updatedAt,
      fields: { displayName: 'Charles' }, confirmed: true,
    }, boundary(caregiver.id))).resolves.toMatchObject({ status: 'completed' });

    for (const [actor, householdId] of [[child.id, 'household-1'], ['removed-1', 'household-1'], [owner.id, 'other-household']] as const) {
      await expect(updateHouseholdMember({
        householdId, membershipId: child.id, expectedUpdatedAt: child.updatedAt,
        fields: { displayName: 'Charles' }, confirmed: true,
      }, boundary(actor))).rejects.toBeInstanceOf(HouseholdManagementAuthorizationError);
    }
  });

  test('rejects a stale member version before the repository mutation', async () => {
    const store = boundary();
    await expect(updateHouseholdMember({
      householdId: 'household-1', membershipId: child.id, expectedUpdatedAt: 'stale',
      fields: { displayName: 'Charles' }, confirmed: true,
    }, store)).rejects.toBeInstanceOf(HouseholdManagementStaleTargetError);
    expect(store.updateMember).not.toHaveBeenCalled();
  });

  test('previews removal impact and only applies the exact reviewed version', async () => {
    const store = boundary();
    const preview = await previewHouseholdMemberRemoval({
      householdId: 'household-1', membershipId: child.id, expectedUpdatedAt: child.updatedAt,
    }, store);
    expect(preview.result).toMatchObject({ capabilityGrants: 2, deviceAssignments: [{ id: device.id }] });
    await expect(removeHouseholdMemberReviewed({ ...preview.result, householdId: 'household-1', confirmed: true }, store))
      .resolves.toMatchObject({ operationId: 'household.member.remove', status: 'completed' });
    expect(store.removeMember).toHaveBeenCalledWith({ membershipId: child.id, expectedUpdatedAt: child.updatedAt });
  });

  test('lists, updates, revokes, and reconciles exact Household devices', async () => {
    const store = boundary();
    await expect(readHouseholdDevices({ householdId: 'household-1' }, store)).resolves.toMatchObject({
      operationId: 'household.device.list', status: 'completed', result: [device],
    });
    await expect(updateHouseholdDevice({
      householdId: 'household-1', deviceId: device.id, expectedUpdatedAt: device.updatedAt,
      fields: { displayName: ' School iPhone ' }, confirmed: true,
    }, store)).resolves.toMatchObject({ operationId: 'household.device.update', status: 'completed' });
    await expect(revokeHouseholdDeviceReviewed({
      householdId: 'household-1', deviceId: device.id, expectedUpdatedAt: device.updatedAt, confirmed: true,
    }, store)).resolves.toMatchObject({ operationId: 'household.device.revoke', result: { status: 'revoked' } });
    await expect(reconcileHouseholdDevice({
      householdId: 'household-1', deviceId: device.id, expectedUpdatedAt: device.updatedAt, confirmed: true,
    }, store)).resolves.toMatchObject({
      operationId: 'household.device.reconcile', status: 'pending_client_action',
      resultRefs: [{ kind: 'household_device', id: device.id }],
    });
  });
});
