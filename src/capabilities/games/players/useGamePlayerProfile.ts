import { useCallback, useEffect, useRef, useState } from 'react';
import { createDefaultGamePlayerProfile, promoteIdentityToProfile, type GamePlayerProfile } from './gamePlayerProfile';
import type { PlayerIdentity } from './playerIdentity';
import { gamePlayerProfileCloud } from './gamePlayerProfileCloud';
import { gamePlayerProfileStorage } from './gamePlayerProfileStorage';

export type GamePlayerProfileStorage = {
  load: (userId: string) => Promise<GamePlayerProfile | null>;
  save: (userId: string, profile: GamePlayerProfile) => Promise<unknown>;
  remove: (userId: string) => Promise<unknown>;
};

export type GamePlayerProfileCloud = {
  load: (userId: string) => Promise<GamePlayerProfile | null>;
  save: (profile: GamePlayerProfile) => Promise<unknown>;
};

type Options = {
  userId: string | null;
  fallbackName: string;
  storage?: GamePlayerProfileStorage;
  cloud?: GamePlayerProfileCloud;
  now?: () => string;
};

const currentTime = () => new Date().toISOString();

export function useGamePlayerProfile({
  userId,
  fallbackName,
  storage = gamePlayerProfileStorage,
  cloud = gamePlayerProfileCloud,
  now = currentTime,
}: Options) {
  const [profile, setProfile] = useState<GamePlayerProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(userId));
  const [syncing, setSyncing] = useState(Boolean(userId));
  const [syncError, setSyncError] = useState<string | null>(null);
  const currentRef = useRef<GamePlayerProfile | null>(null);
  const writeChain = useRef<Promise<unknown>>(Promise.resolve());
  const nowRef = useRef(now);
  nowRef.current = now;

  useEffect(() => {
    let active = true;
    currentRef.current = null;
    setProfile(null);
    setSyncError(null);
    if (!userId) {
      setLoading(false);
      setSyncing(false);
      return () => { active = false; };
    }
    setLoading(true);
    setSyncing(true);
    void storage.load(userId)
      .catch(() => null)
      .then(async (cached) => {
        if (!active) return;
        if (cached?.userId === userId) {
          currentRef.current = cached;
          setProfile(cached);
          setLoading(false);
        }
        try {
          const remote = await cloud.load(userId);
          if (!active) return;
          const resolved = remote ?? cached ?? createDefaultGamePlayerProfile(userId, fallbackName, nowRef.current());
          currentRef.current = resolved;
          setProfile(resolved);
          await storage.save(userId, resolved);
        } catch {
          if (!active) return;
          const resolved = cached ?? createDefaultGamePlayerProfile(userId, fallbackName, nowRef.current());
          currentRef.current = resolved;
          setProfile(resolved);
          setSyncError('Your saved player is available on this device. Account sync will retry next time.');
        } finally {
          if (active) {
            setLoading(false);
            setSyncing(false);
          }
        }
      });
    return () => { active = false; };
  }, [cloud, fallbackName, storage, userId]);

  const save = useCallback((displayName: string, identity: PlayerIdentity) => {
    if (!userId) return;
    const base = currentRef.current?.userId === userId
      ? currentRef.current
      : createDefaultGamePlayerProfile(userId, fallbackName, nowRef.current());
    const next = promoteIdentityToProfile(base, { displayName, identity }, nowRef.current());
    currentRef.current = next;
    setProfile(next);
    setSyncError(null);
    writeChain.current = writeChain.current.catch(() => undefined).then(async () => {
      await storage.save(userId, next);
      await cloud.save(next);
    }).catch(() => setSyncError('Saved on this device. Account sync will retry next time.'));
  }, [cloud, fallbackName, storage, userId]);

  return {
    profile: profile?.userId === userId ? profile : null,
    loading,
    syncing,
    syncError,
    save,
  };
}
