import type { Friend, FriendInvite, PendingFriendRequest } from '../../../services/friendships';
import type { GoalSharingItem } from '../../../services/sharedGoals';

export type SharingInventory = {
  friends: Friend[];
  pendingFriendRequests: PendingFriendRequest[];
  goalShares: GoalSharingItem[];
};

export type SharingActionsBoundary = {
  loadFriendships(): Promise<Pick<SharingInventory, 'friends' | 'pendingFriendRequests'>>;
  loadGoalShares(): Promise<GoalSharingItem[]>;
  createFriendInvite(input: { expiresInDays: number; maxUses: 1 }): Promise<FriendInvite | null>;
  shareFriendInvite(invite: FriendInvite): Promise<'share_sheet_closed' | 'cancelled'>;
  endFriendship(friendshipId: string): Promise<boolean>;
  revokeGoalInvitation(inviteId: string): Promise<unknown>;
  removeGoalPartner(goalId: string, counterpartUserId: string): Promise<unknown>;
  leaveSharedGoal(goalId: string): Promise<unknown>;
};

export class SharingConnectionConflictError extends Error {
  constructor() {
    super('The sharing connection changed after this revocation was reviewed.');
    this.name = 'SharingConnectionConflictError';
  }
}

type SharingConnection = {
  connectionId: string;
  fingerprint: string;
  kind: 'friendship' | 'goal_invitation' | 'goal_access' | 'shared_goal';
  label: string;
  counterpartName: string;
  direction: 'mutual' | 'by_you' | 'with_you';
  status: string;
  changedAt: string;
  revocable: boolean;
  revoke: () => Promise<void>;
};

function friendConnection(friend: Friend, boundary: SharingActionsBoundary): SharingConnection {
  return {
    connectionId: `friendship:${friend.id}`,
    fingerprint: `friendship:${friend.acceptedAt ?? friend.createdAt}`,
    kind: 'friendship', label: 'Friendship', counterpartName: friend.name?.trim() || 'Friend',
    direction: 'mutual', status: friend.status, changedAt: friend.acceptedAt ?? friend.createdAt,
    revocable: friend.status === 'active',
    revoke: async () => {
      if (!(await boundary.endFriendship(friend.id))) throw new Error('The friendship could not be ended.');
    },
  };
}

function opaqueReference(value: string): string {
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }
  return `${(first >>> 0).toString(36)}${(second >>> 0).toString(36)}`;
}

function goalConnectionIdentity(item: GoalSharingItem, kind: SharingConnection['kind']): string {
  const source = kind === 'goal_invitation'
    ? item.inviteId!
    : `${item.goalId}:${item.direction}:${item.counterpartUserId ?? ''}`;
  return opaqueReference(`${kind}:${source}`);
}

function goalConnection(item: GoalSharingItem, boundary: SharingActionsBoundary): SharingConnection {
  const pendingByYou = item.direction === 'by_you'
    && (item.accessState === 'pending' || item.accessState === 'expired') && Boolean(item.inviteId);
  const activeByYou = item.direction === 'by_you' && item.accessState === 'active' && Boolean(item.counterpartUserId);
  const activeWithYou = item.direction === 'with_you' && item.accessState === 'active';
  const kind = pendingByYou ? 'goal_invitation' : activeByYou ? 'goal_access' : 'shared_goal';
  const identity = goalConnectionIdentity(item, kind);
  return {
    connectionId: `${kind}:${identity}`,
    fingerprint: `${kind}:${item.changedAt}`,
    kind,
    label: item.goalTitle,
    counterpartName: item.counterpartName,
    direction: item.direction,
    status: item.accessState,
    changedAt: item.changedAt,
    revocable: pendingByYou || activeByYou || activeWithYou,
    revoke: async () => {
      if (pendingByYou) await boundary.revokeGoalInvitation(item.inviteId!);
      else if (activeByYou) await boundary.removeGoalPartner(item.goalId, item.counterpartUserId!);
      else if (activeWithYou) await boundary.leaveSharedGoal(item.goalId);
      else throw new Error('That Goal sharing connection must be reviewed natively.');
    },
  };
}

function connections(inventory: SharingInventory, boundary: SharingActionsBoundary): SharingConnection[] {
  return [
    ...inventory.friends.map((friend) => friendConnection(friend, boundary)),
    ...inventory.goalShares.map((item) => goalConnection(item, boundary)),
  ];
}

async function loadInventory(boundary: SharingActionsBoundary): Promise<SharingInventory> {
  const [friendships, goalShares] = await Promise.all([
    boundary.loadFriendships(), boundary.loadGoalShares(),
  ]);
  return { ...friendships, goalShares };
}

async function loadInventoryForConnection(
  boundary: SharingActionsBoundary,
  connectionId: string,
): Promise<SharingInventory> {
  if (connectionId.startsWith('friendship:')) {
    const friendships = await boundary.loadFriendships();
    return { ...friendships, goalShares: [] };
  }
  return { friends: [], pendingFriendRequests: [], goalShares: await boundary.loadGoalShares() };
}

function boundedConnection(connection: SharingConnection) {
  const { revoke: _revoke, ...summary } = connection;
  return summary;
}

export function sharingReviewReferenceForFriend(friend: Friend) {
  return {
    connectionId: `friendship:${friend.id}`,
    expectedFingerprint: `friendship:${friend.acceptedAt ?? friend.createdAt}`,
  };
}

export function sharingReviewReferenceForGoalShare(item: GoalSharingItem) {
  const pendingByYou = item.direction === 'by_you'
    && (item.accessState === 'pending' || item.accessState === 'expired') && Boolean(item.inviteId);
  const activeByYou = item.direction === 'by_you' && item.accessState === 'active' && Boolean(item.counterpartUserId);
  const kind = pendingByYou ? 'goal_invitation' : activeByYou ? 'goal_access' : 'shared_goal';
  const identity = goalConnectionIdentity(item, kind);
  return { connectionId: `${kind}:${identity}`, expectedFingerprint: `${kind}:${item.changedAt}` };
}

export function createSharingActions(boundary: SharingActionsBoundary) {
  return {
    loadNativeFriendships: () => boundary.loadFriendships(),
    loadNativeGoalShares: () => boundary.loadGoalShares(),
    async list() {
      const inventory = await loadInventory(boundary);
      return {
        connections: connections(inventory, boundary).map(boundedConnection),
        pendingFriendRequests: inventory.pendingFriendRequests.map((request) => ({
          requestId: request.friendshipId,
          counterpartName: request.fromUserName?.trim() || 'Someone',
          createdAt: request.createdAt,
          accessGranted: false,
        })),
      };
    },
    async prepareInvitation(input: { expiresInDays: number }) {
      if (!Number.isInteger(input.expiresInDays) || input.expiresInDays < 1 || input.expiresInDays > 30) {
        throw new Error('Friend invitations must expire in 1 through 30 days.');
      }
      const invite = await boundary.createFriendInvite({ expiresInDays: input.expiresInDays, maxUses: 1 });
      if (!invite) throw new Error('Kwilt could not prepare the friend invitation.');
      const deliveryStatus = await boundary.shareFriendInvite(invite);
      return {
        invitationId: invite.id,
        expiresAt: invite.expiresAt,
        maxUses: 1 as const,
        deliveryStatus,
        accessGranted: false as const,
      };
    },
    async revoke(input: { connectionId: string; expectedFingerprint: string }) {
      const before = await loadInventoryForConnection(boundary, input.connectionId);
      const connection = connections(before, boundary).find((candidate) => candidate.connectionId === input.connectionId);
      if (!connection || !connection.revocable) throw new Error('That revocable sharing connection is not available.');
      if (connection.fingerprint !== input.expectedFingerprint) throw new SharingConnectionConflictError();
      await connection.revoke();
      const after = await loadInventoryForConnection(boundary, input.connectionId);
      if (connections(after, boundary).some((candidate) => candidate.connectionId === input.connectionId && candidate.revocable)) {
        throw new Error('Kwilt did not confirm the sharing revocation.');
      }
      return { connectionId: input.connectionId, revoked: true as const };
    },
  };
}
