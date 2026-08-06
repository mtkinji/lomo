import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react-native';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { clueTargets } from '@/src/capabilities/games/domain/connectionPrompts';
import { advanceClueFinder, CLUE_TURN_SECONDS, finishClueTurn, formatClueTime, nextPromptIndex, recordClueResult, resolveClueMotion, startClueTurn, type ClueMotionState, type ClueRoundState } from '@/src/capabilities/games/domain/connectionGames';
import { PlayCard } from './ConnectionGameFrame';
import { useGameMusic } from '@/src/capabilities/games/audio/useGameMusic';

export function ClueCircleGame({ players, soundEnabled, onCorrectFeedback, onPassFeedback }: { players: string[]; soundEnabled: boolean; onCorrectFeedback?: () => void; onPassFeedback?: () => void }) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const [targetIndex, setTargetIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(CLUE_TURN_SECONDS);
  const [round, setRound] = useState<ClueRoundState>(() => ({ finderIndex: 0, turnScore: 0, scores: players.map(() => 0), phase: 'handoff' }));
  const [motionAvailable, setMotionAvailable] = useState(false);
  const motionState = useRef<ClueMotionState>('armed');
  const finder = players[round.finderIndex];
  useGameMusic(round.phase === 'playing' ? 'game.clue-circle' : null, soundEnabled);

  useEffect(() => { void DeviceMotion.isAvailableAsync().then(setMotionAvailable); }, []);
  const recordTarget = useCallback((result: 'correct' | 'pass') => {
    setRound((value) => recordClueResult(value, result));
    setTargetIndex((value) => nextPromptIndex(value, clueTargets.length));
    if (result === 'correct') onCorrectFeedback?.();
    else onPassFeedback?.();
  }, [onCorrectFeedback, onPassFeedback]);
  const correct = useCallback(() => recordTarget('correct'), [recordTarget]);
  const pass = useCallback(() => recordTarget('pass'), [recordTarget]);
  useEffect(() => {
    if (round.phase !== 'playing' || !motionAvailable) return;
    DeviceMotion.setUpdateInterval(90);
    const subscription = DeviceMotion.addListener(({ rotationRate }) => {
      const rate = rotationRate?.alpha ?? 0;
      const resolved = resolveClueMotion(rate, motionState.current);
      motionState.current = resolved.state;
      if (resolved.result === 'correct') correct();
      else if (resolved.result === 'pass') pass();
    });
    return () => subscription.remove();
  }, [correct, motionAvailable, pass, round.phase]);
  useEffect(() => {
    if (round.phase !== 'playing') return;
    const interval = setInterval(() => setSecondsRemaining((current) => {
      if (current <= 1) {
        clearInterval(interval);
        setRound((value) => finishClueTurn(value));
        return 0;
      }
      return current - 1;
    }), 1_000);
    return () => clearInterval(interval);
  }, [round.phase]);
  const ready = useCallback((fromMotion = false) => {
    setStarted(true);
    setSecondsRemaining(CLUE_TURN_SECONDS);
    motionState.current = fromMotion ? 'waiting-for-neutral' : 'armed';
    setRound((value) => startClueTurn(value));
  }, []);
  useEffect(() => {
    if (round.phase !== 'handoff' || !motionAvailable) return;
    DeviceMotion.setUpdateInterval(90);
    const subscription = DeviceMotion.addListener(({ rotationRate }) => {
      const resolved = resolveClueMotion(rotationRate?.alpha ?? 0, motionState.current);
      motionState.current = resolved.state;
      if (resolved.result === 'correct') {
        onCorrectFeedback?.();
        ready(true);
      }
    });
    return () => subscription.remove();
  }, [motionAvailable, onCorrectFeedback, ready, round.phase]);
  const continueCircle = () => {
    setSecondsRemaining(CLUE_TURN_SECONDS);
    setRound((value) => advanceClueFinder(value, players.length));
  };
  const restart = () => {
    setStarted(false);
    setTargetIndex(nextPromptIndex(targetIndex, clueTargets.length));
    setSecondsRemaining(CLUE_TURN_SECONDS);
    setRound({ finderIndex: 0, turnScore: 0, scores: players.map(() => 0), phase: 'handoff' });
  };

  if (round.phase === 'finished') {
    const total = round.scores.reduce((sum, score) => sum + score, 0);
    return <><PlayCard eyebrow="CIRCLE COMPLETE" title="Everyone took a turn." copy={`Together you found ${total} ${total === 1 ? 'target' : 'targets'}.`}>{players.map((player, index) => <View key={`${player}-${index}`} style={styles.scoreRow}><Text style={styles.scoreName}>{player}</Text><Text style={styles.scoreValue}>{round.scores[index]} correct</Text></View>)}</PlayCard><GameButton onPress={restart}>Play another circle</GameButton></>;
  }

  if (round.phase === 'handoff') return <View style={[styles.readyStage, { minHeight: Math.max(landscape ? 280 : 520, height - (landscape ? 62 : 140)) }]}>
    <Text style={styles.readyPlayer}>{started ? `Pass to ${finder}` : finder}</Text>
    <Text style={styles.readyCue}>Phone on forehead</Text>
    <Text accessibilityRole="header" style={styles.readyTitle}>Tilt down to start.</Text>
    <View style={styles.gestures}>
      <View style={styles.gesture}><ArrowDown size={20} color={gamesTheme.colors.ink} /><Text style={styles.gestureText}>Correct</Text></View>
      <View style={styles.gesture}><ArrowUp size={20} color={gamesTheme.colors.ink} /><Text style={styles.gestureText}>Pass</Text></View>
    </View>
    {!motionAvailable ? <GameButton style={styles.readyButton} onPress={() => ready()}>{started ? 'Ready' : 'Start'}</GameButton> : null}
  </View>;

  if (round.phase === 'turn-complete') {
    const lastFinder = round.finderIndex >= players.length - 1;
    return <><PlayCard eyebrow="TIME" title={`${finder} found ${round.turnScore}`} copy={lastFinder ? 'The circle is complete.' : 'Catch your breath, then pass the phone.'}><Text style={styles.turnResult}>{round.turnScore === 1 ? '1 correct target' : `${round.turnScore} correct targets`}</Text></PlayCard><GameButton onPress={continueCircle}>{lastFinder ? 'See our circle' : `Pass to ${players[round.finderIndex + 1]}`}</GameButton></>;
  }

  return <View style={[styles.playSurface, { minHeight: Math.max(landscape ? 280 : 520, height - (landscape ? 62 : 140)) }]}>
    <Text style={styles.clock}>{formatClueTime(secondsRemaining)}</Text>
    <View style={styles.targetArea}>
      <Text
        accessibilityRole="header"
        adjustsFontSizeToFit
        minimumFontScale={0.55}
        numberOfLines={2}
        style={[styles.target, landscape ? styles.targetLandscape : styles.targetPortrait]}
    >
        {clueTargets[targetIndex]}
      </Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  readyStage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 24, paddingVertical: 12 },
  readyPlayer: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.56)', fontSize: 13, letterSpacing: 1 },
  readyCue: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.56)', fontSize: 14 },
  readyTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 40, lineHeight: 44, textAlign: 'center' },
  gestures: { flexDirection: 'row', gap: 24, marginTop: 2 },
  gesture: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  gestureText: { fontFamily: gamesTheme.type.utility, color: gamesTheme.colors.ink, fontSize: 14 },
  readyButton: { minHeight: 46, minWidth: 132, marginTop: 8, paddingHorizontal: 24, shadowOffset: { width: 0, height: 4 } },
  turnResult: { fontFamily: gamesTheme.type.display, textAlign: 'center', color: gamesTheme.colors.turmeric, fontSize: 28, paddingTop: 8 },
  playSurface: { flex: 1, position: 'relative', alignItems: 'center', paddingHorizontal: 20 },
  clock: { position: 'absolute', top: 6, left: 0, right: 0, zIndex: 1, textAlign: 'center', fontFamily: gamesTheme.type.display, color: gamesTheme.colors.coralDark, fontSize: 22, fontVariant: ['tabular-nums'] },
  targetArea: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center', transform: [{ translateY: -18 }] },
  target: { width: '100%', fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, textAlign: 'center', includeFontPadding: false },
  targetLandscape: { fontSize: 88, lineHeight: 92, paddingHorizontal: 36 },
  targetPortrait: { fontSize: 76, lineHeight: 82, paddingHorizontal: 12 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10 },
  scoreName: { fontFamily: gamesTheme.type.utility, fontSize: 14, color: gamesTheme.colors.turmeric },
  scoreValue: { fontFamily: gamesTheme.type.body, fontSize: 14, color: gamesTheme.colors.white },
});
