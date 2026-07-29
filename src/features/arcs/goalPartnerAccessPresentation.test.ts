import type { SharedMember } from '../../services/sharedGoals';
import { buildGoalPartnerAccessPresentation } from './goalPartnerAccessPresentation';

function member(overrides: Partial<SharedMember> = {}): SharedMember {
  return {
    userId: 'partner-1',
    role: 'member',
    name: 'Partner One',
    avatarUrl: 'https://example.com/partner.png',
    ...overrides,
  };
}

describe('buildGoalPartnerAccessPresentation', () => {
  it('normalizes auth and profile identity aliases before finding membership', () => {
    const currentMembership = member({ userId: ' profile-user ', role: 'co_owner' });

    const result = buildGoalPartnerAccessPresentation({
      authUserId: ' auth-user ',
      profileUserId: 'profile-user',
      sharedMembers: [member({ userId: 'owner-user', role: 'owner' }), currentMembership],
    });

    expect(result.currentUserIds).toEqual(new Set(['auth-user', 'profile-user']));
    expect(result.currentMembership).toBe(currentMembership);
    expect(result.canLeaveSharedGoal).toBe(false);
    expect(result.canRemoveGoalPartners).toBe(true);
    expect(result.partnerRows).toEqual([
      expect.objectContaining({
        member: expect.objectContaining({ userId: 'owner-user' }),
        isCurrentUser: false,
        roleLabel: 'Owner',
        canRemoveMember: false,
      }),
      expect.objectContaining({
        member: currentMembership,
        isCurrentUser: true,
        roleLabel: 'Owner',
        canRemoveMember: false,
      }),
    ]);
  });

  it('allows a non-owner member to leave but not remove partners', () => {
    const currentMembership = member({ userId: 'member-user', role: 'member' });

    const result = buildGoalPartnerAccessPresentation({
      authUserId: 'member-user',
      profileUserId: null,
      sharedMembers: [member({ userId: 'owner-user', role: 'owner' }), currentMembership],
    });

    expect(result.currentMembership).toBe(currentMembership);
    expect(result.canLeaveSharedGoal).toBe(true);
    expect(result.canRemoveGoalPartners).toBe(false);
  });

  it('grants no member actions when identity or membership is missing', () => {
    const result = buildGoalPartnerAccessPresentation({
      authUserId: '  ',
      profileUserId: undefined,
      sharedMembers: [member({ userId: 'owner-user', role: 'owner' })],
    });

    expect(result.currentUserIds).toEqual(new Set());
    expect(result.currentMembership).toBeNull();
    expect(result.canLeaveSharedGoal).toBe(false);
    expect(result.canRemoveGoalPartners).toBe(false);
    expect(result.headerPartnerAvatars).toEqual([]);
  });

  it('shows other partners while excluding blank IDs, self, and the explicit owner', () => {
    const visiblePartner = member({ userId: ' partner-1 ', name: 'Pat', avatarUrl: null });
    const visibleCoOwner = member({ userId: 'co-owner', role: 'CO_OWNER', name: null });

    const result = buildGoalPartnerAccessPresentation({
      authUserId: 'current-user',
      profileUserId: null,
      sharedMembers: [
        member({ userId: 'current-user' }),
        member({ userId: ' ', name: 'Blank' }),
        member({ userId: 'owner-user', role: 'OWNER', name: 'Owner' }),
        visiblePartner,
        visibleCoOwner,
      ],
    });

    expect(result.headerPartnerAvatars).toEqual([
      { id: ' partner-1 ', name: 'Pat', avatarUrl: null },
      { id: 'co-owner', name: null, avatarUrl: 'https://example.com/partner.png' },
    ]);
  });

  it('builds removable partner rows with stable profile fallbacks', () => {
    const unnamedPartner = member({
      userId: 'partner-user',
      name: null,
      avatarUrl: null,
    });
    const otherCoOwner = member({ userId: 'co-owner', role: 'co_owner', name: 'Casey' });

    const result = buildGoalPartnerAccessPresentation({
      authUserId: 'owner-user',
      profileUserId: null,
      sharedMembers: [
        member({ userId: 'owner-user', role: 'owner', name: 'Owner' }),
        unnamedPartner,
        otherCoOwner,
      ],
    });

    expect(result.partnerRows.slice(1)).toEqual([
      {
        member: unnamedPartner,
        isCurrentUser: false,
        roleLabel: 'Partner',
        canRemoveMember: true,
        avatarName: undefined,
        avatarUrl: undefined,
        displayName: 'Member',
        removeAccessibilityLabel: 'Remove partner',
      },
      {
        member: otherCoOwner,
        isCurrentUser: false,
        roleLabel: 'Partner',
        canRemoveMember: true,
        avatarName: 'Casey',
        avatarUrl: 'https://example.com/partner.png',
        displayName: 'Casey',
        removeAccessibilityLabel: 'Remove Casey',
      },
    ]);
  });
});
