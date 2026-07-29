import { useCallback, useEffect, useRef, useState } from 'react';
import { router, useLocalSearchParams, type Href } from '@/src/capabilities/games/navigation/gamesRouter';
import { ArrowLeft, CircleHelp, Landmark, Minus, Plus, RotateCcw, Sparkles, Volume2, VolumeX, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameBackdrop } from '@/src/capabilities/games/ui/GameBackdrop';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { shouldPlayFailureCue, useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import { applyBankRoll, bankCurrentPlayer, bankPlayer, classifyBankRollCue, createBankGame, type BankGame, type BankingRule } from '@/src/capabilities/games/domain/bank';
import { winnerCelebration, type WinnerCelebration as WinnerCelebrationData } from '@/src/capabilities/games/domain/celebration';
import { analyzeFarkleRoll, bankFarkleTurn, commitFarkleSelection, createFarkleGame, farkleTurn, scoreFarkleSelection, type FarkleGame } from '@/src/capabilities/games/domain/farkle';
import { bankPractice, confirmPracticeSelection, createFarklePractice, riskPractice, togglePracticeDie, type FarklePractice } from '@/src/capabilities/games/domain/farklePractice';
import { useSavedPlayerRoster } from '@/src/capabilities/games/players/useSavedPlayerRoster';
import { Die } from './Die';
import { GamePlayerSetup, type SetupSeat } from '@/src/capabilities/games/features/setup/GamePlayerSetup';
import { PlayerRail } from './PlayerRail';
import { BankBroadcastBoard } from './BankBroadcastBoard';
import { BankPlayerPicker } from './BankPlayerPicker';
import { BankPot } from './BankPot';
import { WinCelebration } from './WinCelebration';
import { parseGameMode, type GameMode } from './gameModes';
import { useAuth } from '@/src/capabilities/games/shell/AuthProvider';
import { createRemoteBankTable } from '@/src/capabilities/games/remote/remoteBankClient';
import { backToGames } from '@/src/capabilities/games/navigation/backToGames';
import { defaultPlayerIdentity, type PlayerIdentity } from '@/src/capabilities/games/players/playerIdentity';
import { identityForSeats } from './setupSeats';
import { useGamePlayerProfile } from '@/src/capabilities/games/players/useGamePlayerProfile';
import { useActiveGameOrientation } from '@/src/capabilities/games/platform/useActiveGameOrientation';
import { usePersonalBests } from '@/src/capabilities/games/players/usePersonalBests';
import { playerBestKey, type PersonalBestOutcome } from '@/src/capabilities/games/players/personalBests';
import { bankRollButtonLabel, useRollCooldown } from './useRollCooldown';
import { permanentUserId } from '@/src/capabilities/games/platform/auth';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';

const initialNames = ['Player 1', 'Player 2'];
const initialSeats: SetupSeat[] = [
  { key: 'seat-1', displayName: '', identity: defaultPlayerIdentity(0) },
  { key: 'seat-2', displayName: '', identity: defaultPlayerIdentity(1) },
];
const randomDice = (count: number) => Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);

export function TumbleScreen() {
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ mode?: string }>();
  const { session } = useAuth();
  const accountUserId = permanentUserId(session);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextSeatId = useRef(3);
  const roster = useSavedPlayerRoster({ userId: accountUserId });
  const playerProfile = useGamePlayerProfile({
    userId: accountUserId,
    fallbackName: session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name ?? session?.user.email?.split('@')[0] ?? 'You',
  });
  const personalBests = usePersonalBests({ userId: accountUserId });
  const mode: GameMode = parseGameMode(params.mode);
  const gameTitle = mode === 'roller' ? 'Dice Roller' : mode === 'bank' ? 'Bank' : 'Farkle';
  const defaultSoundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const [soundOverride, setSoundOverride] = useState<boolean | null>(null);
  const soundOn = soundOverride ?? defaultSoundEnabled;
  const feedback = useGameFeedback(soundOn);
  const [rolling, setRolling] = useState(false);
  const [diceCount, setDiceCount] = useState(2);
  const [rollerDice, setRollerDice] = useState([3, 5]);
  const [seats, setSeats] = useState(initialSeats);
  const [liveIdentities, setLiveIdentities] = useState<PlayerIdentity[]>(() => initialSeats.map((seat, index) => seat.identity ?? defaultPlayerIdentity(index)));
  const [bankSetup, setBankSetup] = useState(true);
  const [bankingRule, setBankingRule] = useState<BankingRule>('anyone');
  const [bankGame, setBankGame] = useState(() => createBankGame(initialNames));
  const [bankDice, setBankDice] = useState([3, 5]);
  const bankRollCooldown = useRollCooldown(3);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [remoteStarting, setRemoteStarting] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [farkleSetup, setFarkleSetup] = useState(true);
  const [farkleGame, setFarkleGame] = useState(() => createFarkleGame(initialNames));
  const [farkleDice, setFarkleDice] = useState([1, 2, 3, 4, 5, 6]);
  const [farkleChoosing, setFarkleChoosing] = useState(false);
  const [selectedDice, setSelectedDice] = useState<number[]>([]);
  const [farklePractice, setFarklePractice] = useState<FarklePractice | null>(null);
  const [practiceReturn, setPracticeReturn] = useState<'start' | 'resume'>('start');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [celebration, setCelebration] = useState<WinnerCelebrationData | null>(null);
  const [bankBestLabels, setBankBestLabels] = useState<(string | null)[]>([]);
  const [farkleBestLabels, setFarkleBestLabels] = useState<(string | null)[]>([]);
  const liveSeats = useRef<SetupSeat[]>(initialSeats);
  const [savePromptOpen, setSavePromptOpen] = useState(false);
  const savePromptShown = useRef(false);
  const previousBankStatus = useRef(bankGame.status);
  const previousFarkleStatus = useRef(farkleGame.status);
  const farkleExplanationsSeen = useRef({ farkle: false, hotDice: false, finalRound: false });
  const dismissCelebration = useCallback(() => {
    setCelebration(null);
    if (!accountUserId && !savePromptShown.current) {
      savePromptShown.current = true;
      setSavePromptOpen(true);
    }
  }, [accountUserId]);

  const createSeat = () => {
    const index = nextSeatId.current++ - 1;
    return { key: `seat-${index + 1}`, displayName: '', identity: defaultPlayerIdentity(index) };
  };
  const cleanNames = () => seats.map((seat, index) => seat.displayName.trim() || `Player ${index + 1}`);
  const seatsForNames = (playerNames: string[]) => {
    const used = new Set<string>();
    return playerNames.map((displayName) => {
      const match = roster.players.find((player) => !used.has(player.id) && player.displayName === displayName);
      if (match) used.add(match.id);
      return { ...createSeat(), savedPlayerId: match?.id, displayName, identity: match?.identity };
    });
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useEffect(() => {
    const outcome = winnerCelebration(previousBankStatus.current, bankGame);
    previousBankStatus.current = bankGame.status;
    if (outcome) {
      const bestOutcomes = personalBests.recordGame('bank', bankGame.players.map((player, index) => ({ ...liveSeats.current[index], score: player.score })));
      setBankBestLabels(bestLabelsForSeats(liveSeats.current, bestOutcomes));
      setCelebration(outcome);
      const winnerIndex = bankGame.players.findIndex((player) => outcome.names.includes(player.name));
      const winnerSound = liveIdentities[winnerIndex]?.successSoundId;
      const endedOnSeven = bankGame.lastRoll[0] + bankGame.lastRoll[1] === 7;
      if (!endedOnSeven) void feedback.success(winnerSound);
      else {
        const timer = setTimeout(() => void feedback.success(winnerSound), 1600);
        return () => clearTimeout(timer);
      }
    }
  }, [bankGame, feedback, liveIdentities, personalBests.recordGame]);
  useEffect(() => {
    const outcome = winnerCelebration(previousFarkleStatus.current, farkleGame);
    previousFarkleStatus.current = farkleGame.status;
    if (outcome) {
      const bestOutcomes = personalBests.recordGame('farkle', farkleGame.players.map((player, index) => ({ ...liveSeats.current[index], score: player.score })));
      setFarkleBestLabels(bestLabelsForSeats(liveSeats.current, bestOutcomes));
      setCelebration(outcome);
      const winnerIndex = farkleGame.players.findIndex((player) => outcome.names.includes(player.name));
      void feedback.success(liveIdentities[winnerIndex]?.successSoundId);
    }
  }, [farkleGame, feedback, liveIdentities, personalBests.recordGame]);

  const settle = (action: () => void, count: number) => {
    const timer = setTimeout(() => {
      timers.current = timers.current.filter((pending) => pending !== timer);
      action();
      setRolling(false);
    }, 820 + count * 35);
    timers.current.push(timer);
  };

  const rollRoller = () => {
    if (rolling) return;
    setRolling(true);
    void feedback.roll();
    setRollerDice(randomDice(diceCount));
    settle(() => undefined, diceCount);
  };

  const rollBank = () => {
    if (rolling || bankGame.status === 'finished') return;
    setBankPickerOpen(false);
    const next = randomDice(2) as [number, number];
    const cue = classifyBankRollCue(bankGame, next);
    const actingIdentity = liveIdentities[bankGame.activePlayer];
    setRolling(true);
    void feedback.roll();
    setBankDice(next);
    settle(() => {
      const nextGame = applyBankRoll(bankGame, next);
      setBankGame(nextGame);
      if (cue === 'bust' && shouldPlayFailureCue(nextGame.status)) void feedback.failure(actingIdentity?.failureSoundId);
      bankRollCooldown.start();
      if (cue === 'doubles') void feedback.success(actingIdentity?.successSoundId);
    }, 2);
  };

  const rollFarkleFrom = (game: FarkleGame, afterRollNote?: string) => {
    if (rolling || game.status === 'finished') return;
    const next = randomDice(game.diceRemaining);
    const actingIdentity = liveIdentities[game.activePlayer];
    setRolling(true);
    setSelectedDice([]);
    setFarkleChoosing(false);
    setFarkleDice(next);
    void feedback.roll();
    settle(() => {
      const analysis = analyzeFarkleRoll(next);
      if (analysis.farkle) {
        const nextGame = farkleTurn(game);
        if (!farkleExplanationsSeen.current.farkle) {
          farkleExplanationsSeen.current.farkle = true;
          setFarkleGame({ ...nextGame, message: 'Nothing scores — unbanked points are lost and the turn ends.' });
        } else setFarkleGame(nextGame);
        if (shouldPlayFailureCue(nextGame.status)) feedback.failure(actingIdentity?.failureSoundId);
      } else {
        setFarkleGame({ ...game, message: afterRollNote ?? 'Tap the dice that score' });
        setFarkleChoosing(true);
      }
    }, next.length);
  };

  const selectedValues = selectedDice.map((index) => farkleDice[index]);
  const selection = scoreFarkleSelection(selectedValues);
  const practiceSelectedValues = farklePractice?.selectedIndexes.map((index) => farklePractice.dice[index]) ?? [];
  const practiceSelection = scoreFarkleSelection(practiceSelectedValues);
  const practiceCanConfirm = practiceSelectedValues.length === 2 && practiceSelectedValues.includes(1) && practiceSelectedValues.includes(5);
  const visibleFarkleDice = farklePractice?.dice ?? farkleDice;
  const analysis = analyzeFarkleRoll(visibleFarkleDice);

  const continueFarkle = () => {
    if (!selection.valid) return;
    const committed = commitFarkleSelection(farkleGame, selectedValues);
    const hotDice = selectedValues.length === farkleGame.diceRemaining;
    if (hotDice || selection.score >= 1500) feedback.success(liveIdentities[farkleGame.activePlayer]?.successSoundId);
    setFarkleGame(committed);
    const note = hotDice && !farkleExplanationsSeen.current.hotDice
      ? 'All six dice scored — hot dice lets you roll all six again.'
      : undefined;
    if (note) farkleExplanationsSeen.current.hotDice = true;
    rollFarkleFrom(committed, note);
  };

  const bankFarkle = () => {
    if (!selection.valid) return;
    const committed = commitFarkleSelection(farkleGame, selectedValues);
    const next = bankFarkleTurn(committed);
    const startsFinalRound = farkleGame.finalRoundStarter === null && next.finalRoundStarter !== null;
    if (startsFinalRound && !farkleExplanationsSeen.current.finalRound) {
      farkleExplanationsSeen.current.finalRound = true;
      setFarkleGame({ ...next, message: '10,000 starts the final round — everyone else gets one last turn.' });
    } else setFarkleGame(next);
    setFarkleChoosing(false);
    setSelectedDice([]);
    setFarkleDice([1, 2, 3, 4, 5, 6]);
    if (next.status !== 'finished') void feedback.success(liveIdentities[farkleGame.activePlayer]?.successSoundId);
  };

  const visibleDice = mode === 'roller' ? rollerDice : mode === 'bank' ? bankDice : visibleFarkleDice;
  const result = mode === 'roller'
    ? rollerDice.reduce((total, die) => total + die, 0)
    : mode === 'bank'
      ? bankGame.pot
      : farklePractice
        ? farklePractice.phase === 'selecting' && practiceSelection.valid ? practiceSelection.score : farklePractice.points
        : farkleGame.turnPoints + (selection.valid ? selection.score : 0);

  const rememberSeats = () => {
    const remembered = roster.remember(seats.filter((seat) => !seat.profileUserId).map((seat) => ({ savedPlayerId: seat.savedPlayerId, displayName: seat.displayName })));
    let rememberedIndex = 0;
    const stableSeats = seats.map((seat) => seat.profileUserId ? seat : { ...seat, savedPlayerId: remembered[rememberedIndex++]?.savedPlayerId });
    liveSeats.current = stableSeats;
    setSeats(stableSeats);
    return stableSeats;
  };
  const startBank = () => { const next = cleanNames(); const stableSeats = rememberSeats(); setLiveIdentities(identityForSeats(stableSeats, roster.players)); setBankBestLabels([]); setBankGame(createBankGame(next, 10, bankingRule)); setBankDice([3, 5]); bankRollCooldown.reset(); setBankPickerOpen(false); setBankSetup(false); };
  const startRemoteBank = useCallback(async () => {
    setRemoteStarting(true);
    setRemoteError(null);
    try {
      const localSeats = seats.filter((seat) => seat.displayName.trim());
      const { sessionId, userId } = await createRemoteBankTable(localSeats.map((seat) => seat.displayName.trim()), bankingRule);
      roster.remember(localSeats.filter((seat) => !seat.profileUserId).map((seat) => ({ savedPlayerId: seat.savedPlayerId, displayName: seat.displayName })));
      router.push({ pathname: '/room/[sessionId]', params: { sessionId, hostUserId: userId } } as Href);
    } catch (next) {
      const message = next && typeof next === 'object' && 'message' in next ? String(next.message) : null;
      setRemoteError(message || 'Unable to open a shared table.');
    } finally { setRemoteStarting(false); }
  }, [bankingRule, roster, seats]);
  const startFarkle = () => {
    const next = cleanNames();
    const stableSeats = rememberSeats();
    setLiveIdentities(identityForSeats(stableSeats, roster.players));
    setFarkleBestLabels([]);
    farkleExplanationsSeen.current = { farkle: false, hotDice: false, finalRound: false };
    setFarkleGame(createFarkleGame(next));
    setFarkleDice([1, 2, 3, 4, 5, 6]);
    setFarkleSetup(false);
    setFarkleChoosing(false);
    setSelectedDice([]);
    setFarklePractice(null);
  };
  const startFarklePractice = (returnTo: 'start' | 'resume') => {
    setLiveIdentities(identityForSeats(seats, roster.players));
    setPracticeReturn(returnTo);
    setFarklePractice(createFarklePractice());
    setFarkleSetup(false);
    setRulesOpen(false);
  };
  const finishFarklePractice = () => {
    if (practiceReturn === 'resume') setFarklePractice(null);
    else startFarkle();
  };
  const newBankGame = () => { setSeats(seatsForNames(bankGame.players.map((player) => player.name))); setBankSetup(true); };
  const newFarkleGame = () => { setSeats(seatsForNames(farkleGame.players.map((player) => player.name))); setFarklePractice(null); setFarkleSetup(true); };
  const setup = mode === 'bank' ? bankSetup : mode === 'farkle' ? farkleSetup : false;
  useActiveGameOrientation(!setup);
  const presenting = !setup && width > height;
  return (
    <GameBackdrop>
      <SafeAreaView style={[styles.safe, presenting ? styles.safePresenting : null]}>
        <View style={[styles.topbar, presenting ? styles.topbarPresenting : null]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to games" onPress={() => backToGames(router)} style={styles.iconButton}><ArrowLeft size={22} color={gamesTheme.colors.ink} /></Pressable>
          <View accessibilityRole="header" accessibilityLabel={`${gameTitle} game`} style={styles.gameTitleLockup}>
            {mode === 'bank' ? <Landmark size={18} color={gamesTheme.colors.ink} /> : mode === 'farkle' ? <Sparkles size={18} color={gamesTheme.colors.ink} /> : null}
            <Text style={styles.gameTitle}>{gameTitle}</Text>
          </View>
          <View style={styles.topActions}>
            {mode === 'farkle' && !farkleSetup ? <Pressable accessibilityRole="button" accessibilityLabel="How to play Farkle" onPress={() => setRulesOpen(true)} style={styles.iconButton}><CircleHelp size={21} color={gamesTheme.colors.ink} /></Pressable> : null}
            <Pressable accessibilityRole="button" accessibilityLabel={soundOn ? 'Turn sound off' : 'Turn sound on'} onPress={() => setSoundOverride(!soundOn)} style={styles.iconButton}>{soundOn ? <Volume2 size={21} color={gamesTheme.colors.ink} /> : <VolumeX size={21} color={gamesTheme.colors.ink} />}</Pressable>
          </View>
        </View>

        {setup ? (
          <GamePlayerSetup
            mode={mode === 'bank' ? 'bank' : 'farkle'}
            seats={seats}
            savedPlayers={roster.players}
            loading={roster.loading}
            onChange={setSeats}
            onRename={roster.rename}
            onIdentityChange={roster.updateIdentity}
            onArchive={roster.archive}
            onPreviewSuccess={(soundId) => { void feedback.success(soundId); }}
            onPreviewFailure={(soundId) => { void feedback.failure(soundId); }}
            onStart={mode === 'bank' ? startBank : startFarkle}
            onLearn={mode === 'farkle' ? () => startFarklePractice('start') : undefined}
            createSeat={createSeat}
            bankingRule={bankingRule}
            onBankingRuleChange={setBankingRule}
            onUseMorePhones={mode === 'bank' ? () => void startRemoteBank() : undefined}
            remoteStarting={remoteStarting}
            remoteError={remoteError}
            selfProfile={playerProfile.profile}
            onEditSelf={() => router.push('/auth')}
            onUseAsMyPlayer={(displayName, identity) => {
              if (accountUserId) playerProfile.save(displayName, identity);
              else router.push({ pathname: '/auth', params: {
                source: 'player-profile', profileName: displayName, colorId: identity.colorId,
                successSoundId: identity.successSoundId, failureSoundId: identity.failureSoundId,
              } });
            }}
            personalBestFor={(player) => 'id' in player
              ? personalBests.bestFor(mode === 'bank' ? 'bank' : 'farkle', { savedPlayerId: player.id, displayName: player.displayName })
              : personalBests.bestFor(mode === 'bank' ? 'bank' : 'farkle', { profileUserId: player.userId, displayName: player.displayName })}
          />
        ) : (
          <>
            <View style={[styles.table, presenting ? styles.tablePresenting : null]}>
              <LinearGradient colors={[gamesTheme.colors.feltLight, gamesTheme.colors.felt, gamesTheme.colors.feltDark]} style={styles.tableInner}>
                <View pointerEvents="none" style={styles.tableInlay} />
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerTopLeft]} />
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerTopRight]} />
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerBottomLeft]} />
                <View pointerEvents="none" style={[styles.cornerMark, styles.cornerBottomRight]} />
                {mode === 'bank' && presenting ? <BankBroadcastBoard game={bankGame} dice={bankDice} identities={liveIdentities} rolling={rolling} compact={height < 420 || width < 760} personalBestLabels={bankBestLabels} /> : <>
                {mode === 'roller' ? <GameHud eyebrow="UTILITY" title="Basic Dice Roller" message="For any game at the table." /> : null}
                {mode === 'bank' ? <GameHud eyebrow={`ROUND ${bankGame.round}/${bankGame.maxRounds}`} title={bankGame.status === 'finished' ? bankGame.message : `${bankGame.players[bankGame.activePlayer]?.name}'s turn`} message={bankGame.message} /> : null}
                {mode === 'farkle' && farklePractice ? <GameHud {...practiceHud(farklePractice, practiceCanConfirm)} /> : null}
                {mode === 'farkle' && !farklePractice ? <GameHud eyebrow={`TURN ${farkleGame.turnPoints}`} title={farkleGame.status === 'finished' ? farkleGame.message : `${farkleGame.players[farkleGame.activePlayer]?.name}'s turn`} message={rolling ? 'Rolling…' : farkleChoosing ? selection.valid ? `Bank to keep ${result}, or roll ${farkleGame.diceRemaining - selectedDice.length || 6} and risk it.` : 'Tap the dice that score' : farkleGame.message} /> : null}
                {mode === 'bank' ? <PlayerRail players={bankGame.players} identities={liveIdentities} activePlayer={bankGame.activePlayer} banked={bankGame.players.map((player) => player.banked)} personalBestLabels={bankBestLabels} /> : null}
                {mode === 'farkle' && !farklePractice ? <PlayerRail players={farkleGame.players} identities={liveIdentities} activePlayer={farkleGame.activePlayer} personalBestLabels={farkleBestLabels} /> : null}
                <View style={[styles.diceTray, visibleDice.length > 4 ? styles.diceTrayMany : null]}>
                  {visibleDice.map((value, index) => {
                    const practiceSelecting = farklePractice?.phase === 'selecting';
                    const liveSelecting = !farklePractice && farkleChoosing;
                    const selectable = mode === 'farkle' && (practiceSelecting || liveSelecting) && analysis.scoringIndexes.includes(index);
                    const selected = farklePractice?.selectedIndexes.includes(index) ?? selectedDice.includes(index);
                    return <Die key={`${index}-${value}-${rolling ? 'rolling' : 'still'}`} value={value} rolling={rolling} small={visibleDice.length > 4} candidate={selectable} selected={mode === 'farkle' && selected} onPress={selectable ? () => {
                      feedback.select();
                      if (farklePractice) setFarklePractice(togglePracticeDie(farklePractice, index));
                      else setSelectedDice((current) => current.includes(index) ? current.filter((item) => item !== index) : [...current, index]);
                    } : undefined} />;
                  })}
                </View>
                {mode === 'bank' ? <BankPot pot={bankGame.pot} rollInRound={bankGame.rollInRound} message={bankGame.message} rolling={rolling} /> : <View style={styles.result}><Text style={styles.resultLabel}>{rolling ? 'ROLLING' : mode === 'roller' ? 'TOTAL' : farklePractice ? 'PRACTICE' : 'TURN'}</Text><Text style={styles.resultValue}>{rolling ? '··' : result}</Text></View>}
                </>}
              </LinearGradient>
            </View>

            {mode === 'roller' ? (
              <View style={[styles.controls, presenting ? styles.controlsPresenting : null]}>
                <View style={styles.counter}><Pressable accessibilityRole="button" accessibilityLabel="Remove one die" disabled={diceCount === 1} onPress={() => { setDiceCount((count) => count - 1); setRollerDice((current) => current.slice(0, -1)); }} style={styles.counterButton}><Minus size={20} color={gamesTheme.colors.ink} /></Pressable><Text style={styles.counterValue}>{diceCount}</Text><Pressable accessibilityRole="button" accessibilityLabel="Add one die" disabled={diceCount === 8} onPress={() => { setDiceCount((count) => count + 1); setRollerDice((current) => [...current, 1]); }} style={styles.counterButton}><Plus size={20} color={gamesTheme.colors.ink} /></Pressable></View>
                <GameButton disabled={rolling} onPress={rollRoller} style={styles.primaryControl}>Roll {diceCount} {diceCount === 1 ? 'die' : 'dice'}</GameButton>
              </View>
            ) : mode === 'bank' ? (
              bankGame.status === 'finished' ? <GameButton onPress={newBankGame} icon={<RotateCcw size={20} color={gamesTheme.colors.ink} />}>New game</GameButton> : <View style={[styles.controls, presenting ? styles.controlsPresenting : null]}><GameButton tone="turmeric" disabled={rolling || bankGame.rollInRound === 0} onPress={() => bankGame.bankingRule === 'anyone' ? setBankPickerOpen(true) : setBankGame((game: BankGame) => bankCurrentPlayer(game))} style={styles.secondaryControl} icon={<Landmark size={19} color={gamesTheme.colors.ink} />}>{bankGame.bankingRule === 'anyone' ? 'Bank!' : `Bank ${bankGame.pot}`}</GameButton><GameButton disabled={rolling || bankRollCooldown.remainingSeconds > 0} onPress={rollBank} style={styles.primaryControl}>{bankRollButtonLabel(rolling, bankRollCooldown.remainingSeconds)}</GameButton></View>
            ) : farklePractice ? (
              farklePractice.phase === 'selecting' ? (
                <GameButton disabled={!practiceCanConfirm} onPress={() => setFarklePractice(confirmPracticeSelection(farklePractice))}>Keep these dice</GameButton>
              ) : farklePractice.phase === 'decision' ? (
                <View style={[styles.controls, presenting ? styles.controlsPresenting : null]}><GameButton tone="turmeric" onPress={() => { setFarklePractice(bankPractice(farklePractice)); void feedback.success(liveIdentities[0]?.successSoundId); }} style={styles.secondaryControl} icon={<Landmark size={19} color={gamesTheme.colors.ink} />}>Bank 150</GameButton><GameButton onPress={() => { setFarklePractice(riskPractice(farklePractice)); void feedback.failure(liveIdentities[0]?.failureSoundId); }} style={styles.primaryControl}>Risk it — roll 4</GameButton></View>
              ) : (
                <GameButton onPress={finishFarklePractice}>{practiceReturn === 'resume' ? 'Return to game' : 'Start the real game'}</GameButton>
              )
            ) : farkleGame.status === 'finished' ? (
              <GameButton onPress={newFarkleGame} icon={<RotateCcw size={20} color={gamesTheme.colors.ink} />}>New game</GameButton>
            ) : (
              <View style={[styles.controls, presenting ? styles.controlsPresenting : null]}><GameButton tone="turmeric" disabled={rolling || !selection.valid} onPress={bankFarkle} style={styles.secondaryControl} icon={<Landmark size={19} color={gamesTheme.colors.ink} />}>Bank {result}</GameButton><GameButton disabled={rolling || (farkleChoosing && !selection.valid)} onPress={farkleChoosing ? continueFarkle : () => rollFarkleFrom(farkleGame)} style={styles.primaryControl}>{rolling ? 'Rolling…' : farkleChoosing ? farkleGame.diceRemaining - selectedDice.length === 0 ? 'Hot dice — roll 6' : `Roll ${farkleGame.diceRemaining - selectedDice.length} again` : 'Roll all 6 dice'}</GameButton></View>
            )}
          </>
        )}
      </SafeAreaView>
      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} onLearn={() => startFarklePractice(farklePractice ? practiceReturn : 'resume')} />
      <BankPlayerPicker game={bankGame} open={bankPickerOpen} onClose={() => setBankPickerOpen(false)} onBank={(playerIds) => { setBankGame((game) => playerIds.reduce((next, playerId) => bankPlayer(next, playerId), game)); setBankPickerOpen(false); }} />
      <WinCelebration celebration={celebration} onComplete={dismissCelebration} />
      <SavePlayersPrompt open={savePromptOpen} onClose={() => setSavePromptOpen(false)} onSave={() => { setSavePromptOpen(false); router.push({ pathname: '/auth', params: { source: 'post-game' } }); }} />
    </GameBackdrop>
  );
}

function bestLabelsForSeats(seats: SetupSeat[], outcomes: PersonalBestOutcome[]) {
  return seats.map((seat) => {
    const key = playerBestKey(seat);
    const outcome = key ? outcomes.find((candidate) => candidate.playerKey === key) : undefined;
    if (!outcome) return null;
    return `${outcome.isNewBest ? 'NEW BEST' : 'BEST'} · ${outcome.bestScore.toLocaleString()}`;
  });
}

function SavePlayersPrompt({ open, onClose, onSave }: { open: boolean; onClose: () => void; onSave: () => void }) {
  return <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.modalBackdrop} onPress={onClose}>
      <Pressable style={styles.savePrompt} onPress={() => undefined}>
        <Text style={styles.saveTitle}>Save your players?</Text>
        <Text style={styles.saveCopy}>Sign in once and these names will be ready on your other devices.</Text>
        <GameButton onPress={onSave}>Save my players</GameButton>
        <GameButton tone="ghost" onPress={onClose}>Not now</GameButton>
      </Pressable>
    </Pressable>
  </Modal>;
}

function GameHud({ eyebrow, title, message }: { eyebrow: string; title: string; message: string }) {
  return <View style={styles.hud}><Text style={styles.hudEyebrow}>{eyebrow}</Text><Text numberOfLines={1} style={styles.hudTitle}>{title}</Text><Text numberOfLines={2} style={styles.hudMessage}>{message}</Text></View>;
}

function practiceHud(practice: FarklePractice, canConfirm: boolean) {
  if (practice.phase === 'selecting') return {
    eyebrow: 'PRACTICE · POINTS DON’T COUNT',
    title: '1s and 5s score on their own',
    message: canConfirm ? 'That makes 150. Keep those dice.' : 'Tap the 1 and 5.',
  };
  if (practice.phase === 'decision') return {
    eyebrow: 'PRACTICE · 150 POINTS',
    title: 'Keep 150, or risk it?',
    message: 'Bank to keep it. Roll four dice to risk it.',
  };
  if (practice.phase === 'banked') return {
    eyebrow: 'PRACTICE · SAFE',
    title: '150 points, safe.',
    message: 'Banking adds the points to your score and ends your turn.',
  };
  return {
    eyebrow: 'PRACTICE · RISKED',
    title: 'That’s a Farkle.',
    message: 'Nothing scores, so the 150 unbanked points are lost.',
  };
}

function RulesModal({ open, onClose, onLearn }: { open: boolean; onClose: () => void; onLearn: () => void }) {
  const [showReference, setShowReference] = useState(false);
  useEffect(() => { if (!open) setShowReference(false); }, [open]);
  const rows = [['Each 1', '100'], ['Each 5', '50'], ['Three 1s', '1,000'], ['Three of a kind', 'Face × 100'], ['Straight / 3 pairs', '1,500'], ['Two triplets', '2,500']];
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}><Pressable style={styles.modalBackdrop} onPress={onClose}><Pressable style={styles.rules} onPress={() => undefined}><Pressable accessibilityRole="button" accessibilityLabel="Close Farkle help" onPress={onClose} style={styles.rulesClose}><X size={19} color={gamesTheme.colors.ink} /></Pressable>{showReference ? <><Text style={styles.rulesTitle}>Farkle scoring</Text><Text style={styles.rulesCopy}>Choose only dice that score. Then bank the points or risk another roll.</Text>{rows.map(([label, value]) => <View key={label} style={styles.ruleRow}><Text style={styles.ruleLabel}>{label}</Text><Text style={styles.ruleValue}>{value}</Text></View>)}<Text style={styles.rulesFoot}>Use all six scoring dice and you get hot dice: roll all six again. First to 10,000 starts the final round.</Text><GameButton tone="ghost" onPress={() => setShowReference(false)}>Back to help</GameButton></> : <><Text style={styles.rulesTitle}>Farkle help</Text><Text style={styles.rulesCopy}>Try one guided turn, or check a score without leaving the table.</Text><GameButton onPress={onLearn}>Learn in one turn</GameButton><GameButton tone="paper" onPress={() => setShowReference(true)}>Scoring reference</GameButton></>}</Pressable></Pressable></Modal>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 12, paddingBottom: 14 },
  safePresenting: { paddingHorizontal: 8, paddingBottom: 8 },
  topbar: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topbarPresenting: { minHeight: 44 },
  gameTitleLockup: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  gameTitle: { fontFamily: gamesTheme.type.display, color: gamesTheme.colors.ink, fontSize: 18 },
  topActions: { flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  table: { flex: 1, minHeight: 0, padding: 9, borderRadius: gamesTheme.radius.lg, backgroundColor: gamesTheme.colors.wood, borderWidth: 2, borderColor: '#5A3422', shadowColor: '#3A2418', shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.26, shadowRadius: 18 },
  tablePresenting: { padding: 6, borderRadius: 18 },
  tableInner: { flex: 1, overflow: 'hidden', borderRadius: gamesTheme.radius.md, borderWidth: 3, borderColor: gamesTheme.colors.woodLight, paddingTop: 14, paddingBottom: 18, justifyContent: 'space-between' },
  tableInlay: { position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, borderRadius: 11, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)' },
  cornerMark: { position: 'absolute', width: 9, height: 9, borderRadius: 2, backgroundColor: 'rgba(248,207,82,0.34)', transform: [{ rotate: '45deg' }] },
  cornerTopLeft: { top: 14, left: 14 },
  cornerTopRight: { top: 14, right: 14 },
  cornerBottomLeft: { bottom: 14, left: 14 },
  cornerBottomRight: { bottom: 14, right: 14 },
  hud: { alignItems: 'center', minHeight: 72, gap: 2, paddingHorizontal: 12 },
  hudEyebrow: { fontFamily: gamesTheme.type.utility, fontSize: 9, color: 'rgba(255,255,255,0.58)', letterSpacing: 1.4 },
  hudTitle: { fontFamily: gamesTheme.type.display, fontSize: 17, color: gamesTheme.colors.white },
  hudMessage: { maxWidth: '92%', textAlign: 'center', fontFamily: gamesTheme.type.body, fontSize: 11, lineHeight: 15, color: 'rgba(255,255,255,0.62)' },
  diceTray: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignContent: 'center', alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 18 },
  diceTrayMany: { gap: 16 },
  result: { alignSelf: 'center', flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  resultLabel: { fontFamily: gamesTheme.type.utility, fontSize: 9, color: 'rgba(255,255,255,0.64)', letterSpacing: 1.6 },
  resultValue: { fontFamily: gamesTheme.type.display, fontSize: 29, color: gamesTheme.colors.white },
  controls: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 12 },
  controlsPresenting: { minHeight: 62, paddingTop: 8, alignSelf: 'center', width: '72%' },
  primaryControl: { flex: 1.2 },
  secondaryControl: { flex: 1 },
  counter: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  counterButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(32,29,24,0.28)' },
  counterValue: { width: 24, textAlign: 'center', fontFamily: gamesTheme.type.display, fontSize: 22, color: gamesTheme.colors.ink },
  modalBackdrop: { flex: 1, padding: 22, justifyContent: 'center', backgroundColor: 'rgba(20,17,13,0.62)' },
  rules: { borderRadius: 26, backgroundColor: gamesTheme.colors.paper, padding: 24, gap: 8 },
  rulesClose: { position: 'absolute', top: 14, right: 14, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(32,29,24,0.07)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  rulesTitle: { fontFamily: gamesTheme.type.display, fontSize: 28, color: gamesTheme.colors.ink, paddingRight: 44 },
  rulesCopy: { fontFamily: gamesTheme.type.body, fontSize: 14, lineHeight: 20, color: 'rgba(32,29,24,0.62)', marginBottom: 4 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(32,29,24,0.05)', borderRadius: 9, padding: 9 },
  ruleLabel: { fontFamily: gamesTheme.type.utility, fontSize: 13, color: gamesTheme.colors.ink },
  ruleValue: { fontFamily: gamesTheme.type.display, fontSize: 13, color: gamesTheme.colors.ink },
  rulesFoot: { fontFamily: gamesTheme.type.body, fontSize: 11, lineHeight: 16, color: 'rgba(32,29,24,0.54)', paddingTop: 4 },
  savePrompt: { marginTop: 'auto', marginHorizontal: -22, marginBottom: -22, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: gamesTheme.colors.cream, padding: 24, gap: 12 },
  saveTitle: { fontFamily: gamesTheme.type.display, fontSize: 29, color: gamesTheme.colors.ink },
  saveCopy: { fontFamily: gamesTheme.type.body, fontSize: 15, lineHeight: 21, color: 'rgba(32,29,24,0.62)', marginBottom: 4 },
});
