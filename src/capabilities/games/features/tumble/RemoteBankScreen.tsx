import { useMemo, useState } from 'react';
import { router, useLocalSearchParams } from '@/src/capabilities/games/navigation/gamesRouter';
import { ArrowLeft, Check, Landmark, Smartphone, Volume2 } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { KwiltGamesLockup } from '@/src/capabilities/games/ui/KwiltGamesLockup';
import { useAuth } from '@/src/capabilities/games/shell/AuthProvider';
import { canControlSeat } from '@/src/capabilities/games/remote/remoteBank';
import { useRemoteBankRoom } from '@/src/capabilities/games/remote/useRemoteBankRoom';
import { Die } from './Die';
import { PlayerRail } from './PlayerRail';
import { OpenBankTableLobby } from './OpenBankTableLobby';
import { useGameMusic } from '@/src/capabilities/games/audio/useGameMusic';
import { bankMusicForState } from '@/src/capabilities/games/gameMusicState';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';
import { restartOpenGameTable } from '@/src/capabilities/games/remote/remoteBankClient';
import { remoteRematchPresentation } from '@/src/capabilities/games/remote/remoteGameLifecycle';
import { KwiltLoader } from '../../../../ui/KwiltLoader';

export function RemoteBankScreen() {
  const { sessionId, tableCode, hostUserId } = useLocalSearchParams<{ sessionId: string; tableCode?: string; hostUserId?: string }>();
  const { session } = useAuth();
  const { room, loading, sending, error, reload, command } = useRemoteBankRoom(sessionId ?? null);
  const [phonesOpen, setPhonesOpen] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const userId = session?.user.id ?? hostUserId ?? '';
  const controlled = useMemo(() => room?.participants.filter((participant) => canControlSeat(participant, userId, room.hostUserId)) ?? [], [room, userId]);
  const game = room?.state;
  const soundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  useGameMusic(game ? bankMusicForState(game) : null, soundEnabled && room?.status !== 'lobby');
  const activeParticipant = game ? room?.participants.find((participant) => participant.seatIndex === game.activePlayer) : null;
  const canRoll = !!activeParticipant && controlled.some((participant) => participant.id === activeParticipant.id);
  const bankers = game?.bankingRule === 'anyone'
    ? controlled.filter((participant) => !game.players[participant.seatIndex]?.banked)
    : activeParticipant && controlled.some((participant) => participant.id === activeParticipant.id) ? [activeParticipant] : [];
  const rematch = remoteRematchPresentation(!!room && userId === room.hostUserId);
  const restart = async () => {
    if (!room || !rematch.canRestart || restarting) return;
    setRestarting(true);
    try { await restartOpenGameTable(room.id); await reload(); }
    finally { setRestarting(false); }
  };

  if (loading || !room || !game) return <GameBackdrop><SafeAreaView style={styles.loading}><KwiltLoader color={gamesTheme.colors.coral} /><Text style={styles.loadingText}>{error ?? 'Joining the table…'}</Text></SafeAreaView></GameBackdrop>;

  if (room.status === 'lobby') return <OpenBankTableLobby room={room} userId={userId} reload={reload} joinedTableCode={tableCode} />;

  return <GameBackdrop>
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to games" onPress={() => router.replace('/')} style={styles.iconButton}><ArrowLeft size={22} color={gamesTheme.colors.ink} /></Pressable>
        <KwiltGamesLockup compact />
        <Pressable accessibilityRole="button" accessibilityLabel="Players on phones" onPress={() => setPhonesOpen(true)} style={styles.iconButton}><Smartphone size={21} color={gamesTheme.colors.ink} /></Pressable>
      </View>

      <View style={styles.table}>
        <LinearGradient colors={[gamesTheme.colors.feltLight, gamesTheme.colors.felt, gamesTheme.colors.feltDark]} style={styles.tableInner}>
          <View pointerEvents="none" style={styles.tableInlay} />
          <View style={styles.hud}><Text style={styles.eyebrow}>REMOTE · ROUND {game.round}/{game.maxRounds}</Text><Text numberOfLines={1} style={styles.title}>{game.status === 'finished' ? game.message : `${game.players[game.activePlayer]?.name}'s turn`}</Text><Text numberOfLines={1} style={styles.message}>{sending ? 'Sending move…' : error ?? game.message}</Text></View>
          <PlayerRail players={game.players} activePlayer={game.activePlayer} banked={game.players.map((player) => player.banked)} />
          <View style={styles.diceTray}>{game.lastRoll.map((value, index) => <Die key={`${room.stateVersion}-${index}`} value={value} rolling={sending} />)}</View>
          <View style={styles.result}><Text style={styles.resultLabel}>POT</Text><Text style={styles.resultValue}>{game.pot}</Text></View>
        </LinearGradient>
      </View>

      {game.status === 'finished' ? <View style={styles.finishedActions}>
        {rematch.canRestart
          ? <GameButton disabled={restarting} onPress={() => void restart()}>{restarting ? 'Opening table…' : rematch.primaryCopy}</GameButton>
          : <Text style={styles.rematchWaiting}>{rematch.primaryCopy}</Text>}
        <GameButton tone="ghost" onPress={() => router.replace('/')}>Back to games</GameButton>
      </View> : (
        <View style={styles.controls}>
          {bankers.length === 1 ? <GameButton tone="turmeric" disabled={sending || game.rollInRound === 0} onPress={() => void command(bankers[0].id, 'bank')} style={styles.secondary} icon={<Landmark size={18} color={gamesTheme.colors.ink} />}>Bank {game.pot}</GameButton> : null}
          {bankers.length > 1 ? <GameButton tone="turmeric" disabled={sending || game.rollInRound === 0} onPress={() => setPhonesOpen(true)} style={styles.secondary} icon={<Landmark size={18} color={gamesTheme.colors.ink} />}>Choose banker</GameButton> : null}
          <GameButton disabled={sending || !canRoll} onPress={() => activeParticipant && void command(activeParticipant.id, 'roll')} style={styles.primary} icon={<Volume2 size={18} color={gamesTheme.colors.ink} />}>{canRoll ? 'Roll' : `Waiting for ${game.players[game.activePlayer]?.name}`}</GameButton>
        </View>
      )}
    </SafeAreaView>

    <Modal visible={phonesOpen} transparent animationType="slide" onRequestClose={() => setPhonesOpen(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setPhonesOpen(false)}>
        <Pressable style={styles.phoneSheet} onPress={() => undefined}>
          <Text style={styles.phoneTitle}>Who’s using their phone?</Text>
          <Text style={styles.phoneCopy}>Everyone else stays on this device.</Text>
          <ScrollView contentContainerStyle={styles.phoneRows}>
            {room.participants.map((participant) => {
              const joined = participant.joinStatus === 'joined';
              const local = participant.controllerUserId === room.hostUserId;
              return <View key={participant.id} style={styles.phoneRow}>
                <Text numberOfLines={1} style={styles.phoneName}>{participant.displayName}</Text>
                <View style={styles.phoneStatus}>{joined ? <Check size={16} color={gamesTheme.colors.felt} /> : <Smartphone size={16} color={gamesTheme.colors.ink} />}<Text style={styles.phoneAction}>{joined ? 'Their phone' : local ? 'Host phone' : 'Unavailable'}</Text></View>
              </View>;
            })}
          </ScrollView>
          <GameButton tone="ghost" onPress={() => setPhonesOpen(false)}>Done</GameButton>
        </Pressable>
      </Pressable>
    </Modal>
  </GameBackdrop>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 12, paddingBottom: 14 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.62)' },
  topbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  table: { flex: 1, minHeight: 0, padding: 9, borderRadius: gamesTheme.radius.lg, backgroundColor: gamesTheme.colors.wood, borderWidth: 2, borderColor: '#5A3422' },
  tableInner: { flex: 1, overflow: 'hidden', borderRadius: gamesTheme.radius.md, borderWidth: 3, borderColor: gamesTheme.colors.woodLight, paddingTop: 14, paddingBottom: 18, justifyContent: 'space-between' },
  tableInlay: { position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  hud: { alignItems: 'center', minHeight: 62, gap: 2, paddingHorizontal: 12 },
  eyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 9, color: 'rgba(255,255,255,0.58)', letterSpacing: 1.4 },
  title: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.white },
  message: { fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(255,255,255,0.62)' },
  diceTray: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  result: { alignSelf: 'center', flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  resultLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, color: 'rgba(255,255,255,0.64)', letterSpacing: 1.6 },
  resultValue: { fontFamily: gamesTheme.type.display, fontSize: 29, color: gamesTheme.colors.white },
  controls: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  finishedActions: { gap: 8, paddingTop: 12 },
  rematchWaiting: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.58)', paddingVertical: 10 },
  primary: { flex: 1.2 },
  secondary: { flex: 0.8 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,17,13,0.62)' },
  phoneSheet: { maxHeight: '78%', borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: gamesTheme.colors.cream, padding: 24, paddingBottom: 34, gap: 8 },
  phoneTitle: { fontFamily: gamesTheme.type.display, fontSize: 28, color: gamesTheme.colors.ink },
  phoneCopy: { fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.58)', marginBottom: 6 },
  phoneRows: { gap: 8, paddingVertical: 4 },
  phoneRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(32,29,24,0.15)', backgroundColor: gamesTheme.colors.paper, paddingHorizontal: 16 },
  phoneName: { flex: 1, fontFamily: gamesTheme.type.display, fontSize: 16, color: gamesTheme.colors.ink },
  phoneStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneAction: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: 'rgba(32,29,24,0.58)' },
});
