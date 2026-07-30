import type { MoneyAppControlSettings } from '../../capabilities/money/domain/moneyAppControl';
import type { HouseholdSnapshot } from '../household/data/household';
import {
  buildFamilyScreenTimeOverviewRows,
  buildMoneyScreenTimeOverview,
} from './screenTimeOverview';

const household: HouseholdSnapshot = {
  household: { id: 'household-1', name: 'My household' },
  currentMembershipId: 'owner-1',
  members: [
    { id: 'owner-1', personId: 'person-1', displayName: 'Andrew', kind: 'adult', role: 'owner' },
    { id: 'child-charlie', personId: 'person-2', displayName: 'Charlie', kind: 'dependent', role: 'child' },
    { id: 'child-riley', personId: 'person-3', displayName: 'Riley', kind: 'dependent', role: 'child' },
  ],
  activations: [
    { childMembershipId: 'child-charlie', capabilityId: 'screen-time', state: 'pending_setup' },
    { childMembershipId: 'child-riley', capabilityId: 'screen-time', state: 'blocked' },
    { childMembershipId: 'child-riley', capabilityId: 'todos', state: 'active' },
  ],
  grants: [],
};

function moneySettings(overrides: Partial<MoneyAppControlSettings> = {}): MoneyAppControlSettings {
  return {
    authorizationStatus: 'approved',
    policies: {
      shopping: {
        enabled: true,
        preset: 'always_review',
        unlockWindowMinutes: 20,
        selectedApps: [{ token: 'amazon' }],
        selectedCategories: [],
        lastReview: null,
      },
      dining: {
        enabled: true,
        preset: 'when_hot',
        unlockWindowMinutes: 20,
        selectedApps: [],
        selectedCategories: [{ token: 'delivery' }],
        lastReview: null,
      },
      disabled: {
        enabled: false,
        preset: 'when_over',
        unlockWindowMinutes: 20,
        selectedApps: [{ token: 'store' }],
        selectedCategories: [],
        lastReview: null,
      },
    },
    lastUpdated: null,
    ...overrides,
  };
}

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

  it('summarizes only enabled Money policies with actual targets', () => {
    expect(buildMoneyScreenTimeOverview(moneySettings())).toEqual({
      activePolicyIds: ['dining', 'shopping'],
      value: '2 categories',
    });
  });

  it('reports setup or attention instead of overstating Money enforcement', () => {
    expect(buildMoneyScreenTimeOverview(moneySettings({ authorizationStatus: 'notDetermined' }))?.value)
      .toBe('Needs setup');
    expect(buildMoneyScreenTimeOverview(moneySettings({ authorizationStatus: 'denied' }))?.value)
      .toBe('Needs attention');
    expect(buildMoneyScreenTimeOverview(moneySettings({ policies: {} }))).toBeNull();
  });
});
