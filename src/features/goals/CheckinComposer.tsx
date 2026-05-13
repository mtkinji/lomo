/**
 * Check-in composer for shared goals.
 *
 * A bottom sheet or inline component that lets users submit check-ins
 * with optional presets and text messages.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Text, HStack } from '../../ui/primitives';
import { Button } from '../../ui/Button';
import { colors, spacing, typography, cardSurfaceStyle } from '../../theme';
import { submitCheckin } from '../../services/checkins';
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
  const [text, setText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Add a message');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await submitCheckin({
        goalId,
        preset: null,
        text: trimmed,
      });

      capture(AnalyticsEvent.SharedGoalCheckinCreated, {
        goalId,
        hasPreset: false,
        preset: null,
        hasText: true,
        source: 'manual_composer',
      });

      void HapticsService.trigger('outcome.success');
      onCheckinSubmitted?.();

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
  }, [goalId, text, capture, onCheckinSubmitted]);

  const canSubmit = Boolean(text.trim());

  return (
    <View style={compact ? styles.containerCompact : styles.container}>
      {!compact ? <Text style={styles.title}>Write a check-in</Text> : null}

      {/* Text input — the primary affordance. Manual check-ins are a fallback
          for moments without a triggering completion, so we lead with words. */}
      <TextInput
        style={[styles.textInput, compact && styles.textInputCompact]}
        placeholder="Say what moved today."
        placeholderTextColor={colors.textSecondary}
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        editable={!isSubmitting}
        autoFocus
      />

      {/* Error message */}
      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      <Text style={styles.privacyHint}>Only send what you want partners to see.</Text>

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
          label={isSubmitting ? 'Sending…' : 'Send'}
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
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.shellAlt,
    padding: spacing.sm,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
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
  textInputCompact: {
    backgroundColor: 'transparent',
    minHeight: 56,
    paddingHorizontal: 0,
    paddingVertical: spacing.xs,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.destructive,
    marginBottom: spacing.sm,
  },
  privacyHint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  actions: {
    justifyContent: 'flex-end',
  },
  submitButton: {
    minWidth: 100,
  },
});

