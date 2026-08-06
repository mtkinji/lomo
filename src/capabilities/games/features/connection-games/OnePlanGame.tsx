import { useEffect, useMemo, useState } from 'react';
import { Circle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import {
  advanceOddballGame,
  beginOddballReveal,
  createOddballGame,
  onePlanScenarios,
  scoreOddballRound,
  startOddballRound,
  type OddballGame,
} from '@/src/capabilities/games/domain/onePlan';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';

const CHOICE_SECONDS = 15;
const SHOW_CUE_MS = 1_200;

type EntryStep = 'winner' | 'scorers' | 'oddball';

export function ShowOfHandsGame({ players, soundEnabled }: { players: string[]; soundEnabled: boolean }) {
  const [game, setGame] = useState<OddballGame>(() => createOddballGame(players));
  const [secondsRemaining, setSecondsRemaining] = useState(CHOICE_SECONDS);
  const [showing, setShowing] = useState(false);
  const [entryStep, setEntryStep] = useState<EntryStep>('winner');
  const [winningOptionIndex, setWinningOptionIndex] = useState<number | null>(null);
  const [scorerIds, setScorerIds] = useState<string[]>([]);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const feedback = useGameFeedback(soundEnabled);
  const scenario = onePlanScenarios[game.scenarioIndex];
  const outsiders = useMemo(() => game.players.filter((player) => !scorerIds.includes(player.id)), [game.players, scorerIds]);

  useEffect(() => {
    if (game.phase !== 'choosing') return;
    const interval = setInterval(() => setSecondsRemaining((current) => {
      if (current <= 1) {
        clearInterval(interval);
        setShowing(true);
        setGame((value) => beginOddballReveal(value));
        void feedback.select();
        return 0;
      }
      return current - 1;
    }), 1_000);
    return () => clearInterval(interval);
  }, [feedback, game.phase]);

  useEffect(() => {
    if (!showing) return;
    const timeout = setTimeout(() => setShowing(false), SHOW_CUE_MS);
    return () => clearTimeout(timeout);
  }, [showing]);

  const startRound = () => {
    setSecondsRemaining(CHOICE_SECONDS);
    setGame((value) => startOddballRound(value));
    void feedback.select();
  };

  const chooseWinner = (optionIndex: number | null) => {
    if (optionIndex === null) {
      setGame((value) => scoreOddballRound(value, { winningOptionIndex: null, scorerIds: [], oddballPlayerId: null }));
      void feedback.failure();
      return;
    }
    setWinningOptionIndex(optionIndex);
    setScorerIds(game.players.map((player) => player.id));
    setEntryStep('scorers');
  };

  const toggleScorer = (playerId: string) => {
    setScorerIds((current) => current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]);
  };

  const recordRound = (oddballPlayerId: string | null) => {
    setGame((value) => scoreOddballRound(value, { winningOptionIndex, scorerIds, oddballPlayerId }));
    void feedback.success();
  };

  const continueFromScorers = () => {
    if (!outsiders.length) recordRound(null);
    else setEntryStep('oddball');
  };

  const nextRound = () => {
    setEntryStep('winner');
    setWinningOptionIndex(null);
    setScorerIds([]);
    setSecondsRemaining(CHOICE_SECONDS);
    setGame((value) => advanceOddballGame(value));
  };

  const restart = () => {
    setEntryStep('winner');
    setWinningOptionIndex(null);
    setScorerIds([]);
    setSecondsRemaining(CHOICE_SECONDS);
    setGame(createOddballGame(players, (game.scenarioIndex + 1) % onePlanScenarios.length));
  };

  if (game.phase === 'teaching') return <View style={[styles.stage, styles.teaching, landscape ? styles.stageLandscape : null]}>
    <Text style={styles.teachingTitle}>Think like the room.</Text>
    <View style={styles.rules}>
      <Text style={styles.rulePrimary}>Pick what most people will pick.</Text>
      <Text style={styles.rule}>Match the biggest group to score.</Text>
      <Text style={styles.rule}>Stand alone and you get the Oddball.</Text>
      <Text style={styles.rule}>You can’t win while you have it.</Text>
    </View>
    <GameButton accessibilityLabel="Start Oddball" style={styles.primaryAction} onPress={startRound}>Start</GameButton>
  </View>;

  if (game.phase === 'finished') {
    const winner = game.players.find((player) => player.id === game.winnerId);
    return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
      <ScoreRail game={game} />
      <View style={styles.centerStage}>
        <Text style={styles.resultEyebrow}>WINNER</Text>
        <Text style={styles.winner}>{winner?.name}</Text>
        <Text style={styles.resultCopy}>Read the room. Dodged the Oddball.</Text>
      </View>
      <GameButton accessibilityLabel="Play Oddball again" onPress={restart}>Play again</GameButton>
    </View>;
  }

  if (game.phase === 'result' && game.outcome) {
    const outcome = game.outcome;
    const tie = outcome.kind === 'tie';
    const newOddballId = outcome.kind === 'scored' ? outcome.oddballPlayerId : null;
    const newOddball = newOddballId
      ? game.players.find((player) => player.id === newOddballId)
      : null;
    const currentOddball = game.players.find((player) => player.id === game.oddballPlayerId);
    const consequence = outcome.kind === 'scored'
      ? scenario.options[outcome.winningOptionIndex].consequence
      : scenario.chaosConsequence;
    return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
      <ScoreRail game={game} />
      <View style={styles.centerStage}>
        <Text style={styles.resultEyebrow}>{tie ? 'TIE' : 'BIGGEST GROUP · +1'}</Text>
        <Text style={styles.resultTitle}>{tie ? 'No points.' : consequence}</Text>
        {newOddball ? <Text style={styles.oddballCallout}>{newOddball.name} gets the Oddball.</Text>
          : currentOddball ? <Text style={styles.markerStays}>Oddball stays with {currentOddball.name}.</Text> : null}
      </View>
      <GameButton onPress={nextRound}>{game.winnerId ? 'See winner' : 'Next question'}</GameButton>
    </View>;
  }

  if (game.phase === 'recording') return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
    <ScoreRail game={game} />
    {showing ? <View style={styles.showStage}>
      <Text style={styles.showCue}>3 · 2 · 1 · SHOW!</Text>
      <Text style={styles.showHint}>Hold up 1, 2, or 3.</Text>
    </View> : <ResultEntry
      game={game}
      scenario={scenario}
      step={entryStep}
      scorerIds={scorerIds}
      outsiders={outsiders}
      onChooseWinner={chooseWinner}
      onToggleScorer={toggleScorer}
      onContinue={continueFromScorers}
      onRecord={recordRound}
    />}
  </View>;

  return <View style={[styles.stage, landscape ? styles.stageLandscape : null]}>
    <ScoreRail game={game} />
    <View style={styles.questionStage}>
      <Text accessibilityLabel={`${secondsRemaining} seconds remaining`} style={[styles.clock, secondsRemaining <= 5 ? styles.clockUrgent : null]}>{`0:${String(secondsRemaining).padStart(2, '0')}`}</Text>
      <Text style={[styles.problem, landscape ? styles.problemLandscape : null]}>{scenario.problem}</Text>
      <View style={styles.options}>{scenario.options.map((option, index) => <View key={option.label} style={styles.option}>
        <View style={styles.number}><Text style={styles.numberText}>{index + 1}</Text></View>
        <Text style={styles.optionText}>{option.label}</Text>
      </View>)}</View>
    </View>
  </View>;
}

function ResultEntry({ game, scenario, step, scorerIds, outsiders, onChooseWinner, onToggleScorer, onContinue, onRecord }: {
  game: OddballGame;
  scenario: (typeof onePlanScenarios)[number];
  step: EntryStep;
  scorerIds: string[];
  outsiders: OddballGame['players'];
  onChooseWinner: (optionIndex: number | null) => void;
  onToggleScorer: (playerId: string) => void;
  onContinue: () => void;
  onRecord: (oddballPlayerId: string | null) => void;
}) {
  if (step === 'winner') return <View style={styles.entryStage}>
    <Text style={styles.entryTitle}>What was the biggest group?</Text>
    <View style={styles.winnerOptions}>{scenario.options.map((option, index) => <Pressable
      key={option.label}
      accessibilityRole="button"
      accessibilityLabel={`${option.label} was the biggest group`}
      onPress={() => onChooseWinner(index)}
      style={({ pressed }) => [styles.winnerOption, pressed ? styles.pressed : null]}
    ><Text style={styles.winnerNumber}>{index + 1}</Text><Text style={styles.winnerLabel}>{option.label}</Text></Pressable>)}</View>
    <GameButton accessibilityLabel="The biggest groups tied" tone="ghost" onPress={() => onChooseWinner(null)}>Tie</GameButton>
  </View>;

  if (step === 'scorers') return <View style={styles.entryStage}>
    <Text style={styles.entryTitle}>Who matched?</Text>
    <Text style={styles.entryHint}>Tap anyone outside the biggest group.</Text>
    <View style={styles.playerGrid}>{game.players.map((player) => {
      const selected = scorerIds.includes(player.id);
      return <Pressable
        key={player.id}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${player.name}, ${selected ? 'included in' : 'outside'} biggest group`}
        onPress={() => onToggleScorer(player.id)}
        style={({ pressed }) => [styles.playerChoice, selected ? styles.playerChoiceSelected : null, pressed ? styles.pressed : null]}
      ><Text style={[styles.playerChoiceText, selected ? styles.playerChoiceTextSelected : null]}>{player.name}</Text></Pressable>;
    })}</View>
    <GameButton accessibilityLabel="Continue" disabled={scorerIds.length < 2} onPress={onContinue}>Continue</GameButton>
  </View>;

  return <View style={styles.entryStage}>
    <Text style={styles.entryTitle}>Did one person stand alone?</Text>
    <View style={styles.playerGrid}>{outsiders.map((player) => <Pressable
      key={player.id}
      accessibilityRole="button"
      accessibilityLabel={`${player.name} stood alone`}
      onPress={() => onRecord(player.id)}
      style={({ pressed }) => [styles.playerChoice, styles.oddballChoice, pressed ? styles.pressed : null]}
    ><Circle size={15} fill={gamesTheme.colors.coral} color={gamesTheme.colors.coralDark} /><Text style={styles.playerChoiceText}>{player.name}</Text></Pressable>)}</View>
    <GameButton accessibilityLabel="No one stood alone" tone="ghost" onPress={() => onRecord(null)}>No one</GameButton>
  </View>;
}

function ScoreRail({ game }: { game: OddballGame }) {
  return <View style={styles.scoreRail}>{game.players.map((player) => {
    const oddball = player.id === game.oddballPlayerId;
    return <View
      key={player.id}
      accessible
      accessibilityLabel={`${player.name}, ${player.score} ${player.score === 1 ? 'point' : 'points'}${oddball ? ', Oddball' : ''}`}
      style={[styles.scoreChip, oddball ? styles.scoreChipOddball : null]}
    >
      <Text numberOfLines={1} style={styles.scoreName}>{player.name}</Text>
      <Text style={styles.scoreValue}>{player.score}</Text>
      {oddball ? <Circle size={13} fill={gamesTheme.colors.coral} color={gamesTheme.colors.coralDark} /> : null}
    </View>;
  })}</View>;
}

const styles = StyleSheet.create({
  stage: { flex: 1, width: '100%', minHeight: 560, justifyContent: 'space-between', gap: 16, paddingVertical: 8 },
  stageLandscape: { minHeight: 300, paddingVertical: 2 },
  teaching: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  teachingTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 42, lineHeight: 46, color: gamesTheme.colors.ink },
  rules: { alignItems: 'center', gap: 6, marginVertical: 18 },
  rulePrimary: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 24, lineHeight: 28, color: gamesTheme.colors.ink },
  rule: { textAlign: 'center', fontFamily: gamesTheme.type.utility, fontSize: 14, lineHeight: 20, color: 'rgba(32,29,24,0.64)' },
  primaryAction: { minWidth: 180 },
  scoreRail: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 7 },
  scoreChip: { minWidth: 86, maxWidth: 132, minHeight: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 10, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.58)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  scoreChipOddball: { borderColor: gamesTheme.colors.coral, backgroundColor: 'rgba(255,143,120,0.16)' },
  scoreName: { maxWidth: 76, fontFamily: gamesTheme.type.utility, fontSize: 12, color: gamesTheme.colors.ink },
  scoreValue: { fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.ink },
  questionStage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  clock: { fontFamily: gamesTheme.type.display, fontSize: 27, fontVariant: ['tabular-nums'], color: gamesTheme.colors.coralDark },
  clockUrgent: { color: gamesTheme.colors.danger },
  problem: { maxWidth: 760, textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 42, lineHeight: 46, letterSpacing: -1, color: gamesTheme.colors.ink },
  problemLandscape: { fontSize: 36, lineHeight: 39 },
  options: { width: '100%', flexDirection: 'row', gap: 10 },
  option: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 7, padding: 10, borderRadius: 20, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  number: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: gamesTheme.colors.turmeric },
  numberText: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
  optionText: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 17, lineHeight: 20, color: gamesTheme.colors.ink },
  showStage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  showCue: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 48, lineHeight: 52, color: gamesTheme.colors.ink },
  showHint: { fontFamily: gamesTheme.type.utility, fontSize: 15, color: 'rgba(32,29,24,0.58)' },
  entryStage: { flex: 1, justifyContent: 'center', gap: 14 },
  entryTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 34, lineHeight: 38, color: gamesTheme.colors.ink },
  entryHint: { marginTop: -8, textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.56)' },
  winnerOptions: { flexDirection: 'row', gap: 9 },
  winnerOption: { flex: 1, minHeight: 92, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 10, borderRadius: 20, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  winnerNumber: { fontFamily: gamesTheme.type.display, fontSize: 24, color: gamesTheme.colors.coralDark },
  winnerLabel: { textAlign: 'center', fontFamily: gamesTheme.type.utility, fontSize: 12, lineHeight: 16, color: gamesTheme.colors.ink },
  playerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  playerChoice: { minWidth: 112, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 14, borderRadius: 23, borderWidth: 1, borderColor: 'rgba(32,29,24,0.18)', backgroundColor: 'rgba(255,255,255,0.55)' },
  playerChoiceSelected: { backgroundColor: gamesTheme.colors.turmeric, borderColor: gamesTheme.colors.ink },
  playerChoiceText: { fontFamily: gamesTheme.type.utility, fontSize: 13, color: gamesTheme.colors.ink },
  playerChoiceTextSelected: { fontFamily: gamesTheme.type.display },
  oddballChoice: { borderColor: gamesTheme.colors.coral },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
  centerStage: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 16 },
  resultEyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 11, letterSpacing: 1.4, color: gamesTheme.colors.coralDark },
  resultTitle: { maxWidth: 720, textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 33, lineHeight: 38, color: gamesTheme.colors.ink },
  resultCopy: { fontFamily: gamesTheme.type.body, fontSize: 16, color: 'rgba(32,29,24,0.6)' },
  oddballCallout: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, overflow: 'hidden', fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.ink, backgroundColor: gamesTheme.colors.coral },
  markerStays: { fontFamily: gamesTheme.type.utility, fontSize: 13, color: 'rgba(32,29,24,0.58)' },
  winner: { fontFamily: gamesTheme.type.display, fontSize: 56, lineHeight: 60, color: gamesTheme.colors.ink },
});
