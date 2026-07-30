import { defaultPlayerIdentity, normalizePlayerIdentity, type PlayerIdentity } from './playerIdentity';

export type SavedPlayer = {
  id: string;
  displayName: string;
  linkedUserId: string | null;
  playCount: number;
  lastPlayedAt: string | null;
  sortOrder: number;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
  identity?: PlayerIdentity;
};

export type PlayerSelection = { savedPlayerId?: string; displayName: string };

const cleanName = (displayName: string) => displayName.trim().replace(/\s+/g, ' ');
const isFallbackName = (displayName: string) => /^player\s+\d+$/i.test(displayName);

export function preparePlayerSelections(selections: PlayerSelection[], createId: () => string): PlayerSelection[] {
  return selections.map((selection) => {
    const displayName = cleanName(selection.displayName);
    if (selection.savedPlayerId || !displayName || isFallbackName(displayName)) return selection;
    return { ...selection, savedPlayerId: createId(), displayName };
  });
}

export function activeSavedPlayers(players: SavedPlayer[]) {
  return players
    .filter((player) => !player.archivedAt)
    .sort((left, right) => {
      const recency = (right.lastPlayedAt ?? '').localeCompare(left.lastPlayedAt ?? '');
      return recency || left.sortOrder - right.sortOrder || left.displayName.localeCompare(right.displayName);
    });
}
export function rememberPlayers(
  players: SavedPlayer[],
  selections: PlayerSelection[],
  options: { now: string; createId: () => string },
) {
  const next = players.map((player) => ({ ...player }));

  selections.forEach((selection, selectionIndex) => {
    const displayName = cleanName(selection.displayName);
    if (!displayName || isFallbackName(displayName)) return;

    const existingIndex = selection.savedPlayerId
      ? next.findIndex((player) => player.id === selection.savedPlayerId)
      : -1;

    if (existingIndex >= 0) {
      const existing = next[existingIndex];
      next[existingIndex] = {
        ...existing,
        displayName,
        playCount: existing.playCount + 1,
        lastPlayedAt: options.now,
        archivedAt: null,
        updatedAt: options.now,
      };
      return;
    }

    next.push({
      id: selection.savedPlayerId ?? options.createId(),
      displayName,
      linkedUserId: null,
      playCount: 1,
      lastPlayedAt: options.now,
      sortOrder: selectionIndex,
      archivedAt: null,
      createdAt: options.now,
      updatedAt: options.now,
      identity: defaultPlayerIdentity(next.length),
    });
  });

  return next;
}

export function updateSavedPlayerIdentity(players: SavedPlayer[], id: string, identity: PlayerIdentity, now: string) {
  return players.map((player, index) => player.id === id
    ? { ...player, identity: normalizePlayerIdentity(identity, index), updatedAt: now }
    : player);
}

export function renameSavedPlayer(players: SavedPlayer[], id: string, rawDisplayName: string, now: string) {
  const displayName = cleanName(rawDisplayName);
  if (!displayName || isFallbackName(displayName)) return players;
  return players.map((player) => player.id === id ? { ...player, displayName, updatedAt: now } : player);
}

export function archiveSavedPlayer(players: SavedPlayer[], id: string, now: string) {
  return players.map((player) => player.id === id ? { ...player, archivedAt: now, updatedAt: now } : player);
}
