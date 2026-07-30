import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mergePersonalBests,
  personalBestFor,
  recordPersonalBests,
  type PersonalBest,
  type PersonalBestGameKey,
  type PersonalBestOutcome,
} from './personalBests';
import type { PlayerSeat } from './playerSeats';
import { personalBestCloud } from './personalBestCloud';
import { personalBestStorage } from './personalBestStorage';

export type PersonalBestStorage = {
  load: () => Promise<PersonalBest[]>;
  save: (records: PersonalBest[]) => Promise<unknown>;
};

export type PersonalBestCloud = {
  load: (userId: string) => Promise<PersonalBest[]>;
  save: (userId: string, records: PersonalBest[]) => Promise<unknown>;
};

type ScoredSeat = Pick<PlayerSeat, 'profileUserId' | 'savedPlayerId' | 'displayName'> & { score: number };

type Options = {
  storage?: PersonalBestStorage;
  cloud?: PersonalBestCloud;
  userId?: string | null;
  now?: () => string;
};

const currentTime = () => new Date().toISOString();

export function usePersonalBests({
  storage = personalBestStorage,
  cloud = personalBestCloud,
  userId = null,
  now = currentTime,
}: Options = {}) {
  const [records, setRecords] = useState<PersonalBest[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(Boolean(userId));
  const [syncError, setSyncError] = useState<string | null>(null);
  const recordsRef = useRef<PersonalBest[]>([]);
  const writeChain = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    let active = true;
    storage.load().catch(() => []).then((loaded) => {
      if (!active) return;
      recordsRef.current = loaded;
      setRecords(loaded);
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
    cloud.load(userId).then(async (remote) => {
      if (!active) return;
      const merged = mergePersonalBests(recordsRef.current, remote);
      recordsRef.current = merged;
      setRecords(merged);
      await storage.save(merged);
      await cloud.save(userId, merged);
    }).catch(() => {
      if (active) setSyncError('Personal bests are saved on this device. Account sync will retry next time.');
    }).finally(() => {
      if (active) setSyncing(false);
    });
    return () => { active = false; };
  }, [cloud, loading, storage, userId]);

  const persist = useCallback((next: PersonalBest[]) => {
    recordsRef.current = next;
    setRecords(next);
    writeChain.current = writeChain.current.catch(() => undefined).then(async () => {
      await storage.save(next);
      if (userId) await cloud.save(userId, next);
    }).catch(() => {
      if (userId) setSyncError('Personal bests are saved on this device. Account sync will retry next time.');
    });
  }, [cloud, storage, userId]);

  const recordGame = useCallback((gameKey: PersonalBestGameKey, seats: ScoredSeat[]): PersonalBestOutcome[] => {
    const result = recordPersonalBests(recordsRef.current, gameKey, seats, now());
    if (result.records !== recordsRef.current) persist(result.records);
    return result.outcomes;
  }, [now, persist]);

  const bestFor = useCallback((gameKey: PersonalBestGameKey, seat: Pick<PlayerSeat, 'profileUserId' | 'savedPlayerId' | 'displayName'>) => (
    personalBestFor(recordsRef.current, gameKey, seat)
  ), [records]);

  return { records, loading, syncing, syncError, recordGame, bestFor };
}
