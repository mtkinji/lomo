import { Pressable } from '@/src/ui/HapticPressable';
import React from 'react';
import { AccessibilityInfo, Animated, ScrollView, StyleSheet, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { DrawerNavigationProp } from '@react-navigation/drawer';
import type { RootDrawerParamList } from '../../navigation/RootNavigator';
import { AppShell } from '../../ui/layout/AppShell';
import { CanvasScrollView } from '../../ui/layout/CanvasScrollView';
import { PageHeader } from '../../ui/layout/PageHeader';
import { Button } from '../../ui/Button';
import { Icon } from '../../ui/Icon';
import { ButtonLabel, Text } from '../../ui/primitives';
import { colors, fonts, spacing, typography } from '../../theme';
import {
  createGuidedOvertureState,
  getGuidedOvertureOffers,
  guidedOvertureReducer,
  type GuidedOvertureMode,
  type GuidedOvertureOffer,
} from '../guidedOverture/guidedOvertureModel';

type LabView = 'menu' | 'overture';

export function GuidedOvertureLabScreen() {
  if (!__DEV__) return null;

  const navigation = useNavigation<DrawerNavigationProp<RootDrawerParamList>>();
  const route = useRoute<RouteProp<RootDrawerParamList, 'GuidedOvertureLab'>>();
  const [view, setView] = React.useState<LabView>('overture');
  const [mode, setMode] = React.useState<GuidedOvertureMode>('portfolio');
  const [forceReducedMotion, setForceReducedMotion] = React.useState(false);
  const [systemReducedMotion, setSystemReducedMotion] = React.useState(false);
  const [screenReaderEnabled, setScreenReaderEnabled] = React.useState(false);
  const reduceMotion = forceReducedMotion || systemReducedMotion || screenReaderEnabled;
  const offers = React.useMemo(() => getGuidedOvertureOffers(mode), [mode]);
  const [overtureState, dispatch] = React.useReducer(
    guidedOvertureReducer,
    false,
    createGuidedOvertureState,
  );
  const sceneOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    setView('overture');
    setMode('portfolio');
    setForceReducedMotion(false);
    dispatch({ type: 'restart' });
  }, [route.params?.sessionId]);

  React.useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setSystemReducedMotion(enabled);
    });
    AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const motionSubscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setSystemReducedMotion,
    );
    const screenReaderSubscription = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setScreenReaderEnabled,
    );
    return () => {
      mounted = false;
      motionSubscription.remove();
      screenReaderSubscription.remove();
    };
  }, []);

  React.useEffect(() => {
    if (view !== 'overture' || overtureState.phase !== 'tour' || reduceMotion) return;
    sceneOpacity.setValue(0);
    Animated.timing(sceneOpacity, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [overtureState.phase, overtureState.sceneIndex, reduceMotion, sceneOpacity, view]);

  const leaveLab = React.useCallback(() => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('DevTools');
  }, [navigation]);

  const startOverture = React.useCallback(
    (nextMode: GuidedOvertureMode, previewReducedMotion = false) => {
      setMode(nextMode);
      setForceReducedMotion(previewReducedMotion);
      setView('overture');
      dispatch({ type: 'restart' });
    },
    [],
  );

  const continueInAgent = React.useCallback(
    (offer?: GuidedOvertureOffer) => {
      navigation.navigate('Agent', {
        launchContext: { source: 'guidedOverture', intent: 'freeCoach' },
        guidedOvertureOfferId: offer?.id ?? 'something-else',
        guidedOvertureSessionId: Date.now(),
        hidePromptSuggestions: true,
        resumeDraft: false,
      });
    },
    [navigation],
  );

  if (view === 'menu') {
    return (
      <AppShell>
        <PageHeader title="Guided Overture lab" onPressBack={() => setView('overture')} />
        <CanvasScrollView contentContainerStyle={styles.menuContent}>
          <Text style={styles.menuIntro}>
            The main test now opens in its production-shaped form. These controls only change the
            task set or accessibility presentation; onboarding state and account data stay untouched.
          </Text>
          <ModeCard
            eyebrow="Recommended"
            title="Play the full portfolio"
            body="Move through six suite-level tasks at your own pace, then continue in Agent."
            icon="sparkles"
            testID="guidedOverture.mode.portfolio"
            onPress={() => startOverture('portfolio')}
          />
          <ModeCard
            eyebrow="Current capabilities"
            title="Play the live task set"
            body="Use the same Agent handoff with only tasks that have a current first-value contract."
            icon="play"
            testID="guidedOverture.mode.live"
            onPress={() => startOverture('live')}
          />
          <ModeCard
            eyebrow="Accessibility"
            title="Play without transitions"
            body="Keep every overture step and manual control while removing the scene fade."
            icon="layers"
            testID="guidedOverture.mode.reducedMotion"
            onPress={() => startOverture('portfolio', true)}
          />
          <Button variant="ghost" fullWidth onPress={leaveLab}>
            Exit to Developer tools
          </Button>
        </CanvasScrollView>
      </AppShell>
    );
  }

  if (overtureState.phase === 'tour') {
    const offer = offers[overtureState.sceneIndex] ?? offers[0];
    const isFirst = overtureState.sceneIndex === 0;
    const isLast = overtureState.sceneIndex === offers.length - 1;

    return (
      <AppShell>
        <View style={styles.overtureHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open Guided Overture lab options"
            testID="guidedOverture.labOptions"
            onPress={() => setView('menu')}
            hitSlop={10}
          >
            <Text style={styles.wordmark}>KWILT</Text>
          </Pressable>
          <Button
            variant="ghost"
            size="sm"
            testID="guidedOverture.skipToAgent"
            onPress={() => continueInAgent()}
          >
            Skip to Kwilt
          </Button>
        </View>

        <View style={styles.sceneShell} testID="guidedOverture.scene">
          <Animated.View style={[styles.sceneCard, { opacity: sceneOpacity }]}>
            <OfferIcon offer={offer} large />
            <Text style={styles.sceneEyebrow}>{offer.sceneLabel}</Text>
            <Text style={styles.sceneTitle}>{offer.taskLabel}</Text>
            <View style={[styles.resultCard, { borderLeftColor: offer.accent }]}>
              <Icon name="check" size={18} color={offer.accent} />
              <Text style={styles.resultText}>{offer.resultLabel}</Text>
            </View>
          </Animated.View>

          <View style={styles.sceneFooter}>
            <Text
              style={styles.progressLabel}
              accessibilityLabel={`Scene ${overtureState.sceneIndex + 1} of ${offers.length}`}
            >
              {overtureState.sceneIndex + 1} of {offers.length}
            </Text>
            <View style={styles.progressRow}>
              {offers.map((candidate, index) => (
                <View
                  key={candidate.id}
                  style={[
                    styles.progressDot,
                    index === overtureState.sceneIndex && styles.progressDotActive,
                  ]}
                />
              ))}
            </View>
            <Button
              variant="accent"
              fullWidth
              testID={`guidedOverture.start.${offer.id}`}
              onPress={() => continueInAgent(offer)}
            >
              <ButtonLabel tone="inverse">Start here</ButtonLabel>
            </Button>
            <View style={styles.navigationRow}>
              <Button
                variant="secondary"
                style={[styles.navigationButton, isFirst && styles.navigationButtonDisabled]}
                disabled={isFirst}
                accessibilityState={{ disabled: isFirst }}
                testID="guidedOverture.back"
                onPress={() => dispatch({ type: 'back' })}
              >
                Back
              </Button>
              <Button
                variant="secondary"
                style={styles.navigationButton}
                testID="guidedOverture.next"
                onPress={() => dispatch({ type: 'next', sceneCount: offers.length })}
              >
                {isLast ? 'See all' : 'Next'}
              </Button>
            </View>
          </View>
        </View>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <View style={styles.overtureHeader}>
        <Button
          variant="ghost"
          size="sm"
          testID="guidedOverture.backToTour"
          onPress={() => dispatch({ type: 'back' })}
        >
          Back
        </Button>
        <Button
          variant="ghost"
          size="sm"
          testID="guidedOverture.replay"
          onPress={() => dispatch({ type: 'restart' })}
        >
          Start over
        </Button>
      </View>
      <ScrollView contentContainerStyle={styles.chooserContent} testID="guidedOverture.chooser">
        <Text style={styles.chooserEyebrow}>A few ways Kwilt can help</Text>
        <Text style={styles.chooserTitle}>Where should we start?</Text>
        <Text style={styles.chooserBody}>
          Choose one useful thing. Kwilt will pick up the conversation from there.
        </Text>
        <View style={styles.offerList}>
          {offers.map((offer) => (
            <OfferButton key={offer.id} offer={offer} onPress={() => continueInAgent(offer)} />
          ))}
        </View>
        <Button
          variant="secondary"
          fullWidth
          testID="guidedOverture.somethingElse"
          onPress={() => continueInAgent()}
        >
          Something else
        </Button>
        <Text style={styles.conceptDisclosure}>
          This learning release continues in Agent. It does not create anything or request access
          until you deliberately continue with a capability-owned action.
        </Text>
      </ScrollView>
    </AppShell>
  );
}

function ModeCard({
  eyebrow,
  title,
  body,
  icon,
  testID,
  onPress,
}: {
  eyebrow: string;
  title: string;
  body: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.modeCard, pressed && styles.pressed]}
    >
      <View style={styles.modeIcon}>
        <Icon name={icon} size={22} color={colors.accent} />
      </View>
      <View style={styles.modeCopy}>
        <Text style={styles.modeEyebrow}>{eyebrow}</Text>
        <Text style={styles.modeTitle}>{title}</Text>
        <Text style={styles.modeBody}>{body}</Text>
      </View>
      <Icon name="chevronRight" size={20} color={colors.textSecondary} />
    </Pressable>
  );
}

function OfferIcon({ offer, large = false }: { offer: GuidedOvertureOffer; large?: boolean }) {
  const size = large ? 76 : 48;
  return (
    <View
      style={[
        styles.offerIcon,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: `${offer.accent}20`,
        },
      ]}
    >
      <Icon name={offer.icon} size={large ? 32 : 21} color={offer.accent} />
    </View>
  );
}

function OfferButton({ offer, onPress }: { offer: GuidedOvertureOffer; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      testID={`guidedOverture.offer.${offer.id}`}
      onPress={onPress}
      style={({ pressed }) => [styles.offerButton, pressed && styles.pressed]}
    >
      <OfferIcon offer={offer} />
      <View style={styles.offerCopy}>
        <Text style={styles.offerTitle}>{offer.taskLabel}</Text>
        <Text style={styles.offerResult}>{offer.resultLabel}</Text>
      </View>
      <Icon name="arrowRight" size={19} color={colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menuContent: { paddingBottom: spacing.xl, gap: spacing.md },
  menuIntro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.xs },
  modeCard: {
    minHeight: 132,
    borderRadius: 22,
    backgroundColor: colors.shellAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  modeIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.canvas,
  },
  modeCopy: { flex: 1, gap: 4 },
  modeEyebrow: { ...typography.label, color: colors.accent, textTransform: 'uppercase' },
  modeTitle: { ...typography.titleSm, color: colors.textPrimary },
  modeBody: { ...typography.bodySm, color: colors.textSecondary },
  overtureHeader: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  wordmark: {
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 3.2,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
  },
  sceneShell: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  sceneCard: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  sceneEyebrow: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  sceneTitle: {
    fontFamily: fonts.bold,
    fontSize: 34,
    lineHeight: 40,
    color: colors.textPrimary,
    textAlign: 'center',
    maxWidth: 350,
  },
  resultCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 18,
    borderLeftWidth: 4,
    backgroundColor: colors.shellAlt,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  resultText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  sceneFooter: { gap: spacing.sm },
  progressLabel: { ...typography.label, color: colors.textSecondary, textAlign: 'center' },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xs, marginBottom: spacing.sm },
  progressDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.border },
  progressDotActive: { width: 22, backgroundColor: colors.accent },
  navigationRow: { flexDirection: 'row', gap: spacing.sm },
  navigationButton: { flex: 1 },
  navigationButtonDisabled: { opacity: 0.45 },
  chooserContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl, gap: spacing.md },
  chooserEyebrow: {
    ...typography.label,
    color: colors.accent,
    textTransform: 'uppercase',
    marginTop: spacing.sm,
  },
  chooserTitle: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 40, color: colors.textPrimary },
  chooserBody: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  offerList: { gap: spacing.sm },
  offerButton: {
    minHeight: 88,
    borderRadius: 20,
    backgroundColor: colors.shellAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  offerIcon: { alignItems: 'center', justifyContent: 'center' },
  offerCopy: { flex: 1, gap: 4 },
  offerTitle: { ...typography.titleSm, color: colors.textPrimary },
  offerResult: { ...typography.bodySm, color: colors.textSecondary },
  conceptDisclosure: {
    ...typography.bodySm,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
});
