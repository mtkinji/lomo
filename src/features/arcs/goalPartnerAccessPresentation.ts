import type { SharedMember } from '../../services/sharedGoals';
import { isGoalOwnerRole } from './goalPartnerRoles';

export type GoalPartnerAvatar = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
};

export type GoalPartnerAccessPresentation = {
  currentUserIds: Set<string>;
  currentMembership: SharedMember | null;
  canLeaveSharedGoal: boolean;
  canRemoveGoalPartners: boolean;
  headerPartnerAvatars: GoalPartnerAvatar[];
};

type GoalPartnerAccessPresentationInput = {
  authUserId: string | null | undefined;
  profileUserId: string | null | undefined;
  sharedMembers: SharedMember[] | null | undefined;
};

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
  };
}
