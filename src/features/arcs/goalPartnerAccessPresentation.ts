import type { SharedMember } from '../../services/sharedGoals';
import { isGoalOwnerRole, sharedMemberRoleLabel } from './goalPartnerRoles';

export type GoalPartnerAvatar = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type GoalPartnerRowPresentation = {
  member: SharedMember;
  isCurrentUser: boolean;
  roleLabel: string;
  canRemoveMember: boolean;
  avatarName: string | undefined;
  avatarUrl: string | undefined;
  displayName: string;
  removeAccessibilityLabel: string;
};

export type GoalPartnerAccessPresentation = {
  currentUserIds: Set<string>;
  currentMembership: SharedMember | null;
  canLeaveSharedGoal: boolean;
  canRemoveGoalPartners: boolean;
  headerPartnerAvatars: GoalPartnerAvatar[];
  partnerRows: GoalPartnerRowPresentation[];
};

type GoalPartnerAccessPresentationInput = {
  authUserId: string | null | undefined;
  profileUserId: string | null | undefined;
  sharedMembers: SharedMember[] | null | undefined;
};

type GoalPartnerRemovalInput = {
  member: SharedMember;
  currentUserIds: Set<string>;
  canRemoveGoalPartners: boolean;
};

export function canRemoveGoalPartnerMember({
  member,
  currentUserIds,
  canRemoveGoalPartners,
}: GoalPartnerRemovalInput): boolean {
  if (!canRemoveGoalPartners) return false;
  if (currentUserIds.has(member.userId.trim())) return false;
  return (member.role ?? '').toLowerCase() !== 'owner';
}

export function buildGoalPartnerRowPresentation({
  member,
  currentUserIds,
  canRemoveGoalPartners,
}: GoalPartnerRemovalInput): GoalPartnerRowPresentation {
  const isCurrentUser = currentUserIds.has(member.userId.trim());

  return {
    member,
    isCurrentUser,
    roleLabel: sharedMemberRoleLabel(member, currentUserIds),
    canRemoveMember: canRemoveGoalPartnerMember({
      member,
      currentUserIds,
      canRemoveGoalPartners,
    }),
    avatarName: member.name ?? undefined,
    avatarUrl: member.avatarUrl ?? undefined,
    displayName: member.name ?? 'Member',
    removeAccessibilityLabel: `Remove ${member.name ?? 'partner'}`,
  };
}

export function buildGoalPartnerAccessPresentation({
  authUserId,
  profileUserId,
  sharedMembers,
}: GoalPartnerAccessPresentationInput): GoalPartnerAccessPresentation {
  const currentUserIds = new Set<string>();
  for (const rawUserId of [authUserId, profileUserId]) {
    const userId = typeof rawUserId === 'string' ? rawUserId.trim() : '';
    if (userId) currentUserIds.add(userId);
  }

  const members = Array.isArray(sharedMembers) ? sharedMembers : [];
  const currentMembership =
    members.find((member) => currentUserIds.has(member.userId.trim())) ?? null;
  const hasOwnerAccess = currentMembership ? isGoalOwnerRole(currentMembership.role) : false;
  const partnerRows = members.map((member) =>
    buildGoalPartnerRowPresentation({
      member,
      currentUserIds,
      canRemoveGoalPartners: hasOwnerAccess,
    }),
  );

  let headerPartnerAvatars: GoalPartnerAvatar[] = [];
  if (members.length > 1) {
    headerPartnerAvatars = members
      .filter((member) => {
        const userId = member.userId.trim();
        if (!userId || currentUserIds.has(userId)) return false;
        return (member.role ?? '').toLowerCase() !== 'owner';
      })
      .map((member) => ({
        id: member.userId,
        name: member.name ?? null,
        avatarUrl: member.avatarUrl ?? null,
      }));
  }

  return {
    currentUserIds,
    currentMembership,
    canLeaveSharedGoal: currentMembership !== null && !hasOwnerAccess,
    canRemoveGoalPartners: hasOwnerAccess,
    headerPartnerAvatars,
    partnerRows,
  };
}
