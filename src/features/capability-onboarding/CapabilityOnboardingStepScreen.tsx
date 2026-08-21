import type { ReactNode } from 'react';
import { useEffect, useRef } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { FullScreenInterstitial } from '../../ui/FullScreenInterstitial';
import {
  FullWidthActionDock,
  useFullWidthActionDockClearance,
} from '../../ui/FullWidthActionDock';
import { Icon } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { Text } from '../../ui/Typography';

export const CAPABILITY_ONBOARDING_STEP_GEOMETRY = {
  chromeHeight: 44,
  illustrationSize: 232,
  titleSlotMinHeight: 112,
} as const;

type Props = {
  action?: ReactNode;
  children: ReactNode;
  closeAccessibilityLabel?: string;
  currentStep?: number;
  illustration: ReactNode;
  onClose?: () => void;
  progressAccessibilityLabel?: string;
  title: string;
  totalSteps?: number;
};

/**
 * Canonical full-screen capability setup step.
 *
 * This component owns the stable page chrome, two-line title region, optical
 * illustration anchor, centered decision region, and persistent action-dock
 * clearance. Capability code supplies only semantic content and one action.
 */
export function CapabilityOnboardingStepScreen({
  action,
  children,
  closeAccessibilityLabel = 'Close capability setup',
  currentStep,
  illustration,
  onClose,
  progressAccessibilityLabel,
  title,
  totalSteps = 4,
}: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const actionClearance = useFullWidthActionDockClearance();
  const scrollRef = useRef<ScrollView>(null);
  const stepLabel = currentStep ? `${currentStep} of ${totalSteps}` : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep, title]);

  return (
    <View style={styles.root} testID="capabilityOnboarding.step">
      <FullScreenInterstitial
        backgroundColor="parchment"
        contentStyle={styles.host}
        progression="button"
        visible
        withinModal
      >
        <View style={styles.viewport}>
          <View style={[styles.chrome, { top: insets.top + spacing.lg }]}>
            <Logo size={22} />
            {stepLabel ? (
              <Text
                accessibilityLabel={progressAccessibilityLabel ?? `Capability setup step ${stepLabel}`}
                style={styles.stepCounter}
                tone="secondary"
                variant="label"
              >
                {stepLabel}
              </Text>
            ) : null}
            {onClose ? (
              <Button
                accessibilityLabel={closeAccessibilityLabel}
                iconButtonSize={CAPABILITY_ONBOARDING_STEP_GEOMETRY.chromeHeight}
                onPress={onClose}
                size="icon"
                variant="ghost"
              >
                <Icon color={colors.textPrimary} name="close" size={22} />
              </Button>
            ) : (
              <View style={styles.headerActionPlaceholder} />
            )}
          </View>

          <ScrollView
            bounces={false}
            contentContainerStyle={[
              styles.content,
              {
                minHeight: height,
                paddingTop: insets.top + spacing.lg + CAPABILITY_ONBOARDING_STEP_GEOMETRY.chromeHeight,
                paddingBottom: actionClearance,
              },
            ]}
            ref={scrollRef}
            showsVerticalScrollIndicator={false}
            testID="capabilityOnboarding.step.scroll"
          >
            <View style={styles.titleSlot} testID="capabilityOnboarding.step.titleSlot">
              <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            </View>
            <View style={styles.illustrationSlot} testID="capabilityOnboarding.step.illustrationSlot">
              {illustration}
            </View>
            <View style={styles.decisionSlot} testID="capabilityOnboarding.step.decisionSlot">
              {children}
            </View>
          </ScrollView>

          {action ? (
            <FullWidthActionDock dockTestID="capabilityOnboarding.step.actionDock">
              {action}
            </FullWidthActionDock>
          ) : null}
        </View>
      </FullScreenInterstitial>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.parchment },
  host: { paddingHorizontal: 0, paddingVertical: 0 },
  viewport: { flex: 1, overflow: 'hidden', backgroundColor: colors.parchment },
  chrome: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerActionPlaceholder: {
    width: CAPABILITY_ONBOARDING_STEP_GEOMETRY.chromeHeight,
    height: CAPABILITY_ONBOARDING_STEP_GEOMETRY.chromeHeight,
  },
  stepCounter: {
    position: 'absolute',
    left: 72,
    right: 72,
    textAlign: 'center',
  },
  content: {
    flexGrow: 1,
    width: '100%',
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.parchment,
  },
  titleSlot: {
    width: '100%',
    minHeight: CAPABILITY_ONBOARDING_STEP_GEOMETRY.titleSlotMinHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.titleMd,
    width: '100%',
    flexShrink: 1,
    color: colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  illustrationSlot: {
    height: CAPABILITY_ONBOARDING_STEP_GEOMETRY.illustrationSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  decisionSlot: {
    flexGrow: 1,
    minHeight: 148,
    gap: spacing.md,
    alignItems: 'stretch',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
});
