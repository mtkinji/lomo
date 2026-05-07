/**
 * Goal feed section for shared goals.
 *
 * Displays recent check-ins and member events with reaction support.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator, RefreshControl, ScrollView, TextInput } from 'react-native';
import { Text, HStack, VStack } from '../../ui/primitives';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
import { EmptyState } from '../../ui/EmptyState';
import { colors, spacing, typography, fonts, cardSurfaceStyle } from '../../theme';
import {
  fetchGoalFeed,
  subscribeToGoalFeed,
  type FeedItem,
  type GoalFeedResult,
} from '../../services/goalFeed';
import {
  addReaction,
  removeReaction,
  REACTION_TYPES,
  type ReactionType,
  type ReactionSummary,
} from '../../services/reactions';
import { getPresetLabel, type CheckinPreset } from '../../services/checkins';
import { submitCheckinReply } from '../../services/checkinReplies';
import { HapticsService } from '../../services/HapticsService';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';
import { Icon } from '../../ui/Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Simple relative time helper (avoids date-fns dependency)
// ─────────────────────────────────────────────────────────────────────────────

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  // Fall back to short date
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type GoalFeedSectionProps = {
  goalId: string;
  /** Callback to refresh the feed (e.g., after activity completion signals) */
  refreshKey?: number;
  /** Max height for the feed section (enables internal scrolling) */
  maxHeight?: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GoalFeedSection({
  goalId,
  refreshKey = 0,
  maxHeight,
}: GoalFeedSectionProps) {
  const { capture } = useAnalytics();
  const [feedResult, setFeedResult] = useState<GoalFeedResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFeed = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const result = await fetchGoalFeed({ goalId, limit: 20 });
      setFeedResult(result);
      capture(AnalyticsEvent.SharedGoalFeedViewed, {
        goalId,
        itemCount: result.items.length,
      });
    } catch (err) {
      // Show a user-friendly error, not the raw technical message
      console.warn('[GoalFeedSection] Feed load error:', err);
      setError('Unable to load to-do. Check your connection and try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [goalId, capture]);

  // Initial load + refresh on key change
  useEffect(() => {
    loadFeed();
  }, [loadFeed, refreshKey]);

  // Subscribe to realtime updates
  useEffect(() => {
    const unsubscribe = subscribeToGoalFeed(goalId, () => {
      // Reload feed on any change
      loadFeed();
    });

    return () => {
      unsubscribe();
    };
  }, [goalId, loadFeed]);

  const handleReaction = useCallback(
    async (feedEventId: string, reaction: ReactionType, currentReaction: ReactionType | null) => {
      HapticsService.trigger('canvas.selection');

      try {
        if (currentReaction === reaction) {
          // Toggle off
          await removeReaction({ goalId, feedEventId });
          capture(AnalyticsEvent.SharedGoalReactionRemoved, { goalId, feedEventId, reaction });
        } else {
          // Add/change reaction
          await addReaction({ goalId, feedEventId, reaction });
          capture(AnalyticsEvent.SharedGoalReactionAdded, { goalId, feedEventId, reaction });
        }

        // Reload feed to get updated counts
        loadFeed();
      } catch (err) {
        console.warn('[GoalFeedSection] Reaction failed:', err);
      }
    },
    [goalId, capture, loadFeed]
  );

  if (isLoading && !feedResult) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  if (error && !feedResult) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable onPress={() => loadFeed()}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </Pressable>
      </View>
    );
  }

  const items = feedResult?.items ?? [];

  return (
    <View style={[styles.container, maxHeight ? { maxHeight } : undefined]}>
      {items.length === 0 ? (
        <EmptyState
          title="Send the first update"
          instructions="Check-ins and cheers will show up here once you or a partner shares progress."
          variant="compact"
          iconName="activity"
          style={styles.emptyContainer}
        />
      ) : (
        <ScrollView
          style={styles.feedScroll}
          contentContainerStyle={styles.feedScrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => loadFeed(true)} />
          }
        >
          {items.map((item) => (
            <FeedItemCard
              key={item.id}
              goalId={goalId}
              item={item}
              onReaction={handleReaction}
              onReplySubmitted={() => loadFeed(true)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Feed Item Card
// ─────────────────────────────────────────────────────────────────────────────

type FeedItemCardProps = {
  goalId: string;
  item: FeedItem;
  onReaction: (feedEventId: string, reaction: ReactionType, currentReaction: ReactionType | null) => void;
  onReplySubmitted: () => void;
};

function FeedItemCard({ goalId, item, onReaction, onReplySubmitted }: FeedItemCardProps) {
  const timeAgo = formatTimeAgo(new Date(item.createdAt));

  // Render based on event type
  if (item.type === 'checkin_submitted') {
    return (
      <CheckinCard
        goalId={goalId}
        item={item}
        timeAgo={timeAgo}
        onReaction={(reaction) =>
          onReaction(item.id, reaction, item.reactions?.myReaction ?? null)
        }
        onReplySubmitted={onReplySubmitted}
      />
    );
  }

  if (item.type === 'member_joined') {
    return (
      <SystemEventCard
        icon="userPlus"
        message={`${item.actorName ?? 'Someone'} joined`}
        timeAgo={timeAgo}
      />
    );
  }

  if (item.type === 'member_left') {
    return (
      <SystemEventCard
        icon="userMinus"
        message={`${item.actorName ?? 'Someone'} left`}
        timeAgo={timeAgo}
      />
    );
  }

  if (item.type === 'progress_made') {
    return (
      <ProgressCard
        item={item}
        timeAgo={timeAgo}
        onReaction={(reaction) =>
          onReaction(item.id, reaction, item.reactions?.myReaction ?? null)
        }
      />
    );
  }

  if (item.type === 'goal_completed') {
    return (
      <GoalCompletedCard
        item={item}
        timeAgo={timeAgo}
        onReaction={(reaction) =>
          onReaction(item.id, reaction, item.reactions?.myReaction ?? null)
        }
      />
    );
  }

  if (item.type === 'checkin_reply') {
    return <ReplyCard item={item} timeAgo={timeAgo} />;
  }

  // Fallback for unknown types
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check-in Card
// ─────────────────────────────────────────────────────────────────────────────

type CheckinCardProps = {
  goalId: string;
  item: FeedItem;
  timeAgo: string;
  onReaction: (reaction: ReactionType) => void;
  onReplySubmitted: () => void;
};

function CheckinCard({ goalId, item, timeAgo, onReaction, onReplySubmitted }: CheckinCardProps) {
  const { capture } = useAnalytics();
  const [replyVisible, setReplyVisible] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyBusy, setReplyBusy] = useState(false);
  const payload = item.payload as {
    preset?: CheckinPreset | null;
    text?: string | null;
  };
  const presetLabel = getPresetLabel(payload.preset ?? null);
  const reactions = item.reactions;

  return (
    <View style={styles.checkinCard}>
      <HStack space="sm" alignItems="flex-start">
        <ProfileAvatar
          name={item.actorName ?? undefined}
          avatarUrl={item.actorAvatarUrl ?? undefined}
          size={36}
          borderRadius={18}
        />
        <VStack flex={1} space="xs">
          <HStack space="xs" alignItems="center">
            <Text style={styles.checkinActorName}>
              {item.actorName ?? 'Someone'}
            </Text>
            <Text style={styles.checkinTime}>{timeAgo}</Text>
          </HStack>

          {presetLabel ? (
            <Text style={styles.checkinPreset}>{presetLabel}</Text>
          ) : null}

          {payload.text ? (
            <Text style={styles.checkinText}>{payload.text}</Text>
          ) : null}

          {/* Reactions row */}
          <ReactionBar
            reactions={reactions}
            onReaction={onReaction}
          />
          {replyVisible ? (
            <VStack space="xs" style={styles.replyComposer}>
              <TextInput
                value={replyText}
                onChangeText={setReplyText}
                placeholder="Write a quick reply"
                placeholderTextColor={colors.textSecondary}
                style={styles.replyInput}
                maxLength={160}
                editable={!replyBusy}
              />
              <HStack space="xs" justifyContent="flex-end">
                <Pressable
                  onPress={() => {
                    setReplyVisible(false);
                    setReplyText('');
                  }}
                  disabled={replyBusy}
                  style={styles.replyAction}
                >
                  <Text style={styles.replyActionText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    const text = replyText.trim();
                    if (!text || replyBusy) return;
                    setReplyBusy(true);
                    try {
                      await submitCheckinReply({ goalId, targetEventId: item.id, text });
                      capture(AnalyticsEvent.SharedGoalReplyCreated, { goalId, targetEventId: item.id });
                      setReplyText('');
                      setReplyVisible(false);
                      onReplySubmitted();
                    } catch (err) {
                      const message = err instanceof Error ? err.message : 'Failed to send reply';
                      capture(AnalyticsEvent.SharedGoalReplyFailed, { goalId, targetEventId: item.id, error: message });
                    } finally {
                      setReplyBusy(false);
                    }
                  }}
                  disabled={replyBusy || !replyText.trim()}
                  style={[styles.replyAction, styles.replySendAction]}
                >
                  <Text style={styles.replySendText}>{replyBusy ? 'Sending…' : 'Send'}</Text>
                </Pressable>
              </HStack>
            </VStack>
          ) : (
            <Pressable
              onPress={() => setReplyVisible(true)}
              style={styles.replyLink}
              accessibilityRole="button"
              accessibilityLabel="Reply to check-in"
            >
              <Text style={styles.replyLinkText}>Reply</Text>
            </Pressable>
          )}
        </VStack>
      </HStack>
    </View>
  );
}

function ReplyCard({ item, timeAgo }: { item: FeedItem; timeAgo: string }) {
  const payload = item.payload as { text?: string | null };
  return (
    <View style={styles.replyCard}>
      <HStack space="sm" alignItems="flex-start">
        <ProfileAvatar
          name={item.actorName ?? undefined}
          avatarUrl={item.actorAvatarUrl ?? undefined}
          size={28}
          borderRadius={14}
        />
        <VStack flex={1} space="xs">
          <HStack space="xs" alignItems="center">
            <Text style={styles.checkinActorName}>{item.actorName ?? 'Someone'}</Text>
            <Text style={styles.checkinTime}>{timeAgo}</Text>
          </HStack>
          <Text style={styles.checkinText}>{payload.text ?? 'Replied'}</Text>
        </VStack>
      </HStack>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Progress Card (activity completed)
// ─────────────────────────────────────────────────────────────────────────────

type ProgressCardProps = {
  item: FeedItem;
  timeAgo: string;
  onReaction: (reaction: ReactionType) => void;
};

function ProgressCard({ item, timeAgo, onReaction }: ProgressCardProps) {
  const reactions = item.reactions;

  return (
    <View style={styles.progressCard}>
      <HStack space="sm" alignItems="flex-start">
        <ProfileAvatar
          name={item.actorName ?? undefined}
          avatarUrl={item.actorAvatarUrl ?? undefined}
          size={36}
          borderRadius={18}
        />
        <VStack flex={1} space="xs">
          <HStack space="xs" alignItems="center">
            <Text style={styles.progressActorName}>
              {item.actorName ?? 'Someone'}
            </Text>
            <Text style={styles.progressTime}>{timeAgo}</Text>
          </HStack>

          <HStack space="xs" alignItems="center">
            <Icon name="check" size={14} color={colors.success} />
            <Text style={styles.progressText}>Made progress</Text>
          </HStack>

          {/* Reactions row */}
          <ReactionBar reactions={reactions} onReaction={onReaction} />
        </VStack>
      </HStack>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Goal Completed Card
// ─────────────────────────────────────────────────────────────────────────────

type GoalCompletedCardProps = {
  item: FeedItem;
  timeAgo: string;
  onReaction: (reaction: ReactionType) => void;
};

function GoalCompletedCard({ item, timeAgo, onReaction }: GoalCompletedCardProps) {
  const reactions = item.reactions;

  return (
    <View style={styles.goalCompletedCard}>
      <HStack space="sm" alignItems="flex-start">
        <ProfileAvatar
          name={item.actorName ?? undefined}
          avatarUrl={item.actorAvatarUrl ?? undefined}
          size={36}
          borderRadius={18}
        />
        <VStack flex={1} space="xs">
          <HStack space="xs" alignItems="center">
            <Text style={styles.goalCompletedActorName}>
              {item.actorName ?? 'Someone'}
            </Text>
            <Text style={styles.goalCompletedTime}>{timeAgo}</Text>
          </HStack>

          <HStack space="xs" alignItems="center">
            <Text style={styles.goalCompletedEmoji}>🎉</Text>
            <Text style={styles.goalCompletedText}>Completed this goal!</Text>
          </HStack>

          {/* Reactions row */}
          <ReactionBar reactions={reactions} onReaction={onReaction} />
        </VStack>
      </HStack>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reaction Bar
// ─────────────────────────────────────────────────────────────────────────────

type ReactionBarProps = {
  reactions?: ReactionSummary;
  onReaction: (reaction: ReactionType) => void;
};

function ReactionBar({ reactions, onReaction }: ReactionBarProps) {
  const myReaction = reactions?.myReaction ?? null;
  const total = reactions?.total ?? 0;

  return (
    <HStack space="xs" style={styles.reactionBar}>
      {REACTION_TYPES.map((reactionType) => {
        const count = reactions?.counts[reactionType.id] ?? 0;
        const isSelected = myReaction === reactionType.id;

        return (
          <Pressable
            key={reactionType.id}
            style={[
              styles.reactionButton,
              isSelected && styles.reactionButtonSelected,
              count > 0 && styles.reactionButtonWithCount,
            ]}
            onPress={() => onReaction(reactionType.id)}
          >
            <Text style={styles.reactionEmoji}>{reactionType.emoji}</Text>
            {count > 0 ? (
              <Text
                style={[
                  styles.reactionCount,
                  isSelected && styles.reactionCountSelected,
                ]}
              >
                {count}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </HStack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// System Event Card
// ─────────────────────────────────────────────────────────────────────────────

type SystemEventCardProps = {
  icon: string;
  message: string;
  timeAgo: string;
};

function SystemEventCard({ icon, message, timeAgo }: SystemEventCardProps) {
  return (
    <HStack space="sm" style={styles.systemEventCard} alignItems="center">
      <Icon name={icon as any} size={16} color={colors.textSecondary} />
      <Text style={styles.systemEventText}>{message}</Text>
      <Text style={styles.systemEventTime}>{timeAgo}</Text>
    </HStack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.destructive,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  retryText: {
    ...typography.bodySm,
    color: colors.accent,
  },
  emptyContainer: {
    padding: spacing.xl,
    paddingTop: spacing.md,
    alignItems: 'center',
  },
  feedScroll: {
    flex: 1,
  },
  feedScrollContent: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  checkinCard: {
    ...cardSurfaceStyle,
    borderRadius: 12,
    padding: spacing.sm,
  },
  checkinActorName: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  checkinTime: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontSize: 12,
  },
  checkinPreset: {
    ...typography.body,
    color: colors.textPrimary,
  },
  checkinText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  replyComposer: {
    marginTop: spacing.xs,
  },
  replyInput: {
    ...typography.bodySm,
    color: colors.textPrimary,
    backgroundColor: colors.shell,
    borderRadius: 10,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  replyAction: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  replySendAction: {
    backgroundColor: colors.accent,
  },
  replyActionText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontFamily: fonts.medium,
  },
  replySendText: {
    ...typography.bodySm,
    color: colors.canvas,
    fontFamily: fonts.medium,
  },
  replyLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  replyLinkText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.medium,
  },
  replyCard: {
    ...cardSurfaceStyle,
    borderRadius: 12,
    padding: spacing.sm,
    marginLeft: spacing.lg,
  },
  reactionBar: {
    marginTop: spacing.xs,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: 'transparent',
  },
  reactionButtonSelected: {
    backgroundColor: colors.pine100,
  },
  reactionButtonWithCount: {
    backgroundColor: colors.shell,
  },
  reactionEmoji: {
    fontSize: 16,
  },
  reactionCount: {
    ...typography.bodySm,
    color: colors.textSecondary,
    marginLeft: 2,
    fontSize: 12,
  },
  reactionCountSelected: {
    color: colors.accent,
  },
  systemEventCard: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  systemEventText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    flex: 1,
  },
  systemEventTime: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontSize: 12,
  },
  progressCard: {
    ...cardSurfaceStyle,
    borderRadius: 12,
    padding: spacing.sm,
  },
  progressActorName: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  progressTime: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontSize: 12,
  },
  progressText: {
    ...typography.bodySm,
    color: colors.success,
    fontFamily: fonts.medium,
  },
  goalCompletedCard: {
    ...cardSurfaceStyle,
    borderRadius: 12,
    padding: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  goalCompletedActorName: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
  goalCompletedTime: {
    ...typography.bodySm,
    color: colors.textSecondary,
    fontSize: 12,
  },
  goalCompletedEmoji: {
    fontSize: 16,
  },
  goalCompletedText: {
    ...typography.bodySm,
    color: colors.textPrimary,
    fontFamily: fonts.medium,
  },
});

