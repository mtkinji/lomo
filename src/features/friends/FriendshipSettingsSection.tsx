import { Pressable } from '@/src/ui/HapticPressable';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
  acceptFriendRequest,
  blockFriendship,
  declineFriendRequest,
  type Friend,
  type PendingFriendRequest,
} from '../../services/friendships';
import { sharingActions } from '../account/actions/sharingActionsBoundary';
import { sharingReviewReferenceForFriend } from '../account/actions/sharingActions';
import { useToastStore } from '../../store/useToastStore';
import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { Icon } from '../../ui/Icon';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { HStack, Text, VStack } from '../../ui/primitives';
import { KwiltLoader } from '../../ui/KwiltLoader';

export function FriendshipSettingsSection() {
  const showToast = useToastStore((state) => state.showToast);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<PendingFriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadFailed(false);
    try {
      const next = await sharingActions.loadNativeFriendships();
      setFriends(next.friends);
      setRequests(next.pendingFriendRequests);
    } catch {
      setLoadFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runRelationshipAction = useCallback(async (
    key: string,
    action: () => Promise<boolean>,
    successMessage?: string,
  ) => {
    if (busyKey) return;
    setBusyKey(key);
    try {
      const succeeded = await action();
      if (!succeeded) {
        showToast({ message: 'That relationship could not be changed.', variant: 'danger' });
        return;
      }
      if (successMessage) {
        showToast({ message: successMessage, variant: 'success' });
      }
      await load();
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, load, showToast]);

  const inviteFriend = useCallback(async () => {
    if (busyKey) return;
    setBusyKey('invite');
    try {
      await sharingActions.prepareInvitation({ expiresInDays: 7 });
    } catch (error) {
      if (!(error instanceof Error && error.message.toLowerCase().includes('cancel'))) {
        showToast({ message: 'Couldn’t share the invite right now.', variant: 'danger' });
      }
    } finally {
      setBusyKey(null);
    }
  }, [busyKey, showToast]);

  const manageFriend = useCallback((friend: Friend) => {
    const name = friend.name?.trim() || 'this person';
    Alert.alert(
      `Manage ${name}`,
      'Ending this friendship does not remove separately shared Goals. Block is a safety action that also prevents new targeted invitations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End friendship',
          onPress: () => void runRelationshipAction(
            `end:${friend.id}`,
            async () => {
              await sharingActions.revoke(sharingReviewReferenceForFriend(friend));
              return true;
            },
            'Friendship ended. Separate shares are unchanged.',
          ),
        },
        {
          text: 'Block',
          style: 'destructive',
          onPress: () => void runRelationshipAction(
            `block:${friend.id}`,
            () => blockFriendship(friend.id),
          ),
        },
      ],
    );
  }, [runRelationshipAction]);

  return (
    <VStack space="lg">
      <Card style={styles.boundaryCard}>
        <HStack space="md" alignItems="flex-start">
          <View style={styles.boundaryIcon}>
            <Icon name="users" size={18} color={colors.textPrimary} />
          </View>
          <VStack flex={1} space="xs">
            <Text style={styles.boundaryTitle}>
              Becoming friends does not share anything by itself.
            </Text>
            <Text style={styles.body}>
              Friends make someone easier to choose when you decide to share.
            </Text>
          </VStack>
        </HStack>
      </Card>

      {loading ? (
        <View style={styles.loadingState}>
          <KwiltLoader color={colors.textSecondary} />
          <Text style={styles.body}>Loading sharing relationships…</Text>
        </View>
      ) : loadFailed ? (
        <Card style={styles.card}>
          <VStack space="md">
            <Text style={styles.sectionTitle}>Sharing relationships are unavailable</Text>
            <Text style={styles.body}>Try again when you have a connection.</Text>
            <Button variant="secondary" onPress={() => void load()}>Try again</Button>
          </VStack>
        </Card>
      ) : (
        <>
          {requests.length > 0 ? (
            <VStack space="sm">
              <Text style={styles.sectionLabel}>Friend requests</Text>
              {requests.map((request) => (
                <Card key={request.friendshipId} style={styles.card}>
                  <VStack space="md">
                    <HStack space="md" alignItems="center">
                      <ProfileAvatar
                        name={request.fromUserName ?? undefined}
                        avatarUrl={request.fromUserAvatarUrl}
                        size={44}
                      />
                      <VStack flex={1} space="xs">
                        <Text style={styles.personName}>{request.fromUserName || 'Someone'}</Text>
                        <Text style={styles.body}>Wants to make future sharing easier.</Text>
                      </VStack>
                    </HStack>
                    <Text style={styles.requestBoundary}>
                      Accepting friendship still shares nothing.
                    </Text>
                    <HStack space="sm" justifyContent="flex-end">
                      <Button
                        variant="ghost"
                        disabled={busyKey !== null}
                        onPress={() => void runRelationshipAction(
                          `decline:${request.friendshipId}`,
                          () => declineFriendRequest(request.friendshipId),
                        )}
                      >
                        Decline
                      </Button>
                      <Button
                        disabled={busyKey !== null}
                        onPress={() => void runRelationshipAction(
                          `accept:${request.friendshipId}`,
                          () => acceptFriendRequest(request.friendshipId),
                          'Friend added. Nothing has been shared.',
                        )}
                      >
                        Accept
                      </Button>
                    </HStack>
                  </VStack>
                </Card>
              ))}
            </VStack>
          ) : null}

          <VStack space="sm">
            <HStack alignItems="center" justifyContent="space-between">
              <Text style={styles.sectionLabel}>Friends</Text>
              <Pressable
                accessibilityRole="button"
                disabled={busyKey !== null}
                onPress={() => void inviteFriend()}
                style={({ pressed }) => [styles.inviteAction, pressed && styles.pressed]}
              >
                <Icon name="userPlus" size={16} color={colors.accent} />
                <Text style={styles.inviteActionText}>
                  {busyKey === 'invite' ? 'Preparing…' : 'Invite a friend'}
                </Text>
              </Pressable>
            </HStack>

            {friends.length === 0 ? (
              <Card style={styles.card}>
                <VStack space="xs">
                  <Text style={styles.sectionTitle}>No friends yet</Text>
                  <Text style={styles.body}>
                    Friends make someone easier to choose when you decide to share.
                  </Text>
                </VStack>
              </Card>
            ) : (
              <Card style={styles.friendListCard}>
                {friends.map((friend, index) => {
                  const name = friend.name?.trim() || 'Friend';
                  return (
                    <View key={friend.id}>
                      {index > 0 ? <View style={styles.divider} /> : null}
                      <HStack space="md" alignItems="center" style={styles.friendRow}>
                        <ProfileAvatar name={name} avatarUrl={friend.avatarUrl} size={42} />
                        <VStack flex={1} space="xs">
                          <Text style={styles.personName}>{name}</Text>
                          <Text style={styles.body}>Nothing shared by friendship</Text>
                        </VStack>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`Manage friendship with ${name}`}
                          disabled={busyKey !== null}
                          hitSlop={8}
                          onPress={() => manageFriend(friend)}
                          style={({ pressed }) => [styles.manageButton, pressed && styles.pressed]}
                        >
                          <Icon name="more" size={19} color={colors.textSecondary} />
                        </Pressable>
                      </HStack>
                    </View>
                  );
                })}
              </Card>
            )}
          </VStack>
        </>
      )}
    </VStack>
  );
}

const styles = StyleSheet.create({
  boundaryCard: {
    padding: spacing.lg,
    backgroundColor: colors.shellAlt,
  },
  boundaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
    borderWidth: 1,
    borderColor: colors.border,
  },
  boundaryTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.semibold,
  },
  sectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontFamily: fonts.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  personName: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  body: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  requestBoundary: {
    ...typography.bodySm,
    color: colors.textPrimary,
    backgroundColor: colors.shellAlt,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  card: {
    padding: spacing.lg,
  },
  loadingState: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.sm,
  },
  inviteAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingLeft: spacing.sm,
  },
  inviteActionText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.semibold,
  },
  friendListCard: {
    padding: 0,
    overflow: 'hidden',
  },
  friendRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: 70,
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.58,
  },
});
