import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useKeepAwake } from 'expo-keep-awake';
import { ArrowLeft, Minus, Music2, Plus, RotateCcw, VolumeX } from 'lucide-react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import { useGameMusic } from '@/src/capabilities/games/audio/useGameMusic';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { adjustDuration, formatTimerDuration, MAX_DURATION_MS, MIN_DURATION_MS } from './gameTimerDuration';
import { useGameTimer } from './useGameTimer';
import { useTimerTickAudio } from './useTimerTickAudio';

const DEFAULT_DURATION_MS = 60_000;
const PRESETS = [
  { durationMs: 30_000, label: '30 sec' },
  { durationMs: 60_000, label: '1 min' },
  { durationMs: 120_000, label: '2 min' },
  { durationMs: 300_000, label: '5 min' },
] as const;
const RING_SIZE = 320;
const RING_RADIUS = 143;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function RunningWakeLock() {
  useKeepAwake('games-timer');
  return null;
}

function TimerRing({ progress, urgent }: { progress: number; urgent: boolean }) {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" width="100%" height="100%" viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}>
      <Circle cx="160" cy="160" r={RING_RADIUS} fill="rgba(255,249,237,0.08)" stroke="rgba(255,249,237,0.18)" strokeWidth="12" />
      <G rotation="-90" origin="160, 160">
        <Circle
          cx="160"
          cy="160"
          r={RING_RADIUS}
          fill="transparent"
          stroke={urgent ? gamesTheme.colors.coral : gamesTheme.colors.turmeric}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${RING_CIRCUMFERENCE} ${RING_CIRCUMFERENCE}`}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.max(0, Math.min(1, progress)))}
        />
      </G>
      {Array.from({ length: 12 }, (_, index) => {
        const angle = index * 30 * Math.PI / 180;
        const x1 = 160 + Math.sin(angle) * 119;
        const y1 = 160 - Math.cos(angle) * 119;
        return <Circle key={index} cx={x1} cy={y1} r="2.4" fill="rgba(255,249,237,0.34)" />;
      })}
    </Svg>
  );
}

export function GameTimerScreen() {
  const { width, height } = useWindowDimensions();
  const isFocused = useIsFocused();
  const timer = useGameTimer();
  const soundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const feedback = useGameFeedback(soundEnabled);
  const [durationMs, setDurationMs] = useState(DEFAULT_DURATION_MS);
  const [musicOn, setMusicOn] = useState(false);
  const previousPhase = useRef(timer.phase);
  const previousSecond = useRef(timer.remainingSeconds);
  const tick = useTimerTickAudio(isFocused && soundEnabled && !musicOn);
  const ringSize = Math.min(width - 64, height * 0.42, 360);

  useGameMusic(isFocused && timer.phase === 'running' && musicOn ? 'game.clue-circle' : null, musicOn);

  useEffect(() => {
    if (isFocused && timer.phase === 'running' && timer.remainingSeconds !== previousSecond.current && timer.remainingSeconds > 0) void tick();
    previousSecond.current = timer.remainingSeconds;
  }, [isFocused, tick, timer.phase, timer.remainingSeconds]);

  useEffect(() => {
    if (isFocused && previousPhase.current === 'running' && timer.phase === 'finished') {
      void feedback.success('chime');
      void AccessibilityInfo.announceForAccessibility('Time is up');
    }
    previousPhase.current = timer.phase;
  }, [feedback, isFocused, timer.phase]);

  const startTimer = () => timer.start(durationMs);
  const displayTime = timer.phase === 'running'
    ? formatTimerDuration(timer.remainingMs)
    : formatTimerDuration(durationMs);
  const urgent = timer.phase === 'running' && timer.remainingSeconds <= 10;
  const progress = timer.phase === 'ready' ? 1 : timer.progress;

  return (
    <View style={styles.screen}>
      <LinearGradient colors={['#1B6650', '#0A3B31', '#061F1A']} style={StyleSheet.absoluteFillObject} />
      <View pointerEvents="none" style={styles.glowTop} />
      <View pointerEvents="none" style={styles.glowBottom} />
      {isFocused && timer.phase === 'running' ? <RunningWakeLock /> : null}
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to Games" onPress={() => router.back()} style={({ pressed }) => [styles.roundButton, pressed ? styles.pressed : null]}><ArrowLeft size={22} color={gamesTheme.colors.paper} /></Pressable>
          <Text style={styles.headerTitle}>Game Timer</Text>
          <Pressable accessibilityRole="switch" accessibilityState={{ checked: musicOn }} accessibilityLabel={musicOn ? 'Turn music off' : 'Turn music on'} onPress={() => setMusicOn((current) => !current)} style={({ pressed }) => [styles.musicButton, musicOn ? styles.musicButtonOn : null, pressed ? styles.pressed : null]}>
            {musicOn ? <Music2 size={18} color={gamesTheme.colors.ink} /> : <VolumeX size={18} color={gamesTheme.colors.paper} />}
            <Text style={[styles.musicLabel, musicOn ? styles.musicLabelOn : null]}>Music</Text>
          </Pressable>
        </View>

        <View style={styles.stage}>
          <Text style={styles.eyebrow}>{timer.phase === 'ready' ? 'CHOOSE A TIME' : timer.phase === 'running' ? 'TIME REMAINING' : 'ROUND COMPLETE'}</Text>
          <View style={[styles.timerFace, { width: ringSize, height: ringSize }]}>
            <TimerRing progress={progress} urgent={urgent} />
            <View accessible accessibilityLabel={timer.phase === 'running' ? `${timer.remainingSeconds} seconds remaining` : undefined} style={styles.timerCenter}>
              <Text style={[styles.timeValue, urgent ? styles.timeValueUrgent : null, timer.phase === 'finished' ? styles.finishedValue : null]}>{timer.phase === 'finished' ? 'Time!' : displayTime}</Text>
              <Text style={styles.timeDetail}>{timer.phase === 'ready' ? 'ready when you are' : timer.phase === 'running' ? 'remaining' : `${formatTimerDuration(durationMs)} round`}</Text>
            </View>
          </View>

          {timer.phase === 'ready' ? (
            <>
              <View style={styles.stepper}>
                <Pressable accessibilityRole="button" accessibilityLabel="Decrease timer by 15 seconds" disabled={durationMs === MIN_DURATION_MS} onPress={() => setDurationMs((current) => adjustDuration(current, -1))} style={({ pressed }) => [styles.stepButton, pressed ? styles.pressed : null, durationMs === MIN_DURATION_MS ? styles.disabled : null]}><Minus size={21} color={gamesTheme.colors.paper} /></Pressable>
                <Text style={styles.stepLabel}>±15 sec</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Increase timer by 15 seconds" disabled={durationMs === MAX_DURATION_MS} onPress={() => setDurationMs((current) => adjustDuration(current, 1))} style={({ pressed }) => [styles.stepButton, pressed ? styles.pressed : null, durationMs === MAX_DURATION_MS ? styles.disabled : null]}><Plus size={21} color={gamesTheme.colors.paper} /></Pressable>
              </View>
              <View accessibilityRole="tablist" style={styles.presets}>
                {PRESETS.map((preset) => {
                  const selected = durationMs === preset.durationMs;
                  return <Pressable key={preset.durationMs} accessibilityRole="button" accessibilityState={{ selected }} accessibilityLabel={`Set timer to ${preset.label}`} onPress={() => setDurationMs(preset.durationMs)} style={({ pressed }) => [styles.preset, selected ? styles.presetSelected : null, pressed ? styles.pressed : null]}><Text style={[styles.presetLabel, selected ? styles.presetLabelSelected : null]}>{preset.label}</Text></Pressable>;
                })}
              </View>
            </>
          ) : null}
        </View>

        <View style={styles.actions}>
          {timer.phase === 'running' ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Reset game timer" onPress={timer.reset} style={({ pressed }) => [styles.resetButton, pressed ? styles.pressed : null]}><RotateCcw size={17} color={gamesTheme.colors.paper} /><Text style={styles.resetLabel}>Reset</Text></Pressable>
          ) : (
            <GameButton accessibilityLabel={timer.phase === 'finished' ? `Start ${formatTimerDuration(durationMs)} timer again` : `Start ${formatTimerDuration(durationMs)} timer`} onPress={startTimer} tone="turmeric" style={styles.startButton}>
              {timer.phase === 'finished' ? 'Start again' : `Start ${formatTimerDuration(durationMs)}`}
            </GameButton>
          )}
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
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
  eyebrow: { marginBottom: 12, color: 'rgba(255,249,237,0.52)', fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.8 },
  timerFace: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000000', shadowOffset: { width: 0, height: 18 }, shadowOpacity: 0.3, shadowRadius: 24 },
  timerCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  timeValue: { color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.display, fontSize: 76, lineHeight: 82, letterSpacing: -3.5, fontVariant: ['tabular-nums'] },
  timeValueUrgent: { color: gamesTheme.colors.coral },
  finishedValue: { color: gamesTheme.colors.turmeric, fontSize: 58, letterSpacing: -2 },
  timeDetail: { marginTop: 2, color: 'rgba(255,249,237,0.58)', fontFamily: gamesTheme.type.utility, fontSize: 12 },
  stepper: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepButton: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  stepLabel: { minWidth: 48, textAlign: 'center', color: 'rgba(255,249,237,0.52)', fontFamily: gamesTheme.type.utility, fontSize: 11 },
  disabled: { opacity: 0.3 },
  presets: { marginTop: 14, flexDirection: 'row', gap: 7 },
  preset: { minWidth: 66, minHeight: 38, paddingHorizontal: 10, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
  presetSelected: { backgroundColor: gamesTheme.colors.paper, borderColor: gamesTheme.colors.paper },
  presetLabel: { color: 'rgba(255,249,237,0.68)', fontFamily: gamesTheme.type.utility, fontSize: 11 },
  presetLabelSelected: { color: gamesTheme.colors.ink },
  actions: { minHeight: 94, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2, paddingBottom: 12 },
  startButton: { width: '100%', maxWidth: 390 },
  resetButton: { minHeight: 48, paddingHorizontal: 20, borderRadius: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.09)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.16)' },
  resetLabel: { color: gamesTheme.colors.paper, fontFamily: gamesTheme.type.utility, fontSize: 13 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
