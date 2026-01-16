/**
 * Check-in composer for shared goals.
 *
 * A bottom sheet or inline component that lets users submit check-ins
 * with optional presets and text messages.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Text, HStack, VStack } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { colors, spacing, typography, fonts, cardSurfaceStyle } from '../../theme';
import { submitCheckin, CHECKIN_PRESETS, type CheckinPreset } from '../../services/checkins';
import { HapticsService } from '../../services/HapticsService';
import { useAnalytics } from '../../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../../services/analytics/events';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type CheckinComposerProps = {
  goalId: string;
  /** Called after a successful check-in submission */
  onCheckinSubmitted?: () => void;
  /** Called when user dismisses the composer */
  onDismiss?: () => void;
  /** Compact mode for inline display (vs. sheet) */
  compact?: boolean;
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CheckinComposer({
  goalId,
  onCheckinSubmitted,
  onDismiss,
  compact = false,
}: CheckinComposerProps) {
  const { capture } = useAnalytics();
  const [selectedPreset, setSelectedPreset] = useState<CheckinPreset | null>(null);
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePresetPress = useCallback((preset: CheckinPreset) => {
    HapticsService.trigger('canvas.selection');
    setSelectedPreset((current) => (current === preset ? null : preset));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedPreset && !text.trim()) {
      setError('Select a status or add a message');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitCheckin({
        goalId,
        preset: selectedPreset,
        text: text.trim() || null,
      });

      capture(AnalyticsEvent.SharedGoalCheckinCreated, {
        goalId,
        hasPreset: Boolean(selectedPreset),
        preset: selectedPreset,
        hasText: Boolean(text.trim()),
      });

      HapticsService.trigger('canvas.success');
      onCheckinSubmitted?.();

      // Reset form
      setSelectedPreset(null);
      setText('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check in';
      setError(message);
      capture(AnalyticsEvent.SharedGoalCheckinFailed, {
        goalId,
        error: message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [goalId, selectedPreset, text, capture, onCheckinSubmitted]);

  const canSubmit = Boolean(selectedPreset || text.trim());

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {!compact && (
        <Text style={styles.title}>Check in</Text>
      )}

      {/* Preset chips */}
      <View style={styles.presetsRow}>
        {CHECKIN_PRESETS.map((preset) => {
          const isSelected = selectedPreset === preset.id;
          return (
            <Pressable
              key={preset.id}
              style={[
                styles.presetChip,
                isSelected && styles.presetChipSelected,
              ]}
              onPress={() => handlePresetPress(preset.id)}
              disabled={isSubmitting}
            >
              <Text style={styles.presetEmoji}>{preset.emoji}</Text>
              <Text
                style={[
                  styles.presetLabel,
                  isSelected && styles.presetLabelSelected,
                ]}
              >
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Optional text input */}
      <TextInput
        style={styles.textInput}
        placeholder="Add a message (optional)"
        placeholderTextColor={colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={280}
        editable={!isSubmitting}
      />

      {/* Error message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {/* Actions */}
      <HStack space="sm" style={styles.actions}>
        {onDismiss ? (
          <Button
            variant="ghost"
            label="Cancel"
            onPress={onDismiss}
            disabled={isSubmitting}
            size="compact"
          />
        ) : null}
        <Button
          variant="primary"
          label={isSubmitting ? 'Checking in…' : 'Check in'}
          onPress={handleSubmit}
          disabled={!canSubmit || isSubmitting}
          size="compact"
          style={styles.submitButton}
        />
      </HStack>
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
  containerCompact: {
    padding: spacing.sm,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
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
    backgroundColor: colors.accentSubtle,
    borderColor: colors.accent,
  },
  presetEmoji: {
    fontSize: 16,
    marginRight: spacing.xs,
  },
  presetLabel: {
    ...typography.bodySm,
    color: colors.textPrimary,
  },
  presetLabelSelected: {
    color: colors.accent,
    fontFamily: fonts.medium,
  },
  textInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.shell,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: spacing.sm,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.destructive,
    marginBottom: spacing.sm,
  },
  actions: {
    justifyContent: 'flex-end',
  },
  submitButton: {
    minWidth: 100,
  },
});

