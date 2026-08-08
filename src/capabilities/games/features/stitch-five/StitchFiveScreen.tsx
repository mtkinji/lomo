import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CircleHelp, Grid3X3, RotateCcw, Share2, Volume2, VolumeX, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Share, StyleSheet, Text as NativeText, View, type TextProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  createStitchFiveGame,
  stitchFivePreviews,
  stitchFiveScorecard,
  stitchFiveShareText,
  stitchFiveTotals,
  stitchFiveWinners,
  rollStitchFiveDice,
  commitStitchFivePatch,
  toggleStitchFivePin,
  type StitchFiveCategoryId,
  type StitchFiveGame,
} from '@/src/capabilities/games/domain/stitch-five';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import { useSavedPlayerRoster } from '@/src/capabilities/games/players/useSavedPlayerRoster';
import { defaultPlayerIdentity } from '@/src/capabilities/games/players/playerIdentity';
import { GamePlayerSetup, type SetupSeat } from '@/src/capabilities/games/features/setup/GamePlayerSetup';
import { backToGames } from '@/src/capabilities/games/navigation/backToGames';
import { router } from '@/src/capabilities/games/navigation/gamesRouter';
import { useActiveGameOrientation } from '@/src/capabilities/games/platform/useActiveGameOrientation';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { FabricDie } from './FabricDie';
import { QuiltBoard } from './QuiltBoard';

const initialSeats: SetupSeat[] = [
  { key: 'stitch-five-seat-1', displayName: '', identity: defaultPlayerIdentity(0) },
  { key: 'stitch-five-seat-2', displayName: '', identity: defaultPlayerIdentity(1) },
];

const randomDice = (count: number) => Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
const Text = (props: TextProps) => <NativeText maxFontSizeMultiplier={1.35} {...props} />;

export function StitchFiveScreen() {
  const roster = useSavedPlayerRoster();
  const nextSeatId = useRef(3);
  const rollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const defaultSoundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const [soundOverride, setSoundOverride] = useState<boolean | null>(null);
  const soundOn = soundOverride ?? defaultSoundEnabled;
  const feedback = useGameFeedback(soundOn);
  const [seats, setSeats] = useState<SetupSeat[]>(initialSeats);
  const [setup, setSetup] = useState(true);
  const [game, setGame] = useState<StitchFiveGame>(() => createStitchFiveGame(['Player 1', 'Player 2']));
  const [rolling, setRolling] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<StitchFiveCategoryId | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultPlayerIndex, setResultPlayerIndex] = useState(0);
  useActiveGameOrientation(false);

  useEffect(() => () => {
    if (rollTimer.current) clearTimeout(rollTimer.current);
  }, []);

  const createSeat = () => {
    const index = nextSeatId.current++ - 1;
    return { key: `stitch-five-seat-${index + 1}`, displayName: '', identity: defaultPlayerIdentity(index) };
  };
  const namesForSeats = () => seats.map((seat, index) => seat.displayName.trim() || `Player ${index + 1}`);

  const startWithNames = (names: string[]) => {
    setGame(createStitchFiveGame(names));
    setSetup(false);
    setRolling(false);
    setSelectedCategory(null);
    setResultPlayerIndex(0);
  };

  const startGame = () => {
    roster.remember(seats.map((seat) => ({ savedPlayerId: seat.savedPlayerId, displayName: seat.displayName })));
    startWithNames(namesForSeats());
  };

  const activePlayer = game.players[game.activePlayer];
  const activeTotals = stitchFiveTotals(activePlayer.scores);
  const previews = stitchFivePreviews(game);
  const unpinnedCount = game.rollsUsed === 0 ? 5 : game.pinned.filter((pinned) => !pinned).length;
  const selectedPatch = stitchFiveScorecard.find(({ id }) => id === selectedCategory);
  const selectedScore = selectedCategory ? previews[selectedCategory] : undefined;

  const roll = () => {
    if (rolling || game.rollsUsed >= 3 || unpinnedCount === 0) return;
    setRolling(true);
    setSelectedCategory(null);
    void feedback.roll();
    const next = rollStitchFiveDice(game, randomDice(unpinnedCount));
    setGame(next);
    rollTimer.current = setTimeout(() => {
      setRolling(false);
      rollTimer.current = null;
    }, 480);
  };

  const selectPatch = (category: StitchFiveCategoryId) => {
    feedback.select();
    setSelectedCategory(category);
  };

  const stitch = () => {
    if (!selectedCategory || selectedScore === undefined) return;
    const next = commitStitchFivePatch(game, selectedCategory);
    setGame(next);
    setSelectedCategory(null);
    void feedback.bank();
    if (next.status === 'finished') {
      const winner = stitchFiveWinners(next)[0];
      const winnerIndex = next.players.findIndex((player) => player === winner);
      setResultPlayerIndex(Math.max(winnerIndex, 0));
      void feedback.success();
    }
  };

  const rematch = () => startWithNames(game.players.map((player) => player.name));
  const shareQuilt = () => void Share.share({ title: 'Finished quilt', message: stitchFiveShareText(game, resultPlayerIndex) });

  return <GameBackdrop>
    <SafeAreaView style={styles.safe}>
      <View style={styles.topbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to games" onPress={() => backToGames(router)} style={[styles.iconButton, styles.backButton]}><ArrowLeft size={22} color={gamesTheme.colors.ink} /></Pressable>
        <View accessibilityRole="header" accessibilityLabel="Stitch Five game" style={styles.titleLockup}><Grid3X3 size={17} color={gamesTheme.colors.ink} /><Text maxFontSizeMultiplier={1.15} numberOfLines={1} style={styles.title}>Stitch Five</Text></View>
        <View style={styles.topActions}>
          {!setup ? <Pressable accessibilityRole="button" accessibilityLabel="How to play Stitch Five" onPress={() => setRulesOpen(true)} style={styles.iconButton}><CircleHelp size={21} color={gamesTheme.colors.ink} /></Pressable> : null}
          <Pressable accessibilityRole="button" accessibilityLabel={soundOn ? 'Turn sound off' : 'Turn sound on'} onPress={() => setSoundOverride(!soundOn)} style={styles.iconButton}>{soundOn ? <Volume2 size={21} color={gamesTheme.colors.ink} /> : <VolumeX size={21} color={gamesTheme.colors.ink} />}</Pressable>
        </View>
      </View>

      {setup ? <GamePlayerSetup
        mode="connection"
        seats={seats}
        savedPlayers={roster.players}
        loading={roster.loading}
        onChange={setSeats}
        onRename={roster.rename}
        onIdentityChange={roster.updateIdentity}
        onArchive={roster.archive}
        onPreviewSuccess={(soundId) => { void feedback.success(soundId); }}
        onPreviewFailure={(soundId) => { void feedback.failure(soundId); }}
        createSeat={createSeat}
        onStart={startGame}
        startLabel="Start stitching"
        minPlayers={2}
        maxPlayers={4}
      /> : game.status === 'finished' ? <ResultView
        game={game}
        playerIndex={resultPlayerIndex}
        onPlayerChange={setResultPlayerIndex}
        onShare={shareQuilt}
        onRematch={rematch}
        onChangePlayers={() => setSetup(true)}
      /> : <>
        <ScrollView style={styles.playScroll} contentContainerStyle={styles.playContent} showsVerticalScrollIndicator={false}>
          <View style={styles.turnHeader}>
            <View style={styles.turnCopy}>
              <Text style={styles.eyebrow}>STITCH {Object.keys(activePlayer.scores).length + 1} OF 13 · {3 - game.rollsUsed} ROLLS LEFT</Text>
              <Text numberOfLines={1} style={styles.playerName}>{activePlayer.name}'s stitch</Text>
              <Text style={styles.instruction}>{rolling ? 'Rolling…' : game.rollsUsed === 0 ? (game.lastAction ? `${game.lastAction.playerName} stitched ${game.lastAction.score}. Roll all five.` : 'Roll all five.') : game.rollsUsed < 3 ? 'Tap dice to pin them, or choose a patch.' : 'Choose one patch to finish the stitch.'}</Text>
            </View>
            <View accessibilityLabel={`${activeTotals.total} points`} style={styles.total}><Text style={styles.totalValue}>{activeTotals.total}</Text><Text style={styles.totalLabel}>POINTS</Text></View>
          </View>

          <View style={styles.diceTray}>
            {game.dice.map((value, index) => <FabricDie
              key={index}
              value={value}
              rolling={rolling && !game.pinned[index]}
              pinned={game.pinned[index]}
              canPin={!rolling && game.rollsUsed > 0 && game.rollsUsed < 3}
              onPress={() => {
                feedback.select();
                setSelectedCategory(null);
                setGame(toggleStitchFivePin(game, index));
              }}
            />)}
          </View>

          <View style={styles.boardHeading}>
            <Text style={styles.boardTitle}>Quilt board</Text>
            <Text style={styles.boardHint}>{game.rollsUsed ? 'Tap an open patch to preview the stitch.' : 'Scores appear after the first roll.'}</Text>
          </View>
          <QuiltBoard player={activePlayer} previews={previews} selectedCategory={selectedCategory} onSelect={game.rollsUsed ? selectPatch : undefined} />
        </ScrollView>

        <View style={styles.actionDock}>
          {selectedPatch && selectedScore !== undefined ? <>
            <GameButton maxFontSizeMultiplier={1.15} onPress={stitch} style={styles.actionPrimary}>Stitch {selectedScore} to {selectedPatch.label}</GameButton>
            {game.rollsUsed < 3 && unpinnedCount > 0 ? <GameButton maxFontSizeMultiplier={1.15} tone="ghost" onPress={roll}>Roll again instead</GameButton> : null}
          </> : game.rollsUsed < 3 ? <GameButton maxFontSizeMultiplier={1.15} disabled={rolling || unpinnedCount === 0} onPress={roll}>{rolling ? 'Rolling…' : game.rollsUsed === 0 ? 'Roll all five dice' : `Roll ${unpinnedCount} ${unpinnedCount === 1 ? 'die' : 'dice'} again`}</GameButton> : <Text accessibilityRole="text" style={styles.choosePrompt}>Choose one open patch above.</Text>}
        </View>
      </>}
    </SafeAreaView>
    <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />
  </GameBackdrop>;
}

function ResultView({ game, playerIndex, onPlayerChange, onShare, onRematch, onChangePlayers }: { game: StitchFiveGame; playerIndex: number; onPlayerChange: (index: number) => void; onShare: () => void; onRematch: () => void; onChangePlayers: () => void }) {
  const winners = stitchFiveWinners(game);
  const selectedPlayer = game.players[playerIndex];
  const selectedTotal = stitchFiveTotals(selectedPlayer.scores).total;
  return <ScrollView style={styles.resultScroll} contentContainerStyle={styles.resultContent} showsVerticalScrollIndicator={false}>
    <Text style={styles.resultEyebrow}>FINISHED QUILT</Text>
    <Text accessibilityRole="header" style={styles.resultTitle}>{winners.length > 1 ? 'A tie, stitched together.' : `${winners[0].name} finishes on top.`}</Text>
    <View style={styles.resultTabs}>{game.players.map((player, index) => <Pressable key={`${player.name}-${index}`} accessibilityRole="tab" accessibilityState={{ selected: playerIndex === index }} onPress={() => onPlayerChange(index)} style={[styles.resultTab, playerIndex === index ? styles.resultTabSelected : null]}><Text style={styles.resultTabName}>{player.name}</Text><Text style={styles.resultTabScore}>{stitchFiveTotals(player.scores).total}</Text></Pressable>)}</View>
    <View style={styles.resultBoardHeader}><Text style={styles.resultPlayer}>{selectedPlayer.name}'s quilt</Text><Text style={styles.resultScore}>{selectedTotal}</Text></View>
    <QuiltBoard player={selectedPlayer} compact />
    <View style={styles.resultActions}>
      <GameButton maxFontSizeMultiplier={1.35} onPress={onShare} icon={<Share2 size={19} color={gamesTheme.colors.ink} />}>Share quilt</GameButton>
      <GameButton maxFontSizeMultiplier={1.35} tone="paper" onPress={onRematch} icon={<RotateCcw size={19} color={gamesTheme.colors.ink} />}>Rematch</GameButton>
      <GameButton maxFontSizeMultiplier={1.35} tone="ghost" onPress={onChangePlayers}>Change players</GameButton>
    </View>
  </ScrollView>;
}

function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable accessibilityViewIsModal style={styles.rules} onPress={() => undefined}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close Stitch Five rules" onPress={onClose} style={styles.rulesClose}><X size={19} color={gamesTheme.colors.ink} /></Pressable>
        <Text accessibilityRole="header" style={styles.rulesTitle}>How to stitch</Text>
        <Text style={styles.rulesIntro}>Roll up to three times. Pin any dice you want to keep. Then stitch one open patch—even when it scores zero.</Text>
        <ScrollView style={styles.rulesScroll} contentContainerStyle={styles.rulesRows}>
          {stitchFiveScorecard.map((patch) => <View key={patch.id} style={styles.ruleRow}><Text style={styles.ruleName}>{patch.label}</Text><Text style={styles.ruleCopy}>{patch.rule}</Text></View>)}
          <View style={styles.ruleRow}><Text style={styles.ruleName}>Seam Bonus</Text><Text style={styles.ruleCopy}>Score 63 across Ones through Sixes to add 35.</Text></View>
        </ScrollView>
        <GameButton maxFontSizeMultiplier={1.35} onPress={onClose}>Back to the quilt</GameButton>
      </Pressable>
    </Pressable>
  </Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 12, paddingBottom: 10 },
  topbar: { position: 'relative', minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  titleLockup: { minWidth: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 92 },
  title: { flexShrink: 1, fontFamily: gamesTheme.type.display, fontSize: 18, color: gamesTheme.colors.ink },
  topActions: { position: 'absolute', top: 5, right: 0, width: 88, flexDirection: 'row', justifyContent: 'flex-end' },
  backButton: { position: 'absolute', top: 5, left: 0 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  playScroll: { flex: 1, minHeight: 0 },
  playContent: { paddingBottom: 18 },
  turnHeader: { minHeight: 86, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 4, paddingBottom: 8 },
  turnCopy: { flex: 1 },
  eyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 8, letterSpacing: 1.25, color: 'rgba(32,29,24,0.5)' },
  playerName: { marginTop: 2, fontFamily: gamesTheme.type.display, fontSize: 25, lineHeight: 28, color: gamesTheme.colors.ink },
  instruction: { marginTop: 2, fontFamily: gamesTheme.type.body, fontSize: 11, lineHeight: 15, color: 'rgba(32,29,24,0.58)' },
  total: { minWidth: 62, minHeight: 62, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: 'rgba(255,249,237,0.68)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  totalValue: { fontFamily: gamesTheme.type.display, fontSize: 22, color: gamesTheme.colors.ink },
  totalLabel: { fontFamily: gamesTheme.type.utility, fontSize: 7, letterSpacing: 1, color: 'rgba(32,29,24,0.5)' },
  diceTray: { minHeight: 88, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 2, paddingVertical: 5, borderRadius: 22, backgroundColor: gamesTheme.colors.felt, borderWidth: 3, borderColor: gamesTheme.colors.woodLight },
  boardHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginTop: 15, marginBottom: 8, paddingHorizontal: 3 },
  boardTitle: { fontFamily: gamesTheme.type.display, fontSize: 20, color: gamesTheme.colors.ink },
  boardHint: { flex: 1, textAlign: 'right', fontFamily: gamesTheme.type.body, fontSize: 9, color: 'rgba(32,29,24,0.5)' },
  actionDock: { paddingTop: 10, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(32,29,24,0.1)' },
  actionPrimary: { width: '100%' },
  choosePrompt: { minHeight: 58, textAlign: 'center', textAlignVertical: 'center', paddingTop: 18, fontFamily: gamesTheme.type.display, fontSize: 16, color: gamesTheme.colors.ink },
  resultScroll: { flex: 1 },
  resultContent: { paddingHorizontal: 3, paddingTop: 14, paddingBottom: 24 },
  resultEyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 9, letterSpacing: 1.4, color: 'rgba(32,29,24,0.48)' },
  resultTitle: { marginTop: 3, fontFamily: gamesTheme.type.display, fontSize: 30, lineHeight: 33, color: gamesTheme.colors.ink },
  resultTabs: { flexDirection: 'row', gap: 7, marginTop: 16, marginBottom: 14 },
  resultTab: { flex: 1, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: 15, backgroundColor: 'rgba(255,249,237,0.48)', borderWidth: 1, borderColor: 'rgba(32,29,24,0.14)' },
  resultTabSelected: { backgroundColor: gamesTheme.colors.turmeric, borderColor: gamesTheme.colors.turmericDark },
  resultTabName: { maxWidth: '90%', fontFamily: gamesTheme.type.utility, fontSize: 10, color: gamesTheme.colors.ink },
  resultTabScore: { fontFamily: gamesTheme.type.display, fontSize: 16, color: gamesTheme.colors.ink },
  resultBoardHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, paddingHorizontal: 3 },
  resultPlayer: { fontFamily: gamesTheme.type.display, fontSize: 20, color: gamesTheme.colors.ink },
  resultScore: { fontFamily: gamesTheme.type.display, fontSize: 24, color: gamesTheme.colors.ink },
  resultActions: { marginTop: 14, gap: 10 },
  modalBackdrop: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: 'rgba(20,17,13,0.64)' },
  rules: { maxHeight: '86%', padding: 22, gap: 12, borderRadius: 26, backgroundColor: gamesTheme.colors.paper },
  rulesClose: { position: 'absolute', zIndex: 2, top: 12, right: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: 'rgba(32,29,24,0.07)' },
  rulesTitle: { paddingRight: 45, fontFamily: gamesTheme.type.display, fontSize: 28, color: gamesTheme.colors.ink },
  rulesIntro: { fontFamily: gamesTheme.type.body, fontSize: 13, lineHeight: 18, color: 'rgba(32,29,24,0.62)' },
  rulesScroll: { minHeight: 0 },
  rulesRows: { gap: 7, paddingBottom: 4 },
  ruleRow: { paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(32,29,24,0.09)' },
  ruleName: { fontFamily: gamesTheme.type.display, fontSize: 13, color: gamesTheme.colors.ink },
  ruleCopy: { marginTop: 1, fontFamily: gamesTheme.type.body, fontSize: 11, color: 'rgba(32,29,24,0.58)' },
});
