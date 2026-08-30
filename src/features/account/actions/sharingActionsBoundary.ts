import { Share } from 'react-native';
import {
  buildFriendInviteUrl,
  createFriendInvite,
  endFriendship,
  getPendingFriendRequests,
  listFriends,
} from '../../../services/friendships';
import {
  leaveSharedGoal,
  listGoalSharing,
  removeGoalPartner,
  revokeTargetedGoalInvite,
} from '../../../services/sharedGoals';
import { createSharingActions, type SharingActionsBoundary } from './sharingActions';

export const DEFAULT_SHARING_ACTIONS_BOUNDARY: SharingActionsBoundary = {
  async loadFriendships() {
    const [friends, pendingFriendRequests] = await Promise.all([listFriends(), getPendingFriendRequests()]);
    return { friends, pendingFriendRequests };
  },
  loadGoalShares: listGoalSharing,
  createFriendInvite,
  async shareFriendInvite(invite) {
    const url = buildFriendInviteUrl(invite.code);
    const result = await Share.share({
      message: 'Connect with me on Kwilt. Becoming friends does not share anything by itself. '
        + `It only makes us easier to find when either of us chooses to share. ${url}`,
      url,
    });
    return result.action === Share.dismissedAction ? 'cancelled' : 'share_sheet_closed';
  },
  endFriendship,
  revokeGoalInvitation: revokeTargetedGoalInvite,
  removeGoalPartner,
  leaveSharedGoal,
};

export const sharingActions = createSharingActions(DEFAULT_SHARING_ACTIONS_BOUNDARY);
