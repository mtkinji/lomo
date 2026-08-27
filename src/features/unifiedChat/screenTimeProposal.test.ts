import {
  parseStoredScreenTimeProposalOperation,
  parseScreenTimeOverrideProposal,
  parseScreenTimePrerequisiteAgreementProposal,
  parsePersonalScreenTimeRuleProposal,
} from './screenTimeProposal';

describe('parseScreenTimeOverrideProposal', () => {
  const now = new Date('2026-07-30T10:00:00.000Z');
  const targets = [
    { childMembershipId: 'charlie', selectionId: 'selection-charlie', expectedVersion: 7 },
    { childMembershipId: 'grant', selectionId: 'selection-grant', expectedVersion: 4 },
  ];

  it('parses one atomic multi-child wall-clock block', () => {
    expect(parseScreenTimeOverrideProposal({
      action: 'block', targets, timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
    }, now)).toEqual({
      type: 'block_family_screen_time_selection', targetId: null,
      payload: { targets, timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z' },
    });
  });

  it('parses a bounded temporary allowance through Kwilt family restrictions', () => {
    expect(parseScreenTimeOverrideProposal({
      action: 'allow', targets: [targets[0]], timeBasis: 'wall_clock', expiresAt: '2026-07-30T10:30:00.000Z',
    }, now)).toMatchObject({
      type: 'allow_family_screen_time_selection',
      payload: { timeBasis: 'wall_clock', expiresAt: '2026-07-30T10:30:00.000Z' },
    });
  });

  it('rejects duplicate children, stale or excessive expiry, and foreground usage', () => {
    expect(parseScreenTimeOverrideProposal({
      action: 'block', targets: [targets[0], { ...targets[1], childMembershipId: 'charlie' }],
      timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
    }, now)).toBeNull();
    expect(parseScreenTimeOverrideProposal({
      action: 'block', targets, timeBasis: 'wall_clock', expiresAt: '2026-07-30T09:59:00.000Z',
    }, now)).toBeNull();
    expect(parseScreenTimeOverrideProposal({
      action: 'allow', targets, timeBasis: 'wall_clock', expiresAt: '2026-08-07T10:00:00.000Z',
    }, now)).toBeNull();
    expect(parseScreenTimeOverrideProposal({
      action: 'allow', targets, timeBasis: 'foreground_usage', expiresAt: null,
    }, now)).toBeNull();
  });

  it('rejects display names, app names, and unknown fields at the mutation boundary', () => {
    expect(parseScreenTimeOverrideProposal({
      action: 'block', childName: 'Charlie', appName: 'Brawl Stars', targets,
      timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
    }, now)).toBeNull();
  });
});

describe('parsePersonalScreenTimeRuleProposal', () => {
  const updatedAt = '2026-08-27T10:00:00.000Z';

  it('accepts only redacted versioned personal rule mutations', () => {
    expect(parsePersonalScreenTimeRuleProposal('screen_time.personal_rule.update', {
      ruleId: 'rule-1', expectedUpdatedAt: updatedAt,
      fields: { kind: 'daily_limit', limitMinutes: 30, enabled: true },
    })).toMatchObject({ type: 'update_personal_screen_time_rule', targetId: 'rule-1' });
    expect(parsePersonalScreenTimeRuleProposal('screen_time.personal_rule.deactivate', {
      ruleId: 'rule-1', expectedUpdatedAt: updatedAt,
    })).toMatchObject({ type: 'deactivate_personal_screen_time_rule' });
    expect(parsePersonalScreenTimeRuleProposal('screen_time.personal_rule.delete', {
      ruleId: 'rule-1', expectedUpdatedAt: updatedAt, selectionToken: 'secret',
    })).toBeNull();
  });
});

describe('parseScreenTimePrerequisiteAgreementProposal', () => {
  const rule = {
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    startMinute: 0,
    endMinute: 1439,
    dailyLimitMinutes: null,
    prerequisiteActivity: {
      selectionId: 'selection-gospel-library',
      thresholdMinutes: 5,
      reset: 'daily',
    },
  };

  it('parses one daily prerequisite before a target selection', () => {
    expect(parseScreenTimePrerequisiteAgreementProposal({
      childMembershipId: 'charlie',
      targetSelectionId: 'selection-games',
      expectedPolicyVersion: 7,
      rule,
    })).toEqual({
      type: 'create_family_screen_time_prerequisite_agreement',
      targetId: null,
      payload: {
        childMembershipId: 'charlie',
        targetSelectionId: 'selection-games',
        expectedPolicyVersion: 7,
        rule,
      },
    });
  });

  it('rejects self-targeting, invalid thresholds, unknown fields, and non-daily resets', () => {
    expect(parseScreenTimePrerequisiteAgreementProposal({
      childMembershipId: 'charlie', targetSelectionId: 'selection-gospel-library',
      expectedPolicyVersion: 7, rule,
    })).toBeNull();
    expect(parseScreenTimePrerequisiteAgreementProposal({
      childMembershipId: 'charlie', targetSelectionId: 'selection-games', expectedPolicyVersion: 7,
      rule: { ...rule, prerequisiteActivity: { ...rule.prerequisiteActivity, thresholdMinutes: 0 } },
    })).toBeNull();
    expect(parseScreenTimePrerequisiteAgreementProposal({
      childMembershipId: 'charlie', targetSelectionId: 'selection-games', expectedPolicyVersion: 7,
      rule: { ...rule, prerequisiteActivity: { ...rule.prerequisiteActivity, reset: 'weekly' } },
    })).toBeNull();
    expect(parseScreenTimePrerequisiteAgreementProposal({
      childMembershipId: 'charlie', targetSelectionId: 'selection-games', expectedPolicyVersion: 7,
      childName: 'Charlie', rule,
    })).toBeNull();
  });
});

describe('parseStoredScreenTimeProposalOperation', () => {
  it.each([
    ['update_family_screen_time_agreement', 'agreement-1'],
    ['deactivate_family_screen_time_agreement', 'agreement-1'],
  ] as const)('round-trips %s without widening the rule payload', (type, targetId) => {
    expect(parseStoredScreenTimeProposalOperation({
      type, targetId,
      payload: {
        childMembershipId: 'charlie', selectionId: 'selection-games', expectedVersion: 2,
        rule: {
          weekdays: [1, 2, 3, 4, 5], startMinute: 900, endMinute: 1140, dailyLimitMinutes: 20,
          prerequisiteActivity: { selectionId: 'selection-reading', thresholdMinutes: 10, reset: 'daily' },
        },
      },
    })).toMatchObject({ type, targetId });
  });

  it('round-trips override cancellation and strict request decisions', () => {
    expect(parseStoredScreenTimeProposalOperation({
      type: 'cancel_family_screen_time_override', targetId: 'override-1',
      payload: { childMembershipId: 'charlie', expectedVersion: 7 },
    })).toMatchObject({ type: 'cancel_family_screen_time_override', targetId: 'override-1' });
    expect(parseStoredScreenTimeProposalOperation({
      type: 'decide_family_screen_time_request', targetId: 'request-1',
      payload: { childMembershipId: 'charlie', decision: 'denied', allowMinutes: null, expectedVersion: 7 },
    })).toMatchObject({ type: 'decide_family_screen_time_request', targetId: 'request-1' });
  });
});
