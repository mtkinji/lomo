/**
 * Shared goal activity drawer.
 *
 * A bottom drawer that shows the feed and check-in composer for shared goals.
 * This is the primary surface for signals-only social engagement.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, VStack } from '../../ui/primitives';
import { BottomDrawer } from '../../ui/BottomDrawer';
import { colors, spacing, typography, fonts } from '../../theme';
import { CheckinComposer } from './CheckinComposer';
import { GoalFeedSection } from './GoalFeedSection';
import { Icon } from '../../ui/Icon';
import { Button } from '../../ui/Button';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SharedGoalActivityDrawerProps = {
  visible: boolean;
  onClose: () => void;
  goalId: string;
  goalTitle?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SharedGoalActivityDrawer({
  visible,
  onClose,
  goalId,
  goalTitle,
}: SharedGoalActivityDrawerProps) {
  const [isComposerVisible, setIsComposerVisible] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);

  const handleCheckinSubmitted = useCallback(() => {
    setIsComposerVisible(false);
    // Trigger feed refresh
    setFeedRefreshKey((k) => k + 1);
  }, []);

  const handleOpenComposer = useCallback(() => {
    setIsComposerVisible(true);
  }, []);

  const handleCloseComposer = useCallback(() => {
    setIsComposerVisible(false);
  }, []);

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['75%']}
      scrimToken="pineSubtle"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <VStack space="xs">
            <Text style={styles.title}>Activity</Text>
            {goalTitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {goalTitle}
              </Text>
            ) : null}
          </VStack>
        </View>

        {/* Check-in composer (collapsible) */}
        {isComposerVisible ? (
          <View style={styles.composerSection}>
            <CheckinComposer
              goalId={goalId}
              onCheckinSubmitted={handleCheckinSubmitted}
              onDismiss={handleCloseComposer}
              compact
            />
          </View>
        ) : (
          <View style={styles.checkinPromptRow}>
            <Button
              variant="secondary"
              size="compact"
              onPress={handleOpenComposer}
              style={styles.checkinButton}
            >
              <Icon name="MessageCircle" size={16} color={colors.accent} />
              <Text style={styles.checkinButtonText}>Check in</Text>
            </Button>
          </View>
        )}

        {/* Feed */}
        <View style={styles.feedSection}>
          <GoalFeedSection
            goalId={goalId}
            refreshKey={feedRefreshKey}
            showCheckinPrompt={false}
          />
        </View>
      </View>
    </BottomDrawer>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  header: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  composerSection: {
    marginBottom: spacing.md,
  },
  checkinPromptRow: {
    marginBottom: spacing.md,
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  checkinButtonText: {
    ...typography.bodySm,
    color: colors.accent,
    fontFamily: fonts.medium,
  },
  feedSection: {
    flex: 1,
  },
});


