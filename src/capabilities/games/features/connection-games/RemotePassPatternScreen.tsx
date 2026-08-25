import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from '@/src/capabilities/games/navigation/gamesRouter';
import { usePatternAudio } from '@/src/capabilities/games/audio/usePatternAudio';
import { patternProfiles, type PatternBeatId } from '@/src/capabilities/games/domain/passPattern';
import { useRemotePassPatternRoom } from '@/src/capabilities/games/remote/useRemotePassPatternRoom';
import { useAuth } from '@/src/capabilities/games/shell/AuthProvider';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { ConnectionGameFrame, PlayCard } from './ConnectionGameFrame';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';

const beats: Record<PatternBeatId, { label: string; symbol: string; color: string; text: string }> = {
  coral: { label: 'Coral', symbol: '●', color: gamesTheme.colors.coral, text: gamesTheme.colors.ink },
  pine: { label: 'Pine', symbol: '▲', color: gamesTheme.colors.feltLight, text: gamesTheme.colors.white },
  gold: { label: 'Gold', symbol: '◆', color: gamesTheme.colors.turmeric, text: gamesTheme.colors.ink },
  sky: { label: 'Sky', symbol: '■', color: '#78BBDD', text: gamesTheme.colors.ink },
  violet: { label: 'Violet', symbol: '✦', color: '#9B7BC2', text: gamesTheme.colors.white },
  rose: { label: 'Rose', symbol: '♥', color: '#E9829D', text: gamesTheme.colors.ink },
};

export function RemotePassPatternScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { session } = useAuth();
  const { room, loading, sending, error, command } = useRemotePassPatternRoom(sessionId ?? null);
  const soundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const audio = usePatternAudio(soundEnabled);
  const [watchComplete, setWatchComplete] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const game = room?.state;
  const activeParticipant = game ? room?.participants.find((participant) => participant.seatIndex === game.playerIndex) : null;
  const canControl = !!activeParticipant && activeParticipant.controllerUserId === session?.user.id;

  useEffect(() => {
    if (!game || game.phase !== 'watch') return audio.stopSequence;
    setWatchComplete(false);
    audio.sequence(game.pattern, { spacingMs: patternProfiles[game.difficulty].spacingMs, onActiveBeat: (_id, index) => setActiveIndex(index), onComplete: () => setWatchComplete(true) });
    return audio.stopSequence;
  }, [audio, game?.difficulty, game?.phase, game?.watchSequence]);

  if (loading || !room || !game || !activeParticipant) return <ConnectionGameFrame title="Pass the Pattern" promise="Remember the rhythm. Add one more beat."><PlayCard tone="paper" title="Joining the pattern…" copy={error ?? 'Loading the shared turn.'} /></ConnectionGameFrame>;

  const send = (action: Parameters<typeof command>[1]) => void command(activeParticipant.id, action);
  if (game.phase === 'handoff') return <ConnectionGameFrame title="Pass the Pattern" promise="Remember the rhythm. Add one more beat."><PlayCard eyebrow="REMOTE · NEXT TURN" title={`${activeParticipant.displayName} is up.`} copy={canControl ? 'Start when everyone is listening.' : `Waiting for ${activeParticipant.displayName}.`} />{canControl ? <GameButton disabled={sending} onPress={() => send({ type: 'ready' })}>We’re ready</GameButton> : null}</ConnectionGameFrame>;

  if (game.phase === 'watch') return <ConnectionGameFrame title="Pass the Pattern" promise="Remember the rhythm. Add one more beat."><PlayCard eyebrow="EVERYONE · WATCH" title={watchComplete ? 'Pattern complete.' : 'Listen together.'} copy={error ?? (canControl ? 'You’ll tap it back when the sound finishes.' : `${activeParticipant.displayName} will tap it back.`)}><View style={styles.sequence}>{game.pattern.map((id, index) => <View key={`${id}-${index}`} style={[styles.sequenceBeat, { backgroundColor: beats[id].color }, activeIndex === index ? styles.active : null]}><Text style={{ color: beats[id].text }}>{beats[id].symbol}</Text></View>)}</View></PlayCard>{watchComplete && canControl ? <View style={styles.actions}><GameButton tone="ghost" disabled={sending} onPress={() => send({ type: 'replay_watch' })}>Play again</GameButton><GameButton disabled={sending} onPress={() => send({ type: 'finish_watch' })}>I’ve got it</GameButton></View> : null}</ConnectionGameFrame>;

  if (game.phase === 'result') return <ConnectionGameFrame title="Pass the Pattern" promise="Remember the rhythm. Add one more beat."><PlayCard eyebrow={game.success ? 'PATTERN GROWS' : 'PATTERN BROKE'} title={game.success ? `${activeParticipant.displayName} added a beat!` : 'So close. Start a fresh rhythm.'} copy={game.success ? `${game.pattern.length} beats are traveling around the room.` : 'No points lost.'} />{canControl ? <GameButton disabled={sending} onPress={() => send({ type: game.success ? 'next_player' : 'restart' })}>{game.success ? 'Pass it on' : 'Start a new pattern'}</GameButton> : null}</ConnectionGameFrame>;

  const available = patternProfiles[game.difficulty].beatIds;
  return <ConnectionGameFrame title="Pass the Pattern" promise="Remember the rhythm. Add one more beat."><PlayCard eyebrow={`${activeParticipant.displayName.toUpperCase()} · ${game.phase === 'repeat' ? 'REPEAT' : 'ADD ONE'}`} title={canControl ? (game.phase === 'repeat' ? 'Tap it back.' : 'Choose one more beat.') : `Waiting for ${activeParticipant.displayName}.`} copy={error ?? (game.phase === 'repeat' ? `${game.answer.length} of ${game.pattern.length} beats` : 'The next beat grows the shared pattern.')} />{canControl ? <View accessibilityRole="toolbar" accessibilityLabel="Beat pad" style={styles.pad}>{available.map((id) => <Pressable key={id} accessibilityRole="button" accessibilityLabel={`${beats[id].label} beat`} disabled={sending} onPress={() => { void audio.beat(id); send({ type: 'submit_beat', beatId: id }); }} style={[styles.beat, { backgroundColor: beats[id].color }]}><Text style={[styles.symbol, { color: beats[id].text }]}>{beats[id].symbol}</Text><Text style={[styles.label, { color: beats[id].text }]}>{beats[id].label}</Text></Pressable>)}</View> : null}</ConnectionGameFrame>;
}

const styles = StyleSheet.create({
  sequence: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  sequenceBeat: { width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', opacity: 0.65 },
  active: { opacity: 1, transform: [{ scale: 1.12 }], borderWidth: 3, borderColor: gamesTheme.colors.white },
  actions: { flexDirection: 'row', gap: 10 },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  beat: { flexBasis: '47%', flexGrow: 1, minWidth: 120, height: 96, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(32,29,24,0.22)', alignItems: 'center', justifyContent: 'center' },
  symbol: { fontFamily: gamesTheme.type.display, fontSize: 22 },
  label: { fontFamily: gamesTheme.type.utility, fontSize: 12 },
});
