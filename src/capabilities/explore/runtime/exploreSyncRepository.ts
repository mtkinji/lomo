import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../../services/backend/supabaseClient';
import {
  encodeExploreRecords,
  mergeExploreRecords,
  recordsChangedAfter,
  type ExploreRemoteRecord,
} from '../domain/exploreSync';
import { useExploreStore } from './useExploreStore';

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return 'Explore history could not sync.';
}

function latestServerTime(records: ExploreRemoteRecord[]): string | null {
  return records.map((record) => record.updated_at)
    .filter(Boolean)
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null;
}

export async function syncExploreHistory(
  userId: string,
  client: SupabaseClient = getSupabaseClient(),
): Promise<void> {
  const start = useExploreStore.getState();
  const startRecords = encodeExploreRecords(start, userId);
  const startSignature = JSON.stringify(startRecords);
  const localWrites = recordsChangedAfter(startRecords, start.sync.lastSyncedAt);

  let pullQuery: any = client.from('explore_records')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: true });
  if (start.sync.lastSyncedAt) {
    pullQuery = pullQuery.gt('updated_at', start.sync.lastSyncedAt);
  }
  const pullResult = await pullQuery;
  if (pullResult.error) throw new Error(errorMessage(pullResult.error));
  const pulled = (pullResult.data ?? []) as ExploreRemoteRecord[];

  let returned: ExploreRemoteRecord[] = [];
  if (localWrites.length) {
    const upsertResult = await client.from('explore_records')
      .upsert(localWrites, { onConflict: 'user_id,record_type,record_id' })
      .select('*');
    if (upsertResult.error) throw new Error(errorMessage(upsertResult.error));
    returned = (upsertResult.data ?? []) as ExploreRemoteRecord[];
  }

  const current = useExploreStore.getState();
  const localChangedDuringSync = JSON.stringify(encodeExploreRecords(current, userId)) !== startSignature;
  const merged = mergeExploreRecords(current, [...pulled, ...returned]);
  const serverTime = latestServerTime([...pulled, ...returned]);
  useExploreStore.setState({
    ...merged,
    sync: {
      ...merged.sync,
      lastSyncedAt: localChangedDuringSync
        ? start.sync.lastSyncedAt
        : serverTime ?? start.sync.lastSyncedAt,
    },
    lastPointDecision: current.lastPointDecision,
  });
}
