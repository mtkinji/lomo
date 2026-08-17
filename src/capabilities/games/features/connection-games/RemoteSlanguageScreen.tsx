import { useEffect, useMemo, useRef, useState } from 'react';
import { router, useLocalSearchParams } from '@/src/capabilities/games/navigation/gamesRouter';
import { ArrowLeft, Check, Crown, Sparkles } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  buildSlanguageTranslation,
  nextSlanguageSlot,
  slanguageSentenceParts,
  type SlanguagePlacements,
} from '@/src/capabilities/games/domain/slanguage';
import { useRemoteSlanguageRoom } from '@/src/capabilities/games/remote/useRemoteSlanguageRoom';
import { useAuth } from '@/src/capabilities/games/shell/AuthProvider';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { KwiltGamesLockup } from '@/src/capabilities/games/ui/KwiltGamesLockup';
import { OpenSlanguageTableLobby } from './OpenSlanguageTableLobby';
import { useGameMusic } from '@/src/capabilities/games/audio/useGameMusic';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';
import { restartOpenGameTable } from '@/src/capabilities/games/remote/remoteBankClient';
import { remoteRematchPresentation } from '@/src/capabilities/games/remote/remoteGameLifecycle';
import { KwiltLoader } from '../../../../ui/KwiltLoader';

function useClock(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [active]);
  return now;
}

export function RemoteSlanguageScreen() {
  const { sessionId, tableCode, hostUserId } = useLocalSearchParams<{ sessionId: string; tableCode?: string; hostUserId?: string }>();
  const { session } = useAuth();
  const { room, loading, sending, error, reload, command } = useRemoteSlanguageRoom(sessionId ?? null);
  const userId = session?.user.id ?? hostUserId ?? '';
  const soundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const musicPhase = room?.state.phase;
  useGameMusic(musicPhase === 'build' || musicPhase === 'vote' ? 'game.slanguage' : null, soundEnabled);

  if (loading || !room) return <GameBackdrop><SafeAreaView style={styles.loading}><KwiltLoader color={gamesTheme.colors.coral} /><Text style={styles.loadingText}>{error ?? 'Opening Slanguage…'}</Text></SafeAreaView></GameBackdrop>;
  if (room.state.phase === 'lobby') return <OpenSlanguageTableLobby
    room={room}
    userId={userId}
    joinedTableCode={tableCode}
    sending={sending}
    error={error}
    reload={reload}
    start={() => command({ type: 'start' })}
  />;

  return <GameBackdrop><SafeAreaView style={styles.safe}>
    <View style={styles.topbar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to games" onPress={() => router.replace('/')} style={styles.iconButton}><ArrowLeft size={22} color={gamesTheme.colors.ink} /></Pressable>
      <View style={styles.roundMeta}><Text style={styles.wordmark}>Slanguage</Text><Text style={styles.round}>ROUND {Math.min(room.state.roundIndex + 1, room.state.totalRounds)}/{room.state.totalRounds}</Text></View>
      <View style={styles.iconButton} />
    </View>
    <View style={styles.content}>
      {room.state.phase === 'build' ? <BuildRound room={room} sending={sending} error={error} submit={(placements) => command({ type: 'submit_translation', placements })} /> : null}
      {room.state.phase === 'reveal' ? <RevealRound room={room} sending={sending} next={() => command({ type: 'advance_reveal' })} /> : null}
      {room.state.phase === 'vote' ? <VoteRound room={room} sending={sending} vote={(submissionParticipantId) => command({ type: 'submit_vote', submissionParticipantId })} /> : null}
      {room.state.phase === 'result' ? <ResultRound room={room} sending={sending} next={() => command({ type: 'next_round' })} /> : null}
      {room.state.phase === 'finished' ? <FinishedRound room={room} userId={userId} reload={reload} /> : null}
    </View>
  </SafeAreaView></GameBackdrop>;
}

type Room = NonNullable<ReturnType<typeof useRemoteSlanguageRoom>['room']>;

function BuildRound({ room, sending, error, submit }: { room: Room; sending: boolean; error: string | null; submit: (placements: SlanguagePlacements) => void }) {
  const prompt = room.prompt;
  const roundRef = useRef(room.state.roundIndex);
  const [placements, setPlacements] = useState<SlanguagePlacements>(() => room.ownPlacements ?? {});
  const [selectedSlot, setSelectedSlot] = useState(prompt?.targets[0]?.id ?? 'opening');
  const now = useClock(true);

  useEffect(() => {
    if (roundRef.current === room.state.roundIndex) return;
    roundRef.current = room.state.roundIndex;
    setPlacements({});
    setSelectedSlot(room.prompt?.targets[0]?.id ?? 'opening');
  }, [room.prompt?.targets, room.state.roundIndex]);

  if (!prompt) return <View style={styles.center}><KwiltLoader color={gamesTheme.colors.coral} /><Text style={styles.loadingText}>Dealing the words…</Text></View>;
  const built = buildSlanguageTranslation(prompt, room.hand, placements);
  const sentenceParts = slanguageSentenceParts(prompt, room.hand, placements);
  const seconds = room.state.deadline ? Math.max(0, Math.ceil((new Date(room.state.deadline).getTime() - now) / 1000)) : 60;
  const submitted = !!room.ownPlacements;
  if (submitted) return <View style={styles.center}>
    <View style={styles.readyMark}><Check size={32} color={gamesTheme.colors.felt} /></View>
    <Text style={styles.bigTitle}>Translation locked.</Text>
    <Text style={styles.supporting}>{room.submittedCount}/{room.participants.length} ready · {seconds}s left</Text>
  </View>;

  const eligible = room.hand.filter((tile) => tile.compatibleTargets.includes(selectedSlot));
  const target = prompt.targets.find((entry) => entry.id === selectedSlot);
  const coreSwaps = prompt.targets.filter((entry) => !!placements[entry.id]).length;
  const selectingSauce = selectedSlot === 'opening' || selectedSlot === 'closing';
  const slotLabel = target?.source ?? (selectedSlot === 'opening' ? 'an opener' : 'a closer');
  const selectTile = (tileId: string) => {
    const next = Object.fromEntries(Object.entries(placements).filter(([slot, usedId]) => slot === selectedSlot || usedId !== tileId));
    if (placements[selectedSlot] === tileId) delete next[selectedSlot];
    else next[selectedSlot] = tileId;
    setPlacements(next);
    if (next[selectedSlot]) setSelectedSlot(nextSlanguageSlot(prompt, next, selectedSlot));
  };
  const unfinishedTarget = prompt.targets.find((entry) => !placements[entry.id]);
  const openSauce = () => setSelectedSlot(!placements.opening ? 'opening' : 'closing');

  return <View style={styles.build}>
    <View style={styles.timerRow}><Text style={styles.buildLabel}>MAKE IT SLANGIER</Text><Text style={[styles.timer, seconds <= 10 ? styles.timerUrgent : null]}>{seconds}</Text></View>
    <View style={styles.sentenceBoard}>
      <Text accessibilityLabel={`Sentence: ${built.text}`} style={styles.sentenceText}>{sentenceParts.map((part, index) => part.kind === 'text'
        ? <Text key={`text-${index}`}>{part.text}</Text>
        : <Text
          key={`${part.slotId}-${index}`}
          accessibilityRole="button"
          accessibilityLabel={`Swap ${part.source}. Current words: ${part.text}`}
          onPress={() => setSelectedSlot(part.slotId)}
          style={[styles.sentenceSlot, part.filled ? styles.sentenceSlotFilled : null, selectedSlot === part.slotId ? styles.sentenceSlotActive : null]}
        >{part.text}</Text>)}</Text>
    </View>
    <View style={styles.choiceHeading}>
      <Text style={styles.trayTitle}>{selectingSauce ? 'OPTIONAL · ADD SOME SAUCE' : 'CHOOSE A SWAP FOR'}</Text>
      <Text style={styles.choicePhrase}>{selectingSauce ? (selectedSlot === 'opening' ? 'Start with…' : 'Finish with…') : `“${slotLabel}”`}</Text>
    </View>
    <View style={styles.tiles}>{eligible.map((tile) => {
      const selected = placements[selectedSlot] === tile.id;
      return <Pressable key={tile.id} accessibilityRole="button" accessibilityLabel={`${tile.text}. ${tile.gloss}. ${tile.era === 'now' ? 'Now' : 'Throwback'}`} onPress={() => selectTile(tile.id)} style={[styles.tile, selected ? styles.tileSelected : null]}>
        <View style={styles.tileTop}><Text style={styles.tileText}>{tile.text}</Text><Text style={styles.tileEra}>{tile.era === 'now' ? 'NOW' : 'THROWBACK'}</Text></View>
        <Text style={styles.tileGloss}>{tile.gloss}</Text>
      </Pressable>;
    })}</View>
    <View style={styles.buildActions}>
      <View style={styles.buildStatus}>
        <Text style={styles.swapCount}>{coreSwaps} of {prompt.targets.length} phrases swapped</Text>
        {built.usedTiles.length > 0 ? <Pressable accessibilityRole="button" onPress={selectingSauce && unfinishedTarget ? () => setSelectedSlot(unfinishedTarget.id) : openSauce} style={styles.sauceLink}>
          <Sparkles size={14} color={gamesTheme.colors.felt} />
          <Text style={styles.sauceText}>{selectingSauce && unfinishedTarget ? 'Back to phrase swaps' : 'Add some sauce'}</Text>
        </Pressable> : null}
      </View>
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <GameButton disabled={sending || built.usedTiles.length === 0} onPress={() => submit(placements)}>{sending ? 'Submitting…' : 'Submit my sentence'}</GameButton>
    </View>
  </View>;
}

function RevealRound({ room, sending, next }: { room: Room; sending: boolean; next: () => void }) {
  const now = useClock(true);
  const participantId = room.state.revealOrder[room.state.revealIndex];
  const submission = room.revealedSubmissions.find((entry) => entry.participantId === participantId);
  const heldFor = room.state.revealStartedAt ? now - new Date(room.state.revealStartedAt).getTime() : 0;
  const canAdvance = heldFor >= 3000;
  return <View style={styles.center}>
    <Text style={styles.phaseLabel}>TRANSLATION {room.state.revealIndex + 1} OF {room.state.revealOrder.length}</Text>
    <View style={styles.revealCard}><Sparkles size={25} color={gamesTheme.colors.turmeric} /><Text style={styles.revealText}>{submission?.text ?? 'Revealing…'}</Text></View>
    <Text style={styles.supporting}>Read it to the room.</Text>
    <GameButton disabled={sending || !canAdvance} onPress={next}>{canAdvance ? 'Next translation' : 'Let it land…'}</GameButton>
  </View>;
}

function VoteRound({ room, sending, vote }: { room: Room; sending: boolean; vote: (participantId: string) => void }) {
  if (room.hasVoted) return <View style={styles.center}><View style={styles.readyMark}><Check size={32} color={gamesTheme.colors.felt} /></View><Text style={styles.bigTitle}>Vote locked.</Text><Text style={styles.supporting}>Waiting for the room.</Text></View>;
  const ballot = room.revealedSubmissions.filter((submission) => submission.participantId !== room.currentParticipantId);
  if (ballot.length === 0) return <View style={styles.center}>
    <Text style={styles.phaseLabel}>NOT ENOUGH TRANSLATIONS</Text>
    <Text style={styles.bigTitle}>No vote needed.</Text>
    <Text style={styles.supporting}>{room.revealedSubmissions.length === 1 ? 'Only one translation made it in. No Crown this round.' : 'No translations made it in. No Crown this round.'}</Text>
  </View>;
  return <View style={styles.vote}>
    <Text style={styles.phaseLabel}>FUNNIEST WINS</Text><Text style={styles.bigTitle}>Crown one translation.</Text>
    <ScrollView contentContainerStyle={styles.ballot}>{ballot.map((submission) => <Pressable key={submission.participantId} accessibilityRole="button" accessibilityLabel={`Vote for ${submission.text}`} disabled={sending} onPress={() => vote(submission.participantId)} style={styles.ballotCard}><Text style={styles.ballotText}>{submission.text}</Text></Pressable>)}</ScrollView>
  </View>;
}

function ResultRound({ room, sending, next }: { room: Room; sending: boolean; next: () => void }) {
  const winners = room.state.roundWinnerIds.map((id) => room.participants.find((participant) => participant.id === id)?.displayName).filter(Boolean);
  const winnerSubmission = room.revealedSubmissions.find((entry) => room.state.roundWinnerIds.includes(entry.participantId));
  const lastRound = room.state.roundIndex + 1 >= room.state.totalRounds;
  return <View style={styles.center}>
    <View style={styles.crownMark}><Crown size={36} color={gamesTheme.colors.ink} /></View>
    <Text style={styles.phaseLabel}>CROWD FAVORITE</Text>
    <Text style={styles.bigTitle}>{winners.length ? `${winners.join(' & ')} ${winners.length === 1 ? 'wins' : 'win'} the Crown.` : 'No Crown this round.'}</Text>
    {!winners.length && room.revealedSubmissions.length < 2 ? <Text style={styles.supporting}>{room.revealedSubmissions.length === 1 ? 'Only one translation made it in.' : 'No translations made it in.'}</Text> : null}
    {winnerSubmission ? <View style={styles.winnerLine}><Text style={styles.winnerText}>{winnerSubmission.text}</Text><Text style={styles.winnerScore}>{winnerSubmission.slangScore} Slang Score</Text></View> : null}
    <GameButton disabled={sending} onPress={next}>{lastRound ? 'See the winner' : 'Next sentence'}</GameButton>
  </View>;
}

function FinishedRound({ room, userId, reload }: { room: Room; userId: string; reload: () => Promise<void> }) {
  const [restarting, setRestarting] = useState(false);
  const winners = room.state.winnerIds.map((id) => room.participants.find((participant) => participant.id === id)?.displayName).filter(Boolean);
  const rematch = remoteRematchPresentation(userId === room.hostUserId);
  const restart = async () => {
    if (!rematch.canRestart || restarting) return;
    setRestarting(true);
    try { await restartOpenGameTable(room.id); await reload(); }
    finally { setRestarting(false); }
  };
  return <View style={styles.center}><View style={styles.crownMark}><Crown size={42} color={gamesTheme.colors.ink} /></View><Text style={styles.phaseLabel}>SLANGUAGE CHAMPION</Text><Text style={styles.heroTitle}>{winners.join(' & ') || 'The room'}</Text><Text style={styles.supporting}>Most Crowns after five translations.</Text>{rematch.canRestart ? <GameButton disabled={restarting} onPress={() => void restart()}>{restarting ? 'Opening table…' : rematch.primaryCopy}</GameButton> : <Text style={styles.supporting}>{rematch.primaryCopy}</Text>}<GameButton tone="ghost" onPress={() => router.replace('/')}>Back to games</GameButton></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 14, paddingBottom: 14 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.62)' },
  topbar: { minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  roundMeta: { alignItems: 'center' },
  wordmark: { fontFamily: gamesTheme.type.display, fontSize: 19, color: gamesTheme.colors.ink },
  round: { fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 1.3, color: 'rgba(32,29,24,0.45)' },
  content: { flex: 1, minHeight: 0 },
  build: { flex: 1, gap: 11 },
  timerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  buildLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.5, color: 'rgba(32,29,24,0.48)' },
  timer: { minWidth: 46, textAlign: 'right', fontFamily: gamesTheme.type.display, fontSize: 28, color: gamesTheme.colors.ink },
  timerUrgent: { color: gamesTheme.colors.danger },
  sentenceBoard: { minHeight: 144, borderRadius: 24, backgroundColor: gamesTheme.colors.felt, borderWidth: 5, borderColor: gamesTheme.colors.wood, paddingHorizontal: 18, paddingVertical: 20, justifyContent: 'center' },
  sentenceText: { fontFamily: gamesTheme.type.display, fontSize: 22, lineHeight: 33, color: gamesTheme.colors.white },
  sentenceSlot: { color: gamesTheme.colors.white, textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: 'rgba(255,255,255,0.72)' },
  sentenceSlotFilled: { color: '#FFF0B8', textDecorationColor: gamesTheme.colors.turmeric },
  sentenceSlotActive: { color: gamesTheme.colors.ink, backgroundColor: gamesTheme.colors.turmeric, textDecorationLine: 'none' },
  choiceHeading: { gap: 2 },
  trayTitle: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.2, color: 'rgba(32,29,24,0.48)' },
  choicePhrase: { fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.ink },
  tiles: { gap: 7 },
  tile: { minHeight: 55, paddingHorizontal: 13, paddingVertical: 9, borderRadius: 16, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  tileSelected: { borderWidth: 2, borderColor: gamesTheme.colors.ink, backgroundColor: '#FFF0B8' },
  tileTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tileText: { flex: 1, fontFamily: gamesTheme.type.display, fontSize: 15, color: gamesTheme.colors.ink },
  tileEra: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, overflow: 'hidden', backgroundColor: 'rgba(32,29,24,0.07)', fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 0.8, color: 'rgba(32,29,24,0.58)' },
  tileGloss: { marginTop: 2, fontFamily: gamesTheme.type.body, fontSize: 10, color: 'rgba(32,29,24,0.5)' },
  buildActions: { marginTop: 'auto', gap: 10 },
  buildStatus: { minHeight: 28, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  swapCount: { fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.5)' },
  sauceLink: { minHeight: 28, flexDirection: 'row', alignItems: 'center', gap: 5 },
  sauceText: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: gamesTheme.colors.felt },
  center: { flex: 1, justifyContent: 'center', gap: 15 },
  readyMark: { alignSelf: 'center', width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: '#DDEBDF' },
  crownMark: { alignSelf: 'center', width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', backgroundColor: gamesTheme.colors.turmeric },
  phaseLabel: { textAlign: 'center', fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.7, color: 'rgba(32,29,24,0.48)' },
  bigTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 30, lineHeight: 34, color: gamesTheme.colors.ink },
  heroTitle: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 43, lineHeight: 46, color: gamesTheme.colors.ink },
  supporting: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 14, color: 'rgba(32,29,24,0.56)' },
  revealCard: { minHeight: 240, borderRadius: 28, backgroundColor: gamesTheme.colors.felt, borderWidth: 6, borderColor: gamesTheme.colors.wood, padding: 24, justifyContent: 'center', gap: 16 },
  revealText: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 29, lineHeight: 36, color: gamesTheme.colors.white },
  vote: { flex: 1, gap: 9 },
  ballot: { gap: 9, paddingVertical: 7 },
  ballotCard: { minHeight: 86, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)', backgroundColor: gamesTheme.colors.paper, padding: 16, justifyContent: 'center' },
  ballotText: { fontFamily: gamesTheme.type.display, fontSize: 18, lineHeight: 23, color: gamesTheme.colors.ink },
  winnerLine: { borderRadius: 22, backgroundColor: gamesTheme.colors.paper, padding: 17, gap: 7 },
  winnerText: { textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 20, lineHeight: 25, color: gamesTheme.colors.ink },
  winnerScore: { textAlign: 'center', fontFamily: gamesTheme.type.utility, fontSize: 10, color: 'rgba(32,29,24,0.48)' },
  error: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 11, color: gamesTheme.colors.danger },
});
