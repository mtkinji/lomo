/**
 * Partner progress guide - celebrates when a partner makes progress on a shared goal.
 *
 * Shows as a bottom guide with:
 * - Partner's avatar and name
 * - Progress message (made progress / completed goal)
 * - Quick reaction buttons to cheer them on
 */

import React, { useCallback } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { Portal } from '@rn-primitives/portal';
import { BottomGuide } from './BottomGuide';
import { Text, Heading, HStack, VStack } from './primitives';
import { ProfileAvatar } from './ProfileAvatar';
import { Button } from './Button';
import { colors, spacing, typography, fonts } from '../theme';
import { usePartnerProgressStore } from '../store/usePartnerProgressStore';
import { addReaction, REACTION_TYPES, type ReactionType } from '../services/reactions';
import { HapticsService } from '../services/HapticsService';
import { useAnalytics } from '../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../services/analytics/events';

/**
 * Host component for the partner progress guide.
 * Mount this once at the app root level.
 */
export function PartnerProgressGuideHost() {
  const { capture } = useAnalytics();
  const pendingEvent = usePartnerProgressStore((s) => s.pendingEvent);
  const guideVisible = usePartnerProgressStore((s) => s.guideVisible);
  const dismiss = usePartnerProgressStore((s) => s.dismiss);

  const handleReaction = useCallback(
    async (reaction: ReactionType) => {
      if (!pendingEvent) return;

      HapticsService.trigger('outcome.bigSuccess');

      try {
        await addReaction({
          goalId: pendingEvent.goalId,
          feedEventId: pendingEvent.id,
          reaction,
        });

        capture(AnalyticsEvent.SharedGoalReactionAdded, {
          goalId: pendingEvent.goalId,
          feedEventId: pendingEvent.id,
          reaction,
          source: 'partner_progress_guide',
        });
      } catch (err) {
        console.warn('[PartnerProgressGuide] Reaction failed:', err);
      }

      dismiss();
    },
    [pendingEvent, dismiss, capture]
  );

  const handleDismiss = useCallback(() => {
    HapticsService.trigger('canvas.selection');
    dismiss();
  }, [dismiss]);

  if (!pendingEvent) {
    return null;
  }

  const isGoalCompleted = pendingEvent.type === 'goal_completed';
  const headline = isGoalCompleted
    ? `${pendingEvent.partnerName} completed a goal! 🎉`
    : `${pendingEvent.partnerName} made progress`;
  const subheadline = isGoalCompleted
    ? `They finished "${pendingEvent.goalTitle}"`
    : `On "${pendingEvent.goalTitle}"`;

  return (
    <Portal name="partner-progress-guide">
      <BottomGuide
        visible={guideVisible}
        onClose={handleDismiss}
        scrim="light"
        guideColor={colors.turmeric500}
        dynamicSizing
      >
        <VStack space="md" style={styles.content}>
          {/* Header with avatar */}
          <HStack space="md" alignItems="center">
            <ProfileAvatar
              name={pendingEvent.partnerName}
              avatarUrl={pendingEvent.partnerAvatarUrl ?? undefined}
              size={48}
              borderRadius={24}
            />
            <VStack space="xs" flex={1}>
              <Text style={styles.headline}>{headline}</Text>
              <Text style={styles.subheadline} numberOfLines={1}>
                {subheadline}
              </Text>
            </VStack>
          </HStack>

          {/* Reaction buttons */}
          <VStack space="sm">
            <Text style={styles.reactLabel}>Cheer them on</Text>
            <HStack space="sm" style={styles.reactionRow}>
              {REACTION_TYPES.map((reactionType) => (
                <Pressable
                  key={reactionType.id}
                  style={styles.reactionButton}
                  onPress={() => handleReaction(reactionType.id)}
                  accessibilityLabel={`React with ${reactionType.label}`}
                >
                  <Text style={styles.reactionEmoji}>{reactionType.emoji}</Text>
                </Pressable>
              ))}
            </HStack>
          </VStack>

          {/* Dismiss button */}
          <Button variant="ghost" size="sm" onPress={handleDismiss}>
            <Text style={styles.dismissText}>Maybe later</Text>
          </Button>
        </VStack>
      </BottomGuide>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing.md,
  },
  headline: {
    ...typography.body,
    fontFamily: fonts.semibold,
    color: colors.textPrimary,
  },
  subheadline: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  reactLabel: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  reactionRow: {
    justifyContent: 'center',
  },
  reactionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.shell,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionEmoji: {
    fontSize: 28,
  },
  dismissText: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
});

