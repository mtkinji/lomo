import { useEffect, useState } from 'react';
import Animated, { Easing, FadeIn, FadeInUp, FadeOut, ReduceMotion, SlideInLeft, SlideInRight, useAnimatedStyle, useSharedValue, withTiming, type ExitAnimationsValues } from 'react-native-reanimated';
import { ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing, typography } from '../../theme';
import { Button } from '../../ui/Button';
import { ChoicePill } from '../../ui/ChoicePill';
import { FullWidthActionDock, useFullWidthActionDockClearance } from '../../ui/FullWidthActionDock';
import { Icon, type IconName } from '../../ui/Icon';
import { Logo } from '../../ui/Logo';
import { Text } from '../../ui/Typography';
import { useAccessibilityPreferences } from '../../ui/hooks/useAccessibilityPreferences';
import { OnboardingShorelineBackdrop } from './OnboardingShorelineBackdrop';
import { OnboardingQuote } from './OnboardingQuote';
import { AtmosphericInvitationScreen } from './AtmosphericInvitationScreen';
import type { CapabilityOnboardingContract, CapabilityOnboardingPathId } from './capabilityOnboardingContracts';

type Starter = {
  id: string; label: string; emphasis: string; promise: string; icon: IconName;
  quotes: readonly [string, ...string[]];
  actions: { pathId: CapabilityOnboardingPathId; label: string }[];
};

// Invitations are presentation only; setup begins at the existing capability handoff.
const STARTERS: Starter[] = [
  {
    id: 'money', label: 'Make a plan for your money', emphasis: 'plan', icon: 'wallet',
    promise: 'See where it goes. Make a plan together.',
    quotes: [
      'I still shop on Amazon. But having to pause when I’m over budget has helped me leave the impulse buys behind.',
      'I had no idea we were spending so much on groceries. Just seeing the total helped us start saving a lot.',
      'Before I go shopping, I glance at the widget on my iPhone Home Screen. I can see how much I have left without even opening the app.',
    ],
    actions: [{ pathId: 'budget-app-controls', label: 'Make a plan for my money' }],
  },
  {
    id: 'screen', label: 'Make room for less screen time', emphasis: 'screen time', icon: 'smartphone',
    promise: 'Set limits that work for you or your family.',
    quotes: [
      'I wanted more evenings where my phone wasn’t the main event. Having a limit helps me put it down.',
      'A pause is often all I need to remember what I meant to be doing.',
      'I still enjoy my favorite apps. I just want a little more say in when I stop.',
    ],
    actions: [{ pathId: 'screen-time-controls', label: 'Make room for less screen time' }],
  },
  {
    id: 'household', label: 'Plan meals together', emphasis: 'meals', icon: 'home',
    promise: 'Bring everyone’s ideas into dinner and the grocery list.',
    quotes: [
      'Everyone gets a say in dinner now. I don’t have to come up with every idea myself.',
      'We put our dinner ideas in one place, and the grocery list follows the plan.',
      'Knowing what we’re cooking makes the end of the day feel a little easier.',
    ],
    actions: [{ pathId: 'make-meals-easier', label: 'Make dinner a shared plan' }],
  },
  {
    id: 'goals', label: 'Set goals and get help reaching them', emphasis: 'goals', icon: 'goals',
    promise: 'Get organized and make time for what you want to do.',
    quotes: [
      'I kept waiting for a clear afternoon to work on my goal. Breaking it into smaller steps helped me start.',
      'My goal feels less far away when I can see one thing to do today.',
      'I don’t need to figure out the whole journey. I just need a next step I can take.',
    ],
    actions: [{ pathId: 'make-progress', label: 'Find my first step' }],
  },
];

export function HouseholdStarterFlow({ paths, onStartPath, onExplore }: {
  paths: CapabilityOnboardingContract[];
  onStartPath: (path: CapabilityOnboardingContract) => void;
  onExplore: () => void;
}) {
  const [stage, setStage] = useState('promise');
  const [goingBack, setGoingBack] = useState(false);
  const [advancedScreenTime, setAdvancedScreenTime] = useState(false);
  const [familyScreenTime, setFamilyScreenTime] = useState(false);
  const travelDirection = useSharedValue(1);
  const { reduceMotionEnabled, screenReaderEnabled } = useAccessibilityPreferences();
  const shorelineOpacity = useSharedValue(1);
  const shorelineStyle = useAnimatedStyle(() => ({ opacity: shorelineOpacity.value }));
  const insets = useSafeAreaInsets();
  const clearance = useFullWidthActionDockClearance('restingFloatingControl');
  const starters = STARTERS.filter((item) => item.actions.some((action) => paths.some((path) => path.id === action.pathId)));
  const selected = starters.find((item) => item.id === stage);
  const isPromise = stage === 'promise';
  const isChoices = stage === 'choices';
  const isCapabilityInvitation = selected != null && selected.id !== 'money';
  const isScreenTime = selected?.id === 'screen';
  const choiceReveal = (index: number) => !reduceMotionEnabled && !screenReaderEnabled && !goingBack
    ? FadeInUp.withInitialValues({ opacity: 0, transform: [{ translateY: 8 }] })
      .delay(200 + index * 500).duration(950).easing(Easing.bezier(0.25, 0.1, 0.25, 1))
    : undefined;
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
  const advance = (next: string) => { travelDirection.value = 1; setGoingBack(false); setAdvancedScreenTime(false); setFamilyScreenTime(false); setStage(next); };
  const actions = selected?.actions.flatMap((action) => {
    const path = paths.find((candidate) => candidate.id === action.pathId);
    return path ? [{ ...action, path }] : [];
  }) ?? [];
  const hasDock = actions.length > 0 && !isScreenTime;
  const startScreenTime = (suggestedKind?: 'daily_limit' | 'focus' | 'real_step') => {
    const path = actions[0]?.path;
    if (path) onStartPath({ ...path, handoff: { kind: 'screen-time-setup', suggestedKind } });
  };
  const back = () => {
    travelDirection.value = -1; setGoingBack(true);
    if (familyScreenTime) { setFamilyScreenTime(false); return; }
    if (advancedScreenTime) { setAdvancedScreenTime(false); return; }
    setStage(selected ? 'choices' : 'promise');
  };

  return (
    <View style={[styles.root, (isChoices || isCapabilityInvitation) && styles.choiceCanvas]} testID="onboarding.householdStarter">
      <StatusBar style={isPromise ? 'light' : 'dark'} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, shorelineStyle]}>
        <OnboardingShorelineBackdrop active={isPromise} tone="dark" />
      </Animated.View>
      {isPromise ? <AtmosphericInvitationScreen variant="promise"
        identity="Kwilt. One app for life."
        message="Built to help you get—and keep—your house in order."
        actionLabel="Get started" onContinue={() => advance('choices')} returning={goingBack} /> : <>
      <View style={[styles.chrome, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.chromeSide}>
          {!isPromise ? <Button variant="ghost" size="icon" accessibilityLabel="Back" onPress={back}><Icon name="chevronLeft" size={24} color={colors.textPrimary} /></Button> : null}
        </View>
        <Logo size={28} variant={isPromise ? 'parchment' : 'default'} />
        <View style={[styles.chromeSide, styles.trailing]}>
          {!isPromise ? <Button variant="ghost" size="md" onPress={onExplore}><Text style={styles.skipLink}>Skip</Text></Button> : null}
        </View>
      </View>
      <Animated.View key={stage} entering={isPromise && !goingBack ? undefined : pageEntrance} exiting={reduceMotionEnabled ? fadeOut : pageExit} style={[styles.stage, !isPromise && styles.pageCanvas, (isChoices || isCapabilityInvitation) && styles.choiceCanvas]}>
      <Animated.View entering={isChoices ? undefined : copyEntrance} style={styles.copyLayer}>
      <ScrollView key={stage} bounces={false} alwaysBounceVertical={false} overScrollMode="never" contentContainerStyle={[styles.content, { paddingBottom: clearance + (actions.length > 1 ? 64 : 0) }]} showsVerticalScrollIndicator={false}>
        {isCapabilityInvitation ? (
          <View style={[styles.story, styles.choiceStory]}>
            <Animated.View entering={choiceReveal(0)} style={styles.choiceIntro}>
              <Text accessibilityRole="header" style={[styles.title, styles.choiceTitle]}>{isScreenTime
                ? familyScreenTime ? 'Manage a child’s screen time.' : advancedScreenTime ? 'Make progress before opening your apps.' : 'Make room for life off-screen.'
                : selected.id === 'goals' ? 'Turn a goal into a next step.' : 'Bring everyone’s ideas to the table.'}</Text>
              <Text variant="body" style={styles.secondary}>{isScreenTime
                ? familyScreenTime ? 'Set local limits on your child’s iPhone. Managing their device from your phone requires Kwilt Pro and a connected household device.' : advancedScreenTime ? 'Pro connects app access to your progress and budgets.' : 'Start with a simple limit.'
                : selected.id === 'goals' ? 'Start with something you want to do.' : 'Start with one meal. Invite your household when you’re ready.'}</Text>
            </Animated.View>
            {isScreenTime ? <View style={styles.choiceRegion}><Animated.View entering={choiceReveal(1)} style={styles.choices}>
              {familyScreenTime ? <>
                <ChoicePill icon="smartphone" label="On this child’s iPhone" emphasis="child’s iPhone" onPress={() => {
                  const path = actions[0]?.path;
                  if (path) onStartPath({ ...path, handoff: { kind: 'screen-time-family', device: 'child' } });
                }} />
                <ChoicePill icon="home" label="From my phone" emphasis="my phone" onPress={() => {
                  const path = actions[0]?.path;
                  if (path) onStartPath({ ...path, handoff: { kind: 'screen-time-family', device: 'caregiver' } });
                }} />
              </> : advancedScreenTime ? <>
                <ChoicePill icon="goals" label="Make progress before opening apps" emphasis="progress" onPress={() => startScreenTime('real_step')} />
                <Button variant="ghost" onPress={() => startScreenTime()}><Text style={styles.skipLink}>Explore budget controls</Text></Button>
                <Button variant="ghost" onPress={() => setAdvancedScreenTime(false)}><Text style={styles.skipLink}>Use a daily limit or Focus instead</Text></Button>
              </> : <>
                <ChoicePill icon="estimate" label="Set a daily limit" emphasis="daily limit" onPress={() => startScreenTime('daily_limit')} />
                <ChoicePill icon="goals" label="Protect a Focus session" emphasis="Focus session" onPress={() => startScreenTime('focus')} />
                <Button variant="ghost" onPress={() => setAdvancedScreenTime(true)}><Text style={styles.skipLink}>Explore advanced controls</Text></Button>
                <Button variant="ghost" onPress={() => setFamilyScreenTime(true)}><Text style={styles.skipLink}>Set up for a child</Text></Button>
              </>}
            </Animated.View></View> : null}
          </View>
        ) : selected ? (
          <OnboardingQuote key={selected.id} quotes={selected.quotes} />
        ) : (
          <View style={[styles.story, styles.choiceStory]}>
            <Animated.View entering={choiceReveal(0)} style={styles.choiceIntro}>
              <Text accessibilityRole="header" style={[styles.title, styles.choiceTitle]}>Let’s get your house in order.</Text>
              <Text variant="body" style={styles.secondary}>We can start with just one thing.</Text>
            </Animated.View>
            <View style={styles.choiceRegion}>
            <Animated.View entering={choiceReveal(1)} style={styles.choices}>
              {starters.map((item) => (
                <ChoicePill key={item.id} icon={item.icon} label={item.label} emphasis={item.emphasis}
                  hint={item.promise} onPress={() => advance(item.id)} />
              ))}
            </Animated.View>
            </View>
          </View>
        )}
      </ScrollView>
      </Animated.View>
      </Animated.View>
      {selected && hasDock && !isCapabilityInvitation ? <View pointerEvents="none" style={[styles.dockFade, { height: clearance + spacing['3xl'] + (actions.length > 1 ? 64 : 0) }]}><LinearGradient colors={[`${colors.parchment}00`, colors.parchment, colors.parchment]} style={StyleSheet.absoluteFill} /></View> : null}
      {hasDock ? <FullWidthActionDock placement="restingFloatingControl" dockTestID="onboarding.householdActionDock">
        <Animated.View key={stage} entering={reduceMotionEnabled || goingBack ? fadeIn : FadeIn.delay(180).duration(140)} style={styles.actions}>
          {actions.map((action, index) => (
            <Button key={action.pathId} fullWidth size="lg" variant={index === 0 ? 'primary' : 'ghost'} onPress={() => onStartPath(action.path)}>{selected?.id === 'goals' ? 'Shape a goal' : selected?.id === 'household' ? 'Choose a recipe' : action.label}</Button>
          ))}
        </Animated.View>
      </FullWidthActionDock> : null}
      </>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.parchment, overflow: 'hidden' },
  pageCanvas: { backgroundColor: colors.parchment },
  choiceCanvas: { backgroundColor: colors.card },
  choiceTitle: { fontFamily: fonts.medium, lineHeight: 40 },
  skipLink: { fontFamily: fonts.regular, fontSize: 15, color: colors.textSecondary, textDecorationLine: 'underline' },
  stage: { flex: 1, overflow: 'hidden' },
  copyLayer: { flex: 1 },
  chrome: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexDirection: 'row', alignItems: 'center' },
  chromeSide: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'flex-start' },
  trailing: { alignItems: 'flex-end' },
  content: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing['3xl'] },
  dockFade: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  story: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: spacing.lg },
  choiceStory: { flexGrow: 1, gap: 0 },
  choiceIntro: { gap: spacing.lg },
  // Keep the introduction anchored; balance choices within the remaining space
  // above the same reserved action dock used by subsequent pages. Intrinsic
  // content can still grow and scroll on short screens or with larger text.
  choiceRegion: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing['2xl'] },
  title: { ...typography.titleXl },
  secondary: { color: colors.textSecondary },
  choices: { gap: spacing.md },
  actions: { gap: spacing.sm },
});
