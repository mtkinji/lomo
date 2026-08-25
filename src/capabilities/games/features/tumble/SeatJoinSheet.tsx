import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useState } from 'react';
import { Modal, Share, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Check, Share2, X } from 'lucide-react-native';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { createInviteUrl, type RemoteBankInvite, type RemoteBankParticipant } from '@/src/capabilities/games/remote/remoteBank';
import { createRemoteBankInvite } from '@/src/capabilities/games/remote/remoteBankClient';

const joinOrigin = process.env.EXPO_PUBLIC_GAMES_JOIN_ORIGIN?.trim() || 'kwilt://games';

export function SeatJoinSheet({ sessionId, participant, open, onClose }: {
  sessionId: string;
  participant: RemoteBankParticipant | null;
  open: boolean;
  onClose: () => void;
}) {
  const [invite, setInvite] = useState<RemoteBankInvite | null>(null);
  const [showCode, setShowCode] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !participant || participant.joinStatus === 'joined') return;
    setInvite(null);
    setError(null);
    setShowCode(false);
    void createRemoteBankInvite(sessionId, participant.id).then(setInvite).catch((next) => setError(next instanceof Error ? next.message : 'Unable to create an invite.'));
  }, [open, participant, sessionId]);

  const url = invite ? createInviteUrl(joinOrigin, invite.token) : null;
  const joined = participant?.joinStatus === 'joined';
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.backdrop} onPress={onClose}>
      <Pressable style={styles.sheet} onPress={() => undefined}>
        <View style={styles.heading}>
          <View style={styles.headingCopy}>
            <Text style={styles.title}>{participant?.displayName ?? 'Player'}</Text>
            <Text style={styles.copy}>{joined ? 'This seat is now on their phone.' : 'Scan this with the iPhone Camera.'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Close invitation" onPress={onClose} style={styles.close}><X size={20} color={gamesTheme.colors.ink} /></Pressable>
        </View>

        {joined ? <View style={styles.joined}><Check size={28} color={gamesTheme.colors.felt} /><Text style={styles.joinedText}>Joined</Text></View> : null}
        {!joined && url ? <View style={styles.qr}><QRCode value={url} size={210} color={gamesTheme.colors.ink} backgroundColor={gamesTheme.colors.paper} /></View> : null}
        {!joined && !url && !error ? <View style={styles.loading}><Text style={styles.loadingText}>Making a private invitation…</Text></View> : null}
        {error ? <Text style={styles.error}>{error}</Text> : null}

        {!joined && url ? <GameButton tone="paper" icon={<Share2 size={19} color={gamesTheme.colors.ink} />} onPress={() => void Share.share({ message: `${participant?.displayName ?? 'You'} can join our Bank game: ${url}`, url })}>Share invite</GameButton> : null}
        {!joined && invite ? (
          showCode
            ? <View style={styles.codeWrap}><Text style={styles.codeLabel}>JOIN CODE</Text><Text selectable style={styles.code}>{invite.code.slice(0, 3)}-{invite.code.slice(3)}</Text></View>
            : <Pressable accessibilityRole="button" onPress={() => setShowCode(true)} style={styles.codeReveal}><Text style={styles.codeRevealText}>Use a code instead</Text></Pressable>
        ) : null}
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,17,13,0.62)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: gamesTheme.colors.cream, padding: 24, paddingBottom: 34, gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14 },
  headingCopy: { flex: 1, gap: 3 },
  title: { fontFamily: gamesTheme.type.display, fontSize: 29, color: gamesTheme.colors.ink },
  copy: { fontFamily: gamesTheme.type.body, fontSize: 14, color: 'rgba(32,29,24,0.6)' },
  close: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(32,29,24,0.07)', alignItems: 'center', justifyContent: 'center' },
  qr: { alignSelf: 'center', padding: 18, borderRadius: 22, backgroundColor: gamesTheme.colors.paper },
  loading: { height: 246, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.55)' },
  joined: { minHeight: 190, alignItems: 'center', justifyContent: 'center', gap: 9 },
  joinedText: { fontFamily: gamesTheme.type.display, fontSize: 24, color: gamesTheme.colors.felt },
  error: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(197,63,43,0.08)', fontFamily: gamesTheme.type.body, color: gamesTheme.colors.danger },
  codeReveal: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  codeRevealText: { fontFamily: gamesTheme.type.utility, fontSize: 12, color: 'rgba(32,29,24,0.58)', textDecorationLine: 'underline' },
  codeWrap: { alignItems: 'center', gap: 3 },
  codeLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.5, color: 'rgba(32,29,24,0.46)' },
  code: { fontFamily: gamesTheme.type.display, fontSize: 25, letterSpacing: 3, color: gamesTheme.colors.ink },
});
