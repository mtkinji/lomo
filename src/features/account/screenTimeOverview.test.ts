import type { HouseholdSnapshot } from '../household/data/household';
import {
  buildFamilyScreenTimeOverviewRows,
} from './screenTimeOverview';

const household: HouseholdSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner', updatedAt: 'version' },
    { id: 'child-charlie', personId: 'person-2', displayName: 'Charlie', kind: 'dependent', role: 'child', updatedAt: 'version' },
    { id: 'child-riley', personId: 'person-3', displayName: 'Riley', kind: 'dependent', role: 'child', updatedAt: 'version' },
  ],
  activations: [
    { childMembershipId: 'child-charlie', capabilityId: 'screen-time', state: 'pending_setup' },
    { childMembershipId: 'child-riley', capabilityId: 'screen-time', state: 'blocked' },
    { childMembershipId: 'child-riley', capabilityId: 'todos', state: 'active' },
  ],
  grants: [],
};

describe('screenTimeOverview', () => {
  it('shows only activated child Screen Time rows with truthful setup state', () => {
    expect(buildFamilyScreenTimeOverviewRows(household)).toEqual([
      { childMembershipId: 'child-charlie', displayName: 'Charlie', value: 'Set up' },
      { childMembershipId: 'child-riley', displayName: 'Riley', value: 'Needs attention' },
    ]);
  });

  it('omits inactive, missing, and non-child family activations', () => {
    expect(buildFamilyScreenTimeOverviewRows({
      ...household,
      activations: [
        { childMembershipId: 'child-charlie', capabilityId: 'screen-time', state: 'inactive' },
        { childMembershipId: 'missing-child', capabilityId: 'screen-time', state: 'active' },
        { childMembershipId: 'owner-1', capabilityId: 'screen-time', state: 'active' },
      ],
    })).toEqual([]);
    expect(buildFamilyScreenTimeOverviewRows(null)).toEqual([]);
  });
});
