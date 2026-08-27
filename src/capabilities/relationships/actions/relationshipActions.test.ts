import type { HouseholdSnapshot } from '../../../features/household/data/household';
import {
  acceptHouseholdInvitation,
  addDependentHouseholdMember,
  createHouseholdInvitation,
  HouseholdActionConfirmationError,
  readHousehold,
  previewHouseholdInvitation,
  setHouseholdCaregiverGrant,
  setHouseholdChildCapability,
  type HouseholdActionBoundary,
} from './relationshipActions';

const emptySnapshot: HouseholdSnapshot = {
  household: null,
  currentMembershipId: null,
  members: [],
  activations: [],
  grants: [],
};

const familySnapshot: HouseholdSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: 'version' },
    { id: 'child-1', personId: 'person-2', displayName: 'Charlie', kind: 'dependent', role: 'child', updatedAt: 'version' },
  ],
  activations: [],
  grants: [],
};

function boundary(): jest.Mocked<HouseholdActionBoundary> {
  return {
    read: jest.fn(async () => familySnapshot),
    addDependent: jest.fn(async (
      _input: Parameters<HouseholdActionBoundary['addDependent']>[0],
    ) => familySnapshot),
    createInvitation: jest.fn(async (
      _input: Parameters<HouseholdActionBoundary['createInvitation']>[0],
    ) => ({
      code: 'ABC123', expiresAt: '2026-08-27T00:00:00Z', role: 'caregiver' as const,
    })),
    previewInvitation: jest.fn(async (
      _code: Parameters<HouseholdActionBoundary['previewInvitation']>[0],
    ) => ({
      householdName: 'My household', inviterDisplayName: 'Andrew',
      role: 'caregiver' as const, expiresAt: '2026-08-27T00:00:00Z',
    })),
    acceptInvitation: jest.fn(async (
      _input: Parameters<HouseholdActionBoundary['acceptInvitation']>[0],
    ) => familySnapshot),
    setChildCapability: jest.fn(async (
      _input: Parameters<HouseholdActionBoundary['setChildCapability']>[0],
    ) => familySnapshot),
    setCaregiverGrant: jest.fn(async (
      _input: Parameters<HouseholdActionBoundary['setCaregiverGrant']>[0],
    ) => familySnapshot),
  };
}

describe('Relationships and Household actions', () => {
  it('reads the authoritative Household without requiring write confirmation', async () => {
    const store = boundary();
    await expect(readHousehold(store)).resolves.toEqual({
      operationId: 'household.read',
      status: 'completed',
      resultRefs: [{ kind: 'household', id: 'household-1' }],
      reversible: true,
      result: familySnapshot,
    });
  });

  it('requires explicit confirmation before membership or authority changes', async () => {
    const store = boundary();
    await expect(addDependentHouseholdMember({
      householdId: null, displayName: 'Charlie', ownerDisplayName: 'Andrew', confirmed: false,
    }, store)).rejects.toBeInstanceOf(HouseholdActionConfirmationError);
    await expect(setHouseholdChildCapability({
      childMembershipId: 'child-1', capabilityId: 'todos', enabled: true, confirmed: false,
    }, store)).rejects.toBeInstanceOf(HouseholdActionConfirmationError);
    expect(store.addDependent).not.toHaveBeenCalled();
    expect(store.setChildCapability).not.toHaveBeenCalled();
  });

  it('normalizes a confirmed dependent-member creation and returns a canonical receipt', async () => {
    const store = boundary();
    await expect(addDependentHouseholdMember({
      householdId: null, displayName: '  Charlie  ', ownerDisplayName: '  Andrew  ', confirmed: true,
    }, store)).resolves.toMatchObject({
      operationId: 'household.member.add_dependent', status: 'completed',
      resultRefs: [{ kind: 'household_member', id: 'child-1' }], reversible: false,
    });
    expect(store.addDependent).toHaveBeenCalledWith({
      householdId: null, displayName: 'Charlie', ownerDisplayName: 'Andrew',
    });
  });

  it('creates and accepts reviewed invitations through the same action boundary', async () => {
    const store = boundary();
    await expect(createHouseholdInvitation({
      householdId: 'household-1', role: 'caregiver', invitedEmail: ' Caregiver@Example.com ',
      ownerDisplayName: ' Andrew ', confirmed: true,
    }, store)).resolves.toMatchObject({
      operationId: 'household.invitation.create', status: 'completed', reversible: false,
      result: { code: 'ABC123', role: 'caregiver' },
    });
    expect(store.createInvitation).toHaveBeenCalledWith({
      householdId: 'household-1', role: 'caregiver', invitedEmail: 'caregiver@example.com',
      ownerDisplayName: 'Andrew',
    });

    await expect(previewHouseholdInvitation(' abc123 ', store)).resolves.toMatchObject({
      operationId: 'household.invitation.preview', reversible: true,
      result: { householdName: 'My household', role: 'caregiver' },
    });
    expect(store.previewInvitation).toHaveBeenCalledWith('ABC123');

    await expect(acceptHouseholdInvitation({
      code: ' abc123 ', displayName: ' Caregiver ', confirmed: true,
    }, store)).resolves.toMatchObject({
      operationId: 'household.invitation.accept',
      resultRefs: [{ kind: 'household', id: 'household-1' }],
      reversible: false,
    });
    expect(store.acceptInvitation).toHaveBeenCalledWith({ code: 'ABC123', displayName: 'Caregiver' });
  });

  it('returns reversible receipts for child capability and caregiver grant changes', async () => {
    const store = boundary();
    await expect(setHouseholdChildCapability({
      childMembershipId: 'child-1', capabilityId: 'screen-time', enabled: true, confirmed: true,
    }, store)).resolves.toMatchObject({
      operationId: 'household.child_capability.update', reversible: true,
      resultRefs: [{ kind: 'household_child_capability', id: 'child-1:screen-time' }],
    });
    await expect(setHouseholdCaregiverGrant({
      caregiverMembershipId: 'caregiver-1', childMembershipId: 'child-1',
      capabilityId: 'todos', granted: true, confirmed: true,
    }, store)).resolves.toMatchObject({
      operationId: 'household.caregiver_grant.update', reversible: true,
      resultRefs: [{ kind: 'household_capability_grant', id: 'caregiver-1:child-1:todos' }],
    });
  });

  it('uses a stable empty-Household result reference before one exists', async () => {
    const store = boundary();
    store.read.mockResolvedValue(emptySnapshot);
    await expect(readHousehold(store)).resolves.toMatchObject({
      resultRefs: [{ kind: 'household', id: 'none' }],
    });
  });
});
