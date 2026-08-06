import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { forecastReveal, nextPlayerIndex, nextPromptIndex } from '@/src/capabilities/games/domain/connectionGames';
import { commonThreadPrompts, forecastPrompts, objectQuestPrompts } from '@/src/capabilities/games/domain/connectionPrompts';
import type { ConnectionGameId } from '@/src/capabilities/games/domain/catalog';
import { connectionStyles as shared, PlayCard } from './ConnectionGameFrame';
import { StoryRelayGame } from './StoryRelayGame';

export function PromptConnectionGame({ gameId, players, soundEnabled = true }: { gameId: ConnectionGameId; players: string[]; soundEnabled?: boolean }) {
  if (gameId === 'common-thread') return <CommonThreadGame players={players} />;
  if (gameId === 'object-quest') return <ObjectQuestGame players={players} />;
  if (gameId === 'story-relay') return <StoryRelayGame players={players} soundEnabled={soundEnabled} />;
  if (gameId === 'family-forecast') return <FamilyForecastGame players={players} />;
  return null;
}

function CommonThreadGame({ players }: { players: string[] }) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [leadIndex, setLeadIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [sharedAnswer, setSharedAnswer] = useState('');
  const prompt = commonThreadPrompts[promptIndex];
  const next = () => { setPromptIndex(nextPromptIndex(promptIndex, commonThreadPrompts.length)); setLeadIndex(nextPlayerIndex(leadIndex, players.length)); setAnswer(''); setSharedAnswer(''); };
  return <><PlayCard eyebrow={`${players[leadIndex].toUpperCase()} · CONNECTOR`} title={`${prompt[0]}  +  ${prompt[1]}`} copy="Everyone pitches a link. The connector chooses the one the group wants to remember." />
    {sharedAnswer ? <PlayCard tone="paper" eyebrow="YOUR THREAD" title={sharedAnswer} copy={`${players[leadIndex]}, tell us why this one won the room.`} /> : <TextInput value={answer} onChangeText={setAnswer} maxLength={80} placeholder="The connection we chose…" placeholderTextColor="rgba(32,29,24,0.35)" style={[shared.input, shared.multiline]} multiline />}
    <GameButton disabled={!sharedAnswer && !answer.trim()} onPress={sharedAnswer ? next : () => setSharedAnswer(answer.trim())}>{sharedAnswer ? 'New pair' : 'We found one'}</GameButton>
  </>;
}

function ObjectQuestGame({ players }: { players: string[] }) {
  const [promptIndex, setPromptIndex] = useState(0);
  const [stage, setStage] = useState<'search' | 'share'>('search');
  const [playerIndex, setPlayerIndex] = useState(0);
  const [returned, setReturned] = useState<number[]>([]);
  const nextShare = () => {
    if (playerIndex === players.length - 1) { setPromptIndex(nextPromptIndex(promptIndex, objectQuestPrompts.length)); setPlayerIndex(0); setReturned([]); setStage('search'); }
    else setPlayerIndex(nextPlayerIndex(playerIndex, players.length));
  };
  const checkIn = (index: number) => {
    const next = [...returned, index];
    setReturned(next);
    if (next.length === players.length) setStage('share');
  };
  return <>{stage === 'search' ? <><PlayCard eyebrow="GO FIND IT" title={objectQuestPrompts[promptIndex]} copy={`${returned.length} of ${players.length} back · leave the phone here and bring back one thing with a story.`} /><View style={styles.checkInGrid}>{players.map((player, index) => <Pressable key={`${player}-${index}`} accessibilityRole="button" accessibilityState={{ selected: returned.includes(index) }} disabled={returned.includes(index)} onPress={() => checkIn(index)} style={[styles.checkIn, returned.includes(index) ? styles.checkInDone : null]}><Text style={styles.checkInText}>{returned.includes(index) ? `${player} ✓` : `${player} is back`}</Text></Pressable>)}</View></> : <><PlayCard eyebrow={`SHARE ${playerIndex + 1} OF ${players.length}`} title={`${players[playerIndex]}, show us.`} copy="What did you find, and what story came with it?" /><GameButton onPress={nextShare}>{playerIndex === players.length - 1 ? 'New quest' : `Pass to ${players[nextPlayerIndex(playerIndex, players.length)]}`}</GameButton></>}</>;
}

function FamilyForecastGame({ players }: { players: string[] }) {
  const [round, setRound] = useState(0);
  const [predictorIndex, setPredictorIndex] = useState(1 % players.length);
  const [predictions, setPredictions] = useState<Record<number, string>>({});
  const [handoff, setHandoff] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);
  const subjectIndex = round % players.length;
  const prompt = forecastPrompts[round % forecastPrompts.length];
  const question = prompt.question.replace('{{name}}', players[subjectIndex]);
  const predictorOrder = players.map((_, index) => index).filter((index) => index !== subjectIndex);
  const predictorPosition = predictorOrder.indexOf(predictorIndex);
  const predict = (choice: string) => {
    const next = { ...predictions, [predictorIndex]: choice };
    setPredictions(next);
    if (Object.keys(next).length === players.length - 1) { setPredictorIndex(subjectIndex); setHandoff(true); }
    else { setPredictorIndex(predictorOrder[predictorPosition + 1]); setHandoff(true); }
  };
  const nextRound = () => { const next = round + 1; const nextSubject = next % players.length; setRound(next); setPredictions({}); setAnswer(null); setPredictorIndex(players.map((_, index) => index).find((index) => index !== nextSubject) ?? 0); setHandoff(false); };
  if (handoff) return <Handoff name={players[predictorIndex]} copy={predictorIndex === subjectIndex ? 'Everyone has guessed. Reveal your real choice.' : 'Make your prediction privately.'} onReady={() => setHandoff(false)} />;
  if (answer) {
    const reveal = forecastReveal(players, subjectIndex, predictions, answer);
    const knows = reveal.correctNames.length ? `${reveal.correctNames.join(' & ')} ${reveal.correctNames.length === 1 ? 'knows' : 'know'} ${players[subjectIndex]}.` : `You surprised everyone, ${players[subjectIndex]}.`;
    return <><PlayCard eyebrow="FORECAST REVEALED" title={knows} copy={`${players[subjectIndex]} chose ${answer}.`}>{reveal.rows.map((row, index) => <View key={`${row.name}-${index}`} accessible accessibilityLabel={`${row.name} predicted ${row.prediction}, ${row.correct ? 'correct' : 'different'}`} style={styles.resultRow}><Text style={styles.resultName}>{row.name}</Text><Text style={styles.resultChoice}>{row.prediction} {row.correct ? '✓' : '·'}</Text></View>)}</PlayCard><GameButton onPress={nextRound}>Forecast someone else</GameButton></>;
  }
  const subjectChoosing = predictorIndex === subjectIndex && Object.keys(predictions).length === players.length - 1;
  return <><PlayCard eyebrow={subjectChoosing ? `${players[subjectIndex].toUpperCase()} · REAL ANSWER` : `${players[predictorIndex].toUpperCase()} · PREDICT PRIVATELY`} title={question} copy={subjectChoosing ? 'Choose what you would really want.' : `What will ${players[subjectIndex]} choose?`} /><View style={shared.row}>{prompt.options.map((option) => <Pressable key={option} onPress={() => subjectChoosing ? setAnswer(option) : predict(option)} style={shared.choice}><Text style={shared.choiceText}>{option}</Text></Pressable>)}</View></>;
}

function Handoff({ name, copy = 'Keep the choice private.', onReady }: { name: string; copy?: string; onReady: () => void }) {
  return <><PlayCard eyebrow="PASS THE PHONE" title={`Hand it to ${name}.`} copy={copy} /><GameButton onPress={onReady}>I’m ready</GameButton></>;
}

const styles = StyleSheet.create({
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', paddingTop: 10 },
  resultName: { flex: 0.38, fontFamily: gamesTheme.type.utility, fontSize: 14, color: gamesTheme.colors.turmeric },
  resultChoice: { flex: 0.62, textAlign: 'right', fontFamily: gamesTheme.type.body, fontSize: 14, color: gamesTheme.colors.white },
  checkInGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  checkIn: { flexBasis: '47%', flexGrow: 1, minHeight: 52, borderRadius: 17, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.18)' },
  checkInDone: { backgroundColor: 'rgba(118,187,160,0.36)', borderColor: gamesTheme.colors.feltLight },
  checkInText: { textAlign: 'center', fontFamily: gamesTheme.type.utility, fontSize: 13, color: gamesTheme.colors.ink },
});
