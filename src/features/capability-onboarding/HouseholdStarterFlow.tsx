import { useEffect, useState } from 'react';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, ReduceMotion, SlideInLeft, SlideInRight, interpolateColor, useAnimatedStyle, useSharedValue, withDelay, withTiming, type ExitAnimationsValues } from 'react-native-reanimated';
import { Image, ScrollView, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { FullWidthActionDock, useFullWidthActionDockClearance } from '../../ui/FullWidthActionDock';
import { Pressable } from '../../ui/HapticPressable';
import { Icon, type IconName } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { ButtonLabel, Text } from '../../ui/Typography';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';
import { OnboardingShorelineBackdrop } from './OnboardingShorelineBackdrop';
import type { CapabilityOnboardingContract, CapabilityOnboardingPathId } from './capabilityOnboardingContracts';

type Starter = {
  id: string; label: string; emphasis: string; promise: string; icon: IconName;
  title: string; body: string; artwork: ImageSourcePropType;
  actions: { pathId: CapabilityOnboardingPathId; label: string }[];
};

// Invitations are presentation only; setup begins at the existing capability handoff.
const STARTERS: Starter[] = [
  {
    id: 'money', label: 'Make a plan for your money', emphasis: 'plan', icon: 'wallet',
    promise: 'See where it goes. Make a plan together.',
    title: 'A clearer picture of your money.',
    body: 'Bring your spending into view, make a budget, and add shopping-app pauses when you want them.',
    artwork: require('../../../assets/onboarding/illustrated/money.jpg'),
    actions: [{ pathId: 'budget-app-controls', label: 'Set up Money' }],
  },
  {
    id: 'screen', label: 'Make room for less screen time', emphasis: 'screen time', icon: 'smartphone',
    promise: 'Set limits that work for you or your family.',
    title: 'Give your attention a boundary.',
    body: 'Choose a daily app limit. Kwilt can pause the apps you select when their time is up.',
    artwork: require('../../../assets/onboarding/illustrated/screen.jpg'),
    actions: [{ pathId: 'screen-time-controls', label: 'Set up Screen Time' }],
  },
  {
    id: 'household', label: 'Plan meals together', emphasis: 'meals', icon: 'home',
    promise: 'Bring everyone’s ideas into dinner and the grocery list.',
    title: 'Plan meals everyone has a say in.',
    body: 'Bring your household’s ideas together, choose what’s for dinner, and make one shared grocery list.',
    artwork: require('../../../assets/onboarding/illustrated/household.jpg'),
    actions: [{ pathId: 'make-meals-easier', label: 'Plan a meal' }, { pathId: 'household-chores', label: 'Start with chores' }],
  },
  {
    id: 'goals', label: 'Set goals and get help reaching them', emphasis: 'goals', icon: 'goals',
    promise: 'Get organized and make time for what you want to do.',
    title: 'Give your goal a next step.',
    body: 'Turn something you want to do into a practical goal and small next steps.',
    artwork: require('../../../assets/onboarding/illustrated/goals.jpg'),
    actions: [{ pathId: 'make-progress', label: 'Create a goal' }],
  },
];

function StarterLabel({ item, index, animate }: { item: Starter; index: number; animate: boolean }) {
  const emphasis = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    emphasis.value = animate ? withDelay(350 + index * 180, withTiming(1, { duration: 220 })) : 1;
  }, [animate, emphasis, index]);
  const emphasisStyle = useAnimatedStyle(() => ({
    color: interpolateColor(emphasis.value, [0, 1], [colors.textSecondary, colors.textPrimary]),
  }));
  const start = item.label.indexOf(item.emphasis);
  return <Text variant="body" style={styles.rowLabel}>
    {item.label.slice(0, start)}
    {/* Inline animated span keeps the sentence's native wrapping and reserves its
        final semibold width, avoiding reflow as attention moves down the cards. */}
    <Animated.Text style={[styles.rowEmphasis, emphasisStyle]}>{item.emphasis}</Animated.Text>
    {item.label.slice(start + item.emphasis.length)}
  </Text>;
}

export function HouseholdStarterFlow({ paths, onStartPath, onExplore }: {
  paths: CapabilityOnboardingContract[];
  onStartPath: (path: CapabilityOnboardingContract) => void;
  onExplore: () => void;
}) {
  const [stage, setStage] = useState('promise');
  const [goingBack, setGoingBack] = useState(false);
  const travelDirection = useSharedValue(1);
  const { reduceMotionEnabled } = useAccessibilityPreferences();
  const shorelineOpacity = useSharedValue(1);
  const shorelineStyle = useAnimatedStyle(() => ({ opacity: shorelineOpacity.value }));
  const [artworkWidth, setArtworkWidth] = useState(0);
  const [copyHeight, setCopyHeight] = useState(0);
  const insets = useSafeAreaInsets();
  const clearance = useFullWidthActionDockClearance();
  const starters = STARTERS.filter((item) => item.actions.some((action) => paths.some((path) => path.id === action.pathId)));
  const selected = starters.find((item) => item.id === stage);
  const isPromise = stage === 'promise';
  useEffect(() => {
    shorelineOpacity.value = withTiming(isPromise ? 1 : 0, { duration: reduceMotionEnabled ? 120 : 280 });
  }, [isPromise, reduceMotionEnabled, shorelineOpacity]);
  // Reduced motion retains a short opacity transition, with no spatial movement.
  const fadeIn = FadeIn.duration(reduceMotionEnabled || goingBack ? 140 : 280).reduceMotion(ReduceMotion.Never);
  const fadeOut = FadeOut.duration(100).reduceMotion(ReduceMotion.Never);
  const pageEntrance = reduceMotionEnabled ? fadeIn
    : (goingBack ? SlideInLeft : SlideInRight).duration(300).easing(Easing.out(Easing.cubic));
  // Exiting views retain their previous render props. Read the direction at
  // departure so Back reverses the old page too, not just the entering page.
  const pageExit = (values: ExitAnimationsValues) => {
    'worklet';
    return {
      initialValues: { originX: values.currentOriginX },
      animations: { originX: withTiming(values.currentOriginX - travelDirection.value * values.windowWidth,
        { duration: 300, easing: Easing.out(Easing.cubic), reduceMotion: ReduceMotion.System }) },
    };
  };
  const copyEntrance = !goingBack && !reduceMotionEnabled
    ? FadeInUp.withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] }).delay(160).duration(160)
    : fadeIn;
  const artEntrance = reduceMotionEnabled || goingBack ? fadeIn : FadeIn.delay(200).duration(200);
  const advance = (next: string) => { travelDirection.value = 1; setGoingBack(false); setStage(next); };
  const actions = selected?.actions.flatMap((action) => {
    const path = paths.find((candidate) => candidate.id === action.pathId);
    return path ? [{ ...action, path }] : [];
  }) ?? [];
  const hasDock = isPromise || actions.length > 0;
  const back = () => { travelDirection.value = -1; setGoingBack(true); setStage(selected ? 'choices' : 'promise'); };

  return (
    <View style={styles.root} testID="onboarding.householdStarter">
      <StatusBar style={isPromise ? 'light' : 'dark'} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shorelineStyle]}>
        <OnboardingShorelineBackdrop active={isPromise} tone="dark" />
      </Animated.View>
      <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.chromeSide}>
          {!isPromise ? <Button variant="ghost" size="icon" accessibilityLabel="Back" onPress={back}><Icon name="chevronLeft" size={24} color={colors.textPrimary} /></Button> : null}
        </View>
        <Logo size={28} variant={isPromise ? 'parchment' : 'default'} />
        <View style={[styles.chromeSide, styles.trailing]}>
          {!isPromise ? <Button variant="ghost" size="md" onPress={onExplore}>Skip</Button> : null}
        </View>
      </View>
      <Animated.View key={stage} entering={isPromise && !goingBack ? undefined : pageEntrance} exiting={reduceMotionEnabled ? fadeOut : pageExit} style={[styles.stage, !isPromise && styles.pageCanvas]}>
        {selected ? <Animated.View entering={artEntrance} testID={`onboarding.illustration.${selected.id}`} onLayout={(event) => setArtworkWidth(event.nativeEvent.layout.width)} pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.artwork, { top: spacing['3xl'] + copyHeight + spacing.xl }]}>
          <Image source={selected.artwork} accessible={false} resizeMode="cover" style={selected.id === 'money' ? [styles.moneyArtwork, { width: artworkWidth, height: artworkWidth * 1.5, top: -artworkWidth * 0.54 }] : styles.squareArtwork} />
          <LinearGradient colors={[colors.parchment, `${colors.parchment}00`]} style={styles.artworkTopFade} />
          <LinearGradient colors={[`${colors.parchment}00`, colors.parchment]} style={styles.artworkBottomFade} />
        </Animated.View> : null}
      <Animated.View entering={copyEntrance} style={styles.copyLayer}>
      <ScrollView key={stage} bounces={false} alwaysBounceVertical={false} overScrollMode="never" contentContainerStyle={[styles.content, isPromise && styles.promiseContent, selected && styles.illustratedContent, { paddingBottom: clearance + (actions.length > 1 ? 64 : 0) }]} showsVerticalScrollIndicator={false}>
        {isPromise ? (
          <View style={styles.promise}>
            <Text style={styles.promiseLabel}>Kwilt. One app for life.</Text>
            <Text accessibilityRole="header" style={styles.promiseTitle}>Built to help you get—and keep—your house in order.</Text>
          </View>
        ) : selected ? (
          <View style={styles.illustratedStory}>
            <View onLayout={(event) => setCopyHeight(event.nativeEvent.layout.height)} style={styles.storyCopy}>
              <Text accessibilityRole="header" style={[styles.title, styles.centered]}>{selected.title}</Text>
              <Text variant="body" style={[styles.secondary, styles.centered]}>{selected.body}</Text>
            </View>
          </View>
        ) : (
          <View style={[styles.story, styles.choiceStory]}>
            <View style={styles.choiceIntro}>
              <Text accessibilityRole="header" style={styles.title}>Let’s get your house in order.</Text>
              <Text variant="body" style={styles.secondary}>We can start with just one thing.</Text>
            </View>
            <View style={styles.choiceRegion}>
            <View style={styles.choices}>
              {starters.map((item, index) => (
                <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.label} accessibilityHint={item.promise} onPress={() => advance(item.id)} style={({ pressed }) => pressed && styles.pressed}>
                  <Card padding="none" marginVertical={0} elevation="none" style={styles.row}>
                  <Icon name={item.icon} size={22} color={colors.textSecondary} />
                  <View style={styles.rowCopy}>
                    <StarterLabel item={item} index={index} animate={!reduceMotionEnabled && !goingBack} />
                  </View>
                  <Icon name="chevronRight" size={18} color={colors.textSecondary} />
                  </Card>
                </Pressable>
              ))}
            </View>
            </View>
          </View>
        )}
      </ScrollView>
      </Animated.View>
      </Animated.View>
      {selected && hasDock ? <View pointerEvents="none" style={[styles.dockFade, { height: clearance + spacing['3xl'] + (actions.length > 1 ? 64 : 0) }]}><LinearGradient colors={[`${colors.parchment}00`, colors.parchment, colors.parchment]} style={StyleSheet.absoluteFill} /></View> : null}
      {hasDock ? <FullWidthActionDock>
        <Animated.View key={stage} entering={reduceMotionEnabled || goingBack ? fadeIn : FadeIn.delay(180).duration(140)} style={styles.actions}>
          {isPromise ? <Button variant="inverse" fullWidth size="lg" onPress={() => advance('choices')}><ButtonLabel tone="default">Get started</ButtonLabel></Button> : actions.map((action, index) => (
            <Button key={action.pathId} fullWidth size="lg" variant={index === 0 ? 'primary' : 'ghost'} onPress={() => onStartPath(action.path)}>{action.label}</Button>
          ))}
        </Animated.View>
      </FullWidthActionDock> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.parchment, overflow: 'hidden' },
  pageCanvas: { backgroundColor: colors.parchment },
  stage: { flex: 1, overflow: 'hidden' },
  copyLayer: { flex: 1 },
  chrome: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  chromeSide: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'flex-start' },
  trailing: { alignItems: 'flex-end' },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing['3xl'] },
  promiseContent: { justifyContent: 'center' },
  illustratedContent: { paddingHorizontal: 0 },
  illustratedStory: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  storyCopy: { paddingHorizontal: spacing.xl, gap: spacing.lg, backgroundColor: colors.parchment },
  centered: { textAlign: 'center' },
  artwork: { position: 'absolute', alignSelf: 'center', width: '100%', maxWidth: 600, aspectRatio: 1, overflow: 'hidden' },
  squareArtwork: { width: '100%', height: '100%' },
  moneyArtwork: { position: 'absolute', left: 0 },
  artworkTopFade: { position: 'absolute', top: 0, left: 0, right: 0, height: spacing.xl },
  artworkBottomFade: { position: 'absolute', bottom: 0, left: 0, right: 0, height: spacing['3xl'] },
  dockFade: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  promise: { maxWidth: 520, alignSelf: 'center', gap: spacing.xl, paddingBottom: spacing['3xl'] },
  promiseLabel: { ...typography.body, fontFamily: fonts.medium, textAlign: 'center', color: colors.parchment },
  promiseTitle: { ...typography.titleXl, fontFamily: typography.body.fontFamily, textAlign: 'center', color: colors.parchment },
  story: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg },
  choiceStory: { flexGrow: 1, gap: 0 },
  choiceIntro: { gap: spacing.lg },
  // Keep the introduction anchored; balance choices within the remaining space
  // above the same reserved action dock used by subsequent pages. Intrinsic
  // content can still grow and scroll on short screens or with larger text.
  choiceRegion: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing['2xl'] },
  title: { ...typography.titleXl },
  secondary: { color: colors.textSecondary },
  choices: { gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 60, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  pressed: { opacity: 0.65 },
  rowCopy: { flex: 1, gap: spacing.xs },
  rowLabel: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  rowEmphasis: { fontFamily: fonts.semibold },
  actions: { gap: spacing.sm },
});
