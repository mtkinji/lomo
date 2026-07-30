import { useState } from 'react';
import { router, type Href } from '@/src/capabilities/games/navigation/gamesRouter';
import { GamePlayerSetup } from '@/src/capabilities/games/features/setup/GamePlayerSetup';
import type { GamePlayerProfile } from '@/src/capabilities/games/players/gamePlayerProfile';
import type { FailureSoundId, PlayerIdentity, SuccessSoundId } from '@/src/capabilities/games/players/playerIdentity';
import type { PlayerSeat } from '@/src/capabilities/games/players/playerSeats';
import type { SavedPlayer } from '@/src/capabilities/games/players/savedPlayers';
import { createOpenSlanguageTable } from '@/src/capabilities/games/remote/remoteSlanguageClient';
import { getSlanguageStartError } from './slanguageStartError';

type Props = {
  seats: PlayerSeat[];
  savedPlayers: SavedPlayer[];
  loading: boolean;
  onChange: (seats: PlayerSeat[]) => void;
  createSeat: () => PlayerSeat;
  onRename: (id: string, name: string) => void;
  onIdentityChange: (id: string, identity: PlayerIdentity) => void;
  onArchive: (id: string) => void;
  onPreviewSuccess: (soundId: SuccessSoundId) => void;
  onPreviewFailure: (soundId: FailureSoundId) => void;
  selfProfile?: GamePlayerProfile | null;
  onEditSelf?: () => void;
  onUseAsMyPlayer?: (name: string, identity: PlayerIdentity) => void;
  onRememberHost: (seat: PlayerSeat) => void;
};

export function SlanguageStartScreen({
  seats,
  savedPlayers,
  loading,
  onChange,
  createSeat,
  onRename,
  onIdentityChange,
  onArchive,
  onPreviewSuccess,
  onPreviewFailure,
  selfProfile,
  onEditSelf,
  onUseAsMyPlayer,
  onRememberHost,
}: Props) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hostSeat = seats[0];
  const hostName = hostSeat?.displayName.trim() ?? '';

  const open = async () => {
    if (!hostSeat || !hostName || working) return;
    setWorking(true);
    setError(null);
    try {
      const result = await createOpenSlanguageTable(hostName);
      onRememberHost(hostSeat);
      router.replace({ pathname: '/room/[sessionId]', params: { sessionId: result.sessionId, hostUserId: result.userId } } as Href);
    } catch (next) {
      setError(getSlanguageStartError(next));
    } finally { setWorking(false); }
  };

  return <GamePlayerSetup
    mode="remote-only"
    seats={seats}
    savedPlayers={savedPlayers}
    loading={loading}
    onChange={onChange}
    createSeat={createSeat}
    onRename={onRename}
    onIdentityChange={onIdentityChange}
    onArchive={onArchive}
    onPreviewSuccess={onPreviewSuccess}
    onPreviewFailure={onPreviewFailure}
    onUseMorePhones={() => void open()}
    remoteStarting={working}
    remoteError={error}
    remoteCapacity={8}
    selfProfile={selfProfile}
    onEditSelf={onEditSelf}
    onUseAsMyPlayer={onUseAsMyPlayer}
  />;
}
