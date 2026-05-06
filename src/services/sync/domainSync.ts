import { InteractionManager } from 'react-native';
import { getSupabaseClient } from '../backend/supabaseClient';
import { useAppStore, switchDomainUser } from '../../store/useAppStore';
import type { Activity, Arc, Goal } from '../../domain/types';
import { normalizeActivity } from '../../domain/normalizeActivity';

type DomainTable = 'kwilt_arcs' | 'kwilt_goals' | 'kwilt_activities';

type SyncUser = { userId: string };

type RemoteRow = {
  id: string;
  data: any;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  updated_at?: string | null;
};

type DomainRemoteCounts = {
  arcs: number;
  goals: number;
  activities: number;
};

type DomainPullResult = {
  counts: DomainRemoteCounts;
};

let started = false;
let stopAuthSub: (() => void) | null = null;
let stopDomainSub: (() => void) | null = null;

let activeUser: SyncUser | null = null;
let pushTimeout: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let suppressNextPush = false;
let disabledReason: string | null = null;

let enableGeneration = 0;

let prevArcIds = new Set<string>();
let prevGoalIds = new Set<string>();
let prevActivityIds = new Set<string>();

export function resetPrevIds(): void {
  prevArcIds = new Set<string>();
  prevGoalIds = new Set<string>();
  prevActivityIds = new Set<string>();
}

const PUSH_DEBOUNCE_MS = 1200;
const IS_JEST = typeof process !== 'undefined' && Boolean((process as any).env?.JEST_WORKER_ID);
const FIRST_PULL_RETRY_DELAYS_MS = IS_JEST ? [1, 1, 1] : [500, 1000, 2000];
const REMOTE_TABLE_FETCH_TIMEOUT_MS = IS_JEST ? 50 : 12000;

function getErrorMessage(e: unknown): string {
  if (!e) return '';
  const anyE = e as any;
  if (typeof anyE?.message === 'string') return anyE.message;
  try {
    return String(e);
  } catch {
    return '';
  }
}

function getConciseSyncError(e: unknown): string {
  const msg = getErrorMessage(e).trim();
  return msg || 'Unable to load your Kwilt records right now.';
}

function maybeDisableIfSchemaCacheMissingTable(e: unknown): boolean {
  const msg = getErrorMessage(e);
  // PostgREST error when the linked Supabase project hasn't had migrations applied
  // (or PostgREST schema cache hasn't reloaded yet).
  const looksLikeMissingTable =
    msg.includes("Could not find the table 'public.kwilt_") && msg.includes('schema cache');

  if (!looksLikeMissingTable) return false;

  if (!disabledReason) {
    disabledReason = msg;
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[domainSync] disabled (missing Supabase tables in PostgREST schema cache). Apply migrations for kwilt_* tables, then restart the app/dev server.',
        msg,
      );
    }
  }

  return true;
}

function parseIsoMs(iso: unknown): number {
  if (typeof iso !== 'string') return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

function lwwPreferRemote(local: { updatedAt?: string } | null, remote: { updatedAt?: string } | null): boolean {
  const localMs = parseIsoMs(local?.updatedAt);
  const remoteMs = parseIsoMs(remote?.updatedAt);
  if (!local) return true;
  if (!remote) return false;
  return remoteMs > localMs;
}

async function fetchRemoteTable(table: DomainTable, userId: string): Promise<RemoteRow[]> {
  const supabase = getSupabaseClient();
  const abortController = createAbortController();
  const queryBase = supabase
    .from(table)
    .select('id, data, is_deleted, deleted_at, updated_at')
    .eq('user_id', userId);
  const query: PromiseLike<{ data: any[] | null; error: any }> =
    abortController && typeof (queryBase as any)?.abortSignal === 'function'
      ? (queryBase as any).abortSignal(abortController.signal)
      : (queryBase as any);
  const { data, error } = await withTimeout(
    query,
    REMOTE_TABLE_FETCH_TIMEOUT_MS,
    `${table}: timed out while loading records`,
    () => abortController?.abort(),
  );
  if (error) {
    throw new Error(`${table}: ${getConciseSyncError(error)}`);
  }
  if (!Array.isArray(data)) {
    throw new Error(`${table}: unexpected response while loading records`);
  }
  return data as any;
}

function createAbortController(): AbortController | null {
  try {
    return typeof AbortController === 'undefined' ? null : new AbortController();
  } catch {
    return null;
  }
}

function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  message: string,
  onTimeout?: () => void,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      onTimeout?.();
      reject(new Error(message));
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

function applyRemoteMerge(params: {
  arcs: RemoteRow[];
  goals: RemoteRow[];
  activities: RemoteRow[];
}) {
  const nowIso = new Date().toISOString();

  const state = useAppStore.getState();
  const localArcs = state.arcs ?? [];
  const localGoals = state.goals ?? [];
  const localActivities = state.activities ?? [];

  const nextArcsById = new Map(localArcs.map((a) => [a.id, a]));
  const nextGoalsById = new Map(localGoals.map((g) => [g.id, g]));
  const nextActivitiesById = new Map(localActivities.map((a) => [a.id, a]));

  const applyRows = <T extends { id: string; updatedAt: string }>(rows: RemoteRow[], map: Map<string, T>) => {
    for (const row of rows) {
      const id = typeof row?.id === 'string' ? row.id : '';
      if (!id) continue;

      if (row?.is_deleted) {
        map.delete(id);
        continue;
      }

      const remoteObj = row?.data;
      if (!remoteObj || typeof remoteObj !== 'object') continue;
      if (typeof (remoteObj as any).id !== 'string') continue;

      const localObj = map.get(id) ?? null;
      if (lwwPreferRemote(localObj as any, remoteObj as any)) {
        // Trust remote as canonical; patch in an updatedAt if absent so future merges are stable.
        const patched = {
          ...(remoteObj as any),
          updatedAt: typeof (remoteObj as any).updatedAt === 'string' ? (remoteObj as any).updatedAt : nowIso,
        } as T;
        map.set(id, patched);
      }
    }
  };

  applyRows<Arc>(params.arcs, nextArcsById as any);
  applyRows<Goal>(params.goals, nextGoalsById as any);
  applyRows<Activity>(params.activities, nextActivitiesById as any);

  const nextArcs = Array.from(nextArcsById.values());
  const nextGoals = Array.from(nextGoalsById.values());
  const nextActivities = Array.from(nextActivitiesById.values()).map((a) =>
    normalizeActivity({ activity: a, nowIso })
  );

  // Prevent push loops from the merge write itself.
  suppressNextPush = true;
  useAppStore.setState(
    {
      arcs: nextArcs,
      goals: nextGoals,
      activities: nextActivities,
    } as any,
    false,
  );
}

async function pullAndMerge(user: SyncUser): Promise<DomainPullResult> {
  const [arcs, goals, activities] = await Promise.all([
    fetchRemoteTable('kwilt_arcs', user.userId),
    fetchRemoteTable('kwilt_goals', user.userId),
    fetchRemoteTable('kwilt_activities', user.userId),
  ]);

  const alive = (rows: RemoteRow[]) => rows.filter((r) => !r.is_deleted).length;
  const dead = (rows: RemoteRow[]) => rows.filter((r) => r.is_deleted).length;
  const counts = {
    arcs: alive(arcs),
    goals: alive(goals),
    activities: alive(activities),
  };

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(
      `[domainSync] pullAndMerge for ${user.userId.slice(0, 8)}… — ` +
      `arcs: ${counts.arcs} alive / ${dead(arcs)} tombstoned, ` +
      `goals: ${counts.goals} alive / ${dead(goals)} tombstoned, ` +
      `activities: ${counts.activities} alive / ${dead(activities)} tombstoned`,
    );
  }

  applyRemoteMerge({ arcs, goals, activities });
  return { counts };
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pullAndMergeWithRetry(user: SyncUser): Promise<DomainPullResult> {
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= FIRST_PULL_RETRY_DELAYS_MS.length; attempt += 1) {
    try {
      return await pullAndMerge(user);
    } catch (e) {
      lastError = e;
      if (attempt >= FIRST_PULL_RETRY_DELAYS_MS.length) break;
      await wait(FIRST_PULL_RETRY_DELAYS_MS[attempt] ?? 0);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(getConciseSyncError(lastError));
}

function markDomainPullReady(result: DomainPullResult): void {
  useAppStore.setState({
    domainHydrated: true,
    domainSyncStatus: 'ready',
    domainSyncError: null,
    domainSyncRemoteCounts: result.counts,
    domainSyncLastSuccessfulPullAt: new Date().toISOString(),
  } as any);
}

function markDomainPullError(e: unknown, opts: { keepHydrated: boolean }): void {
  const message = getConciseSyncError(e);
  useAppStore.setState({
    domainHydrated: opts.keepHydrated,
    domainSyncStatus: 'error',
    domainSyncError: message,
  } as any);
}

function buildUpsertRows<T extends { id: string }>(user: SyncUser, items: T[], extra?: Record<string, any>) {
  const nowIso = new Date().toISOString();
  return items.map((item) => ({
    user_id: user.userId,
    id: item.id,
    data: item,
    updated_at: nowIso,
    is_deleted: false,
    deleted_at: null,
    ...(extra ?? {}),
  }));
}

function buildTombstones(user: SyncUser, removedIds: string[]) {
  const nowIso = new Date().toISOString();
  return removedIds.map((id) => ({
    user_id: user.userId,
    id,
    data: {},
    updated_at: nowIso,
    is_deleted: true,
    deleted_at: nowIso,
  }));
}

async function pushNow(): Promise<void> {
  const user = activeUser;
  if (!user) return;
  if (disabledReason) return;

  // Only push once domain objects have hydrated from the separate domain storage.
  if (useAppStore.getState().domainHydrated !== true) return;

  if (pushInFlight) return;
  pushInFlight = true;
  try {
    const supabase = getSupabaseClient();
    const state = useAppStore.getState();

    const arcs = state.arcs ?? [];
    const goals = state.goals ?? [];
    const activities = state.activities ?? [];

    const nextArcIds = new Set(arcs.map((a) => a.id));
    const nextGoalIds = new Set(goals.map((g) => g.id));
    const nextActivityIds = new Set(activities.map((a) => a.id));

    const removedArcIds = Array.from(prevArcIds).filter((id) => !nextArcIds.has(id));
    const removedGoalIds = Array.from(prevGoalIds).filter((id) => !nextGoalIds.has(id));
    const removedActivityIds = Array.from(prevActivityIds).filter((id) => !nextActivityIds.has(id));

    prevArcIds = nextArcIds;
    prevGoalIds = nextGoalIds;
    prevActivityIds = nextActivityIds;

    const arcRows = buildUpsertRows(user, arcs);
    const goalRows = buildUpsertRows(user, goals);
    const activityRows = buildUpsertRows(user, activities);

    const arcTombstones = buildTombstones(user, removedArcIds);
    const goalTombstones = buildTombstones(user, removedGoalIds);
    const activityTombstones = buildTombstones(user, removedActivityIds);

    const doUpsert = async (table: DomainTable, rows: any[]) => {
      if (!rows || rows.length === 0) return;
      await supabase.from(table).upsert(rows, { onConflict: 'user_id,id' }).select('id').throwOnError();
    };

    await doUpsert('kwilt_arcs', [...arcRows, ...arcTombstones]);
    await doUpsert('kwilt_goals', [...goalRows, ...goalTombstones]);
    await doUpsert('kwilt_activities', [...activityRows, ...activityTombstones]);
  } catch (e) {
    if (__DEV__) {
      if (maybeDisableIfSchemaCacheMissingTable(e)) return;
      // eslint-disable-next-line no-console
      console.warn('[domainSync] push failed', e);
    }
  } finally {
    pushInFlight = false;
  }
}

function schedulePush(): void {
  if (!activeUser) return;
  if (disabledReason) return;

  if (pushTimeout) clearTimeout(pushTimeout);
  pushTimeout = setTimeout(() => {
    pushTimeout = null;
    void pushNow();
  }, PUSH_DEBOUNCE_MS);
}

async function enableForUser(user: SyncUser): Promise<void> {
  const gen = ++enableGeneration;

  // Stop any in-flight sync for the previous user.
  disable();

  // Load the new user's domain from their scoped AsyncStorage key.
  // Returns true if local cached data was found; false means no cache (fresh user on this device).
  const hadLocalCache = await switchDomainUser(user.userId);

  // Guard against a newer enableForUser call that superseded this one.
  if (gen !== enableGeneration) return;

  activeUser = user;

  // Initialize previous sets from the now-loaded state so first diff doesn't tombstone everything.
  const seedPrevIds = () => {
    const s = useAppStore.getState();
    prevArcIds = new Set((s.arcs ?? []).map((a) => a.id));
    prevGoalIds = new Set((s.goals ?? []).map((g) => g.id));
    prevActivityIds = new Set((s.activities ?? []).map((a) => a.id));
  };
  seedPrevIds();

  if (hadLocalCache) {
    // User has cached data -- show it immediately and refresh from backend in the background.
    InteractionManager.runAfterInteractions(() => {
      if (gen !== enableGeneration) return;
      void pullAndMerge(user)
        .then((result) => {
          if (gen !== enableGeneration) return;
          markDomainPullReady(result);
        })
        .catch((e) => {
          if (gen !== enableGeneration) return;
          markDomainPullError(e, { keepHydrated: true });
        });
    });
  } else {
    // No local cache (e.g. fresh install or second account). Await the backend pull
    // so the UI stays on a loading indicator instead of flashing an empty state.
    try {
      useAppStore.setState({
        domainHydrated: false,
        domainSyncStatus: 'pulling-remote',
        domainSyncError: null,
      } as any);
      const result = await pullAndMergeWithRetry(user);
      if (gen !== enableGeneration) return;
      markDomainPullReady(result);
    } catch (e) {
      if (gen !== enableGeneration) return;
      markDomainPullError(e, { keepHydrated: false });
    }
    seedPrevIds();
  }

  // Subscribe to domain slice changes and push debounced.
  stopDomainSub?.();
  stopDomainSub = useAppStore.subscribe(
    (s) => ({
      arcs: s.arcs,
      goals: s.goals,
      activities: s.activities,
      domainHydrated: s.domainHydrated,
    }),
    (next, prev) => {
      if (!next?.domainHydrated) return;
      if (prev && next.arcs === prev.arcs && next.goals === prev.goals && next.activities === prev.activities) {
        return;
      }
      if (suppressNextPush) {
        suppressNextPush = false;
        return;
      }
      schedulePush();
    },
    { fireImmediately: true } as any,
  );
}

function disable(): void {
  activeUser = null;
  stopDomainSub?.();
  stopDomainSub = null;
  if (pushTimeout) {
    clearTimeout(pushTimeout);
    pushTimeout = null;
  }
  resetPrevIds();
}

export function startDomainSync(): void {
  if (started) return;
  started = true;

  // Auth identity lives in the store (kept in sync by App.tsx).
  stopAuthSub = useAppStore.subscribe(
    (s) => s.authIdentity,
    (identity) => {
      const userId = identity?.userId?.trim() ?? '';
      if (!userId) {
        // Flush outgoing user's domain, then clear local state.
        void switchDomainUser(null).catch(() => undefined);
        disable();
        return;
      }
      void (async () => {
        try {
          await enableForUser({ userId });
        } catch (e) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[domainSync] enableForUser failed', e);
          }
        }
      })();
    },
    { fireImmediately: true } as any,
  );
}

export function stopDomainSync(): void {
  stopAuthSub?.();
  stopAuthSub = null;
  disable();
  started = false;
}

export async function retryDomainPull(): Promise<void> {
  const user = activeUser;
  if (!user) return;

  const gen = enableGeneration;
  useAppStore.setState({
    domainHydrated: false,
    domainSyncStatus: 'pulling-remote',
    domainSyncError: null,
  } as any);

  try {
    const result = await pullAndMergeWithRetry(user);
    if (gen !== enableGeneration) return;
    const s = useAppStore.getState();
    prevArcIds = new Set((s.arcs ?? []).map((a) => a.id));
    prevGoalIds = new Set((s.goals ?? []).map((g) => g.id));
    prevActivityIds = new Set((s.activities ?? []).map((a) => a.id));
    markDomainPullReady(result);
  } catch (e) {
    if (gen !== enableGeneration) return;
    markDomainPullError(e, { keepHydrated: false });
  }
}

/**
 * Check if a user has any existing synced data (Arcs, Goals, or Activities).
 * Used to determine if this is a returning user on a fresh install.
 */
export async function checkUserHasSyncedData(userId: string): Promise<boolean> {
  try {
    const supabase = getSupabaseClient();
    
    // Check for any non-deleted arcs first (most likely to exist)
    const { data: arcs, error: arcsError } = await supabase
      .from('kwilt_arcs')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .limit(1);
    
    if (!arcsError && arcs && arcs.length > 0) {
      return true;
    }

    // Check for goals
    const { data: goals, error: goalsError } = await supabase
      .from('kwilt_goals')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .limit(1);
    
    if (!goalsError && goals && goals.length > 0) {
      return true;
    }

    // Check for activities
    const { data: activities, error: activitiesError } = await supabase
      .from('kwilt_activities')
      .select('id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .limit(1);
    
    if (!activitiesError && activities && activities.length > 0) {
      return true;
    }

    return false;
  } catch (e) {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn('[domainSync] checkUserHasSyncedData failed', e);
    }
    // On error, assume new user to avoid blocking onboarding
    return false;
  }
}
