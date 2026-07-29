import type { SavedPlayer } from './savedPlayers';

export function mergeSavedPlayers(local: SavedPlayer[], cloud: SavedPlayer[]): SavedPlayer[] {
  const merged = new Map<string, SavedPlayer>();
  [...local, ...cloud].forEach((player) => {
    const current = merged.get(player.id);
    if (!current || player.updatedAt > current.updatedAt) merged.set(player.id, player);
  });
  return [...merged.values()];
}
