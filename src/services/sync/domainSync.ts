import { InteractionManager } from 'react-native';
import { getSupabaseClient } from '../backend/supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import type { Activity, Arc, Goal } from '../../domain/types';

type DomainTable = 'kwilt_arcs' | 'kwilt_goals' | 'kwilt_activities';

type SyncUser = { userId: string };

type RemoteRow = {
  id: string;
  data: any;
  is_deleted?: boolean | null;
  deleted_at?: string | null;
  updated_at?: string | null;
};

let started = false;
let stopAuthSub: (() => void) | null = null;
let stopDomainSub: (() => void) | null = null;

let activeUser: SyncUser | null = null;
let pushTimeout: ReturnType<typeof setTimeout> | null = null;
let pushInFlight = false;
let suppressNextPush = false;
let disabledReason: string | null = null;

let prevArcIds = new Set<string>();
let prevGoalIds = new Set<string>();
let prevActivityIds = new Set<string>();

const PUSH_DEBOUNCE_MS = 1200;

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
  const { data, error } = await supabase
    .from(table)
    .select('id, data, is_deleted, deleted_at, updated_at')
    .eq('user_id', userId);
  if (error || !Array.isArray(data)) return [];
  return data as any;
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
  const nextActivities = Array.from(nextActivitiesById.values());

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

async function pullAndMerge(user: SyncUser): Promise<void> {
  const [arcs, goals, activities] = await Promise.all([
    fetchRemoteTable('kwilt_arcs', user.userId),
    fetchRemoteTable('kwilt_goals', user.userId),
    fetchRemoteTable('kwilt_activities', user.userId),
  ]);

  applyRemoteMerge({ arcs, goals, activities });
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

function enableForUser(user: SyncUser) {
  activeUser = user;

  // Initialize previous sets from current state so first diff doesn't tombstone everything.
  const state = useAppStore.getState();
  prevArcIds = new Set((state.arcs ?? []).map((a) => a.id));
  prevGoalIds = new Set((state.goals ?? []).map((g) => g.id));
  prevActivityIds = new Set((state.activities ?? []).map((a) => a.id));

  // Pull-on-enable; defer until after interactions so startup stays snappy.
  InteractionManager.runAfterInteractions(() => {
    void pullAndMerge(user).catch(() => undefined);
  });

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
        disable();
        return;
      }
      enableForUser({ userId });
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


