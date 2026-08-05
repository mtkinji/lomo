import { useRef, useState } from 'react';
import { router, useLocalSearchParams } from '@/src/capabilities/games/navigation/gamesRouter';
import { Text } from 'react-native';
import { findConnectionGame } from '@/src/capabilities/games/domain/catalog';
import { gamesTheme } from '@/src/capabilities/games/theme/gamesTheme';
import { GameButton } from '@/src/capabilities/games/ui/GameButton';
import { ConnectionGameFrame, PlayCard } from './ConnectionGameFrame';
import { GamePlayerSetup } from '@/src/capabilities/games/features/setup/GamePlayerSetup';
import { PromptConnectionGame } from './PromptConnectionGames';
import { PassPatternGame } from './PassPatternGame';
import { DoodleBridgeGame } from './DoodleBridgeGame';
import { ClueCircleGame } from './ClueCircleGame';
import { ShowOfHandsGame } from './OnePlanGame';
import { SlanguageStartScreen } from './SlanguageStartScreen';
import { useSavedPlayerRoster } from '@/src/capabilities/games/players/useSavedPlayerRoster';
import { useAuth } from '@/src/capabilities/games/shell/AuthProvider';
import type { PlayerSeat } from '@/src/capabilities/games/players/playerSeats';
import { useGamePlayerProfile } from '@/src/capabilities/games/players/useGamePlayerProfile';
import { useGameFeedback } from '@/src/capabilities/games/audio/useGameFeedback';
import { useActiveGameOrientation } from '@/src/capabilities/games/platform/useActiveGameOrientation';
import { permanentUserId } from '@/src/capabilities/games/platform/auth';
import { useGamesSettingsStore } from '@/src/capabilities/games/settings/useGamesSettingsStore';

export function ConnectionGameScreen() {
  const { gameId } = useLocalSearchParams<{ gameId?: string }>();
  const { session } = useAuth();
  const accountUserId = permanentUserId(session);
  const roster = useSavedPlayerRoster({ userId: accountUserId });
  const playerProfile = useGamePlayerProfile({
    userId: accountUserId,
    fallbackName: session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name ?? session?.user.email?.split('@')[0] ?? 'You',
  });
  const defaultSoundEnabled = useGamesSettingsStore((state) => state.soundEnabled);
  const [soundOverride, setSoundOverride] = useState<boolean | null>(null);
  const soundOn = soundOverride ?? defaultSoundEnabled;
  const feedback = useGameFeedback(soundOn);
  const game = findConnectionGame(gameId);
  const suggestedName = session?.user.user_metadata?.full_name ?? session?.user.user_metadata?.name ?? '';
  const remoteOnly = game?.id === 'slanguage';
  const nextSeatId = useRef(remoteOnly ? 2 : 3);
  const [seats, setSeats] = useState<PlayerSeat[]>(remoteOnly
    ? [{ key: 'seat-1', displayName: suggestedName }]
    : [{ key: 'seat-1', displayName: '' }, { key: 'seat-2', displayName: '' }]);
  const isInstantGame = game?.id === 'same-page';
  const [started, setStarted] = useState(isInstantGame);
  const [sessionKey, setSessionKey] = useState(0);
  useActiveGameOrientation(started);

  if (!game) return <ConnectionGameFrame title="Game not found" promise="This table is not available."><PlayCard tone="paper"><Text style={{ fontFamily: gamesTheme.type.body, color: gamesTheme.colors.ink }}>Return to the game shelf and choose another table.</Text></PlayCard></ConnectionGameFrame>;
  const createSeat = () => {
    const number = nextSeatId.current++;
    return { key: `seat-${number}`, displayName: `Player ${number}` };
  };
  if (game.id === 'slanguage') return <ConnectionGameFrame title={game.title} promise={game.promise} showHeading={false} gameHeader gameMark={game.mark}><SlanguageStartScreen
    seats={seats}
    savedPlayers={roster.players}
    loading={roster.loading}
    onChange={setSeats}
    createSeat={createSeat}
    onRename={roster.rename}
    onIdentityChange={roster.updateIdentity}
    onArchive={roster.archive}
    onPreviewSuccess={(soundId) => { void feedback.success(soundId); }}
    onPreviewFailure={(soundId) => { void feedback.failure(soundId); }}
    selfProfile={playerProfile.profile}
    onEditSelf={() => router.push('/auth')}
    onUseAsMyPlayer={(displayName, identity) => {
      if (accountUserId) playerProfile.save(displayName, identity);
      else router.push({ pathname: '/auth', params: {
        source: 'player-profile', profileName: displayName, colorId: identity.colorId,
        successSoundId: identity.successSoundId, failureSoundId: identity.failureSoundId,
      } });
    }}
    onRememberHost={(seat) => {
      if (!seat.profileUserId) roster.remember([{ savedPlayerId: seat.savedPlayerId, displayName: seat.displayName }]);
    }}
  /></ConnectionGameFrame>;

  const cleanPlayers = seats.map((seat, index) => seat.displayName.trim() || `Player ${index + 1}`);
  return <ConnectionGameFrame
    title={game.title}
    promise={game.promise}
    playing={started}
    compactPlayChrome={isInstantGame}
    gameHeader
    gameMark={game.mark}
    showHeading={false}
    onRestart={started ? () => setSessionKey((value) => value + 1) : undefined}
    soundEnabled={started && game.id === 'clue-circle' ? soundOn : undefined}
    onToggleSound={started && game.id === 'clue-circle' ? () => setSoundOverride(!soundOn) : undefined}
  >
    {!started ? <GamePlayerSetup
      mode="connection"
      seats={seats}
      savedPlayers={roster.players}
      loading={roster.loading}
      onChange={setSeats}
      createSeat={createSeat}
      onRename={roster.rename}
      onIdentityChange={roster.updateIdentity}
      onArchive={roster.archive}
      onPreviewSuccess={(soundId) => { void feedback.success(soundId); }}
      onPreviewFailure={(soundId) => { void feedback.failure(soundId); }}
      selfProfile={playerProfile.profile}
      onEditSelf={() => router.push('/auth')}
      onUseAsMyPlayer={(displayName, identity) => {
        if (accountUserId) playerProfile.save(displayName, identity);
        else router.push({ pathname: '/auth', params: {
          source: 'player-profile', profileName: displayName, colorId: identity.colorId,
          successSoundId: identity.successSoundId, failureSoundId: identity.failureSoundId,
        } });
      }}
      onStart={() => {
        roster.remember(seats.filter((seat) => !seat.profileUserId && seat.displayName.trim()).map(({ savedPlayerId, displayName }) => ({ savedPlayerId, displayName: displayName.trim() })));
        setSeats(seats.map((seat, index) => ({ ...seat, displayName: cleanPlayers[index] })));
        setStarted(true);
      }} /> : <GameBody
        key={sessionKey}
        gameId={game.id}
        players={cleanPlayers}
        soundEnabled={soundOn}
        onClueCorrect={() => { void feedback.success('sparkle'); }}
        onCluePass={feedback.select}
      />}
    {started && !isInstantGame && game.id !== 'clue-circle' ? <GameButton tone="ghost" onPress={() => setStarted(false)}>Change players</GameButton> : null}
  </ConnectionGameFrame>;
}

function GameBody({ gameId, players, soundEnabled, onClueCorrect, onCluePass }: { gameId: NonNullable<ReturnType<typeof findConnectionGame>>['id']; players: string[]; soundEnabled: boolean; onClueCorrect: () => void; onCluePass: () => void }) {
  if (gameId === 'same-page') return <ShowOfHandsGame />;
  if (gameId === 'pass-pattern') return <PassPatternGame players={players} />;
  if (gameId === 'doodle-bridge') return <DoodleBridgeGame players={players} />;
  if (gameId === 'clue-circle') return <ClueCircleGame players={players} soundEnabled={soundEnabled} onCorrectFeedback={onClueCorrect} onPassFeedback={onCluePass} />;
  return <PromptConnectionGame gameId={gameId} players={players} />;
}
