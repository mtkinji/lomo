import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { storyRelayPrompts } from '@/src/capabilities/games/domain/connectionPrompts';
import {
  MAX_STORY_CHAPTERS,
  getStoryTurn,
  nextStoryStep,
  storySoFar,
  type StoryContribution,
} from '@/src/capabilities/games/domain/storyRelay';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { connectionStyles as shared, PlayCard } from './ConnectionGameFrame';

type Phase = 'turn' | 'reveal' | 'finished';

export function StoryRelayGame({ players }: { players: string[] }) {
  const [premiseIndex, setPremiseIndex] = useState(0);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [turnIndex, setTurnIndex] = useState(0);
  const [contributions, setContributions] = useState<StoryContribution[]>([]);
  const [line, setLine] = useState('');
  const [selectedSpark, setSelectedSpark] = useState<string | undefined>();
  const [handoff, setHandoff] = useState(false);
  const [phase, setPhase] = useState<Phase>('turn');

  const premise = storyRelayPrompts[premiseIndex];
  const turn = getStoryTurn(players, chapterIndex, turnIndex, premiseIndex);
  const chapterContributions = contributions.filter((item) => item.chapterIndex === chapterIndex);

  const addContribution = () => {
    const nextContributions = [...contributions, {
      chapterIndex,
      player: turn.player,
      text: line.trim(),
      spark: selectedSpark,
    }];
    const next = nextStoryStep({ chapterIndex, turnIndex, playerCount: players.length });
    setContributions(nextContributions);
    setLine('');
    setSelectedSpark(undefined);
    if (next.kind === 'turn') {
      setTurnIndex(next.turnIndex);
      setHandoff(true);
    } else {
      setPhase(next.kind);
    }
  };

  const continueStory = () => {
    const next = nextStoryStep({ chapterIndex, turnIndex, playerCount: players.length, continueStory: true });
    if (next.kind !== 'turn') return;
    setChapterIndex(next.chapterIndex);
    setTurnIndex(next.turnIndex);
    setPhase('turn');
  };

  const startAnother = () => {
    setPremiseIndex((value) => (value + 1) % storyRelayPrompts.length);
    setChapterIndex(0);
    setTurnIndex(0);
    setContributions([]);
    setLine('');
    setSelectedSpark(undefined);
    setHandoff(false);
    setPhase('turn');
  };

  if (handoff) {
    return <><PlayCard eyebrow="PASS THE PHONE" title={`Hand it to ${turn.player}.`} copy="Their turn starts when they’re ready." /><GameButton onPress={() => setHandoff(false)}>I’m ready</GameButton></>;
  }

  if (phase === 'finished') {
    return <>
      <StoryReveal eyebrow="THE END · READ IT ALOUD" premise={premise} contributions={contributions} />
      <GameButton onPress={startAnother}>Start another story</GameButton>
    </>;
  }

  if (phase === 'reveal') {
    return <>
      <StoryReveal eyebrow="READ IT ALOUD" premise={`Chapter ${chapterIndex + 1}`} contributions={chapterContributions} />
      <View style={shared.actionStack}>
        <GameButton onPress={continueStory}>One more chapter</GameButton>
        <GameButton tone="paper" onPress={() => setPhase('finished')}>Finish this story</GameButton>
      </View>
    </>;
  }

  const priorStory = storySoFar(contributions);
  const promptCopy = selectedSpark
    ? `${turn.prompt} Work in ${selectedSpark}.`
    : turn.prompt;

  return <>
    <PlayCard
      eyebrow={`CHAPTER ${chapterIndex + 1} · ${turn.player.toUpperCase()}`}
      title={turn.purpose}
      copy={priorStory ? `Story so far: ${priorStory}` : premise}
    >
      <Text style={styles.turnPrompt}>{promptCopy}</Text>
    </PlayCard>
    {turn.allowsSpark ? <View style={styles.sparkSection}>
      <Text style={shared.label}>ADD A STORY SPARK</Text>
      <View style={styles.sparkWrap}>
        {turn.sparks.map((spark) => <Pressable
          key={spark}
          accessibilityRole="button"
          accessibilityState={{ selected: selectedSpark === spark }}
          onPress={() => setSelectedSpark(selectedSpark === spark ? undefined : spark)}
          style={[styles.spark, selectedSpark === spark ? styles.sparkSelected : null]}
        ><Text style={styles.sparkText}>{spark}</Text></Pressable>)}
        <Pressable accessibilityRole="button" accessibilityState={{ selected: !selectedSpark }} onPress={() => setSelectedSpark(undefined)} style={[styles.spark, !selectedSpark ? styles.sparkOwn : null]}><Text style={styles.sparkText}>my own idea</Text></Pressable>
      </View>
    </View> : null}
    <TextInput
      accessibilityLabel={`${turn.player}'s story contribution`}
      value={line}
      onChangeText={setLine}
      maxLength={140}
      placeholder="Add your part…"
      placeholderTextColor="rgba(32,29,24,0.35)"
      style={[shared.input, shared.multiline]}
      multiline
    />
    <GameButton disabled={!line.trim()} onPress={addContribution}>Add to our story</GameButton>
  </>;
}

function StoryReveal({ eyebrow, premise, contributions }: { eyebrow: string; premise: string; contributions: StoryContribution[] }) {
  return <PlayCard eyebrow={eyebrow} title={premise} copy="Take turns reading your parts. Make the joins dramatic.">
    {contributions.map((item, index) => <Text accessibilityLabel={`${item.player}: ${item.text}`} key={`${item.chapterIndex}-${index}`} style={styles.storyLine}><Text style={styles.storyName}>{item.player}: </Text>{item.text}</Text>)}
  </PlayCard>;
}

const styles = StyleSheet.create({
  turnPrompt: { fontFamily: gamesTheme.type.utility, fontSize: 14, lineHeight: 20, color: gamesTheme.colors.turmeric },
  sparkSection: { gap: 8 },
  sparkWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  spark: { minHeight: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(32,29,24,0.18)', backgroundColor: gamesTheme.colors.paper, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  sparkSelected: { borderColor: gamesTheme.colors.ink, backgroundColor: gamesTheme.colors.turmeric },
  sparkOwn: { borderStyle: 'dashed' },
  sparkText: { fontFamily: gamesTheme.type.utility, fontSize: 13, color: gamesTheme.colors.ink },
  storyLine: { fontFamily: gamesTheme.type.body, fontSize: 16, lineHeight: 23, color: 'rgba(255,255,255,0.82)' },
  storyName: { fontFamily: gamesTheme.type.utility, color: gamesTheme.colors.turmeric },
});
