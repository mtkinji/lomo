import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePatternAudio } from '@/src/capabilities/games/audio/usePatternAudio';
import { advancePassPattern, createPassPatternGame, patternProfiles, type PassPatternAction, type PassPatternState, type PatternBeatId, type PatternDifficulty } from '@/src/capabilities/games/domain/passPattern';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { PlayCard } from './ConnectionGameFrame';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';

const beats: Record<PatternBeatId, { label: string; symbol: string; background: string; text: string }> = {
  coral: { label: 'Coral', symbol: '●', background: gamesTheme.colors.coral, text: gamesTheme.colors.ink },
  pine: { label: 'Pine', symbol: '▲', background: gamesTheme.colors.feltLight, text: gamesTheme.colors.white },
  gold: { label: 'Gold', symbol: '◆', background: gamesTheme.colors.turmeric, text: gamesTheme.colors.ink },
  sky: { label: 'Sky', symbol: '■', background: '#78BBDD', text: gamesTheme.colors.ink },
  violet: { label: 'Violet', symbol: '✦', background: '#9B7BC2', text: gamesTheme.colors.white },
  rose: { label: 'Rose', symbol: '♥', background: '#E9829D', text: gamesTheme.colors.ink },
};

export function PassPatternGame({ players }: { players: string[] }) {
  const soundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const audio = usePatternAudio(soundEnabled);
  const [game, setGame] = useState<PassPatternState | null>(null);
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);
  const [watchComplete, setWatchComplete] = useState(false);

  const perform = (action: PassPatternAction) => {
    if (!game) return null;
    const result = advancePassPattern(game, action);
    if (result.ok) setGame(result.state);
    return result;
  };

  useEffect(() => {
    if (!game || game.phase !== 'watch') return audio.stopSequence;
    setWatchComplete(false);
    audio.sequence(game.pattern, {
      spacingMs: patternProfiles[game.difficulty].spacingMs,
      onActiveBeat: (_beatId, index) => setActiveBeatIndex(index),
      onComplete: () => setWatchComplete(true),
    });
    return audio.stopSequence;
  }, [audio, game?.difficulty, game?.phase, game?.watchSequence]);

  if (!game) return <DifficultyPicker onSelect={(difficulty) => setGame(createPassPatternGame(difficulty, players.length))} />;

  const player = players[game.playerIndex];
  const profile = patternProfiles[game.difficulty];
  const availableBeats = profile.beatIds;

  if (game.phase === 'handoff') return <>
    <PlayCard eyebrow={`${profile.label.toUpperCase()} · NEXT TURN`} title={`Pass to ${player}`} copy="Keep the pattern covered until they have the phone." />
    <GameButton onPress={() => perform({ type: 'ready' })}>We’re ready</GameButton>
  </>;

  if (game.phase === 'watch') return <>
    <PlayCard eyebrow={`${player.toUpperCase()} · WATCH`} title={watchComplete ? 'Pattern complete.' : 'Listen together.'} copy={watchComplete ? 'Play it once more, or hide it and repeat.' : 'Everyone can help remember. Only the active player taps it back.'}>
      <View accessibilityLabel="Pattern playback" style={styles.sequence}>{game.pattern.map((id, index) => {
        const beat = beats[id];
        const active = activeBeatIndex === index;
        return <View key={`${id}-${index}`} style={[styles.sequenceBeat, { backgroundColor: beat.background }, active ? styles.sequenceBeatActive : null]}><Text style={[styles.sequenceSymbol, { color: beat.text }]}>{beat.symbol}</Text><Text style={[styles.sequenceNumber, { color: beat.text }]}>{index + 1}</Text></View>;
      })}</View>
    </PlayCard>
    {watchComplete ? <View style={styles.actions}><GameButton tone="ghost" onPress={() => perform({ type: 'replay_watch' })}>Play again</GameButton><GameButton onPress={() => perform({ type: 'finish_watch' })}>I’ve got it</GameButton></View> : null}
  </>;

  if (game.phase === 'result') return <>
    <PlayCard eyebrow={game.success ? 'PATTERN GROWS' : 'PATTERN BROKE'} title={game.success ? `${player} added a beat!` : 'So close. Start a fresh rhythm.'} copy={game.success ? `${game.pattern.length} beats are now traveling around the circle.` : 'No points lost. The fun is keeping it alive together.'} />
    <GameButton onPress={() => {
      const result = perform({ type: game.success ? 'next_player' : 'restart' });
      if (result?.ok) audio.stopSequence();
    }}>{game.success ? `Pass to ${players[(game.playerIndex + 1) % players.length]}` : 'Start a new pattern'}</GameButton>
  </>;

  return <>
    <PlayCard eyebrow={`${player.toUpperCase()} · ${game.phase === 'repeat' ? 'REPEAT' : 'ADD ONE'}`} title={game.phase === 'repeat' ? 'Tap it back.' : 'Choose one more beat.'} copy={game.phase === 'repeat' ? `${game.answer.length} of ${game.pattern.length} beats` : 'Your new beat becomes part of the family pattern.'} />
    <BeatPad beatIds={availableBeats} onBeat={(beatId) => {
      void audio.beat(beatId);
      const result = perform({ type: 'submit_beat', beatId });
      if (result?.ok && result.state.phase === 'result') void (result.state.success ? audio.success() : audio.failure());
    }} />
  </>;
}

function DifficultyPicker({ onSelect }: { onSelect: (difficulty: PatternDifficulty) => void }) {
  return <>
    <PlayCard eyebrow="PASS THE PATTERN" title="Choose your rhythm." copy="One choice for the whole group." />
    <View style={styles.profileStack}>{(Object.keys(patternProfiles) as PatternDifficulty[]).map((difficulty) => {
      const profile = patternProfiles[difficulty];
      return <Pressable key={difficulty} accessibilityRole="button" accessibilityLabel={`${profile.label}: ${profile.description}`} onPress={() => onSelect(difficulty)} style={({ pressed }) => [styles.profile, pressed ? styles.pressed : null]}><Text style={styles.profileTitle}>{profile.label}</Text><Text style={styles.profileCopy}>{profile.description}</Text></Pressable>;
    })}</View>
  </>;
}

function BeatPad({ beatIds, onBeat }: { beatIds: readonly PatternBeatId[]; onBeat: (id: PatternBeatId) => void }) {
  return <View accessibilityRole="toolbar" accessibilityLabel="Beat pad" style={styles.pad}>{beatIds.map((id) => {
    const beat = beats[id];
    return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${beat.label} beat`} accessibilityHint="Adds this beat to your answer" onPress={() => onBeat(id)} style={({ pressed }) => [styles.colorButton, { backgroundColor: beat.background }, pressed ? styles.colorButtonPressed : null]}><Text style={[styles.colorButtonMark, { color: beat.text }]}>{beat.symbol}</Text><Text style={[styles.colorButtonLabel, { color: beat.text }]}>{beat.label}</Text></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  profileStack: { gap: 10 },
  profile: { minHeight: 72, paddingHorizontal: 18, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(32,29,24,0.16)', backgroundColor: gamesTheme.colors.paper, justifyContent: 'center' },
  profileTitle: { fontFamily: gamesTheme.type.display, fontSize: 20, color: gamesTheme.colors.ink },
  profileCopy: { marginTop: 2, fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.58)' },
  pressed: { opacity: 0.72, transform: [{ translateY: 2 }] },
  actions: { flexDirection: 'row', gap: 10 },
  sequence: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, paddingTop: 6 },
  sequenceBeat: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.68, transform: [{ scale: 0.94 }] },
  sequenceBeatActive: { opacity: 1, transform: [{ scale: 1.12 }], borderWidth: 3, borderColor: gamesTheme.colors.white },
  sequenceSymbol: { fontFamily: gamesTheme.type.display, fontSize: 18, lineHeight: 20 },
  sequenceNumber: { fontFamily: gamesTheme.type.utility, fontSize: 10, lineHeight: 12 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorButton: { flexBasis: '47%', flexGrow: 1, minWidth: 120, height: 96, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(32,29,24,0.22)', alignItems: 'center', justifyContent: 'center', gap: 3, shadowColor: gamesTheme.colors.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 0, elevation: 4 },
  colorButtonPressed: { transform: [{ translateY: 4 }], shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 1 },
  colorButtonMark: { fontFamily: gamesTheme.type.display, fontSize: 22, lineHeight: 24 },
  colorButtonLabel: { fontFamily: gamesTheme.type.utility, fontSize: 13, letterSpacing: 0.8 },
});
