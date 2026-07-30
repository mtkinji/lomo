import { useEffect, useMemo, useState } from 'react';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { Radio, Share2, UserRound, X } from 'lucide-react-native';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { advertiseNearbyTable, stopAdvertisingNearbyTable } from '@/src/capabilities/games/nearby/nearbyTables';
import { createInviteUrl, tableMarkForCode } from '@/src/capabilities/games/remote/remoteBank';
import { removeRemoteBankTableParticipant } from '@/src/capabilities/games/remote/remoteBankClient';
import { createOpenGameTableInvite, type RemoteSlanguageRoom } from '@/src/capabilities/games/remote/remoteSlanguageClient';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { KwiltGamesLockup } from '@/src/capabilities/games/ui/KwiltGamesLockup';

const joinOrigin = process.env.EXPO_PUBLIC_GAMES_JOIN_ORIGIN?.trim() || 'kwilt://games';

export function OpenSlanguageTableLobby({
  room,
  userId,
  joinedTableCode,
  sending,
  error: roomError,
  reload,
  start,
}: {
  room: RemoteSlanguageRoom;
  userId: string;
  joinedTableCode?: string;
  sending: boolean;
  error: string | null;
  reload: () => Promise<void>;
  start: () => Promise<void> | void;
}) {
  const isHost = room.hostUserId === userId;
  const [invite, setInvite] = useState<{ token: string; code: string; expiresAt: string } | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openSeats = Math.max(0, room.state.capacity - room.participants.length);

  useEffect(() => {
    if (!isHost) return undefined;
    let active = true;
    void createOpenGameTableInvite(room.id)
      .then((next) => { if (active) setInvite(next); })
      .catch((next) => { if (active) setError(next instanceof Error ? next.message : 'Unable to open the table.'); });
    return () => { active = false; };
  }, [isHost, room.id]);

  useEffect(() => {
    if (!isHost || !invite?.code) return undefined;
    void advertiseNearbyTable(invite.code, 'slanguage').catch(() => setError('Nearby discovery is unavailable. The QR and code still work.'));
    return () => stopAdvertisingNearbyTable();
  }, [invite?.code, isHost]);

  const inviteUrl = invite ? createInviteUrl(joinOrigin, invite.token) : null;
  const tableMark = useMemo(() => {
    const code = invite?.code ?? joinedTableCode;
    return code ? tableMarkForCode(code) : null;
  }, [invite?.code, joinedTableCode]);

  const remove = async (participantId: string) => {
    setWorking(true);
    setError(null);
    try { await removeRemoteBankTableParticipant(room.id, participantId); await reload(); }
    catch { setError('Unable to remove that player.'); }
    finally { setWorking(false); }
  };

  return <GameBackdrop><SafeAreaView style={styles.safe}>
    <View style={styles.topbar}><KwiltGamesLockup compact /><Pressable accessibilityRole="button" accessibilityLabel="Close table" onPress={() => router.replace('/')} style={styles.close}><X size={20} color={gamesTheme.colors.ink} /></Pressable></View>
    <View style={styles.heading}><Text style={styles.eyebrow}>SLANGUAGE</Text><Text style={styles.title}>{isHost ? 'Bring in the room.' : 'You’re in.'}</Text><Text style={styles.copy}>{isHost ? 'Three phones minimum. No accounts needed.' : 'The first sentence drops when the host starts.'}</Text></View>

    {isHost ? <View style={styles.inviteArea}>
      <View style={styles.qrWrap}>{inviteUrl ? <QRCode value={inviteUrl} size={142} color={gamesTheme.colors.ink} backgroundColor={gamesTheme.colors.paper} /> : <Text style={styles.loading}>Opening the table…</Text>}</View>
      <View style={styles.inviteCopy}>
        {tableMark ? <View style={styles.nearby}><Radio size={16} color={gamesTheme.colors.felt} /><Text style={styles.nearbyText}>{tableMark} · nearby</Text></View> : null}
        {invite ? <><Text style={styles.codeLabel}>TABLE CODE</Text><Text selectable style={styles.code}>{invite.code.slice(0, 3)}-{invite.code.slice(3)}</Text></> : null}
        {inviteUrl ? <Pressable accessibilityRole="button" onPress={() => void Share.share({ message: `Join our Slanguage table: ${inviteUrl}`, url: inviteUrl })} style={styles.share}><Share2 size={16} color={gamesTheme.colors.ink} /><Text style={styles.shareText}>Share</Text></Pressable> : null}
      </View>
    </View> : tableMark ? <View style={styles.joinedMark}><Text style={styles.joinedMarkLabel}>TABLE</Text><Text style={styles.joinedMarkValue}>{tableMark}</Text></View> : null}

    <View style={styles.people}>
      <View style={styles.peopleHeading}><Text style={styles.peopleTitle}>Players</Text><Text style={styles.peopleCount}>{room.participants.length}/{room.state.capacity}</Text></View>
      <View style={styles.rows}>{room.participants.map((participant) => <View key={participant.id} style={styles.row}>
        <View style={styles.avatar}><UserRound size={18} color={gamesTheme.colors.ink} /></View>
        <View style={styles.personCopy}><Text numberOfLines={1} style={styles.personName}>{participant.displayName}</Text><Text style={styles.personMeta}>{participant.role === 'host' ? 'Host' : 'On their phone'}</Text></View>
        {isHost && participant.role !== 'host' ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${participant.displayName}`} disabled={working} onPress={() => void remove(participant.id)} style={styles.remove}><X size={16} color={gamesTheme.colors.ink} /></Pressable> : null}
      </View>)}</View>
      <Text style={styles.waiting}>{room.participants.length < 3 ? `${3 - room.participants.length} more ${3 - room.participants.length === 1 ? 'player' : 'players'} needed` : openSeats > 0 ? `${openSeats} places still open` : 'The table is full'}</Text>
    </View>
    {error || roomError ? <Text accessibilityRole="alert" style={styles.error}>{error ?? roomError}</Text> : null}
    {isHost ? <GameButton disabled={working || sending || room.participants.length < 3} onPress={() => void start()}>{sending ? 'Starting…' : room.participants.length < 3 ? 'Waiting for three' : 'Start Slanguage'}</GameButton> : <GameButton disabled>Waiting for host</GameButton>}
  </SafeAreaView></GameBackdrop>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 18, paddingBottom: 16, gap: 12 },
  topbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.48)' },
  heading: { gap: 3 },
  eyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.6, color: gamesTheme.colors.danger },
  title: { fontFamily: gamesTheme.type.display, fontSize: 31, lineHeight: 33, color: gamesTheme.colors.ink },
  copy: { fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.58)' },
  inviteArea: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 24, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  qrWrap: { width: 148, height: 148, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: gamesTheme.colors.paper },
  loading: { fontFamily: gamesTheme.type.body, fontSize: 12, color: 'rgba(32,29,24,0.5)' },
  inviteCopy: { flex: 1, alignItems: 'center', gap: 6 },
  nearby: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nearbyText: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: gamesTheme.colors.felt },
  codeLabel: { fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 1.3, color: 'rgba(32,29,24,0.45)' },
  code: { fontFamily: gamesTheme.type.display, fontSize: 22, letterSpacing: 2, color: gamesTheme.colors.ink },
  share: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareText: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: gamesTheme.colors.ink },
  joinedMark: { padding: 18, borderRadius: 22, backgroundColor: gamesTheme.colors.turmeric, alignItems: 'center', gap: 2 },
  joinedMarkLabel: { fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 1.5, color: 'rgba(32,29,24,0.5)' },
  joinedMarkValue: { fontFamily: gamesTheme.type.display, fontSize: 26, color: gamesTheme.colors.ink },
  people: { flex: 1, minHeight: 0, gap: 8 },
  peopleHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  peopleTitle: { fontFamily: gamesTheme.type.display, fontSize: 20, color: gamesTheme.colors.ink },
  peopleCount: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: 'rgba(32,29,24,0.5)' },
  rows: { gap: 6 },
  row: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.1)' },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: gamesTheme.colors.turmeric, alignItems: 'center', justifyContent: 'center' },
  personCopy: { flex: 1 },
  personName: { fontFamily: gamesTheme.type.display, fontSize: 15, color: gamesTheme.colors.ink },
  personMeta: { fontFamily: gamesTheme.type.body, fontSize: 10, color: 'rgba(32,29,24,0.5)' },
  remove: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  waiting: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.5)' },
  error: { padding: 9, borderRadius: 11, backgroundColor: 'rgba(197,63,43,0.08)', fontFamily: gamesTheme.type.body, fontSize: 11, color: gamesTheme.colors.danger },
});
