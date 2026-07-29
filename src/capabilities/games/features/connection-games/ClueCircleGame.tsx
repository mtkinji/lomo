import { useCallback, useEffect, useRef, useState } from 'react';
import { RotateCcw, Smartphone } from 'lucide-react-native';
import DeviceMotion from 'expo-sensors/build/DeviceMotion';
import { StyleSheet, Text, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { clueModes, clueTargets } from '@/src/capabilities/games/domain/connectionPrompts';
import { advanceClueRound, CLUE_TARGETS_PER_PLAYER, nextPromptIndex, type ClueRoundState } from '@/src/capabilities/games/domain/connectionGames';
import { PlayCard } from './ConnectionGameFrame';

export function ClueCircleGame({ players }: { players: string[] }) {
  const [targetIndex, setTargetIndex] = useState(0);
  const [clueModeIndex, setClueModeIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState<ClueRoundState>(() => ({ finderIndex: 0, attempts: 0, scores: players.map(() => 0), phase: 'handoff' }));
  const [motionAvailable, setMotionAvailable] = useState(false);
  const lastMotion = useRef(0);
  const finder = players[round.finderIndex];

  useEffect(() => { void DeviceMotion.isAvailableAsync().then(setMotionAvailable); }, []);
  const recordTarget = useCallback((correct: boolean) => {
    setRound((value) => advanceClueRound(value, players.length, correct));
    setTargetIndex((value) => nextPromptIndex(value, clueTargets.length));
    setClueModeIndex((value) => nextPromptIndex(value, clueModes.length));
  }, [players.length]);
  const correct = useCallback(() => recordTarget(true), [recordTarget]);
  const anotherClue = useCallback(() => setClueModeIndex((value) => nextPromptIndex(value, clueModes.length)), []);
  useEffect(() => {
    if (round.phase !== 'playing' || !motionAvailable) return;
    DeviceMotion.setUpdateInterval(90);
    const subscription = DeviceMotion.addListener(({ rotationRate }) => {
      const rate = rotationRate?.alpha ?? 0;
      const now = Date.now();
      if (now - lastMotion.current < 900) return;
      if (rate > 95) { lastMotion.current = now; correct(); }
      else if (rate < -95) { lastMotion.current = now; anotherClue(); }
    });
    return () => subscription.remove();
  }, [anotherClue, correct, motionAvailable, round.phase]);
  const ready = () => { setStarted(true); setRound((value) => ({ ...value, phase: 'playing' })); };
  const restart = () => {
    setStarted(false);
    setTargetIndex(nextPromptIndex(targetIndex, clueTargets.length));
    setClueModeIndex(0);
    setRound({ finderIndex: 0, attempts: 0, scores: players.map(() => 0), phase: 'handoff' });
  };

  if (round.phase === 'finished') {
    const total = round.scores.reduce((sum, score) => sum + score, 0);
    return <><PlayCard eyebrow="CIRCLE COMPLETE" title="Everyone took a turn." copy={`Together you found ${total} ${total === 1 ? 'clue' : 'clues'}.`}>{players.map((player, index) => <View key={`${player}-${index}`} style={styles.scoreRow}><Text style={styles.scoreName}>{player}</Text><Text style={styles.scoreValue}>{round.scores[index]} correct</Text></View>)}</PlayCard><GameButton onPress={restart}>Play another circle</GameButton></>;
  }

  if (round.phase === 'handoff') return <><PlayCard eyebrow={started ? 'PASS THE PHONE' : 'DEVICE AS THE CARD'} title={started ? `Pass to ${finder}` : `${finder}, hold the phone to your forehead.`} copy={started ? `They get ${CLUE_TARGETS_PER_PLAYER} targets. Keep the screen hidden until it reaches their forehead.` : `Everyone else will see the target. Bow forward for correct. Lean back for another clue. Touch controls stay available.`}><View style={styles.phone}><Smartphone size={50} color={gamesTheme.colors.turmeric} /><Text style={styles.phoneText}>{motionAvailable ? 'Motion ready' : 'Touch controls ready'}</Text></View></PlayCard><GameButton onPress={ready}>{started ? `${finder} is ready` : 'Show the first clue'}</GameButton></>;

  const score = round.scores[round.finderIndex] ?? 0;
  return <>
    <PlayCard eyebrow={`${finder.toUpperCase()} · TARGET ${round.attempts + 1} OF ${CLUE_TARGETS_PER_PLAYER} · ${score} CORRECT`} title={clueTargets[targetIndex]} copy={clueModes[clueModeIndex]}><Text style={styles.audience}>Everyone else: help them guess.</Text></PlayCard>
    <View style={styles.actions}><GameButton tone="turmeric" onPress={anotherClue} icon={<RotateCcw size={18} color={gamesTheme.colors.ink} />}>Another clue</GameButton><GameButton onPress={correct}>Correct</GameButton></View>
    <GameButton tone="ghost" onPress={() => recordTarget(false)}>Skip this target</GameButton>
  </>;
}

const styles = StyleSheet.create({
  phone: { alignItems: 'center', gap: 7, paddingTop: 8 },
  phoneText: { fontFamily: gamesTheme.type.utility, color: 'rgba(255,255,255,0.62)', fontSize: 11 },
  audience: { fontFamily: gamesTheme.type.utility, textAlign: 'center', color: gamesTheme.colors.turmeric, fontSize: 14, paddingTop: 6 },
  actions: { flexDirection: 'row', gap: 10 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10 },
  scoreName: { fontFamily: gamesTheme.type.utility, fontSize: 14, color: gamesTheme.colors.turmeric },
  scoreValue: { fontFamily: gamesTheme.type.body, fontSize: 14, color: gamesTheme.colors.white },
});
