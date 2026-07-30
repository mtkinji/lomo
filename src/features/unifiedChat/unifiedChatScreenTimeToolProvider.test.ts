import { UNIFIED_CHAT_TOOL_CATALOG } from './toolCatalog';
import { createUnifiedChatToolProvider } from './unifiedChatToolProvider';

const tool = (id: string) => UNIFIED_CHAT_TOOL_CATALOG.find((candidate) => candidate.id === id)!;
const now = new Date('2026-07-30T10:00:00.000Z');
const snapshots = {
  goals: { goals: [] }, todos: { activities: [], goals: [] }, chapters: { chapters: [] },
  screenTime: { children: [{
    membershipId: 'charlie', displayName: 'Charlie', canManage: true,
    policy: {
      childMembershipId: 'charlie', subjectId: 'subject-charlie', desiredPolicyVersion: 7,
      selections: [{ id: 'selection-charlie', label: 'Brawl Stars', selectionRef: 'opaque-ref', status: 'active' as const }],
      agreements: [], activeOverrides: [], pendingRequests: [], devices: [], latestDeviceReceipt: null,
    },
  }] },
};

describe('Unified Chat family Screen Time provider', () => {
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
});
