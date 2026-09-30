import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { ButtonLabel, Text } from '../../ui/Typography';
import { Logo } from '../../ui/Logo';
import { FullWidthActionDock, useFullWidthActionDockClearance } from '../../ui/FullWidthActionDock';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';

type Props = {
  message: string;
  actionLabel: string;
  onContinue: () => void;
  /** Returning to a seen invitation should not replay its presentation. */
  returning?: boolean;
} & ({ variant: 'promise'; identity: string } | { variant: 'invitation'; identity?: never });

// Scoped atmospheric pattern preset, not a global animation token.
const reveal = (index: number) => FadeInUp
  .withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
  .delay(200 + index * 500).duration(950).easing(Easing.bezier(0.25, 0.1, 0.25, 1));

/**
 * Content owner for initial landing and selective setup invitations only.
 * Keep OnboardingShorelineBackdrop outside this screen (and outside keyed page
 * transitions) so consecutive invitations share one uninterrupted player.
 * Callers own navigation; this component never inserts an onboarding step.
 */
export function AtmosphericInvitationScreen(props: Props) {
  // New semantic content gets a fresh choreography without remounting media.
  return <InvitationContent key={`${props.variant}:${props.message}`} {...props} />;
}

function InvitationContent(props: Props) {
  const insets = useSafeAreaInsets();
  const clearance = useFullWidthActionDockClearance('restingFloatingControl');
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityPreferences();
  const [settled, setSettled] = useState(false);
  const animate = !reduceMotionEnabled && !screenReaderEnabled && !props.returning && !settled;
  const count = props.variant === 'promise' ? 2 : 1;
  return <View style={styles.root}>
    <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
      <View style={styles.logoSlot}><Logo size={28} variant="parchment" /></View>
    </View>
    <ScrollView bounces={false} alwaysBounceVertical={false} overScrollMode="never"
      onScrollBeginDrag={() => setSettled(true)} showsVerticalScrollIndicator={false}
      contentContainerStyle={[styles.content, { paddingBottom: clearance }]}>
      <View key={animate ? 'reveal' : 'settled'} style={styles.promise}>
        {props.variant === 'promise' ? <Animated.View entering={animate ? reveal(0) : undefined}>
          <Text style={styles.identity}>{props.identity}</Text>
        </Animated.View> : null}
        <Animated.View entering={animate ? reveal(count - 1) : undefined}>
          <Text accessibilityRole="header" style={styles.message}>{props.message}</Text>
        </Animated.View>
      </View>
    </ScrollView>
    <FullWidthActionDock placement="restingFloatingControl" dockTestID="onboarding.householdActionDock">
      <Animated.View key={animate ? 'reveal' : 'settled'} entering={animate
        ? FadeIn.withInitialValues({ opacity: 0.65 }).delay(200 + count * 500).duration(500)
        : undefined}>
        <Button variant="inverse" fullWidth size="lg" onPress={props.onContinue}>
          <ButtonLabel tone="default">{props.actionLabel}</ButtonLabel>
        </Button>
      </Animated.View>
    </FullWidthActionDock>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  chrome: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  logoSlot: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  content: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing['3xl'] },
  promise: { maxWidth: 520, alignSelf: 'center', gap: spacing.xl, paddingBottom: spacing['3xl'] },
  identity: { ...typography.body, fontFamily: fonts.medium, textAlign: 'center', color: colors.parchment },
  message: { ...typography.titleXl, textAlign: 'center', color: colors.parchment },
});
