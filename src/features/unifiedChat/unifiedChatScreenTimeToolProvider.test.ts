import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';

const tool = (id: string) => UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id)!;
const now = new Date('2026-07-30T10:00:00.000Z');
const snapshots = {
  goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
  screenTime: { self: {
    kind: 'self' as const, deviceScope: 'current_device' as const, authorizationStatus: 'approved' as const,
    personalRules: [{
      id: 'personal-rule-1', kind: 'composite' as const, targetLabels: ['Instagram'],
      conditionCount: 2, connector: 'all' as const, outcome: 'pause' as const, enabled: true,
      updatedAt: '2026-08-27T10:00:00.000Z',
    }],
  }, children: [{
    membershipId: 'charlie', displayName: 'Charlie', canManage: true,
    policy: {
      childMembershipId: 'charlie', subjectId: 'subject-charlie', desiredPolicyVersion: 7,
      selections: [
        { id: 'selection-charlie', label: 'Brawl Stars', selectionRef: 'opaque-ref', status: 'active' as const },
        { id: 'selection-games', label: 'Games', selectionRef: 'opaque-games', status: 'active' as const },
        { id: 'selection-gospel', label: 'Gospel Library', selectionRef: 'opaque-gospel', status: 'active' as const },
      ],
      agreements: [{
        id: 'agreement-1', selectionId: 'selection-games', active: true, version: 2,
        updatedAt: '2026-07-30T09:00:00.000Z',
        rule: {
          weekdays: [1, 2, 3, 4, 5], startMinute: 960, endMinute: 1140,
          dailyLimitMinutes: 30,
          prerequisiteActivity: {
            selectionId: 'selection-gospel', thresholdMinutes: 10, reset: 'daily',
            selectionRef: 'nested-opaque-ref',
          },
          selectionRef: 'agreement-opaque-ref',
        },
      }], activeOverrides: [{
        id: 'override-1', selectionId: 'selection-charlie', action: 'block' as const,
        timeBasis: 'wall_clock' as const, startsAt: '2026-07-30T09:00:00.000Z',
        expiresAt: '2026-07-30T13:00:00.000Z', usageMinutes: null,
        provenance: 'caregiver_direct' as const, policyVersion: 7, status: 'active' as const,
      }], pendingRequests: [{
        id: 'request-1', selectionId: 'selection-charlie', kind: 'more_time' as const,
        requestedMinutes: 30, message: 'Homework is done', status: 'pending' as const,
        expiresAt: '2026-07-30T12:00:00.000Z', createdAt: '2026-07-30T09:45:00.000Z',
      }],
      devices: [{
        id: 'device-1', readiness: 'ready' as const, authorizationStatus: 'authorized' as const,
        lastSeenAt: null, releasedAt: null,
      }],
      latestDeviceReceipt: {
        policyVersion: 7, outcome: 'applied' as const, failureCode: null,
        occurredAt: '2026-07-30T09:30:00.000Z', deviceId: 'device-1',
      },
    },
  }] },
};

describe('Unified Chat family Screen Time provider', () => {
  it('reads and proposes personal rule changes without exposing Apple tokens', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'personal-list', toolId: 'screen_time.personal_rule.list', arguments: {},
    }, tool('screen_time.personal_rule.list'))).resolves.toMatchObject({
      status: 'completed', output: { rules: [{ id: 'personal-rule-1', targetLabels: ['Instagram'] }] },
    });
    await expect(provider.execute({
      id: 'personal-update', toolId: 'screen_time.personal_rule.update', arguments: {
        ruleId: 'personal-rule-1', expectedUpdatedAt: '2026-08-27T10:00:00.000Z',
        fields: { enabled: false },
      },
    }, tool('screen_time.personal_rule.update'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()[0]).toMatchObject({
      operation: { type: 'update_personal_screen_time_rule', targetId: 'personal-rule-1' },
    });
    expect(JSON.stringify(provider.proposals())).not.toMatch(/token|selectionRef/i);
  });

  it('rejects stale personal rule mutation timestamps', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'personal-delete', toolId: 'screen_time.personal_rule.delete', arguments: {
        ruleId: 'personal-rule-1', expectedUpdatedAt: '2026-08-26T10:00:00.000Z',
      },
    }, tool('screen_time.personal_rule.delete'))).resolves.toMatchObject({
      status: 'failed', code: 'screen_time_rule_stale', retryable: true,
    });
  });
  it('reads authorized Screen Time policy state without exposing Apple selection references', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    const result = await provider.execute({
      id: 'read-1', toolId: 'screen_time.read', arguments: { childMembershipIds: ['charlie'] },
    }, tool('screen_time.read'));

    expect(result).toEqual({
      status: 'completed',
      receipt: null,
      output: {
        children: [{
          membershipId: 'charlie', displayName: 'Charlie', desiredPolicyVersion: 7,
          selections: [
            { id: 'selection-charlie', label: 'Brawl Stars', status: 'active' },
            { id: 'selection-games', label: 'Games', status: 'active' },
            { id: 'selection-gospel', label: 'Gospel Library', status: 'active' },
          ],
          agreements: [{
            id: 'agreement-1', selectionId: 'selection-games', active: true, version: 2,
            updatedAt: '2026-07-30T09:00:00.000Z',
            rule: {
              weekdays: [1, 2, 3, 4, 5], startMinute: 960, endMinute: 1140,
              dailyLimitMinutes: 30,
              prerequisiteActivity: {
                selectionId: 'selection-gospel', thresholdMinutes: 10, reset: 'daily',
              },
            },
          }], activeOverrides: [{
            id: 'override-1', selectionId: 'selection-charlie', action: 'block',
            timeBasis: 'wall_clock', startsAt: '2026-07-30T09:00:00.000Z',
            expiresAt: '2026-07-30T13:00:00.000Z', usageMinutes: null,
            provenance: 'caregiver_direct', policyVersion: 7, status: 'active',
          }], pendingRequests: [{
            id: 'request-1', selectionId: 'selection-charlie', kind: 'more_time',
            requestedMinutes: 30, message: 'Homework is done', status: 'pending',
            expiresAt: '2026-07-30T12:00:00.000Z', createdAt: '2026-07-30T09:45:00.000Z',
          }],
          devices: [{
            readiness: 'ready', authorizationStatus: 'authorized', lastSeenAt: null, releasedAt: null,
          }],
          latestDeviceReceipt: {
            policyVersion: 7, outcome: 'applied', failureCode: null,
            occurredAt: '2026-07-30T09:30:00.000Z',
          },
        }],
      },
    });
    expect(JSON.stringify(result)).not.toContain('opaque-ref');
    expect(JSON.stringify(result)).not.toContain('subject-charlie');
    expect(JSON.stringify(result)).not.toContain('device-1');
  });

  it('rejects a Screen Time read for children outside the authorized snapshot', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'read-2', toolId: 'screen_time.read', arguments: { childMembershipIds: ['not-authorized'] },
    }, tool('screen_time.read'))).resolves.toEqual({
      status: 'failed', code: 'screen_time_child_not_authorized',
      message: 'One or more children are not available for Screen Time management.', retryable: false,
    });
  });

  it('stages a compact explicit-review block proposal from stable authorized targets', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    const result = await provider.execute({
      id: 'call-1', toolId: 'screen_time.override.block', arguments: {
        targets: [{ childMembershipId: 'charlie', selectionId: 'selection-charlie', expectedVersion: 7 }],
        timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
      },
    }, tool('screen_time.override.block'));
    expect(result).toMatchObject({ status: 'proposed' });
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'screenTime', title: 'Block Brawl Stars',
      body: expect.stringMatching(/^Charlie · until /),
      operation: expect.objectContaining({
        type: 'block_family_screen_time_selection', targetId: null,
      }),
    })]);
  });

  it('stages an allowance without promising it overrides non-Kwilt restrictions', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'call-2', toolId: 'screen_time.override.allow', arguments: {
        targets: [{ childMembershipId: 'charlie', selectionId: 'selection-charlie', expectedVersion: 7 }],
        timeBasis: 'wall_clock', expiresAt: '2026-07-30T10:30:00.000Z',
      },
    }, tool('screen_time.override.allow'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals()[0]).toMatchObject({
      title: 'Allow Brawl Stars', body: expect.stringMatching(/^Charlie · for Kwilt family restrictions · until /),
    });
  });

  it('rejects stale versions and selections outside the authorized child snapshot', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'call-3', toolId: 'screen_time.override.block', arguments: {
        targets: [{ childMembershipId: 'charlie', selectionId: 'wrong-selection', expectedVersion: 6 }],
        timeBasis: 'wall_clock', expiresAt: '2026-07-30T13:00:00.000Z',
      },
    }, tool('screen_time.override.block'))).resolves.toMatchObject({
      status: 'failed', code: 'screen_time_target_stale', retryable: true,
    });
    expect(provider.proposals()).toEqual([]);
  });

  it('stages an explicit daily prerequisite agreement using two saved selections', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    const result = await provider.execute({
      id: 'call-4', toolId: 'screen_time.agreement.create', arguments: {
        childMembershipId: 'charlie',
        targetSelectionId: 'selection-games',
        expectedPolicyVersion: 7,
        rule: {
          weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1439,
          dailyLimitMinutes: null,
          prerequisiteActivity: { selectionId: 'selection-gospel', thresholdMinutes: 5, reset: 'daily' },
        },
      },
    }, tool('screen_time.agreement.create'));

    expect(result).toMatchObject({ status: 'proposed' });
    expect(provider.proposals()).toEqual([expect.objectContaining({
      capabilityId: 'screenTime',
      title: 'Use Gospel Library before Games',
      body: 'Charlie uses Gospel Library for 5 minutes before Games become available each day.',
      operation: expect.objectContaining({
        type: 'create_family_screen_time_prerequisite_agreement',
        payload: expect.objectContaining({
          childMembershipId: 'charlie', targetSelectionId: 'selection-games', expectedPolicyVersion: 7,
        }),
      }),
    })]);
  });

  it('rejects a prerequisite agreement when either saved selection is stale or belongs elsewhere', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'call-5', toolId: 'screen_time.agreement.create', arguments: {
        childMembershipId: 'charlie', targetSelectionId: 'selection-games', expectedPolicyVersion: 7,
        rule: {
          weekdays: [0, 1, 2, 3, 4, 5, 6], startMinute: 0, endMinute: 1439,
          dailyLimitMinutes: null,
          prerequisiteActivity: { selectionId: 'missing', thresholdMinutes: 5, reset: 'daily' },
        },
      },
    }, tool('screen_time.agreement.create'))).resolves.toMatchObject({
      status: 'failed', code: 'screen_time_target_stale', retryable: true,
    });
    expect(provider.proposals()).toEqual([]);
  });

  it('stages an exact agreement update and deactivation from the current authorized version', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'update-1', toolId: 'screen_time.agreement.update', arguments: {
        childMembershipId: 'charlie', agreementId: 'agreement-1', selectionId: 'selection-games',
        expectedVersion: 2,
        rule: { weekdays: [1, 2, 3, 4, 5], startMinute: 900, endMinute: 1140, dailyLimitMinutes: 20 },
      },
    }, tool('screen_time.agreement.update'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({
      id: 'deactivate-1', toolId: 'screen_time.agreement.deactivate', arguments: {
        childMembershipId: 'charlie', agreementId: 'agreement-1', selectionId: 'selection-games',
        expectedVersion: 2, currentRule: {
          weekdays: [1, 2, 3, 4, 5], startMinute: 960, endMinute: 1140, dailyLimitMinutes: 30,
          prerequisiteActivity: { selectionId: 'selection-gospel', thresholdMinutes: 10, reset: 'daily' },
        },
      },
    }, tool('screen_time.agreement.deactivate'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals().map((proposal) => proposal.operation.type)).toEqual([
      'update_family_screen_time_agreement', 'deactivate_family_screen_time_agreement',
    ]);
  });

  it('rejects an agreement update that requires its target selection before itself', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'update-stale-prerequisite', toolId: 'screen_time.agreement.update', arguments: {
        childMembershipId: 'charlie', agreementId: 'agreement-1', selectionId: 'selection-games',
        expectedVersion: 2,
        rule: {
          weekdays: [1, 2, 3, 4, 5], startMinute: 900, endMinute: 1140, dailyLimitMinutes: 20,
          prerequisiteActivity: { selectionId: 'selection-games', thresholdMinutes: 10, reset: 'daily' },
        },
      },
    }, tool('screen_time.agreement.update'))).resolves.toMatchObject({
      status: 'failed', code: 'screen_time_target_stale', retryable: true,
    });
    expect(provider.proposals()).toEqual([]);
  });

  it('stages cancellation and child-request decisions only from current authorized state', async () => {
    const provider = createUnifiedChatToolProvider({ snapshots, now: () => now });
    await expect(provider.execute({
      id: 'cancel-1', toolId: 'screen_time.override.cancel', arguments: {
        childMembershipId: 'charlie', overrideId: 'override-1', expectedVersion: 7,
      },
    }, tool('screen_time.override.cancel'))).resolves.toMatchObject({ status: 'proposed' });
    await expect(provider.execute({
      id: 'decide-1', toolId: 'screen_time.request.decide', arguments: {
        childMembershipId: 'charlie', requestId: 'request-1', decision: 'approved',
        allowMinutes: 30, expectedVersion: 7,
      },
    }, tool('screen_time.request.decide'))).resolves.toMatchObject({ status: 'proposed' });
    expect(provider.proposals().map((proposal) => proposal.operation.type)).toEqual([
      'cancel_family_screen_time_override', 'decide_family_screen_time_request',
    ]);
  });
});
