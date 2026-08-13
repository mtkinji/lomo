import { useState } from 'react';
import { router, type Href } from '@/src/capabilities/games/navigation/gamesRouter';
import { ChevronRight, Dices, Play, Radio, Timer, UsersRound } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JoinTableDrawer } from '@/src/capabilities/games/features/remote/JoinTableDrawer';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { basicDiceUtility, catalogForRelease, type GameDefinition } from '@/src/capabilities/games/domain/catalog';
import { useCapabilityShellOptional } from '@/src/navigation/CapabilityShellContext';
import { PageHeader } from '@/src/ui/layout/PageHeader';

function openGame(game: GameDefinition) {
  if (game.route.kind === 'tumble') router.push({ pathname: '/tumble', params: { mode: game.route.mode } });
  else if (game.route.kind === 'stitch-five') router.push('/stitch-five');
  else router.push(`/play/${game.route.gameId}` as Href);
}

type GameShelfScreenProps = {
  joinInitiallyOpen?: boolean;
  initialJoinToken?: string;
  onJoinDrawerClose?: () => void;
};

export function GameShelfScreen({ joinInitiallyOpen = false, initialJoinToken, onJoinDrawerClose }: GameShelfScreenProps = {}) {
  const capabilityShell = useCapabilityShellOptional();
  const [joinOpen, setJoinOpen] = useState(joinInitiallyOpen);
  const releaseGames = catalogForRelease(false);
  const includeWorkshop = __DEV__ || process.env.EXPO_PUBLIC_GAMES_WORKSHOP === '1';
  const workshopGames = includeWorkshop
    ? catalogForRelease(true).filter((game) => game.releaseStatus !== 'ready')
    : [];
  const closeJoinDrawer = () => {
    setJoinOpen(false);
    onJoinDrawerClose?.();
  };
  return <GameBackdrop>
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <PageHeader
        title="Games"
        onPressMenu={() => capabilityShell?.openMenu()}
        rightElement={(
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Find or join a nearby game"
            onPress={() => setJoinOpen(true)}
            style={({ pressed }) => [styles.joinGame, pressed ? styles.joinGamePressed : null]}
          >
            <Radio size={16} color={gamesTheme.colors.ink} />
            <Text style={styles.joinGameText}>Join</Text>
          </Pressable>
        )}
        containerStyle={styles.header}
      />
      <View style={styles.intro}><Text style={styles.title}>Play together.</Text><Text style={styles.subtitle}>Pick the energy. Start in seconds.</Text></View>
      <ScrollView style={styles.inventory} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Play Oddball" onPress={() => router.push('/play/same-page')} style={({ pressed }) => [styles.quickStart, pressed ? styles.pressed : null]}>
          <View style={styles.quickMark}><Play size={20} fill={gamesTheme.colors.ink} color={gamesTheme.colors.ink} /></View>
          <View style={styles.quickCopy}><Text style={styles.quickEyebrow}>3–8 PLAYERS · 5–10 MIN</Text><Text style={styles.quickTitle}>Oddball</Text><Text style={styles.quickBody}>Read the room. Don’t stand alone.</Text></View>
          <ChevronRight size={20} color={gamesTheme.colors.ink} />
        </Pressable>
        <Text style={styles.catalogHeading}>Ready for the table</Text>
        <View style={styles.grid}>{releaseGames.filter((game) => game.id !== 'same-page').map((game) => <GameCard key={game.id} game={game} />)}</View>
        {workshopGames.length ? <View style={styles.workshopSection}>
          <Text style={styles.catalogHeading}>Workshop</Text>
          <Text style={styles.workshopCopy}>Playable candidates still earning their place in 2.0.</Text>
          <View style={styles.grid}>{workshopGames.map((game) => <GameCard key={game.id} game={game} workshop />)}</View>
        </View> : null}
        <View style={styles.utilitySection}>
          <Text style={styles.sectionLabel}>UTILITIES</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open 60-second Game Timer" onPress={() => router.push('/timer')} style={({ pressed }) => [styles.utilityCard, pressed ? styles.pressed : null]}>
            <View style={[styles.utilityIcon, styles.timerIcon]}><Timer size={23} color={gamesTheme.colors.paper} /></View>
            <View style={styles.utilityCopy}><Text style={styles.utilityTitle}>Game Timer</Text><Text style={styles.utilityMeta}>Pick a time. Make your move.</Text></View>
            <ChevronRight size={19} color={gamesTheme.colors.ink} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Open Basic Dice Roller" onPress={() => router.push({ pathname: '/tumble', params: { mode: basicDiceUtility.route.mode } })} style={({ pressed }) => [styles.utilityCard, pressed ? styles.pressed : null]}>
            <View style={styles.utilityIcon}><Dices size={23} color={gamesTheme.colors.ink} /></View>
            <View style={styles.utilityCopy}><Text style={styles.utilityTitle}>{basicDiceUtility.title}</Text><Text style={styles.utilityMeta}>{basicDiceUtility.promise}</Text></View>
            <ChevronRight size={19} color={gamesTheme.colors.ink} />
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
    <JoinTableDrawer visible={joinOpen} token={initialJoinToken} onClose={closeJoinDrawer} />
  </GameBackdrop>;
}

function GameCard({ game, workshop = false }: { game: GameDefinition; workshop?: boolean }) {
  const duration = `${game.durationMinutes[0]}–${game.durationMinutes[1]} min`;
  return <Pressable accessibilityRole="button" accessibilityLabel={`Play ${game.title}, ${game.minPlayers} to ${game.maxPlayers} players, ${duration}, ${game.energy}`} onPress={() => openGame(game)} style={({ pressed }) => [styles.gameCard, workshop ? styles.workshopCard : null, pressed ? styles.pressed : null]}>
    <View style={[styles.mark, { backgroundColor: game.accent }]}><Text style={styles.markText}>{game.mark}</Text></View>
    <Text numberOfLines={1} style={styles.cardTitle}>{game.title}</Text>
    <Text numberOfLines={2} style={styles.cardPromise}>{game.promise}</Text>
    <View style={styles.cardMeta}><View style={styles.playerMeta}><UsersRound size={13} color="rgba(32,29,24,0.52)" /><Text style={styles.playerText}>{game.minPlayers}–{game.maxPlayers}</Text></View><Text style={styles.experienceMeta}>{duration} · {game.energy}</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 16 },
  header: { paddingLeft: 0, paddingTop: 2, paddingBottom: 8 },
  intro: { paddingHorizontal: 2, paddingTop: 8, paddingBottom: 13 },
  title: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 36, lineHeight: 38, letterSpacing: -1.6 },
  subtitle: { marginTop: 2, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.54)', fontSize: 13 },
  inventory: { flex: 1 },
  scroll: { paddingBottom: 24 },
  quickStart: { minHeight: 104, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20, padding: 14, borderRadius: 24, backgroundColor: gamesTheme.colors.turmeric, borderWidth: 2, borderColor: 'rgba(32,29,24,0.16)' },
  quickMark: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.45)' },
  quickCopy: { flex: 1 },
  quickEyebrow: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.56)', fontSize: 9, letterSpacing: 1.1 },
  quickTitle: { marginTop: 2, fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 21, letterSpacing: -0.4 },
  quickBody: { marginTop: 2, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.62)', fontSize: 12 },
  catalogHeading: { marginBottom: 10, paddingHorizontal: 3, fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameCard: { width: '48.5%', minHeight: 154, borderRadius: 22, padding: 13, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)', shadowColor: '#3B2A1C', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 9 },
  workshopCard: { borderStyle: 'dashed', shadowOpacity: 0.03, backgroundColor: 'rgba(255,255,255,0.58)' },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  mark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  markText: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 20 },
  cardTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 17, letterSpacing: -0.3 },
  cardPromise: { minHeight: 34, marginTop: 3, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.55)', fontSize: 11, lineHeight: 15 },
  playerMeta: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  playerText: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.52)', fontSize: 10 },
  cardMeta: { marginTop: 'auto', gap: 3 },
  experienceMeta: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.48)', fontSize: 9, textTransform: 'lowercase' },
  workshopSection: { marginTop: 24 },
  workshopCopy: { marginTop: -6, marginBottom: 11, paddingHorizontal: 3, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.54)', fontSize: 12, lineHeight: 17 },
  utilitySection: { marginTop: 22, gap: 8 },
  sectionLabel: { paddingHorizontal: 3, fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.44)', fontSize: 10, letterSpacing: 1.5 },
  utilityCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, paddingRight: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.52)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  utilityIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,29,24,0.07)' },
  timerIcon: { backgroundColor: gamesTheme.colors.coral },
  utilityCopy: { flex: 1 },
  utilityTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 16 },
  utilityMeta: { marginTop: 2, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.52)', fontSize: 11 },
  joinGame: { minWidth: 78, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: gamesTheme.radius.pill, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  joinGamePressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  joinGameText: { fontFamily: gamesTheme.type.utility, fontSize: 12, color: gamesTheme.colors.ink },
});
