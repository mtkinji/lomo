/**
 * Check-in composer for shared goals.
 *
 * A bottom sheet or inline component that lets users submit check-ins
 * with optional presets and text messages.
 */

import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text, HStack } from '../../ui/primitives';
import { Input } from '../../ui/Input';
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
      <Input
        accessibilityLabel="Check-in message"
        surfaceRole="composer"
        multilineMinHeight={compact ? 56 : 80}
        multilineMaxHeight={180}
        containerStyle={styles.textInputPlacement}
        errorText={error ?? undefined}
        placeholder="Say what moved today."
        value={text}
        onChangeText={setText}
        multiline
        maxLength={500}
        editable={!isSubmitting}
        autoFocus
      />

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
    padding: spacing.sm,
  },
  title: {
    ...typography.titleSm,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  textInputPlacement: {
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

