import type { HouseholdSnapshot } from '../../household/data/household';
import type { ScreenTimeRule } from './screenTimeRule';
import { routeForScreenTimeGuideManagement } from './screenTimeGuideManagement';

const household: HouseholdSnapshot = {
  household: { id: 'household-1', name: 'Watanabe' },
  currentMembershipId: 'adult-1',
  members: [{
    id: 'child-1', personId: 'person-1', displayName: 'Maya', kind: 'dependent',
    role: 'child', updatedAt: '2026-09-19T00:00:00.000Z',
  }],
  activations: [],
  grants: [],
};

const familyRule: ScreenTimeRule = {
  id: 'family-1', domain: 'family', subject: { kind: 'child', membershipId: 'child-1' },
  selectionId: 'games', title: 'Games after homework',
  trigger: { type: 'family_agreement', agreementId: 'agreement-1' },
  temporaryOpen: { allowed: false, durationMinutes: 20 }, active: true,
  desiredVersion: 1, appliedVersion: 1,
};

describe('routeForScreenTimeGuideManagement', () => {
  it('routes one fully resolved family subject to that child management surface', () => {
    expect(routeForScreenTimeGuideManagement({
      rules: [familyRule], unresolvedCount: 0, household,
    })).toBe(
      'kwilt://settings/household/child-1/screen-time?householdId=household-1&childDisplayName=Maya',
    );
  });

  it('uses the truthful overview for unresolved, mixed-domain, or missing household context', () => {
    const personalRule: ScreenTimeRule = {
      ...familyRule,
      id: 'personal-1', domain: 'personal', subject: { kind: 'self' },
      trigger: { type: 'focus_active' },
    };
    expect(routeForScreenTimeGuideManagement({ rules: [familyRule], unresolvedCount: 1, household }))
      .toBe('kwilt://settings/screen-time');
    expect(routeForScreenTimeGuideManagement({ rules: [familyRule, personalRule], unresolvedCount: 0, household }))
      .toBe('kwilt://settings/screen-time');
    expect(routeForScreenTimeGuideManagement({ rules: [familyRule], unresolvedCount: 0, household: null }))
      .toBe('kwilt://settings/screen-time');
  });
});
