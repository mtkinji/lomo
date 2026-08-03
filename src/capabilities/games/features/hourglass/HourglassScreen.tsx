import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { ArrowLeft, Music2, RotateCcw, Smartphone, VolumeX } from 'lucide-react-native';
import Svg, { Circle, ClipPath, Defs, LinearGradient as SvgGradient, Line, Path, Rect, Stop } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import { useGameMusic } from '@/src/capabilities/games/audio/useGameMusic';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import type { HourglassEnd } from './hourglassMotion';
import { useHourglassTimer, type HourglassTimerState } from './useHourglassTimer';
import { usePhysicalHourglassMotion } from './usePhysicalHourglassMotion';

const FLIP_MS = 520;

function RunningWakeLock() {
  useKeepAwake('games-hourglass');
  return null;
}

type HourglassStyle = 'physical' | 'classic' | 'simple';
type HourglassArtProps = Pick<HourglassTimerState, 'phase'> & {
  progress: number;
  flowDirection?: 'down' | 'up';
  restingEnd?: HourglassEnd;
};

function HourglassArt({ phase, progress, flowDirection = 'down', restingEnd = 'upright' }: HourglassArtProps) {
  const running = phase === 'running';
  const upperProgress = running
    ? (flowDirection === 'down' ? progress : 1 - progress)
    : (restingEnd === 'inverted' ? 1 : 0);
  const lowerProgress = running
    ? (flowDirection === 'down' ? 1 - progress : progress)
    : (restingEnd === 'upright' ? 1 : 0);
  const upperHeight = 100 * upperProgress;
  const upperY = 72 + (100 - upperHeight);
  const lowerHeight = 105 * lowerProgress;
  const lowerY = 298 - lowerHeight;
  const flowing = running && progress > 0;

  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width="100%" height="100%" viewBox="0 0 260 370">
      <Defs>
        <SvgGradient id="wood" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B78353" />
          <Stop offset="0.48" stopColor="#75452D" />
          <Stop offset="1" stopColor="#4A281B" />
        </SvgGradient>
        <SvgGradient id="sand" x1="0" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor="#FFE78D" />
          <Stop offset="0.55" stopColor="#F8CF52" />
          <Stop offset="1" stopColor="#D99A2B" />
        </SvgGradient>
        <SvgGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.18" />
          <Stop offset="0.45" stopColor="#FFFFFF" stopOpacity="0.04" />
          <Stop offset="1" stopColor="#D6FFF1" stopOpacity="0.2" />
        </SvgGradient>
        <ClipPath id="glass-clip">
          <Path d="M61 59H199C199 115 174 151 139 184C174 217 199 255 199 311H61C61 255 86 217 121 184C86 151 61 115 61 59Z" />
        </ClipPath>
      </Defs>

      <Circle cx="130" cy="186" r="116" fill="#061F1A" opacity="0.22" />
      <Path d="M61 59H199C199 115 174 151 139 184C174 217 199 255 199 311H61C61 255 86 217 121 184C86 151 61 115 61 59Z" fill="url(#glass)" stroke="#D6FFF1" strokeOpacity="0.48" strokeWidth="4" />

      <Rect x="58" y={upperY} width="144" height={upperHeight} fill="url(#sand)" clipPath="url(#glass-clip)" />
      <Rect x="58" y={lowerY} width="144" height={lowerHeight} fill="url(#sand)" clipPath="url(#glass-clip)" />
      {flowing ? <Line x1="130" y1={flowDirection === 'down' ? 181 : 189} x2="130" y2={flowDirection === 'down' ? 270 : 100} stroke="#FFE78D" strokeWidth="4" strokeLinecap="round" /> : null}
      {flowing && flowDirection === 'down' && lowerHeight > 4 ? <Path d={`M92 ${lowerY + 10} Q130 ${Math.max(209, lowerY - 20)} 168 ${lowerY + 10}Z`} fill="#F8CF52" clipPath="url(#glass-clip)" /> : null}
      {flowing && flowDirection === 'up' && upperHeight > 4 ? <Path d={`M92 ${upperY + upperHeight - 10} Q130 ${Math.min(161, upperY + upperHeight + 20)} 168 ${upperY + upperHeight - 10}Z`} fill="#F8CF52" clipPath="url(#glass-clip)" /> : null}

      <Line x1="55" y1="51" x2="55" y2="319" stroke="url(#wood)" strokeWidth="14" strokeLinecap="round" />
      <Line x1="205" y1="51" x2="205" y2="319" stroke="url(#wood)" strokeWidth="14" strokeLinecap="round" />
      <Rect x="35" y="34" width="190" height="32" rx="13" fill="url(#wood)" />
      <Rect x="35" y="304" width="190" height="32" rx="13" fill="url(#wood)" />
      <Rect x="50" y="40" width="160" height="5" rx="2.5" fill="#E7B778" opacity="0.45" />
      <Rect x="50" y="310" width="160" height="5" rx="2.5" fill="#E7B778" opacity="0.32" />
      <Path d="M76 74C82 121 99 149 125 178" fill="none" stroke="#FFFFFF" strokeOpacity="0.36" strokeWidth="5" strokeLinecap="round" />
    </Svg>
  );
}

const STYLE_OPTIONS: { value: HourglassStyle; label: string }[] = [
  { value: 'physical', label: 'Physical' },
  { value: 'classic', label: 'Classic' },
  { value: 'simple', label: 'Simple' },
];

function HourglassStylePicker({ value, onChange }: { value: HourglassStyle; onChange: (value: HourglassStyle) => void }) {
  return (
    <View accessibilityRole="tablist" style={styles.stylePicker}>
      {STYLE_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={`${option.label} style`}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [styles.styleOption, selected ? styles.styleOptionSelected : null, pressed ? styles.pressed : null]}
          >
            <Text style={[styles.styleOptionLabel, selected ? styles.styleOptionLabelSelected : null]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function SimpleTimerFace({
  phase,
  seconds,
  onStart,
}: {
  phase: HourglassTimerState['phase'];
  seconds: number;
  onStart: () => void;
}) {
  const content = (
    <View
      accessible={phase === 'running'}
      accessibilityLabel={phase === 'running' ? `${seconds} seconds remaining` : undefined}
      style={[styles.simpleDial, phase === 'finished' ? styles.simpleDialFinished : null]}
    >
      <Text style={[styles.simpleValue, phase === 'finished' ? styles.simpleValueFinished : null]}>{phase === 'finished' ? 'Time!' : seconds}</Text>
      <Text style={styles.simpleDetail}>{phase === 'finished' ? 'Tap for another turn' : phase === 'running' ? 'seconds remaining' : 'tap to start'}</Text>
    </View>
  );

  if (phase === 'running') return content;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={phase === 'finished' ? 'Start simple timer again for 60 seconds' : 'Start simple timer for 60 seconds'}
      onPress={onStart}
      style={({ pressed }) => [styles.simplePressable, pressed ? styles.simplePressed : null]}
    >
      {content}
    </Pressable>
  );
}

export function HourglassScreen() {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const timer = useHourglassTimer();
  const defaultSoundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const hourglassStyle = useGamesSettingsStore((state) => state.hourglassStyle);
  const setHourglassStyle = useGamesSettingsStore((state) => state.setHourglassStyle);
  const feedback = useGameFeedback(defaultSoundEnabled);
  const [musicOn, setMusicOn] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [flipping, setFlipping] = useState(false);
  const [physicalFlowEnd, setPhysicalFlowEnd] = useState<HourglassEnd>('upright');
  const flip = useRef(new Animated.Value(0)).current;
  const mounted = useRef(true);
  const previousPhase = useRef(timer.phase);
  const artWidth = Math.min(width * 0.66, height * 0.35, 284);

  useGameMusic(isFocused && timer.phase === 'running' && musicOn ? 'game.clue-circle' : null, musicOn);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => () => {
    mounted.current = false;
    flip.stopAnimation();
  }, [flip]);

  useEffect(() => {
    if (isFocused && previousPhase.current === 'running' && timer.phase === 'finished') {
      void feedback.success('chime');
      void AccessibilityInfo.announceForAccessibility('Time is up');
    }
    previousPhase.current = timer.phase;
  }, [feedback, isFocused, timer.phase]);

  const startTimer = (animate: boolean) => {
    if (flipping || timer.phase === 'running') return;
    if (!animate || reduceMotion) {
      timer.start();
      return;
    }
    setFlipping(true);
    timer.start();
    flip.setValue(0);
    Animated.timing(flip, {
      toValue: 1,
      duration: FLIP_MS,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      if (!mounted.current) return;
      flip.setValue(0);
      setFlipping(false);
    });
  };

  const startFromPhysicalEnd = (end: HourglassEnd) => {
    setPhysicalFlowEnd(end);
    startTimer(false);
  };

  const physicalMotion = usePhysicalHourglassMotion({
    enabled: isFocused && hourglassStyle === 'physical' && timer.phase !== 'running',
    onFlip: startFromPhysicalEnd,
  });

  const startPhysicalByTouch = () => {
    setPhysicalFlowEnd('upright');
    startTimer(true);
  };
  const physicalGuidance = physicalMotion.availability === 'checking'
    ? 'Checking motion…'
    : physicalMotion.availability === 'unavailable'
      ? 'Motion unavailable · tap to start'
      : physicalMotion.armedEnd === null
        ? 'Hold phone upright'
        : timer.phase === 'finished'
          ? 'Turn phone over again'
          : 'Turn phone over';

  const statusTitle = timer.phase === 'finished' ? 'Time!' : timer.phase === 'running' ? `${timer.remainingSeconds}` : '60';
  const statusDetail = timer.phase === 'finished' ? 'Ready for the next turn.' : 'seconds';
  const physicalStatusDetail = timer.phase === 'running' ? 'seconds' : physicalGuidance;
  const statusAccessibilityLabel = timer.phase === 'running'
    ? `${timer.remainingSeconds} seconds remaining`
    : timer.phase === 'finished'
      ? `Time is up. ${hourglassStyle === 'physical' ? physicalGuidance : 'Ready for the next turn'}`
      : hourglassStyle === 'physical'
        ? `60-second hourglass ready. ${physicalGuidance}`
        : '60-second hourglass ready';
  const rotation = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const physicalContentRotation = physicalFlowEnd === 'inverted' ? '180deg' : '0deg';

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#1B6650', '#0A3B31', '#061F1A']} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      {isFocused && timer.phase === 'running' ? <RunningWakeLock /> : null}
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to Games" onPress={() => router.back()} style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}>
            <ArrowLeft size={22} color={gamesTheme.colors.paper} />
          </Pressable>
          <Text style={styles.headerTitle}>Hourglass</Text>
          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: musicOn }}
            accessibilityLabel={musicOn ? 'Turn music off' : 'Turn music on'}
            onPress={() => setMusicOn((current) => !current)}
            style={({ pressed }) => [styles.musicButton, musicOn ? styles.musicButtonOn : null, pressed ? styles.pressed : null]}
          >
            {musicOn ? <Music2 size={18} color={gamesTheme.colors.ink} /> : <VolumeX size={18} color={gamesTheme.colors.paper} />}
            <Text style={[styles.musicLabel, musicOn ? styles.musicLabelOn : null]}>Music</Text>
          </Pressable>
        </View>

        <HourglassStylePicker value={hourglassStyle} onChange={setHourglassStyle} />

        <View style={styles.stage}>
          {hourglassStyle === 'simple' ? (
            <SimpleTimerFace phase={timer.phase} seconds={timer.remainingSeconds} onStart={() => startTimer(false)} />
          ) : (
            <>
              <Animated.View style={[styles.art, { width: artWidth, height: artWidth * 1.42, transform: [{ rotate: flipping ? rotation : '0deg' }] }]}>
                <HourglassArt
                  phase={flipping ? 'ready' : timer.phase}
                  progress={flipping ? 0 : timer.progress}
                  flowDirection={hourglassStyle === 'physical' && physicalFlowEnd === 'inverted' ? 'up' : 'down'}
                  restingEnd={flipping ? 'upright' : hourglassStyle === 'physical' ? (physicalMotion.armedEnd ?? physicalFlowEnd) : 'upright'}
                />
              </Animated.View>
              <View style={[styles.status, hourglassStyle === 'physical' ? { transform: [{ rotate: physicalContentRotation }] } : null]}>
                <Text
                  accessibilityLabel={statusAccessibilityLabel}
                  style={[styles.statusTitle, timer.phase === 'finished' ? styles.finishedTitle : null]}
                >
                  {statusTitle}
                </Text>
                <Text accessible={false} style={styles.statusDetail}>{hourglassStyle === 'physical' ? physicalStatusDetail : statusDetail}</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.actions}>
          {timer.phase === 'running' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Reset hourglass" onPress={timer.reset} style={({ pressed }) => [styles.resetButton, pressed ? styles.pressed : null]}>
              <RotateCcw size={17} color={gamesTheme.colors.paper} />
              <Text style={styles.resetLabel}>Reset</Text>
            </Pressable>
          ) : hourglassStyle === 'classic' ? (
            <GameButton accessibilityLabel={timer.phase === 'finished' ? 'Flip hourglass again for 60 seconds' : 'Flip hourglass for 60 seconds'} disabled={flipping} onPress={() => startTimer(true)} tone="turmeric" style={styles.flipButton}>
              {timer.phase === 'finished' ? 'Flip again' : 'Flip hourglass'}
            </GameButton>
          ) : hourglassStyle === 'physical' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Start hourglass by touch" onPress={startPhysicalByTouch} style={({ pressed }) => [styles.touchFallback, pressed ? styles.pressed : null]}>
              <Smartphone size={17} color={gamesTheme.colors.paper} />
              <Text style={styles.touchFallbackLabel}>Tap to flip</Text>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: gamesTheme.colors.feltDark, overflow: 'hidden' },
  safe: { flex: 1, paddingHorizontal: 18 },
  glowTop: { position: 'absolute', top: -130, right: -100, width: 330, height: 330, borderRadius: 165, backgroundColor: gamesTheme.colors.turmeric, opacity: 0.1 },
  glowBottom: { position: 'absolute', bottom: -150, left: -110, width: 360, height: 360, borderRadius: 180, backgroundColor: gamesTheme.colors.coral, opacity: 0.08 },
  header: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { position: 'absolute', left: 76, right: 76, textAlign: 'center', color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.display, fontSize: 17 },
  roundButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  musicButton: { minWidth: 92, height: 42, paddingHorizontal: 12, borderRadius: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  musicButtonOn: { backgroundColor: gamesTheme.colors.turmeric, borderColor: gamesTheme.colors.turmeric },
  musicLabel: { color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.utility, fontSize: 12 },
  musicLabelOn: { color: gamesTheme.colors.ink },
  stylePicker: { alignSelf: 'center', flexDirection: 'row', gap: 3, padding: 4, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  styleOption: { minHeight: 36, minWidth: 86, paddingHorizontal: 13, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  styleOptionSelected: { backgroundColor: 'rgba(255,249,237,0.16)' },
  styleOptionLabel: { color: 'rgba(255,249,237,0.6)', fontFamily: gamesTheme.type.utility, fontSize: 12 },
  styleOptionLabelSelected: { color: gamesTheme.colors.paper },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  art: { maxHeight: 430, shadowColor: '#000000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.35, shadowRadius: 24 },
  status: { marginTop: -4, alignItems: 'center', minHeight: 80 },
  statusTitle: { color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.display, fontSize: 44, lineHeight: 48, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
  finishedTitle: { color: gamesTheme.colors.turmeric },
  statusDetail: { marginTop: 2, color: 'rgba(255,249,237,0.62)', fontFamily: gamesTheme.type.body, fontSize: 14 },
  simplePressable: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  simplePressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  simpleDial: { width: 264, height: 264, borderRadius: 132, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,249,237,0.08)', borderWidth: 3, borderColor: 'rgba(255,249,237,0.28)', shadowColor: '#000000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.3, shadowRadius: 24 },
  simpleDialFinished: { borderColor: gamesTheme.colors.turmeric, backgroundColor: 'rgba(244,185,66,0.1)' },
  simpleValue: { color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.display, fontSize: 112, lineHeight: 118, letterSpacing: -5, fontVariant: ['tabular-nums'] },
  simpleValueFinished: { color: gamesTheme.colors.turmeric, fontSize: 64, letterSpacing: -2 },
  simpleDetail: { marginTop: 6, color: 'rgba(255,249,237,0.62)', fontFamily: gamesTheme.type.utility, fontSize: 13 },
  actions: { minHeight: 92, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4, paddingBottom: 12 },
  flipButton: { width: '100%', maxWidth: 380 },
  resetButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  resetLabel: { color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.utility, fontSize: 13 },
  touchFallback: { minHeight: 48, paddingHorizontal: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  touchFallbackLabel: { color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.utility, fontSize: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
