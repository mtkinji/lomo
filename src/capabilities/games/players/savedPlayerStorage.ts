import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SavedPlayer } from './savedPlayers';
import { normalizePlayerIdentity } from './playerIdentity';

export const SAVED_PLAYER_STORAGE_KEY = 'kwilt-games.saved-players.v1';

export type SavedPlayerStorageAdapter = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

type SavedPlayerDocument = {
  schemaVersion: 1;
  players: SavedPlayer[];
  updatedAt: string;
};

function isSavedPlayer(value: unknown): value is SavedPlayer {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SavedPlayer>;
  return typeof candidate.id === 'string'
    && typeof candidate.displayName === 'string'
    && typeof candidate.playCount === 'number'
    && typeof candidate.sortOrder === 'number'
    && typeof candidate.createdAt === 'string'
    && typeof candidate.updatedAt === 'string';
}

export function createSavedPlayerStorage(adapter: SavedPlayerStorageAdapter) {
  return {
    async load() {
      try {
        const raw = await adapter.getItem(SAVED_PLAYER_STORAGE_KEY);
        if (!raw) return [];
        const document = JSON.parse(raw) as Partial<SavedPlayerDocument>;
        if (document.schemaVersion !== 1 || !Array.isArray(document.players)) return [];
        return document.players.filter(isSavedPlayer).map((player, index) => ({
          ...player,
          identity: normalizePlayerIdentity(player.identity, index),
        }));
      } catch {
        return [];
      }
    },
    async save(players: SavedPlayer[]) {
      const document: SavedPlayerDocument = {
        schemaVersion: 1,
        players,
        updatedAt: new Date().toISOString(),
      };
      await adapter.setItem(SAVED_PLAYER_STORAGE_KEY, JSON.stringify(document));
    },
  };
}

export const savedPlayerStorage = createSavedPlayerStorage(AsyncStorage);
