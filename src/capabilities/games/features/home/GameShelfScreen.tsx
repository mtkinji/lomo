import { useState } from 'react';
import { router, type Href } from '@/src/capabilities/games/navigation/gamesRouter';
import { ChevronRight, Dices, Hourglass, Radio, UsersRound } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { JoinTableDrawer } from '@/src/capabilities/games/features/remote/JoinTableDrawer';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { basicDiceUtility, gameCatalog, type GameDefinition } from '@/src/capabilities/games/domain/catalog';
import { useCapabilityShellOptional } from '@/src/navigation/CapabilityShellContext';
import { PageHeader } from '@/src/ui/layout/PageHeader';

function openGame(game: GameDefinition) {
  if (game.route.kind === 'tumble') router.push({ pathname: '/tumble', params: { mode: game.route.mode } });
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
  const gameCount = gameCatalog.length === 11 ? 'Eleven' : 'Ten';
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
      <View style={styles.intro}><Text style={styles.title}>Play together.</Text><Text style={styles.subtitle}>{gameCount} ways to pull everyone in.</Text></View>
      <ScrollView style={styles.inventory} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>{gameCatalog.map((game) => <GameCard key={game.id} game={game} />)}</View>
        <View style={styles.utilitySection}>
          <Text style={styles.sectionLabel}>UTILITIES</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Open 60-second Hourglass" onPress={() => router.push('/hourglass')} style={({ pressed }) => [styles.utilityCard, pressed ? styles.pressed : null]}>
            <View style={[styles.utilityIcon, styles.hourglassIcon]}><Hourglass size={23} color={gamesTheme.colors.paper} /></View>
            <View style={styles.utilityCopy}><Text style={styles.utilityTitle}>Hourglass</Text><Text style={styles.utilityMeta}>One beautiful minute. Flip when you’re ready.</Text></View>
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

function GameCard({ game }: { game: GameDefinition }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Play ${game.title}, ${game.minPlayers} to ${game.maxPlayers} players`} onPress={() => openGame(game)} style={({ pressed }) => [styles.gameCard, pressed ? styles.pressed : null]}>
    <View style={[styles.mark, { backgroundColor: game.accent }]}><Text style={styles.markText}>{game.mark}</Text></View>
    <Text numberOfLines={1} style={styles.cardTitle}>{game.title}</Text>
    <Text numberOfLines={2} style={styles.cardPromise}>{game.promise}</Text>
    <View style={styles.playerMeta}><UsersRound size={13} color="rgba(32,29,24,0.52)" /><Text style={styles.playerText}>{game.minPlayers}–{game.maxPlayers}</Text></View>
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
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  gameCard: { width: '48.5%', minHeight: 154, borderRadius: 22, padding: 13, backgroundColor: gamesTheme.colors.paper, borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)', shadowColor: '#3B2A1C', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.1, shadowRadius: 9 },
  pressed: { transform: [{ scale: 0.98 }], opacity: 0.88 },
  mark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 9 },
  markText: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 20 },
  cardTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 17, letterSpacing: -0.3 },
  cardPromise: { minHeight: 34, marginTop: 3, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.55)', fontSize: 11, lineHeight: 15 },
  playerMeta: { marginTop: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  playerText: { fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.52)', fontSize: 10 },
  utilitySection: { marginTop: 22, gap: 8 },
  sectionLabel: { paddingHorizontal: 3, fontFamily: gamesTheme.type.utility, color: 'rgba(32,29,24,0.44)', fontSize: 10, letterSpacing: 1.5 },
  utilityCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 11, paddingRight: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.52)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  utilityIcon: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(32,29,24,0.07)' },
  hourglassIcon: { backgroundColor: gamesTheme.colors.felt },
  utilityCopy: { flex: 1 },
  utilityTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 16 },
  utilityMeta: { marginTop: 2, fontFamily: gamesTheme.type.body, color: 'rgba(32,29,24,0.52)', fontSize: 11 },
  joinGame: { minWidth: 78, minHeight: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12, borderRadius: gamesTheme.radius.pill, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.12)' },
  joinGamePressed: { opacity: 0.82, transform: [{ scale: 0.97 }] },
  joinGameText: { fontFamily: gamesTheme.type.utility, fontSize: 12, color: gamesTheme.colors.ink },
});
