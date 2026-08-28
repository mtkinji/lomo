import {
  SharingConnectionConflictError,
  createSharingActions,
  type SharingActionsBoundary,
} from './sharingActions';

const friend = {
  id: 'friendship-1', friendUserId: 'user-2', status: 'active' as const, initiatedByMe: true,
  createdAt: '2026-08-01T00:00:00.000Z', acceptedAt: '2026-08-02T00:00:00.000Z',
  name: 'Blaire', avatarUrl: 'private-avatar',
};
const goalInvite = {
  direction: 'by_you' as const, goalId: 'goal-1', goalTitle: 'Walk together', accessState: 'pending' as const,
  counterpartName: 'Blaire', counterpartAvatarUrl: 'private-avatar', inviteId: 'invite-1',
  inviteCode: 'secret-code', counterpartUserId: 'user-2', changedAt: '2026-08-03T00:00:00.000Z',
};

function boundary(): SharingActionsBoundary & {
  endFriendship: jest.Mock;
  revokeGoalInvitation: jest.Mock;
} {
  let friends = [friend];
  let goalShares = [goalInvite];
  const endFriendship = jest.fn(async () => { friends = []; return true; });
  const revokeGoalInvitation = jest.fn(async () => { goalShares = []; });
  return {
    loadFriendships: async () => ({
      friends, pendingFriendRequests: [{ friendshipId: 'request-1', fromUserId: 'user-3', fromUserName: 'Ruth',
        fromUserAvatarUrl: 'private-avatar', createdAt: '2026-08-04T00:00:00.000Z' }],
    }),
    loadGoalShares: async () => goalShares,
    createFriendInvite: async () => ({ id: 'draft-1', code: 'invite-secret', createdAt: 'now',
      expiresAt: 'later', uses: 0, maxUses: 1 }),
    shareFriendInvite: async () => 'share_sheet_closed',
    endFriendship,
    revokeGoalInvitation,
    removeGoalPartner: async () => undefined,
    leaveSharedGoal: async () => undefined,
  };
}

test('lists bounded sharing connections without invite codes, avatars, or private user IDs', async () => {
  const result = await createSharingActions(boundary()).list();
  expect(result).toMatchObject({
    connections: [
      { connectionId: 'friendship:friendship-1', kind: 'friendship', counterpartName: 'Blaire', revocable: true },
      { connectionId: expect.stringMatching(/^goal_invitation:[a-z0-9]+$/), kind: 'goal_invitation', label: 'Walk together', revocable: true },
    ],
    pendingFriendRequests: [{ requestId: 'request-1', counterpartName: 'Ruth' }],
  });
  expect(JSON.stringify(result)).not.toContain('secret-code');
  expect(JSON.stringify(result)).not.toContain('private-avatar');
  expect(JSON.stringify(result)).not.toContain('user-2');
  expect(JSON.stringify(result)).not.toContain('user-3');
});

test('keeps active Goal access connection references opaque', async () => {
  const provider = boundary();
  provider.loadGoalShares = async () => [{
    ...goalInvite,
    accessState: 'active',
    inviteId: null,
  }];

  const result = await createSharingActions(provider).list();

  expect(result.connections[1]).toMatchObject({
    connectionId: expect.stringMatching(/^goal_access:[a-z0-9]+$/),
    kind: 'goal_access',
    revocable: true,
  });
  expect(JSON.stringify(result)).not.toContain('user-2');
  expect(JSON.stringify(result)).not.toContain('goal-1');
});

test('prepares a one-use friend invitation and never claims it was delivered', async () => {
  await expect(createSharingActions(boundary()).prepareInvitation({ expiresInDays: 7 })).resolves.toEqual({
    invitationId: 'draft-1', expiresAt: 'later', maxUses: 1, deliveryStatus: 'share_sheet_closed',
    accessGranted: false,
  });
});

test('revokes the exact reviewed sharing connection and confirms it disappeared', async () => {
  const provider = boundary();
  const actions = createSharingActions(provider);
  const listed = await actions.list();
  const friendship = listed.connections[0];
  await expect(actions.revoke({
    connectionId: friendship.connectionId, expectedFingerprint: friendship.fingerprint,
  })).resolves.toEqual({ connectionId: 'friendship:friendship-1', revoked: true });
  expect(provider.endFriendship).toHaveBeenCalledWith('friendship-1');
});

test('rejects a stale sharing connection without mutating it', async () => {
  const provider = boundary();
  const listed = await createSharingActions(provider).list();
  const invitation = listed.connections[1];
  await expect(createSharingActions(provider).revoke({
    connectionId: invitation.connectionId, expectedFingerprint: 'stale',
  })).rejects.toThrow(SharingConnectionConflictError);
  expect(provider.revokeGoalInvitation).not.toHaveBeenCalled();
});
