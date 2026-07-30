import { useCallback, useEffect, useRef, useState } from 'react';
import * as Crypto from 'expo-crypto';
import {
  activeSavedPlayers,
  archiveSavedPlayer,
  preparePlayerSelections,
  rememberPlayers,
  renameSavedPlayer,
  updateSavedPlayerIdentity,
  type PlayerSelection,
  type SavedPlayer,
} from './savedPlayers';
import type { PlayerIdentity } from './playerIdentity';
import { savedPlayerStorage } from './savedPlayerStorage';
import { savedPlayerCloud } from './savedPlayerCloud';
import { mergeSavedPlayers } from './savedPlayerSync';

export type SavedPlayerRosterStorage = {
  load: () => Promise<SavedPlayer[]>;
  save: (players: SavedPlayer[]) => Promise<unknown>;
};

export type SavedPlayerCloud = {
  load: (userId: string) => Promise<SavedPlayer[]>;
  save: (userId: string, players: SavedPlayer[]) => Promise<unknown>;
};

type Options = {
  storage?: SavedPlayerRosterStorage;
  now?: () => string;
  createId?: () => string;
  cloud?: SavedPlayerCloud;
  userId?: string | null;
};

export function useSavedPlayerRoster({
  storage = savedPlayerStorage,
  now = () => new Date().toISOString(),
  createId = () => Crypto.randomUUID(),
  cloud = savedPlayerCloud,
  userId = null,
}: Options = {}) {
  const [allPlayers, setAllPlayers] = useState<SavedPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(Boolean(userId));
  const [syncError, setSyncError] = useState<string | null>(null);
  const playersRef = useRef<SavedPlayer[]>([]);
  const writeChain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    storage.load()
      .catch(() => [])
      .then((players) => {
        if (!active) return;
        playersRef.current = players;
        setAllPlayers(players);
        setLoading(false);
      });
    return () => { active = false; };
  }, [storage]);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      setSyncing(false);
      setSyncError(null);
      return;
    }
    let active = true;
    setSyncing(true);
    setSyncError(null);
    cloud.load(userId)
      .then(async (cloudPlayers) => {
        if (!active) return;
        const merged = mergeSavedPlayers(playersRef.current, cloudPlayers);
        playersRef.current = merged;
        setAllPlayers(merged);
        await storage.save(merged);
        await cloud.save(userId, merged);
      })
      .catch(() => {
        if (active) setSyncError('Your players are still saved on this device. Cloud sync will retry next time.');
      })
      .finally(() => {
        if (active) setSyncing(false);
      });
    return () => { active = false; };
  }, [cloud, loading, storage, userId]);

  const commit = useCallback((transform: (players: SavedPlayer[]) => SavedPlayer[]) => {
    const next = transform(playersRef.current);
    playersRef.current = next;
    setAllPlayers(next);
    writeChain.current = writeChain.current
      .catch(() => undefined)
      .then(async () => {
        await storage.save(next);
        if (userId) await cloud.save(userId, next);
      })
      .catch(() => {
        if (userId) setSyncError('Your players are still saved on this device. Cloud sync will retry next time.');
      });
  }, [cloud, storage, userId]);

  const remember = useCallback((selections: PlayerSelection[]) => {
    const prepared = preparePlayerSelections(selections, createId);
    commit((players) => rememberPlayers(players, prepared, { now: now(), createId }));
    return prepared;
  }, [commit, createId, now]);

  const rename = useCallback((id: string, displayName: string) => {
    commit((players) => renameSavedPlayer(players, id, displayName, now()));
  }, [commit, now]);

  const archive = useCallback((id: string) => {
    commit((players) => archiveSavedPlayer(players, id, now()));
  }, [commit, now]);

  const updateIdentity = useCallback((id: string, identity: PlayerIdentity) => {
    commit((players) => updateSavedPlayerIdentity(players, id, identity, now()));
  }, [commit, now]);

  return {
    players: activeSavedPlayers(allPlayers),
    loading,
    syncing,
    syncError,
    remember,
    rename,
    archive,
    updateIdentity,
  };
}
