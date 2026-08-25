import { Pressable } from '@/src/ui/HapticPressable';
import { useEffect, useRef, useState } from 'react';
import { router, type Href } from '@/src/capabilities/games/navigation/gamesRouter';
import { Radio, UsersRound } from 'lucide-react-native';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import {
  claimRemoteBankTableInvite,
  previewOpenGameTableInvite,
  type OpenGameTablePreview,
} from '@/src/capabilities/games/remote/remoteBankClient';
import { normalizeJoinCode, tableMarkForCode } from '@/src/capabilities/games/remote/remoteBank';
import { browseNearbyTables, nearbyTablesAvailable, type NearbyTable } from '@/src/capabilities/games/nearby/nearbyTables';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { BottomDrawer, BottomDrawerScrollView } from '@/src/ui/BottomDrawer';
import { BottomDrawerHeader } from '@/src/ui/layout/BottomDrawerHeader';
import { useAuth } from '@/src/capabilities/games/shell/AuthProvider';
import { permanentUserId } from '@/src/capabilities/games/platform/auth';
import { useGamePlayerProfile } from '@/src/capabilities/games/players/useGamePlayerProfile';

type JoinTableDrawerProps = {
  visible: boolean;
  token?: string;
  onClose: () => void;
};

export function JoinTableDrawer({ visible, token, onClose }: JoinTableDrawerProps) {
  const { session } = useAuth();
  const accountUserId = permanentUserId(session);
  const fallbackName = session?.user.user_metadata?.full_name
    ?? session?.user.user_metadata?.name
    ?? session?.user.email?.split('@')[0]
    ?? 'You';
  const playerProfile = useGamePlayerProfile({ userId: accountUserId, fallbackName });
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [nearbyTables, setNearbyTables] = useState<NearbyTable[]>([]);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameHelp, setNameHelp] = useState<string | null>(null);
  const [preview, setPreview] = useState<OpenGameTablePreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const nameInputRef = useRef<TextInput>(null);
  const didPrefillName = useRef(false);
  const cleanName = displayName.trim();
  const cleanCode = normalizeJoinCode(code);
  const nearbyAvailable = nearbyTablesAvailable();

  useEffect(() => {
    if (!visible || !token) {
      setPreview(null);
      setPreviewing(false);
      return;
    }
    let active = true;
    setPreviewing(true);
    setError(null);
    void previewOpenGameTableInvite({ token })
      .then((next) => { if (active) setPreview(next); })
      .catch(() => { if (active) setError('That table invitation is unavailable.'); })
      .finally(() => { if (active) setPreviewing(false); });
    return () => { active = false; };
  }, [token, visible]);

  useEffect(() => {
    if (!visible) {
      didPrefillName.current = false;
      return;
    }
    if (didPrefillName.current) return;
    const suggestedName = playerProfile.profile?.displayName.trim();
    if (!suggestedName) return;
    didPrefillName.current = true;
    setDisplayName((current) => current.trim() ? current : suggestedName);
  }, [playerProfile.profile?.displayName, visible]);

  useEffect(() => {
    if (!visible || token || !nearbyAvailable) return undefined;
    let active = true;
    let stop: (() => void) | null = null;
    void browseNearbyTables(
      (tables) => { if (active) setNearbyTables(tables); },
      (message) => { if (active) setNearbyError(message); },
    ).then((cleanup) => {
      if (!active) cleanup?.();
      else stop = cleanup;
    }).catch((next) => {
      if (active) setNearbyError(next instanceof Error ? next.message : 'Nearby tables are unavailable.');
    });
    return () => {
      active = false;
      stop?.();
      setNearbyTables([]);
      setNearbyError(null);
    };
  }, [nearbyAvailable, token, visible]);

  const canJoinToken = !!token && preview?.canJoin !== false && cleanName.length > 0 && !joining && !previewing;
  const canJoinCode = cleanCode.length === 6 && cleanName.length > 0 && !joining;
  const join = async (input: { token?: string; shortCode?: string }) => {
    if (!cleanName || joining) return;
    setJoining(true);
    setError(null);
    try {
      const nextPreview = input.token && preview
        ? preview
        : await previewOpenGameTableInvite(input);
      if (nextPreview.alreadyJoined) {
        router.replace({ pathname: '/room/[sessionId]', params: { sessionId: nextPreview.sessionId, tableCode: nextPreview.tableCode } } as Href);
        return;
      }
      if (!nextPreview.canJoin) throw new Error(nextPreview.inviteState);
      const result = await claimRemoteBankTableInvite({ ...input, displayName: cleanName });
      router.replace({ pathname: '/room/[sessionId]', params: { sessionId: result.sessionId, tableCode: result.tableCode } } as Href);
    } catch (next) {
      const message = next instanceof Error ? next.message.toLowerCase() : '';
      if (message.includes('full')) setError('That table is full.');
      else if (message.includes('already_joined')) setError('This phone has already joined that table.');
      else if (message.includes('anonymous sign-ins are disabled')) setError('Guest joining is not available in this build yet.');
      else setError('That table has closed or its invitation expired.');
    } finally {
      setJoining(false);
    }
  };

  const joinNearby = (table: NearbyTable) => {
    if (joining) return;
    if (!cleanName) {
      setNameHelp('Add your name to join this table.');
      nameInputRef.current?.focus();
      return;
    }
    setNameHelp(null);
    void join({ shortCode: table.code });
  };

  const gameName = preview?.gameKey === 'slanguage' ? 'Slanguage' : 'Bank';
  const unavailableCopy = preview?.inviteState === 'full'
    ? `That ${gameName} table is full.`
    : preview?.inviteState === 'closed'
      ? `That ${gameName} table has closed.`
      : preview?.inviteState === 'expired'
        ? `That ${gameName} invitation has expired.`
        : null;
  const returnToTable = () => {
    if (!preview) return;
    router.replace({ pathname: '/room/[sessionId]', params: { sessionId: preview.sessionId, tableCode: preview.tableCode } } as Href);
  };

  return (
    <BottomDrawer
      visible={visible}
      onClose={onClose}
      snapPoints={['72%', '92%']}
      initialSnapIndex={0}
      scrimToken="pineSubtle"
      enableContentPanningGesture
      sheetStyle={styles.sheet}
      handleContainerStyle={styles.handleContainer}
      handleStyle={styles.handle}
    >
      <BottomDrawerScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        automaticallyAdjustKeyboardInsets
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
      >
        <BottomDrawerHeader
          title={token && preview ? `Join ${preview.hostDisplayName}’s ${gameName} table` : token && error ? 'Invitation unavailable' : token ? 'Opening invitation…' : 'Find a table nearby'}
          subtitle={token && preview ? `${preview.participantCount} playing · ${Math.max(0, preview.capacity - preview.participantCount)} places open` : token && error ? 'Ask the host for a fresh link or table code.' : token ? 'Checking that the table is still open.' : 'Searching while this sheet is open. Other players can’t see you.'}
          variant="withClose"
          onClose={onClose}
          closeAccessibilityLabel="Close join table"
          titleVariant="lg"
          titleStyle={styles.title}
          subtitleStyle={styles.copy}
        />

        {!token ? <View style={styles.section}>
          <View style={styles.sectionHeading}><Radio size={17} color={gamesTheme.colors.ink} /><Text style={styles.sectionTitle}>NEARBY</Text></View>
          {nearbyTables.length > 0 ? nearbyTables.map((table) => <Pressable
            key={table.code}
            accessibilityRole="button"
            accessibilityLabel={`Join ${table.game === 'slanguage' ? 'Slanguage' : 'Bank'} table ${tableMarkForCode(table.code)}`}
            accessibilityHint={!cleanName ? 'Add your player name first' : 'Joins the open table'}
            disabled={joining}
            onPress={() => joinNearby(table)}
            style={({ pressed }) => [styles.nearbyCard, joining ? styles.disabled : null, pressed ? styles.pressed : null]}
          >
            <View style={styles.nearbyMark}><UsersRound size={20} color={gamesTheme.colors.ink} /></View>
            <View style={styles.nearbyCopy}><Text style={styles.nearbyTitle}>{table.game === 'slanguage' ? 'Slanguage nearby' : 'Bank nearby'}</Text><Text style={styles.nearbyMeta}>{tableMarkForCode(table.code)}</Text></View>
            <Text style={styles.joinLabel}>Join</Text>
          </Pressable>) : <View style={[styles.searchCard, (!nearbyAvailable || nearbyError) ? styles.searchCardUnavailable : null]}>
            <View style={styles.searchIcon}><Radio size={20} color={nearbyAvailable && !nearbyError ? gamesTheme.colors.felt : 'rgba(32,29,24,0.46)'} /></View>
            <View style={styles.searchCopy}>
              <Text style={styles.searchTitle}>{nearbyAvailable && !nearbyError ? 'Looking for open tables…' : 'Nearby search unavailable'}</Text>
              <Text style={styles.searchMeta}>{nearbyAvailable && !nearbyError ? 'Ask the host to open a table in Kwilt.' : 'Use a table code below.'}</Text>
            </View>
          </View>}
        </View> : null}

        {unavailableCopy ? <Text accessibilityRole="alert" style={styles.error}>{unavailableCopy}</Text> : null}

        {(!token || preview?.canJoin) ? <View style={styles.nameBlock}>
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            ref={nameInputRef}
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={18}
            value={displayName}
            onChangeText={(next) => {
              setDisplayName(next);
              if (next.trim()) setNameHelp(null);
            }}
            placeholder="Olive"
            placeholderTextColor="rgba(32,29,24,0.28)"
            accessibilityLabel="Your player name"
            returnKeyType={token ? 'go' : 'next'}
            onSubmitEditing={() => { if (canJoinToken) void join({ token }); }}
            style={styles.input}
          />
          {nameHelp ? <Text accessibilityRole="alert" style={styles.nameHelp}>{nameHelp}</Text> : null}
        </View> : null}

        {token && preview?.alreadyJoined ? <GameButton onPress={returnToTable}>Return to table</GameButton> : null}
        {token && preview?.canJoin ? <GameButton disabled={!canJoinToken} onPress={() => void join({ token })}>{joining ? 'Joining…' : 'Join table'}</GameButton> : null}

        {!token ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>HAVE A CODE?</Text>
          <TextInput
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={8}
            value={code}
            onChangeText={setCode}
            placeholder="W7K-4JP"
            placeholderTextColor="rgba(32,29,24,0.25)"
            accessibilityLabel="Join code"
            returnKeyType="go"
            onSubmitEditing={() => { if (canJoinCode) void join({ shortCode: cleanCode }); }}
            style={[styles.input, styles.codeInput]}
          />
          <GameButton disabled={!canJoinCode} onPress={() => void join({ shortCode: cleanCode })}>{joining ? 'Joining…' : 'Join table'}</GameButton>
        </View> : null}

        {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      </BottomDrawerScrollView>
    </BottomDrawer>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: gamesTheme.colors.cream },
  handleContainer: { backgroundColor: gamesTheme.colors.cream },
  handle: { backgroundColor: 'rgba(32,29,24,0.18)' },
  scroll: { flex: 1 },
  content: { gap: 18, paddingHorizontal: 20, paddingBottom: 36 },
  title: { fontFamily: gamesTheme.type.display, fontSize: 31, lineHeight: 34, letterSpacing: -1 },
  copy: { fontFamily: gamesTheme.type.body, fontSize: 14, lineHeight: 20, color: 'rgba(32,29,24,0.6)' },
  nameBlock: { gap: 6 },
  label: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.4, color: 'rgba(32,29,24,0.48)' },
  input: { height: 58, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(32,29,24,0.18)', backgroundColor: gamesTheme.colors.paper, paddingHorizontal: 16, fontFamily: gamesTheme.type.utility, fontSize: 17, color: gamesTheme.colors.ink },
  codeInput: { height: 68, textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 26, letterSpacing: 4 },
  section: { gap: 10 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  sectionTitle: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.5, color: 'rgba(32,29,24,0.48)' },
  nearbyCard: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, paddingRight: 16, borderRadius: 20, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  nearbyMark: { width: 48, height: 48, borderRadius: 16, backgroundColor: gamesTheme.colors.turmeric, alignItems: 'center', justifyContent: 'center' },
  nearbyCopy: { flex: 1 },
  nearbyTitle: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
  nearbyMeta: { fontFamily: gamesTheme.type.body, fontSize: 12, color: 'rgba(32,29,24,0.55)' },
  joinLabel: { fontFamily: gamesTheme.type.utility, fontSize: 12, color: gamesTheme.colors.ink },
  searchCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 20, backgroundColor: 'rgba(86,139,113,0.1)', borderWidth: 1, borderColor: 'rgba(64,112,89,0.22)' },
  searchCardUnavailable: { backgroundColor: 'rgba(32,29,24,0.04)', borderColor: 'rgba(32,29,24,0.12)' },
  searchIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: gamesTheme.colors.paper },
  searchCopy: { flex: 1, gap: 2 },
  searchTitle: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.ink },
  searchMeta: { fontFamily: gamesTheme.type.body, fontSize: 12, lineHeight: 16, color: 'rgba(32,29,24,0.58)' },
  nameHelp: { fontFamily: gamesTheme.type.body, fontSize: 12, color: gamesTheme.colors.danger },
  disabled: { opacity: 0.46 },
  pressed: { transform: [{ scale: 0.985 }] },
  error: { padding: 11, borderRadius: 12, backgroundColor: 'rgba(197,63,43,0.08)', fontFamily: gamesTheme.type.body, color: gamesTheme.colors.danger },
});
