import { type ReactNode, useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Hand, Zap } from 'lucide-react-native';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import {
  advanceOnePlan,
  beginOnePlanReveal,
  createOnePlanGame,
  onePlanScenarios,
  reportOnePlanConsensus,
  reportOnePlanSplit,
} from '@/src/capabilities/games/domain/onePlan';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';

export function ShowOfHandsGame() {
  const [game, setGame] = useState(createOnePlanGame);
  const [finalChoice, setFinalChoice] = useState(false);
  const { width, height } = useWindowDimensions();
  const soundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const feedback = useGameFeedback(soundEnabled);
  const scenario = onePlanScenarios[game.scenarioIndex];
  const boardHeight = width > height ? undefined : Math.max(580, height - 170);

  const revealConsensus = (optionIndex: number) => {
    setGame((current) => reportOnePlanConsensus(current, optionIndex));
    void feedback.success();
  };

  const revealSplit = () => {
    if (game.phase === 'final-reveal') void feedback.failure();
    else void feedback.select();
    setGame((current) => reportOnePlanSplit(current));
  };

  const beginReveal = () => {
    setGame((current) => beginOnePlanReveal(current));
    void feedback.select();
  };

  if (game.phase === 'finished') {
    const highFivesWon = game.winner === 'bridges';
    return <GameBoard bridges={game.bridges} chaos={game.chaos} minHeight={boardHeight}>
      <StageCue tone={highFivesWon ? 'gold' : 'coral'}>{highFivesWon ? 'THREE HIGH FIVES!' : 'TOTAL CHAOS'}</StageCue>
      <View style={styles.centerStage}>
        <Text style={styles.endingTitle}>{highFivesWon ? 'You beat the impossible.' : 'Chaos has the keys now.'}</Text>
        <Text style={styles.boardBody}>{highFivesWon ? 'Three disasters. Three times everybody matched.' : 'The plan is gone, the world is weirder, and everybody somehow survived.'}</Text>
      </View>
      <GameButton tone={highFivesWon ? 'turmeric' : 'coral'} onPress={() => {
        setFinalChoice(false);
        setGame(createOnePlanGame((game.scenarioIndex + 1) % onePlanScenarios.length));
      }}>Play again</GameButton>
    </GameBoard>;
  }

  if (game.phase === 'consequence' && game.outcome) {
    const highFive = game.outcome.kind === 'bridge';
    const consequence = game.outcome.kind === 'bridge'
      ? scenario.options[game.outcome.optionIndex].consequence
      : scenario.chaosConsequence;
    const terminal = game.bridges >= 3 || game.chaos >= 3;
    return <GameBoard bridges={game.bridges} chaos={game.chaos} minHeight={boardHeight}>
      <StageCue tone={highFive ? 'gold' : 'coral'}>{highFive ? 'HIGH FIVE!' : 'CHAOS STRIKES!'}</StageCue>
      <View style={styles.consequenceStage}>
        <Text style={styles.consequence}>{consequence}</Text>
      </View>
      <GameButton tone={highFive ? 'turmeric' : 'coral'} onPress={() => {
        setFinalChoice(false);
        setGame((current) => advanceOnePlan(current));
      }}>{terminal ? 'See who wins' : 'Next disaster'}</GameButton>
    </GameBoard>;
  }

  if (game.phase === 'first-reveal' || game.phase === 'final-reveal') {
    const final = game.phase === 'final-reveal';
    return <GameBoard bridges={game.bridges} chaos={game.chaos} minHeight={boardHeight}>
      <StageCue tone="coral">{final ? 'FINAL REVEAL' : 'REVEAL'}</StageCue>
      <View style={styles.revealStage}>
        <Text style={styles.revealTitle}>3 · 2 · 1 · SHOW!</Text>
        <Instruction>Look at the hands. Did the whole room match?</Instruction>
      </View>
      <View style={styles.actionStack}>
        {scenario.options.map((option, index) => <GameButton key={option.label} tone="paper" style={styles.resultButton} onPress={() => revealConsensus(index)}>{`Everyone picked ${index + 1}`}</GameButton>)}
        <GameButton tone="coral" style={styles.splitButton} onPress={revealSplit}>{final ? 'Still split' : 'No match'}</GameButton>
      </View>
    </GameBoard>;
  }

  if (game.phase === 'pitch') {
    if (finalChoice) return <GameBoard bridges={game.bridges} chaos={game.chaos} minHeight={boardHeight}>
      <StageCue tone="coral">FINAL PICK</StageCue>
      <Text style={styles.problem}>{scenario.problem}</Text>
      <Instruction>Choose again behind your back. This one decides the round.</Instruction>
      <OptionList options={scenario.options.map((option) => option.label)} compact />
      <GameButton onPress={beginReveal}>Ready to reveal</GameButton>
    </GameBoard>;

    return <GameBoard bridges={game.bridges} chaos={game.chaos} minHeight={boardHeight}>
      <StageCue tone="gold">NO MATCH YET</StageCue>
      <View style={styles.pitchStage}>
        <Text style={styles.pitchTitle}>One sentence each.</Text>
        <Instruction>Smallest camp goes first. Make your case—no interruptions.</Instruction>
      </View>
      <OptionList options={scenario.options.map((option) => option.label)} compact />
      <GameButton tone="turmeric" onPress={() => {
        setFinalChoice(true);
        void feedback.select();
      }}>Pick again</GameButton>
    </GameBoard>;
  }

  return <GameBoard bridges={game.bridges} chaos={game.chaos} minHeight={boardHeight}>
    <StageCue tone="gold">DISASTER {game.roundIndex + 1}</StageCue>
    <Text style={styles.problem}>{scenario.problem}</Text>
    <Instruction>Pick 1, 2, or 3 behind your back. Keep it secret.</Instruction>
    <OptionList options={scenario.options.map((option) => option.label)} />
    <GameButton onPress={beginReveal}>Reveal together</GameButton>
  </GameBoard>;
}

function GameBoard({ bridges, chaos, minHeight, children }: { bridges: number; chaos: number; minHeight?: number; children: ReactNode }) {
  return <View style={[styles.board, minHeight ? { minHeight } : null]}>
    <Scoreboard bridges={bridges} chaos={chaos} />
    {children}
  </View>;
}

function StageCue({ tone, children }: { tone: 'gold' | 'coral'; children: ReactNode }) {
  return <View style={[styles.stageCue, tone === 'coral' ? styles.stageCueCoral : styles.stageCueGold]}><Text style={styles.stageCueText}>{children}</Text></View>;
}

function Instruction({ children }: { children: ReactNode }) {
  return <View style={styles.instruction}><Text style={styles.instructionLabel}>DO THIS</Text><Text style={styles.instructionText}>{children}</Text></View>;
}

function OptionList({ options, compact = false }: { options: string[]; compact?: boolean }) {
  return <View style={styles.options}>{options.map((option, index) => <View key={option} style={[styles.option, compact ? styles.optionCompact : null]}>
    <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
    <Text style={styles.optionText}>{option}</Text>
  </View>)}</View>;
}

function Scoreboard({ bridges, chaos }: { bridges: number; chaos: number }) {
  return <View style={styles.scoreboard} accessibilityLabel={`${bridges} ${bridges === 1 ? 'High Five' : 'High Fives'}, ${chaos} Chaos`}>
    <Score label="HIGH FIVES" filled={bridges} kind="high-five" />
    <Text style={styles.versus}>VS</Text>
    <Score label="CHAOS" filled={chaos} kind="chaos" />
  </View>;
}

function Score({ label, filled, kind }: { label: string; filled: number; kind: 'high-five' | 'chaos' }) {
  const Icon = kind === 'high-five' ? Hand : Zap;
  return <View style={styles.score}>
    <Text style={styles.scoreLabel}>{label}</Text>
    <View style={styles.scoreIcons}>{[0, 1, 2].map((index) => <Icon
      key={index}
      size={16}
      strokeWidth={index < filled ? 3 : 2}
      color={index < filled ? kind === 'high-five' ? gamesTheme.colors.turmeric : gamesTheme.colors.coral : 'rgba(255,255,255,0.2)'}
    />)}</View>
  </View>;
}

const styles = StyleSheet.create({
  board: { width: '100%', flexGrow: 1, justifyContent: 'space-between', gap: 14, borderRadius: 34, padding: 18, backgroundColor: gamesTheme.colors.felt, borderWidth: 7, borderColor: gamesTheme.colors.wood },
  stageCue: { alignSelf: 'flex-start', borderRadius: 999, paddingVertical: 7, paddingHorizontal: 13 },
  stageCueGold: { backgroundColor: gamesTheme.colors.turmeric },
  stageCueCoral: { backgroundColor: gamesTheme.colors.coral },
  stageCueText: { fontFamily: gamesTheme.type.utility, fontSize: 11, letterSpacing: 1.4, color: gamesTheme.colors.ink },
  problem: { fontFamily: gamesTheme.type.display, fontSize: 32, lineHeight: 35, letterSpacing: -0.7, color: gamesTheme.colors.white },
  boardBody: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 17, lineHeight: 23, color: 'rgba(255,255,255,0.76)' },
  instruction: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: gamesTheme.colors.feltDark },
  instructionLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.2, color: gamesTheme.colors.turmeric },
  instructionText: { flex: 1, fontFamily: gamesTheme.type.body, fontSize: 15, lineHeight: 19, color: gamesTheme.colors.white },
  actionStack: { gap: 9 },
  options: { gap: 9 },
  option: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 13, borderRadius: 18, paddingHorizontal: 13, backgroundColor: gamesTheme.colors.paper, borderWidth: 2, borderColor: 'rgba(32,29,24,0.14)' },
  optionCompact: { minHeight: 50 },
  number: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: gamesTheme.colors.turmeric },
  numberText: { fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.ink },
  optionText: { flex: 1, fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.ink },
  scoreboard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 20, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: gamesTheme.colors.feltDark, borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  score: { flex: 1, alignItems: 'center', gap: 2 },
  scoreLabel: { fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.4, color: 'rgba(255,255,255,0.65)' },
  scoreIcons: { minHeight: 18, flexDirection: 'row', alignItems: 'center', gap: 6 },
  versus: { fontFamily: gamesTheme.type.utility, fontSize: 9, color: 'rgba(255,255,255,0.38)' },
  revealStage: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  revealTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 36, lineHeight: 40, letterSpacing: -1, color: gamesTheme.colors.white },
  resultButton: { minHeight: 52 },
  splitButton: { minHeight: 50 },
  pitchStage: { gap: 8 },
  pitchTitle: { fontFamily: gamesTheme.type.display, fontSize: 34, lineHeight: 37, color: gamesTheme.colors.white },
  consequenceStage: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  consequence: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 30, lineHeight: 35, letterSpacing: -0.6, color: gamesTheme.colors.white },
  centerStage: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14, paddingHorizontal: 8 },
  endingTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 36, lineHeight: 40, color: gamesTheme.colors.white },
});
