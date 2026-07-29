import { useState } from 'react';
import { router, useLocalSearchParams } from '@/src/capabilities/games/navigation/gamesRouter';
import { Ionicons } from '@expo/vector-icons';
import { Dices, X } from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { KwiltGamesLockup } from '@/src/capabilities/games/ui/KwiltGamesLockup';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { permanentUserId, signInWithProvider, type AuthProviderName } from '@/src/capabilities/games/platform/auth';
import { useAuth } from '@/src/capabilities/games/shell/AuthProvider';
import { useGamePlayerProfile } from '@/src/capabilities/games/players/useGamePlayerProfile';
import { normalizePlayerIdentity, playerColor, playerColorText } from '@/src/capabilities/games/players/playerIdentity';
import { PlayerIdentityEditor } from '@/src/capabilities/games/players/PlayerIdentityEditor';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';

const TERMS = 'https://kwilt.app/terms';
const PRIVACY = 'https://kwilt.app/privacy';

export function AuthScreen() {
  const { source, profileName, colorId, successSoundId, failureSoundId } = useLocalSearchParams<{
    source?: string; profileName?: string; colorId?: string; successSoundId?: string; failureSoundId?: string;
  }>();
  const { session, configError, signOut } = useAuth();
  const accountUserId = permanentUserId(session);
  const fallbackName = session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name ?? session?.user.email?.split('@')[0] ?? 'You';
  const playerProfile = useGamePlayerProfile({ userId: accountUserId, fallbackName });
  const feedback = useGameFeedback(true);
  const [loading, setLoading] = useState<AuthProviderName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [promotionResolved, setPromotionResolved] = useState(false);
  const promotionIdentity = normalizePlayerIdentity({ colorId, successSoundId, failureSoundId });
  const promotionName = profileName?.trim() ?? '';
  const canPromote = source === 'player-profile' && !!promotionName && !promotionResolved;

  const connect = async (provider: AuthProviderName) => {
    setError(null);
    setLoading(provider);
    try {
      await signInWithProvider(provider);
      if (source === 'post-game' || source === 'remote-room' || source === 'remote-invite') router.back();
    }
    catch (next) {
      const message = next instanceof Error ? next.message : 'Unable to sign in.';
      if (!message.toLowerCase().includes('cancel')) setError(message);
    } finally { setLoading(null); }
  };

  return (
    <GameBackdrop dark>
      <SafeAreaView style={styles.safe}>
        <View style={styles.topbar}>
          <KwiltGamesLockup inverse compact />
          <Pressable accessibilityRole="button" accessibilityLabel="Close sign in" onPress={() => router.back()} style={styles.close}><X size={21} color={gamesTheme.colors.white} /></Pressable>
        </View>

        <View pointerEvents="none" style={styles.tableArt}>
          <View style={[styles.artDie, styles.artDieOne]}><Dices size={60} color={gamesTheme.colors.ink} /></View>
          <View style={[styles.artDie, styles.artDieTwo]}><Text style={styles.artPips}>••{`\n`} •</Text></View>
          <View style={styles.scoreChip}><Text style={styles.scoreChipText}>GAME NIGHT</Text></View>
        </View>

        <ScrollView style={styles.sheetFrame} contentContainerStyle={styles.sheet} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {accountUserId ? (
            <>
              <Text style={styles.eyebrow}>MY PLAYER</Text>
              <Text style={styles.title}>Make every table feel like yours.</Text>
              {canPromote ? <View style={styles.promotion}>
                <Text style={styles.promotionTitle}>Bring these choices with you?</Text>
                <View style={[styles.promotionPreview, { backgroundColor: playerColor(promotionIdentity.colorId) }]}><Text style={[styles.promotionName, { color: playerColorText(promotionIdentity.colorId) }]}>{promotionName}</Text><Text style={[styles.promotionMeta, { color: playerColorText(promotionIdentity.colorId) }]}>{promotionIdentity.successSoundId} win · {promotionIdentity.failureSoundId} fail</Text></View>
                <Text style={styles.promotionCopy}>This copies the choices to My player. The remembered player stays separate.</Text>
                <GameButton onPress={() => { playerProfile.save(promotionName, promotionIdentity); setPromotionResolved(true); }}>Use these choices for my profile</GameButton>
                <GameButton tone="ghost" onPress={() => setPromotionResolved(true)}>Keep them separate</GameButton>
              </View> : null}
              {playerProfile.profile ? <View style={[styles.playerCard, { backgroundColor: playerColor(playerProfile.profile.identity.colorId) }]}>
                <View style={[styles.playerMark, { borderColor: playerColorText(playerProfile.profile.identity.colorId) }]}><Text style={[styles.playerMarkText, { color: playerColorText(playerProfile.profile.identity.colorId) }]}>{playerProfile.profile.displayName.slice(0, 1).toUpperCase()}</Text></View>
                <View style={styles.playerCopy}><Text style={[styles.playerName, { color: playerColorText(playerProfile.profile.identity.colorId) }]}>{playerProfile.profile.displayName}</Text><Text style={[styles.playerMeta, { color: playerColorText(playerProfile.profile.identity.colorId) }]}>Follows you when you sign in</Text></View>
              </View> : <Text style={styles.copy}>{playerProfile.loading ? 'Loading your player…' : 'Your player is ready to personalize.'}</Text>}
              {playerProfile.syncError ? <Text style={styles.error}>{playerProfile.syncError}</Text> : null}
              <GameButton disabled={!playerProfile.profile} onPress={() => setEditingProfile(true)}>Edit my player</GameButton>
              <Text style={styles.accountLabel}>SIGNED IN AS</Text>
              <Text style={styles.accountEmail}>{session?.user.email ?? 'Your Kwilt account'}</Text>
              <GameButton onPress={() => router.replace('/')}>Back to games</GameButton>
              <GameButton tone="ghost" onPress={() => void signOut()}>Sign out</GameButton>
            </>
          ) : (
            <>
              <Text style={styles.eyebrow}>SAVE YOUR TABLE</Text>
              <Text style={styles.title}>Save your players.</Text>
              <Text style={styles.copy}>Sign in to keep these names ready on your other devices. Guest play always works.</Text>
              {error || configError ? <Text style={styles.error}>{error ?? configError}</Text> : null}
              <View style={styles.buttons}>
                <GameButton tone="paper" disabled={!!loading} onPress={() => void connect('apple')} icon={<Ionicons name="logo-apple" size={20} color={gamesTheme.colors.ink} />}>{loading === 'apple' ? 'Connecting…' : 'Continue with Apple'}</GameButton>
                <GameButton tone="paper" disabled={!!loading} onPress={() => void connect('google')} icon={<Ionicons name="logo-google" size={19} color={gamesTheme.colors.ink} />}>{loading === 'google' ? 'Connecting…' : 'Continue with Google'}</GameButton>
                <GameButton tone="ghost" onPress={() => router.back()}>Keep playing as a guest</GameButton>
              </View>
              <Text style={styles.legal}>By continuing, you agree to our <Text style={styles.link} onPress={() => void Linking.openURL(TERMS)}>Terms</Text> and <Text style={styles.link} onPress={() => void Linking.openURL(PRIVACY)}>Privacy Policy</Text>.</Text>
            </>
          )}
        </ScrollView>
        <PlayerIdentityEditor
          visible={editingProfile && !!playerProfile.profile}
          initial={playerProfile.profile ? { displayName: playerProfile.profile.displayName, identity: playerProfile.profile.identity } : null}
          eyebrow="MY PLAYER"
          title="Make it yours"
          saveLabel="Save my player"
          onClose={() => setEditingProfile(false)}
          onSave={playerProfile.save}
          onPreviewSuccess={(soundId) => { void feedback.success(soundId); }}
          onPreviewFailure={(soundId) => { void feedback.failure(soundId); }}
        />
      </SafeAreaView>
    </GameBackdrop>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 18 },
  topbar: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)' },
  tableArt: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  artDie: { position: 'absolute', width: 112, height: 112, borderRadius: 24, backgroundColor: gamesTheme.colors.paper, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 6, height: 12 }, shadowOpacity: 0.3, shadowRadius: 12 },
  artDieOne: { transform: [{ translateX: -62 }, { translateY: -12 }, { rotate: '-11deg' }] },
  artDieTwo: { transform: [{ translateX: 58 }, { translateY: 22 }, { rotate: '13deg' }] },
  artPips: { fontSize: 40, lineHeight: 30, color: gamesTheme.colors.ink, textAlign: 'center' },
  scoreChip: { marginTop: 170, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 999, backgroundColor: gamesTheme.colors.turmeric },
  scoreChipText: { fontFamily: gamesTheme.type.utility, fontSize: 10, letterSpacing: 1.8, color: gamesTheme.colors.ink },
  sheetFrame: { maxHeight: '76%', marginHorizontal: -18, backgroundColor: gamesTheme.colors.cream, borderTopLeftRadius: 30, borderTopRightRadius: 30, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.16, shadowRadius: 28 },
  sheet: { padding: 24, paddingBottom: 34, gap: 13 },
  eyebrow: { fontFamily: gamesTheme.type.utility, color: gamesTheme.colors.danger, fontSize: 10, letterSpacing: 1.7 },
  title: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 31, lineHeight: 31, letterSpacing: -1.2 },
  copy: { fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.62)', fontSize: 15, lineHeight: 21 },
  buttons: { gap: 12, paddingTop: 4 },
  error: { fontFamily: gamesTheme.type.body, color: gamesTheme.colors.danger, fontSize: 12, lineHeight: 17, padding: 10, borderRadius: 10, backgroundColor: 'rgba(197,63,43,0.08)' },
  playerCard: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 20, padding: 12 },
  playerMark: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  playerMarkText: { fontFamily: gamesTheme.type.display, fontSize: 22 },
  playerCopy: { flex: 1 },
  playerName: { fontFamily: gamesTheme.type.display, fontSize: 19 },
  playerMeta: { marginTop: 2, fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 0.7, opacity: 0.68 },
  accountLabel: { marginTop: 5, fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.42)', fontSize: 9, letterSpacing: 1.3 },
  accountEmail: { fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.68)', fontSize: 13 },
  promotion: { gap: 9, padding: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.48)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  promotionTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 18 },
  promotionPreview: { minHeight: 54, justifyContent: 'center', borderRadius: 14, paddingHorizontal: 14 },
  promotionName: { fontFamily: gamesTheme.type.display, fontSize: 17 },
  promotionMeta: { marginTop: 2, fontFamily: gamesTheme.type.utility, fontSize: 9, opacity: 0.66 },
  promotionCopy: { fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.58)', fontSize: 11, lineHeight: 15 },
  legal: { textAlign: 'center', fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.48)', fontSize: 10, lineHeight: 14 },
  link: { textDecorationLine: 'underline', color: gamesTheme.colors.ink },
});
