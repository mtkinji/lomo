import type { HouseholdSnapshot } from '../data/household';
import type { HouseholdDevice } from '../data/householdDeviceParticipation';
import { projectCurrentHouseholdModeSession } from './householdModeReconciliation';
import type { HouseholdModeSession } from './useHouseholdModeStore';

const session: HouseholdModeSession = {
  deviceId: 'device-1', householdId: 'house-1', assignedCaregiverUserId: 'user-1',
  assignedCaregiverName: 'Andrew', activeMemberId: 'child-1', requiresCaregiverReauthentication: false,
  verification: 'unavailable', members: [],
};
const device: HouseholdDevice = {
  id: 'device-1', householdId: 'house-1', kind: 'shared_household', childMembershipId: null,
  assignedCaregiverMembershipId: 'owner-1', installId: 'install-123', label: 'Shared iPad',
  platform: 'ipados', status: 'ready', memberIds: ['child-1'], updatedAt: 'version',
};
const snapshot: HouseholdSnapshot = {
  household: { id: 'house-1', name: 'Watanabe Household' }, currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: 'version' },
    { id: 'child-1', personId: 'person-2', displayName: 'Charlie', kind: 'dependent', role: 'child', updatedAt: 'version' },
  ],
  activations: [{ childMembershipId: 'child-1', capabilityId: 'todos', state: 'active' }],
  grants: [],
};

describe('Household Mode reconciliation', () => {
  it('replaces persisted member and capability state from current server authority', () => {
    expect(projectCurrentHouseholdModeSession(session, [device], snapshot, 'install-123')).toMatchObject({
      verification: 'current', activeMemberId: 'child-1',
      members: [{ id: 'child-1', displayName: 'Charlie', capabilityIds: ['todos'] }],
    });
  });

  it('rejects a revoked device or a different assigned caregiver membership', () => {
    expect(projectCurrentHouseholdModeSession(session, [], snapshot, 'install-123')).toBeNull();
    expect(projectCurrentHouseholdModeSession(session, [{
      ...device, assignedCaregiverMembershipId: 'caregiver-2',
    }], snapshot, 'install-123')).toBeNull();
    expect(projectCurrentHouseholdModeSession(session, [device], snapshot, 'another-install')).toBeNull();
  });
});
