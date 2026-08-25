import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useMemo, useState } from 'react';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { Radio, Share2, UserRound, X } from 'lucide-react-native';
import { Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { advertiseNearbyTable, stopAdvertisingNearbyTable } from '@/src/capabilities/games/nearby/nearbyTables';
import { createInviteUrl, tableMarkForCode, type RemoteBankRoom, type RemoteBankTableInvite } from '@/src/capabilities/games/remote/remoteBank';
import { createRemoteBankTableInvite, removeRemoteBankTableParticipant, startRemoteBankTable } from '@/src/capabilities/games/remote/remoteBankClient';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { KwiltGamesLockup } from '@/src/capabilities/games/ui/KwiltGamesLockup';

const joinOrigin = process.env.EXPO_PUBLIC_GAMES_JOIN_ORIGIN?.trim() || 'kwilt://games';

export function OpenBankTableLobby({ room, userId, reload, joinedTableCode }: { room: RemoteBankRoom; userId: string; reload: () => Promise<void>; joinedTableCode?: string }) {
  const isHost = room.hostUserId === userId;
  const [invite, setInvite] = useState<RemoteBankTableInvite | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const capacity = Number((room.state as typeof room.state & { capacity?: number }).capacity ?? 6);
  const openSeats = Math.max(0, capacity - room.participants.length);

  useEffect(() => {
    if (!isHost) return undefined;
    let active = true;
    setError(null);
    void createRemoteBankTableInvite(room.id)
      .then((next) => { if (active) setInvite(next); })
      .catch((next) => { if (active) setError(next instanceof Error ? next.message : 'Unable to open the table.'); });
    return () => { active = false; };
  }, [isHost, room.id]);

  useEffect(() => {
    if (!isHost || !invite?.code) return undefined;
    void advertiseNearbyTable(invite.code).catch((next) => {
      setError(next instanceof Error ? `${next.message} The QR and code still work.` : 'Nearby discovery is unavailable. The QR and code still work.');
    });
    return () => stopAdvertisingNearbyTable();
  }, [invite?.code, isHost]);

  const inviteUrl = invite ? createInviteUrl(joinOrigin, invite.token) : null;
  const tableMark = useMemo(() => {
    const code = invite?.code ?? joinedTableCode;
    return code ? tableMarkForCode(code) : null;
  }, [invite?.code, joinedTableCode]);

  const start = async () => {
    setWorking(true);
    setError(null);
    try {
      await startRemoteBankTable(room.id);
      await reload();
    } catch (next) {
      setError(next instanceof Error ? next.message : 'Unable to start the table.');
    } finally { setWorking(false); }
  };

  const remove = async (participantId: string) => {
    setWorking(true);
    setError(null);
    try {
      await removeRemoteBankTableParticipant(room.id, participantId);
      await reload();
    } catch (next) {
      setError(next instanceof Error ? next.message : 'Unable to remove that player.');
    } finally { setWorking(false); }
  };

  return <GameBackdrop><SafeAreaView style={styles.safe}>
    <View style={styles.topbar}>
      <KwiltGamesLockup compact />
      <Pressable accessibilityRole="button" accessibilityLabel="Close table" onPress={() => router.replace('/')} style={styles.close}><X size={20} color={gamesTheme.colors.ink} /></Pressable>
    </View>
    <View style={styles.heading}>
      <Text style={styles.eyebrow}>BANK TABLE</Text>
      <Text style={styles.title}>{isHost ? 'Bring everyone in.' : 'You’re at the table.'}</Text>
      <Text style={styles.copy}>{isHost ? 'Everyone can join this one table themselves.' : 'The game begins when the host is ready.'}</Text>
    </View>

    {isHost ? <View style={styles.inviteArea}>
      <View style={styles.qrWrap}>{inviteUrl ? <QRCode value={inviteUrl} size={154} color={gamesTheme.colors.ink} backgroundColor={gamesTheme.colors.paper} /> : <Text style={styles.loading}>Opening the table…</Text>}</View>
      <View style={styles.inviteCopy}>
        {tableMark ? <View style={styles.nearby}>
          <Radio size={18} color={gamesTheme.colors.felt} />
          <View style={styles.nearbyCopy}><Text style={styles.nearbyTitle}>Open nearby</Text><Text style={styles.nearbyText}>People in Kwilt can find this table while this screen is open.</Text></View>
          <Text style={styles.nearbyMark}>{tableMark}</Text>
        </View> : null}
        <Text style={styles.scanCopy}>Each phone can scan this code instead.</Text>
        {invite ? <><Text style={styles.codeLabel}>TABLE CODE</Text><Text selectable style={styles.code}>{invite.code.slice(0, 3)}-{invite.code.slice(3)}</Text></> : null}
        {inviteUrl ? <Pressable accessibilityRole="button" onPress={() => void Share.share({ message: `Join our Bank table: ${inviteUrl}`, url: inviteUrl })} style={styles.share}><Share2 size={16} color={gamesTheme.colors.ink} /><Text style={styles.shareText}>Share</Text></Pressable> : null}
      </View>
    </View> : tableMark ? <View style={styles.joinedMark}><Text style={styles.joinedMarkLabel}>TABLE</Text><Text style={styles.joinedMarkValue}>{tableMark}</Text></View> : null}

    <View style={styles.people}>
      <View style={styles.peopleHeading}><Text style={styles.peopleTitle}>At the table</Text><Text style={styles.peopleCount}>{room.participants.length}/{capacity}</Text></View>
      <View style={styles.rows}>{room.participants.map((participant) => {
        const removable = isHost && participant.role !== 'host';
        return <View key={participant.id} style={styles.row}>
          <View style={styles.avatar}><UserRound size={18} color={gamesTheme.colors.ink} /></View>
          <View style={styles.personCopy}><Text numberOfLines={1} style={styles.personName}>{participant.displayName}</Text><Text style={styles.personMeta}>{participant.role === 'host' ? 'Host' : participant.controllerUserId === room.hostUserId ? 'On host phone' : 'On their phone'}</Text></View>
          {removable ? <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${participant.displayName}`} disabled={working} onPress={() => void remove(participant.id)} style={styles.remove}><X size={16} color={gamesTheme.colors.ink} /></Pressable> : null}
        </View>;
      })}</View>
      {openSeats > 0 ? <Text style={styles.waiting}>{isHost ? `${openSeats} place${openSeats === 1 ? '' : 's'} still open` : 'Waiting for the host'}</Text> : <Text style={styles.waiting}>The table is full</Text>}
    </View>

    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <View style={styles.actions}>{isHost ? <GameButton disabled={working || room.participants.length < 2} onPress={() => void start()}>{working ? 'Starting…' : room.participants.length < 2 ? 'Waiting for someone' : 'Start game'}</GameButton> : <GameButton disabled>Waiting for host</GameButton>}</View>
  </SafeAreaView></GameBackdrop>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 18, paddingBottom: 16, gap: 14 },
  topbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.48)' },
  heading: { gap: 3 },
  eyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.6, color: gamesTheme.colors.danger },
  title: { fontFamily: gamesTheme.type.display, fontSize: 31, lineHeight: 33, color: gamesTheme.colors.ink },
  copy: { fontFamily: gamesTheme.type.body, fontSize: 13, color: 'rgba(32,29,24,0.58)' },
  inviteArea: { alignItems: 'center', gap: 9, padding: 13, borderRadius: 24, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  qrWrap: { width: 164, height: 164, alignItems: 'center', justifyContent: 'center', borderRadius: 18, backgroundColor: gamesTheme.colors.paper },
  loading: { fontFamily: gamesTheme.type.body, fontSize: 12, color: 'rgba(32,29,24,0.5)' },
  inviteCopy: { width: '100%', alignItems: 'center', gap: 5 },
  nearby: { width: '100%', flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 16, backgroundColor: 'rgba(86,139,113,0.1)' },
  nearbyCopy: { flex: 1, gap: 2 },
  nearbyTitle: { fontFamily: gamesTheme.type.display, fontSize: 15, color: gamesTheme.colors.ink },
  nearbyText: { fontFamily: gamesTheme.type.body, fontSize: 11, lineHeight: 15, color: 'rgba(32,29,24,0.58)' },
  nearbyMark: { fontFamily: gamesTheme.type.utility, fontSize: 10, color: gamesTheme.colors.felt },
  scanCopy: { maxWidth: 280, textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 12, lineHeight: 17, color: 'rgba(32,29,24,0.58)' },
  codeLabel: { marginTop: 2, fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 1.3, color: 'rgba(32,29,24,0.45)' },
  code: { fontFamily: gamesTheme.type.display, fontSize: 22, letterSpacing: 2, color: gamesTheme.colors.ink },
  share: { minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 6 },
  shareText: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: gamesTheme.colors.ink },
  joinedMark: { padding: 18, borderRadius: 22, backgroundColor: gamesTheme.colors.turmeric, alignItems: 'center', gap: 2 },
  joinedMarkLabel: { fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 1.5, color: 'rgba(32,29,24,0.5)' },
  joinedMarkValue: { fontFamily: gamesTheme.type.display, fontSize: 26, color: gamesTheme.colors.ink },
  people: { flex: 1, minHeight: 0, gap: 9 },
  peopleHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  peopleTitle: { fontFamily: gamesTheme.type.display, fontSize: 20, color: gamesTheme.colors.ink },
  peopleCount: { fontFamily: gamesTheme.type.utility, fontSize: 11, color: 'rgba(32,29,24,0.5)' },
  rows: { gap: 7 },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 11, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.1)' },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: gamesTheme.colors.turmeric, alignItems: 'center', justifyContent: 'center' },
  personCopy: { flex: 1 },
  personName: { fontFamily: gamesTheme.type.display, fontSize: 16, color: gamesTheme.colors.ink },
  personMeta: { fontFamily: gamesTheme.type.body, fontSize: 10, color: 'rgba(32,29,24,0.5)' },
  remove: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  waiting: { textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.5)' },
  error: { padding: 10, borderRadius: 11, backgroundColor: 'rgba(197,63,43,0.08)', fontFamily: gamesTheme.type.body, fontSize: 11, color: gamesTheme.colors.danger },
  actions: { paddingTop: 2 },
});
