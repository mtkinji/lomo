/**
 * Check-in nudge prompt.
 *
 * A lightweight, dismissable inline prompt that encourages users to check in
 * on shared goals. Supports quick one-tap check-ins via preset chips.
 *
 * This is designed for contextual surfaces (e.g., goal detail canvas,
 * post-activity completion) rather than as a full composer.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View, Pressable, Animated } from 'react-native';
import { Text, HStack } from './primitives';
import { colors, spacing, typography, fonts, cardSurfaceStyle } from '../theme';
import { submitCheckin, CHECKIN_PRESETS, type CheckinPreset } from '../services/checkins';
import { HapticsService } from '../services/HapticsService';
import { useAnalytics } from '../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../services/analytics/events';
import { useCheckinNudgeStore } from '../store/useCheckinNudgeStore';
import { Icon } from './Icon';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CheckinNudgePromptProps = {
  goalId: string;
  /** Headline text (e.g., "How's it going?") */
  headline?: string;
  /** Subheadline text (e.g., "Let your team know") */
  subheadline?: string;
  /** Called after a successful check-in */
  onCheckinSubmitted?: () => void;
  /** Called when user dismisses the prompt */
  onDismiss?: () => void;
  /** Analytics context for tracking */
  source?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CheckinNudgePrompt({
  goalId,
  headline = "How's it going?",
  subheadline = 'Let your team know',
  onCheckinSubmitted,
  onDismiss,
  source = 'nudge_prompt',
}: CheckinNudgePromptProps) {
  const { capture } = useAnalytics();
  const recordCheckin = useCheckinNudgeStore((s) => s.recordCheckin);
  const dismissNudge = useCheckinNudgeStore((s) => s.dismissNudge);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedPreset, setSubmittedPreset] = useState<CheckinPreset | null>(null);

  const handlePresetPress = useCallback(
    async (preset: CheckinPreset) => {
      if (isSubmitting) return;

      void HapticsService.trigger('canvas.selection');
      setIsSubmitting(true);
      setSubmittedPreset(preset);

      try {
        await submitCheckin({
          goalId,
          preset,
          text: null,
        });

        capture(AnalyticsEvent.SharedGoalCheckinCreated, {
          goalId,
          hasPreset: true,
          preset,
          hasText: false,
          source,
        });

        recordCheckin(goalId);
        void HapticsService.trigger('outcome.success');

        // Brief delay to show success state before dismissing
        setTimeout(() => {
          onCheckinSubmitted?.();
        }, 600);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to check in';
        capture(AnalyticsEvent.SharedGoalCheckinFailed, {
          goalId,
          error: message,
          source,
        });
        setIsSubmitting(false);
        setSubmittedPreset(null);
      }
    },
    [goalId, isSubmitting, capture, recordCheckin, onCheckinSubmitted, source]
  );

  const handleDismiss = useCallback(() => {
    void HapticsService.trigger('canvas.selection');
    dismissNudge(goalId);
    onDismiss?.();
  }, [goalId, dismissNudge, onDismiss]);

  return (
    <View style={styles.container}>
      {/* Header row with dismiss button */}
      <HStack style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subheadline}>{subheadline}</Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          hitSlop={12}
          style={styles.dismissButton}
          accessibilityLabel="Dismiss"
        >
          <Icon name="close" size={18} color={colors.textSecondary} />
        </Pressable>
      </HStack>

      {/* Quick preset chips */}
      <View style={styles.presetsRow}>
        {CHECKIN_PRESETS.map((preset) => {
          const isSelected = submittedPreset === preset.id;
          const isDisabled = isSubmitting && !isSelected;
          return (
            <Pressable
              key={preset.id}
              style={[
                styles.presetChip,
                isSelected && styles.presetChipSelected,
                isDisabled && styles.presetChipDisabled,
              ]}
              onPress={() => handlePresetPress(preset.id)}
              disabled={isSubmitting}
            >
              <Text style={styles.presetEmoji}>{preset.emoji}</Text>
              <Text
                style={[
                  styles.presetLabel,
                  isSelected && styles.presetLabelSelected,
                  isDisabled && styles.presetLabelDisabled,
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    ...cardSurfaceStyle,
    borderRadius: 16,
  },
  header: {
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  headline: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  subheadline: {
    ...typography.bodySm,
    color: colors.textSecondary,
  },
  dismissButton: {
    padding: spacing.xs,
    marginRight: -spacing.xs,
    marginTop: -spacing.xs,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 999,
    backgroundColor: colors.shell,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  presetChipSelected: {
    backgroundColor: colors.pine100,
    borderColor: colors.accent,
  },
  presetChipDisabled: {
    opacity: 0.5,
  },
  presetEmoji: {
    fontSize: 14,
    marginRight: spacing.xs,
  },
  presetLabel: {
    ...typography.bodySm,
    fontSize: 13,
    color: colors.textPrimary,
  },
  presetLabelSelected: {
    color: colors.accent,
    fontFamily: fonts.medium,
  },
  presetLabelDisabled: {
    color: colors.textSecondary,
  },
});


