import { useCallback, useEffect, useRef, useState } from 'react';

import { sharedHomeCache, type SharedHomeCacheSnapshot } from './sharedHomeCache';
import {
  getSharedHomeRepository,
  type SharedHomeRepository,
} from './sharedHomeRepository';
import type { SharedHomeDelivery } from './sharedHomeTypes';

type SharedHomeCache = {
  load(userId: string): Promise<SharedHomeCacheSnapshot | null>;
  save(userId: string, items: SharedHomeDelivery[]): Promise<void>;
  remove(userId: string): Promise<void>;
};

type Dependencies = {
  repository: SharedHomeRepository;
  cache: SharedHomeCache;
};

export type SharedHomeFeedState = {
  items: SharedHomeDelivery[];
  loading: boolean;
  refreshing: boolean;
  stale: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useSharedHomeFeed(
  userId: string | null | undefined,
  dependencies?: Dependencies,
): SharedHomeFeedState {
  const defaultsRef = useRef<Dependencies | null>(null);
  if (!dependencies && !defaultsRef.current) {
    defaultsRef.current = {
      repository: getSharedHomeRepository(),
      cache: sharedHomeCache,
    };
  }
  const { repository, cache } = dependencies ?? defaultsRef.current!;
  const [items, setItems] = useState<SharedHomeDelivery[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [refreshing, setRefreshing] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const visibleItemCountRef = useRef(0);
  const previousUserIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const fresh = await repository.list();
      visibleItemCountRef.current = fresh.length;
      setItems(fresh);
      setStale(false);
      setError(null);
      await cache.save(userId, fresh).catch(() => undefined);
    } catch {
      setStale(visibleItemCountRef.current > 0);
      setError('Shared activity could not be refreshed.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [cache, repository, userId]);

  useEffect(() => {
    let active = true;
    const previousUserId = previousUserIdRef.current;
    if (previousUserId && previousUserId !== userId) {
      void cache.remove(previousUserId).catch(() => undefined);
    }
    previousUserIdRef.current = userId ?? null;
    visibleItemCountRef.current = 0;
    setItems([]);
    setError(null);
    setStale(false);
    setLoading(Boolean(userId));
    if (!userId) return () => { active = false; };

    void (async () => {
      const snapshot = await cache.load(userId);
      if (!active) return;
      if (snapshot) {
        visibleItemCountRef.current = snapshot.items.length;
        setItems(snapshot.items);
        setLoading(false);
      }
      await refresh();
    })();

    const stop = repository.subscribe(userId, () => { void refresh(); });
    return () => {
      active = false;
      void stop();
    };
  }, [cache, refresh, repository, userId]);

  return { items, loading, refreshing, stale, error, refresh };
}
