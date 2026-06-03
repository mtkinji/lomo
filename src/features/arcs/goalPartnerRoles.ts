import type { SharedMember } from '../../services/sharedGoals';

export function isGoalOwnerRole(role: string | null | undefined): boolean {
  const value = (role ?? '').toLowerCase();
  return value === 'owner' || value === 'co_owner';
}

export function sharedMemberRoleLabel(member: SharedMember, currentUserIds: Set<string>): string {
  if (member.role === 'owner') return 'Owner';
  if ((member.role ?? '').toLowerCase() === 'co_owner' && currentUserIds.has(member.userId.trim())) {
    return 'Owner';
  }
  return 'Partner';
}

