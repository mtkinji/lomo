import type { SavedPlayer } from './savedPlayers';
import type { FailureSoundId, PlayerIdentity, SuccessSoundId } from './playerIdentity';
import { normalizePlayerIdentity } from './playerIdentity';
import { PlayerIdentityEditor } from './PlayerIdentityEditor';

type Props = {
  player: SavedPlayer | null;
  onClose: () => void;
  onSave: (id: string, name: string, identity: PlayerIdentity) => void;
  onArchive: (id: string) => void;
  onPreviewSuccess: (soundId: SuccessSoundId) => void;
  onPreviewFailure: (soundId: FailureSoundId) => void;
  onUseAsMyPlayer?: (name: string, identity: PlayerIdentity) => void;
};

export function SavedPlayerEditor({ player, onClose, onSave, onArchive, onPreviewSuccess, onPreviewFailure, onUseAsMyPlayer }: Props) {
  return <PlayerIdentityEditor
    visible={!!player}
    initial={player ? { displayName: player.displayName, identity: normalizePlayerIdentity(player.identity) } : null}
    eyebrow="REMEMBERED PLAYER"
    title={player ? `Customize ${player.displayName}` : 'Customize player'}
    saveLabel="Save on this device"
    onClose={onClose}
    onSave={(name, identity) => { if (player) onSave(player.id, name, identity); }}
    onRemove={player ? () => onArchive(player.id) : undefined}
    removeLabel="Remove remembered name"
    secondaryLabel={onUseAsMyPlayer ? 'Use these choices for my profile' : undefined}
    onSecondary={onUseAsMyPlayer}
    onPreviewSuccess={onPreviewSuccess}
    onPreviewFailure={onPreviewFailure}
  />;
}
