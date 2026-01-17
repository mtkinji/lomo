/**
 * Friends list screen.
 *
 * Shows the user's friends, pending requests, and provides ability to
 * add new friends via invite link.
 *
 * @see docs/prds/social-dynamics-evolution-prd.md (Phase 3)
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Pressable,
  Share,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, VStack, HStack } from '../../ui/primitives';
import { AppShell } from '../../ui/layout/AppShell';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { colors, spacing, typography, fonts, cardSurfaceStyle } from '../../theme';
import { HapticsService } from '../../services/HapticsService';
import { useToastStore } from '../../store/useToastStore';
import {
  listFriends,
  getPendingFriendRequests,
  acceptFriendRequest,
  declineOrBlockFriend,
  createFriendInvite,
  buildFriendInviteUrl,
  type Friend,
  type PendingFriendRequest,
} from '../../services/friendships';
import { useAnalytics } from '../../services/analytics/useAnalytics';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type FriendsScreenProps = {};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function FriendsScreen({}: FriendsScreenProps) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { capture } = useAnalytics();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingFriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);

  const loadData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [friendsResult, requestsResult] = await Promise.all([
        listFriends(),
        getPendingFriendRequests(),
      ]);
      setFriends(friendsResult);
      setPendingRequests(requestsResult);
    } catch (err) {
      console.error('[FriendsScreen] Failed to load data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    void loadData(true);
  }, [loadData]);

  const handleAddFriend = useCallback(async () => {
    void HapticsService.trigger('canvas.selection');
    setIsCreatingInvite(true);

    try {
      const invite = await createFriendInvite();
      if (!invite) {
        useToastStore.getState().showToast({
          message: 'Failed to create invite link',
          variant: 'danger',
        });
        return;
      }

      const url = buildFriendInviteUrl(invite.code);

      await Share.share({
        message: `Add me as a friend on Kwilt! ${url}`,
        url,
      });

      capture('friend_invite_shared', { inviteId: invite.id });
    } catch (err) {
      // User cancelled share - not an error
      if ((err as Error)?.message?.includes('cancel')) return;
      console.error('[FriendsScreen] Failed to share invite:', err);
    } finally {
      setIsCreatingInvite(false);
    }
  }, [capture]);

  const handleAcceptRequest = useCallback(
    async (request: PendingFriendRequest) => {
      void HapticsService.trigger('canvas.selection');

      const success = await acceptFriendRequest(request.friendshipId);
      if (success) {
        void HapticsService.trigger('outcome.success');
        useToastStore.getState().showToast({
          message: `You're now friends with ${request.fromUserName || 'this user'}!`,
          variant: 'success',
        });
        void loadData();
        capture('friend_request_accepted', { friendshipId: request.friendshipId });
      } else {
        useToastStore.getState().showToast({
          message: 'Failed to accept request',
          variant: 'danger',
        });
      }
    },
    [loadData, capture]
  );

  const handleDeclineRequest = useCallback(
    async (request: PendingFriendRequest) => {
      void HapticsService.trigger('canvas.selection');

      const success = await declineOrBlockFriend(request.friendshipId);
      if (success) {
        void loadData();
        capture('friend_request_declined', { friendshipId: request.friendshipId });
      }
    },
    [loadData, capture]
  );

  const renderFriendItem = useCallback(
    ({ item }: { item: Friend }) => (
      <View style={styles.friendCard}>
        <HStack space="md" style={styles.friendCardContent}>
          <ProfileAvatar
            avatarUrl={item.avatarUrl}
            name={item.name ?? undefined}
            size={48}
          />
          <VStack space="xs" style={styles.friendInfo}>
            <Text style={styles.friendName}>{item.name || 'Friend'}</Text>
            <Text style={styles.friendStatus}>
              {item.status === 'active' ? 'Friends' : 'Pending'}
            </Text>
          </VStack>
        </HStack>
      </View>
    ),
    []
  );

  const renderPendingRequest = useCallback(
    ({ item }: { item: PendingFriendRequest }) => (
      <View style={styles.requestCard}>
        <HStack space="md" style={styles.requestCardContent}>
          <ProfileAvatar
            avatarUrl={item.fromUserAvatarUrl}
            name={item.fromUserName ?? undefined}
            size={48}
          />
          <VStack space="xs" style={styles.requestInfo}>
            <Text style={styles.requestName}>{item.fromUserName || 'Someone'}</Text>
            <Text style={styles.requestSubtext}>wants to be friends</Text>
          </VStack>
          <HStack space="sm">
            <Pressable
              style={styles.declineButton}
              onPress={() => handleDeclineRequest(item)}
            >
              <Icon name="close" size={20} color={colors.textSecondary} />
            </Pressable>
            <Pressable
              style={styles.acceptButton}
              onPress={() => handleAcceptRequest(item)}
            >
              <Icon name="check" size={20} color={colors.canvas} />
            </Pressable>
          </HStack>
        </HStack>
      </View>
    ),
    [handleAcceptRequest, handleDeclineRequest]
  );

  const ListHeader = useCallback(
    () => (
      <View>
        {/* Add Friend Button */}
        <View style={styles.addFriendSection}>
          <Button
            variant="primary"
            fullWidth
            onPress={handleAddFriend}
            disabled={isCreatingInvite}
          >
            <HStack space="sm" style={styles.addFriendContent}>
              <Icon name="userPlus" size={20} color={colors.canvas} />
              <Text style={styles.addFriendText}>
                {isCreatingInvite ? 'Creating link...' : 'Add Friend'}
              </Text>
            </HStack>
          </Button>
        </View>

        {/* Pending Requests */}
        {pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Friend Requests ({pendingRequests.length})
            </Text>
            {pendingRequests.map((request) => (
              <View key={request.friendshipId}>
                {renderPendingRequest({ item: request })}
              </View>
            ))}
          </View>
        )}

        {/* Friends Section Header */}
        {friends.length > 0 && (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Friends ({friends.length})
            </Text>
          </View>
        )}
      </View>
    ),
    [
      handleAddFriend,
      isCreatingInvite,
      pendingRequests,
      friends.length,
      renderPendingRequest,
    ]
  );

  const ListEmpty = useCallback(
    () => (
      <View style={styles.emptyState}>
        <Icon name="Users" size={48} color={colors.textSecondary} />
        <Text style={styles.emptyTitle}>No friends yet</Text>
        <Text style={styles.emptySubtext}>
          Share an invite link to add friends who can cheer your milestones!
        </Text>
      </View>
    ),
    []
  );

  return (
    <AppShell>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <Icon name="ChevronLeft" size={24} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Friends</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={friends}
            renderItem={renderFriendItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={ListHeader}
            ListEmptyComponent={pendingRequests.length === 0 ? ListEmpty : null}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.accent}
              />
            }
          />
        )}
      </View>
    </AppShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.shell,
  },
  backButton: {
    padding: spacing.xs,
    marginLeft: -spacing.xs,
  },
  headerTitle: {
    ...typography.titleMd,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: spacing.lg,
    paddingBottom: 100,
  },
  addFriendSection: {
    marginBottom: spacing.lg,
  },
  addFriendContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendText: {
    ...typography.body,
    color: colors.canvas,
    fontFamily: fonts.medium,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    ...typography.titleSm,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  friendCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    borderRadius: 12,
  },
  friendCardContent: {
    alignItems: 'center',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  friendStatus: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  requestCard: {
    ...cardSurfaceStyle,
    padding: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.sm,
  },
  requestCardContent: {
    alignItems: 'center',
  },
  requestInfo: {
    flex: 1,
  },
  requestName: {
    ...typography.body,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  requestSubtext: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.shell,
    justifyContent: 'center',
    alignItems: 'center',
  },
  separator: {
    height: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptySubtext: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
});

export default FriendsScreen;

