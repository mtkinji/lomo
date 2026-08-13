import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { usePatternAudio } from '@/src/capabilities/games/audio/usePatternAudio';
import { usePatternGroove } from '@/src/capabilities/games/audio/usePatternGroove';
import type { PatternBeatId } from '@/src/capabilities/games/domain/passPattern';
import {
  advancePassPatternRhythm,
  createPassPatternRhythmGame,
  patternGrooveOrder,
  patternGrooves,
  playablePatternBeatIds,
  type PassPatternRhythmAction,
  type PassPatternRhythmState,
} from '@/src/capabilities/games/domain/passPatternRhythm';
import { HapticsService } from '@/src/services/HapticsService';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { PlayCard } from './ConnectionGameFrame';

const beats: Record<PatternBeatId, { label: string; symbol: string; background: string; text: string }> = {
  coral: { label: 'Coral', symbol: '●', background: gamesTheme.colors.coral, text: gamesTheme.colors.ink },
  pine: { label: 'Pine', symbol: '▲', background: gamesTheme.colors.feltLight, text: gamesTheme.colors.white },
  gold: { label: 'Gold', symbol: '◆', background: gamesTheme.colors.turmeric, text: gamesTheme.colors.ink },
  sky: { label: 'Sky', symbol: '■', background: '#78BBDD', text: gamesTheme.colors.ink },
  violet: { label: 'Violet', symbol: '✦', background: '#9B7BC2', text: gamesTheme.colors.white },
  rose: { label: 'Rose', symbol: '♥', background: '#E9829D', text: gamesTheme.colors.ink },
};

export function PassPatternGame({ players, soundEnabled }: { players: string[]; soundEnabled: boolean }) {
  const initialGame = useRef(createPassPatternRhythmGame(players.length));
  const gameRef = useRef<PassPatternRhythmState>(initialGame.current);
  const [game, setGame] = useState(initialGame.current);
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);
  const [watchComplete, setWatchComplete] = useState(false);
  const audio = usePatternAudio(soundEnabled);
  const groove = usePatternGroove(game.grooveId, soundEnabled);
  const grooveProfile = patternGrooves[game.grooveId];

  const perform = (action: PassPatternRhythmAction) => {
    const result = advancePassPatternRhythm(gameRef.current, action);
    if (result.ok) {
      gameRef.current = result.state;
      setGame(result.state);
    }
    return result;
  };

  useEffect(() => {
    if (game.phase !== 'watch') return audio.stopSequence;
    setWatchComplete(false);
    audio.sequence(game.pattern, {
      spacingMs: grooveProfile.beatMs,
      startDelayMs: groove.msUntilNextBeat(),
      onActiveBeat: (_beatId, index) => setActiveBeatIndex(index),
      onComplete: () => setWatchComplete(true),
    });
    return audio.stopSequence;
  }, [audio, game.grooveId, game.phase, game.watchSequence, groove.msUntilNextBeat, grooveProfile.beatMs]);

  const player = players[game.playerIndex];
  const remainingNames = game.activePlayerIndexes.map((index) => players[index]);

  if (game.phase === 'finished') {
    return <>
      <PlayCard eyebrow="LAST ONE IN" title={`${players[game.winnerIndex ?? game.playerIndex]} held the pattern.`} copy={`${game.round} ${game.round === 1 ? 'groove' : 'grooves'} played. Everyone made the song.`}>
        <GroovePulse grooveId={game.grooveId} beatIndex={groove.beatIndex} />
      </PlayCard>
      <GameButton onPress={() => {
        void HapticsService.trigger('outcome.success');
        perform({ type: 'rematch' });
      }}>Play again</GameButton>
    </>;
  }

  if (game.phase === 'handoff') return <>
    <PlayCard eyebrow={`ROUND ${game.round} · ${grooveProfile.label.toUpperCase()}`} title={`Pass to ${player}`} copy={`Tap each note when the pulse lands. ${game.activePlayerIndexes.length} players are still in.`}>
      <GroovePulse grooveId={game.grooveId} beatIndex={groove.beatIndex} />
      <RemainingPlayers names={remainingNames} />
    </PlayCard>
    <GameButton onPress={() => perform({ type: 'ready' })}>We’re ready</GameButton>
  </>;

  if (game.phase === 'watch') return <>
    <PlayCard eyebrow={`${player.toUpperCase()} · WATCH`} title={watchComplete ? 'Pattern complete.' : 'Listen to the groove.'} copy={watchComplete ? 'Play it once more, or start on the next pulse.' : 'Each note lands on one beat. Only the active player taps it back.'}>
      <GroovePulse grooveId={game.grooveId} beatIndex={groove.beatIndex} />
      <View accessibilityLabel="Pattern playback" style={styles.sequence}>{game.pattern.map((id, index) => {
        const beat = beats[id];
        const active = activeBeatIndex === index;
        return <View key={`${id}-${index}`} style={[styles.sequenceBeat, { backgroundColor: beat.background }, active ? styles.sequenceBeatActive : null]}><Text style={[styles.sequenceSymbol, { color: beat.text }]}>{beat.symbol}</Text><Text style={[styles.sequenceNumber, { color: beat.text }]}>{index + 1}</Text></View>;
      })}</View>
    </PlayCard>
    {watchComplete ? <View style={styles.actions}><GameButton tone="ghost" onPress={() => perform({ type: 'replay_watch' })}>Play again</GameButton><GameButton onPress={() => perform({ type: 'finish_watch' })}>I’ve got it</GameButton></View> : null}
  </>;

  if (game.phase === 'result') {
    const success = game.outcome === 'success';
    const survivorsAfterMiss = game.activePlayerIndexes.length - 1;
    const nextGrooveId = patternGrooveOrder[game.round % patternGrooveOrder.length];
    return <>
      <PlayCard
        eyebrow={success ? 'PATTERN GROWS' : game.outcome === 'off-beat' ? 'MISSED THE PULSE' : 'DIFFERENT NOTE'}
        title={success ? `${player} added a note!` : `${player} is out this game.`}
        copy={success
          ? `${game.pattern.length} notes are traveling around the circle.`
          : survivorsAfterMiss === 1
            ? 'One player remains. See who held the pattern.'
            : `${survivorsAfterMiss} players keep going. ${patternGrooves[nextGrooveId].label} is next.`}
      >
        <GroovePulse grooveId={game.grooveId} beatIndex={groove.beatIndex} />
      </PlayCard>
      <GameButton onPress={() => {
        if (!success) void HapticsService.trigger('outcome.error');
        perform({ type: 'continue' });
      }}>{success ? `Pass to ${nextSurvivorName(game, players)}` : survivorsAfterMiss === 1 ? 'See winner' : `Start ${patternGrooves[nextGrooveId].label}`}</GameButton>
    </>;
  }

  return <>
    <PlayCard
      eyebrow={`${player.toUpperCase()} · ${game.phase === 'repeat' ? 'REPEAT' : 'ADD ONE'}`}
      title={game.phase === 'repeat' ? 'Tap it on the beat.' : 'Add one more note.'}
      copy={game.phase === 'repeat' ? `${game.answer.length} of ${game.pattern.length} notes` : 'Your note becomes part of the shared song.'}
    >
      <GroovePulse grooveId={game.grooveId} beatIndex={groove.beatIndex} />
    </PlayCard>
    <BeatPad
      beatIds={playablePatternBeatIds}
      onTouchDown={(beatId) => audio.beat(beatId)}
      onBeat={(beatId, touchTimestampMs) => {
        perform({ type: 'submit_beat', beatId, timingOffsetMs: groove.timingOffsetMs(touchTimestampMs) });
      }}
    />
  </>;
}

function nextSurvivorName(game: PassPatternRhythmState, players: string[]) {
  const activePosition = game.activePlayerIndexes.indexOf(game.playerIndex);
  return players[game.activePlayerIndexes[(activePosition + 1) % game.activePlayerIndexes.length]];
}

function RemainingPlayers({ names }: { names: string[] }) {
  return <Text accessibilityLabel={`Still in: ${names.join(', ')}`} style={styles.remaining}>Still in · {names.join(' · ')}</Text>;
}

function GroovePulse({ grooveId, beatIndex }: { grooveId: keyof typeof patternGrooves; beatIndex: number }) {
  const groove = patternGrooves[grooveId];
  return <View accessible accessibilityLabel={`${groove.label} groove, ${groove.bpm} beats per minute, beat ${beatIndex + 1} of 4`} style={styles.grooveRow}>
    <Text style={styles.grooveLabel}>{groove.label} · {groove.bpm} BPM</Text>
    <View importantForAccessibility="no-hide-descendants" style={styles.pulse}>{[0, 1, 2, 3].map((index) => <View key={index} style={[styles.pulseDot, index === beatIndex ? styles.pulseDotActive : null]} />)}</View>
  </View>;
}

function BeatPad({ beatIds, onTouchDown, onBeat }: { beatIds: readonly PatternBeatId[]; onTouchDown: (id: PatternBeatId) => void; onBeat: (id: PatternBeatId, touchTimestampMs: number) => void }) {
  const touchTimes = useRef<Partial<Record<PatternBeatId, number>>>({});
  return <View accessibilityRole="toolbar" accessibilityLabel="Beat pad" style={styles.pad}>{beatIds.map((id) => {
    const beat = beats[id];
    return <Pressable
      key={id}
      accessibilityRole="button"
      accessibilityLabel={`${beat.label} beat`}
      accessibilityHint="Plays this note and adds it to your answer"
      onPressIn={() => {
        touchTimes.current[id] = Date.now();
        onTouchDown(id);
      }}
      onPress={() => {
        const timestamp = touchTimes.current[id] ?? Date.now();
        if (touchTimes.current[id] == null) onTouchDown(id);
        delete touchTimes.current[id];
        onBeat(id, timestamp);
      }}
      style={({ pressed }) => [styles.colorButton, { backgroundColor: beat.background }, pressed ? styles.colorButtonPressed : null]}
    ><Text style={[styles.colorButtonMark, { color: beat.text }]}>{beat.symbol}</Text><Text style={[styles.colorButtonLabel, { color: beat.text }]}>{beat.label}</Text></Pressable>;
  })}</View>;
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 10 },
  sequence: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 9, paddingTop: 2 },
  sequenceBeat: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', opacity: 0.68, transform: [{ scale: 0.94 }] },
  sequenceBeatActive: { opacity: 1, transform: [{ scale: 1.08 }], borderWidth: 3, borderColor: gamesTheme.colors.white },
  sequenceSymbol: { fontFamily: gamesTheme.type.display, fontSize: 18, lineHeight: 20 },
  sequenceNumber: { fontFamily: gamesTheme.type.utility, fontSize: 10, lineHeight: 12 },
  grooveRow: { flexDirection: 'row', minHeight: 44, alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  grooveLabel: { fontFamily: gamesTheme.type.utility, fontSize: 12, letterSpacing: 0.6, color: gamesTheme.colors.white },
  pulse: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pulseDot: { width: 11, height: 11, borderRadius: 6, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', backgroundColor: 'transparent' },
  pulseDotActive: { backgroundColor: gamesTheme.colors.turmeric, borderColor: gamesTheme.colors.turmeric, transform: [{ scale: 1.18 }] },
  remaining: { fontFamily: gamesTheme.type.body, fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.68)' },
  pad: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  colorButton: { flexBasis: '47%', flexGrow: 1, minWidth: 120, height: 96, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(32,29,24,0.22)', alignItems: 'center', justifyContent: 'center', gap: 3, shadowColor: gamesTheme.colors.ink, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 0, elevation: 4 },
  colorButtonPressed: { transform: [{ translateY: 4 }], shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, elevation: 1 },
  colorButtonMark: { fontFamily: gamesTheme.type.display, fontSize: 22, lineHeight: 24 },
  colorButtonLabel: { fontFamily: gamesTheme.type.utility, fontSize: 13, letterSpacing: 0.8 },
});
