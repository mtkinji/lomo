import type { HouseholdSnapshot } from '../../household/data/household';
import { resolveScreenTimeActor } from './screenTimeHouseholdAuthority';

const snapshot = (role: 'owner' | 'caregiver' | 'child'): HouseholdSnapshot => ({
  household: { id: 'household-1', name: 'Family' },
  currentMembershipId: 'member-1',
  members: [{
    id: 'member-1',
    personId: 'person-1',
    displayName: 'Person',
    kind: role === 'child' ? 'dependent' : 'adult',
    role,
    updatedAt: 'version',
  }],
  activations: [],
  grants: role === 'caregiver' ? [{
    caregiverMembershipId: 'member-1',
    childMembershipId: 'child-1',
    capabilityId: 'screen-time',
  }] : [],
});

describe('resolveScreenTimeActor', () => {
  it('keeps owner, scoped caregiver, and child authority distinct', () => {
    expect(resolveScreenTimeActor(snapshot('owner'))).toEqual({ kind: 'household_owner' });
    expect(resolveScreenTimeActor(snapshot('caregiver'))).toEqual({
      kind: 'household_caregiver',
      childMembershipIds: ['child-1'],
    });
    expect(resolveScreenTimeActor(snapshot('child'))).toEqual({
      kind: 'household_child',
      membershipId: 'member-1',
    });
  });

  it('treats a person outside Household as an adult managing their own rules', () => {
    expect(resolveScreenTimeActor(null)).toEqual({ kind: 'self_adult' });
  });
});
