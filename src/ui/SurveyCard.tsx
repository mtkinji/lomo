import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Button } from './Button';
import { HStack, VStack, ButtonLabel, Text } from './primitives';
import { QuestionCard } from './QuestionCard';
import { cardElevation, colors, spacing } from '../theme';

export type SurveyStep = {
  id: string;
  title: ReactNode;
  titleAccessory?: ReactNode;
  render: () => ReactNode;
  /**
   * When false, disables the primary CTA (Next/Submit).
   * Defaults to true.
   */
  canProceed?: boolean;
};

type SurveyCardVariant = 'stacked' | 'flat';
type SurveyCardMode = 'active' | 'completed';
type ShadowSafetyMode = 'alignToCanvas' | 'guaranteeNoClip';

type SurveyCardProps = {
  steps: SurveyStep[];
  currentStepIndex: number;
  onBack?: () => void;
  onNext?: () => void;
  onSubmit?: () => void;
  /**
   * Override the step label displayed above the question title.
   * Defaults to "{index} of {count}".
   */
  stepLabel?: string;
  backLabel?: string;
  nextLabel?: string;
  submitLabel?: string;
  variant?: SurveyCardVariant;
  /**
   * When "completed", hides navigation actions and shows a completion indicator.
   * Defaults to "active".
   */
  mode?: SurveyCardMode;
  /**
   * Optional override for the completion badge label when mode="completed".
   * Defaults to "Completed".
   */
  completedLabel?: string;
  /**
   * Optional override for the footer left slot. When provided, replaces the step label text.
   */
  footerLeft?: ReactNode;
  /**
   * Optional override for the footer right slot. When provided, replaces the default
   * actions (active mode) or completion badge (completed mode).
   */
  footerRight?: ReactNode;
  /**
   * Controls how aggressively SurveyCard insets itself horizontally to avoid shadow clipping.
   *
   * - "alignToCanvas" (default): match AppShell's canvas gutter (spacing.sm) so the card edge
   *   aligns with the app shell. Note: in hosts that clip rounded corners via `overflow: hidden`
   *   (e.g. drawers/sheets), large shadows like `composer` can still clip if the host doesn't
   *   provide enough horizontal gutter.
   * - "guaranteeNoClip": increase horizontal inset to at least the largest shadow radius used
   *   by the front/behind cards (so it won't clip even inside overflow-hidden hosts).
   */
  shadowSafety?: ShadowSafetyMode;
  /**
   * Elevation for the front (white) card.
   * Defaults to "lift" (stronger than "soft" but less spread than "composer").
   */
  frontElevation?: keyof typeof cardElevation;
  /**
   * Shadow token for the behind (muted) rotated card.
   * Defaults to "composer" for the strongest "sheet under sheet" look.
   */
  behindElevation?: keyof typeof cardElevation;
  style?: StyleProp<ViewStyle>;
  cardStyle?: StyleProp<ViewStyle>;
};

export function SurveyCard({
  steps,
  currentStepIndex,
  onBack,
  onNext,
  onSubmit,
  stepLabel,
  backLabel = 'Back',
  nextLabel = 'Next',
  submitLabel = 'Submit',
  variant = 'stacked',
  mode = 'active',
  completedLabel = 'Completed',
  footerLeft,
  footerRight,
  shadowSafety = 'alignToCanvas',
  frontElevation = 'lift',
  behindElevation = 'composer',
  style,
  cardStyle,
}: SurveyCardProps) {
  const totalSteps = Math.max(0, steps.length);
  const safeIndex = Math.min(Math.max(0, currentStepIndex), Math.max(0, totalSteps - 1));
  const step = steps[safeIndex];
  const isFirst = safeIndex === 0;
  const isLast = safeIndex === totalSteps - 1;
  const primaryLabel = isLast ? submitLabel : nextLabel;
  const canProceed = step?.canProceed ?? true;
  const isPrimaryDisabled = !canProceed;
  const isCompleted = mode === 'completed';

  if (!step) return null;

  const resolvedStepLabel =
    stepLabel ?? (isCompleted ? completedLabel : `${safeIndex + 1} of ${totalSteps}`);

  const canvasGutterPx = spacing.sm;
  const frontShadowRadius = cardElevation[frontElevation]?.shadowRadius ?? 0;
  const behindShadowRadius = cardElevation[behindElevation]?.shadowRadius ?? 0;
  const requiredInsetPx =
    shadowSafety === 'guaranteeNoClip'
      ? Math.max(canvasGutterPx, frontShadowRadius, behindShadowRadius)
      : canvasGutterPx;
  const behindShadowStyle = cardElevation[behindElevation] as ViewStyle | undefined;

  return (
    <View style={[styles.container, { paddingHorizontal: requiredInsetPx }, style]}>
      <View style={styles.deck}>
        {variant === 'stacked' ? (
          <View pointerEvents="none" style={[styles.behindCard, behindShadowStyle]} />
        ) : null}

        <QuestionCard
          title={step.title}
          titleAccessory={step.titleAccessory}
          elevation={frontElevation}
          style={[styles.frontCard, cardStyle]}
        >
          <VStack space="md">
            <View>{step.render()}</View>
            <HStack
              alignItems="center"
              justifyContent="space-between"
              space="sm"
              style={styles.footerRow}
            >
              {footerLeft ? footerLeft : (
                <Text style={styles.footerStepLabel}>{resolvedStepLabel}</Text>
              )}
              {footerRight ? (
                footerRight
              ) : isCompleted ? (
                <View style={styles.completedBadge} accessibilityLabel={completedLabel}>
                  <Text style={styles.completedBadgeText}>✓ {completedLabel}</Text>
                </View>
              ) : (
                <HStack alignItems="center" justifyContent="flex-end" space="sm">
                  {!isFirst ? (
                    <Button variant="ghost" onPress={onBack} accessibilityLabel={backLabel}>
                      <ButtonLabel size="md">{backLabel}</ButtonLabel>
                    </Button>
                  ) : null}
                  <Button
                    variant="primary"
                    disabled={isPrimaryDisabled}
                    style={isPrimaryDisabled ? styles.primaryDisabled : undefined}
                    onPress={isLast ? onSubmit : onNext}
                    accessibilityLabel={primaryLabel}
                  >
                    <ButtonLabel size="md" tone={isPrimaryDisabled ? 'muted' : 'inverse'}>
                      {primaryLabel}
                    </ButtonLabel>
                  </Button>
                </HStack>
              )}
            </HStack>
          </VStack>
        </QuestionCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    // Horizontal inset is computed dynamically (see `shadowSafety`).
    paddingVertical: spacing.sm,
    // Extra separation from the content above so the behind card doesn't
    // visually collide with prior bubbles.
    marginTop: spacing.lg,
  },
  deck: {
    position: 'relative',
    overflow: 'visible',
  },
  behindCard: {
    position: 'absolute',
    // Match the front card size so rotation reveals corners on all sides.
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    // Must differ from both the page canvas and the front card; otherwise the
    // "stack" reads like a single card (canvas + card are both #FFF).
    backgroundColor: colors.cardMuted,
    borderRadius: 18,
    // Flat “paper” behind (no border/shadow).
    borderWidth: 0,
    borderColor: 'transparent',
    // Shadow style is computed dynamically from `behindElevation`.
    transform: [
      // Clockwise tilt
      { rotate: '3.5deg' },
      { translateX: 0 },
      { translateY: 0 },
    ],
  },
  frontCard: {
    // QuestionCard uses Card defaults that include a vertical margin; remove it so
    // the behind card aligns and reads like a true “stack”.
    marginVertical: 0,
    // Reference looks essentially borderless.
    borderColor: 'transparent',
  },
  footerRow: {
    paddingTop: spacing.xs,
  },
  footerStepLabel: {
    color: colors.textPrimary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    // Use the same "label" sizing as other small metadata in cards.
    // (Text defaults to bodySm; keep this explicit for clarity.)
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  primaryDisabled: {
    backgroundColor: colors.pine200,
    borderColor: colors.pine200,
  },
  completedBadge: {
    backgroundColor: colors.pine100,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderWidth: 1,
    borderColor: colors.pine200,
  },
  completedBadgeText: {
    color: colors.textPrimary,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});


