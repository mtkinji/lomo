import { useEffect, useMemo, useState } from 'react';
import { router, type Href } from '@/src/capabilities/games/navigation/gamesRouter';
import { Radio, UsersRound } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { claimRemoteBankTableInvite } from '@/src/capabilities/games/remote/remoteBankClient';
import { normalizeJoinCode, tableMarkForCode } from '@/src/capabilities/games/remote/remoteBank';
import { browseNearbyTables, nearbyTablesAvailable, type NearbyTable } from '@/src/capabilities/games/nearby/nearbyTables';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { BottomDrawer, BottomDrawerScrollView } from '@/src/ui/BottomDrawer';
import { BottomDrawerHeader } from '@/src/ui/layout/BottomDrawerHeader';

type JoinTableDrawerProps = {
  visible: boolean;
  token?: string;
  onClose: () => void;
};

export function JoinTableDrawer({ visible, token, onClose }: JoinTableDrawerProps) {
  const [displayName, setDisplayName] = useState('');
  const [code, setCode] = useState('');
  const [nearbyTables, setNearbyTables] = useState<NearbyTable[]>([]);
  const [nearbyError, setNearbyError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cleanName = displayName.trim();
  const cleanCode = normalizeJoinCode(code);

  useEffect(() => {
    if (!visible || token || !nearbyTablesAvailable()) return undefined;
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
    return () => { active = false; stop?.(); };
  }, [token, visible]);

  const canJoinToken = !!token && cleanName.length > 0 && !joining;
  const canJoinCode = cleanCode.length === 6 && cleanName.length > 0 && !joining;
  const nearbyCopy = useMemo(() => {
    if (!nearbyTablesAvailable()) return 'Scan the host’s QR or enter the table code.';
    if (nearbyError) return 'Nearby discovery is unavailable. The table code still works.';
    if (nearbyTables.length === 0) return 'Looking for an open Kwilt table…';
    return 'Choose the table shown on the host’s phone.';
  }, [nearbyError, nearbyTables.length]);

  const join = async (input: { token?: string; shortCode?: string }) => {
    if (!cleanName || joining) return;
    setJoining(true);
    setError(null);
    try {
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
          title={token ? 'Take your place' : 'Join a table'}
          subtitle={token ? 'Add the name everyone at the table will see.' : nearbyCopy}
          variant="withClose"
          onClose={onClose}
          closeAccessibilityLabel="Close join table"
          titleVariant="lg"
          titleStyle={styles.title}
          subtitleStyle={styles.copy}
        />

        <View style={styles.nameBlock}>
          <Text style={styles.label}>YOUR NAME</Text>
          <TextInput
            autoCapitalize="words"
            autoCorrect={false}
            maxLength={18}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Olive"
            placeholderTextColor="rgba(32,29,24,0.28)"
            accessibilityLabel="Your player name"
            returnKeyType={token ? 'go' : 'next'}
            onSubmitEditing={() => { if (canJoinToken) void join({ token }); }}
            style={styles.input}
          />
        </View>

        {token ? <GameButton disabled={!canJoinToken} onPress={() => void join({ token })}>{joining ? 'Joining…' : 'Join table'}</GameButton> : null}

        {!token && nearbyTables.length > 0 ? <View style={styles.section}>
          <View style={styles.sectionHeading}><Radio size={17} color={gamesTheme.colors.ink} /><Text style={styles.sectionTitle}>NEARBY</Text></View>
          {nearbyTables.map((table) => <Pressable
            key={table.code}
            accessibilityRole="button"
            accessibilityLabel={`Join ${table.game === 'slanguage' ? 'Slanguage' : 'Bank'} table ${tableMarkForCode(table.code)}`}
            disabled={!cleanName || joining}
            onPress={() => void join({ shortCode: table.code })}
            style={({ pressed }) => [styles.nearbyCard, (!cleanName || joining) ? styles.disabled : null, pressed ? styles.pressed : null]}
          >
            <View style={styles.nearbyMark}><UsersRound size={20} color={gamesTheme.colors.ink} /></View>
            <View style={styles.nearbyCopy}><Text style={styles.nearbyTitle}>{table.game === 'slanguage' ? 'Slanguage nearby' : 'Bank nearby'}</Text><Text style={styles.nearbyMeta}>{tableMarkForCode(table.code)}</Text></View>
            <Text style={styles.joinLabel}>Join</Text>
          </Pressable>)}
        </View> : null}

        {!token ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>TABLE CODE</Text>
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
  disabled: { opacity: 0.46 },
  pressed: { transform: [{ scale: 0.985 }] },
  error: { padding: 11, borderRadius: 12, backgroundColor: 'rgba(197,63,43,0.08)', fontFamily: gamesTheme.type.body, color: gamesTheme.colors.danger },
});
