/**
 * Goal feed section for shared goals.
 *
 * Displays recent check-ins and member events with reaction support.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { Text, HStack, VStack } from '../../ui/primitives';
import { ProfileAvatar } from '../../ui/ProfileAvatar';
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
  /** Callback to refresh the feed (e.g., after submitting a check-in) */
  refreshKey?: number;
  /** Max height for the feed section (enables internal scrolling) */
  maxHeight?: number;
  /** Whether to show the "Check in" prompt at the top */
  showCheckinPrompt?: boolean;
  onPressCheckin?: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function GoalFeedSection({
  goalId,
  refreshKey = 0,
  maxHeight,
  showCheckinPrompt = false,
  onPressCheckin,
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
      const message = err instanceof Error ? err.message : 'Failed to load feed';
      setError(message);
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
      {showCheckinPrompt && onPressCheckin ? (
        <Pressable style={styles.checkinPrompt} onPress={onPressCheckin}>
          <Icon name="MessageCircle" size={18} color={colors.accent} />
          <Text style={styles.checkinPromptText}>Share how it's going</Text>
        </Pressable>
      ) : null}

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            No activity yet. Check in to let your partner know how it's going!
          </Text>
        </View>
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
              item={item}
              onReaction={handleReaction}
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
  item: FeedItem;
  onReaction: (feedEventId: string, reaction: ReactionType, currentReaction: ReactionType | null) => void;
};

function FeedItemCard({ item, onReaction }: FeedItemCardProps) {
  const timeAgo = formatTimeAgo(new Date(item.createdAt));

  // Render based on event type
  if (item.type === 'checkin_submitted') {
    return (
      <CheckinCard
        item={item}
        timeAgo={timeAgo}
        onReaction={(reaction) =>
          onReaction(item.id, reaction, item.reactions?.myReaction ?? null)
        }
      />
    );
  }

  if (item.type === 'member_joined') {
    return (
      <SystemEventCard
        icon="UserPlus"
        message={`${item.actorName ?? 'Someone'} joined`}
        timeAgo={timeAgo}
      />
    );
  }

  if (item.type === 'member_left') {
    return (
      <SystemEventCard
        icon="UserMinus"
        message={`${item.actorName ?? 'Someone'} left`}
        timeAgo={timeAgo}
      />
    );
  }

  // Fallback for unknown types
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Check-in Card
// ─────────────────────────────────────────────────────────────────────────────

type CheckinCardProps = {
  item: FeedItem;
  timeAgo: string;
  onReaction: (reaction: ReactionType) => void;
};

function CheckinCard({ item, timeAgo, onReaction }: CheckinCardProps) {
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
    alignItems: 'center',
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  feedScroll: {
    flex: 1,
  },
  feedScrollContent: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  checkinPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.accentSubtle,
    borderRadius: 12,
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  checkinPromptText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.medium,
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
    backgroundColor: colors.accentSubtle,
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
});

