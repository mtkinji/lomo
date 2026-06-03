import { isGoalOwnerRole, sharedMemberRoleLabel } from './goalPartnerRoles';
import type { SharedMember } from '../../services/sharedGoals';

function member(overrides: Partial<SharedMember>): SharedMember {
  return {
    userId: 'member-1',
    role: 'member',
    ...overrides,
  };
}

describe('goalPartnerRoles', () => {
  describe('isGoalOwnerRole', () => {
    it('treats owner and co_owner roles as owner-level roles', () => {
      expect(isGoalOwnerRole('owner')).toBe(true);
      expect(isGoalOwnerRole('co_owner')).toBe(true);
      expect(isGoalOwnerRole('CO_OWNER')).toBe(true);
    });

    it('does not treat missing or partner roles as owner-level roles', () => {
      expect(isGoalOwnerRole(null)).toBe(false);
      expect(isGoalOwnerRole(undefined)).toBe(false);
      expect(isGoalOwnerRole('partner')).toBe(false);
    });
  });

  describe('sharedMemberRoleLabel', () => {
    it('labels explicit owners as Owner', () => {
      expect(sharedMemberRoleLabel(member({ role: 'owner' }), new Set())).toBe('Owner');
    });

    it('labels the current user co-owner as Owner', () => {
      expect(
        sharedMemberRoleLabel(
          member({ userId: ' current-user ', role: 'co_owner' }),
          new Set(['current-user']),
        ),
      ).toBe('Owner');
    });

    it('labels other co-owners and partners as Partner', () => {
      expect(
        sharedMemberRoleLabel(member({ userId: 'other-user', role: 'co_owner' }), new Set(['current-user'])),
      ).toBe('Partner');
      expect(sharedMemberRoleLabel(member({ role: 'member' }), new Set())).toBe('Partner');
    });
  });
});

