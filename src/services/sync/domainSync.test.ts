import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore, getDomainStorageKey, switchDomainUser } from '../../store/useAppStore';
import type { Arc, Goal, Activity } from '../../domain/types';
import { resetPrevIds, retryDomainPull, startDomainSync, stopDomainSync } from './domainSync';

const NOW_ISO = new Date('2026-01-15T12:00:00.000Z').toISOString();

type TableName = 'kwilt_arcs' | 'kwilt_goals' | 'kwilt_activities';
type SelectResult = { data: any[] | null; error: any | null };

const mockSelectQueues: Record<TableName, SelectResult[]> = {
  kwilt_arcs: [],
  kwilt_goals: [],
  kwilt_activities: [],
};

const defaultEmptyResult = (): SelectResult => ({ data: [], error: null });

const mockNextSelectResult = (table: TableName): Promise<SelectResult> => {
  const queued = mockSelectQueues[table].shift();
  return Promise.resolve(queued ?? defaultEmptyResult());
};

jest.mock('../backend/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn((table: TableName) => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => mockNextSelectResult(table)),
      })),
      upsert: jest.fn(() => ({
        select: jest.fn(() => ({
          throwOnError: jest.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    })),
  })),
}));

function arc(overrides: Partial<Arc> = {}): Arc {
  return {
    id: 'arc-1',
    name: 'Arc',
    status: 'active',
    startDate: NOW_ISO,
    endDate: null,
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function goal(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    ...overrides,
  };
}

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: NOW_ISO,
    updatedAt: NOW_ISO,
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

function row<T extends { id: string }>(item: T) {
  return {
    id: item.id,
    user_id: 'user-a',
    data: item,
    is_deleted: false,
    deleted_at: null,
    updated_at: item.updatedAt ?? NOW_ISO,
  };
}

function queueRemote(params: {
  arcs?: Arc[];
  goals?: Goal[];
  activities?: Activity[];
  errors?: Partial<Record<TableName, any>>;
}) {
  mockSelectQueues.kwilt_arcs.push({
    data: params.errors?.kwilt_arcs ? null : (params.arcs ?? []).map(row),
    error: params.errors?.kwilt_arcs ?? null,
  });
  mockSelectQueues.kwilt_goals.push({
    data: params.errors?.kwilt_goals ? null : (params.goals ?? []).map(row),
    error: params.errors?.kwilt_goals ?? null,
  });
  mockSelectQueues.kwilt_activities.push({
    data: params.errors?.kwilt_activities ? null : (params.activities ?? []).map(row),
    error: params.errors?.kwilt_activities ?? null,
  });
}

function seedDomainSnapshot(key: string, arcs: Arc[], goals: Goal[], activities: Activity[]) {
  const snapshot = JSON.stringify({ arcs, goals, activities, activityTagHistory: {} });
  return AsyncStorage.setItem(key, snapshot);
}

async function waitForStore(predicate: () => boolean) {
  for (let i = 0; i < 80; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out waiting for store state: ${JSON.stringify(useAppStore.getState())}`);
}

describe('domainSync account transitions', () => {
  beforeEach(async () => {
    stopDomainSync();
    await switchDomainUser(null);
    useAppStore.getState().resetStore();
    useAppStore.getState().clearAuthIdentity();
    resetPrevIds();
    await AsyncStorage.clear();
    mockSelectQueues.kwilt_arcs = [];
    mockSelectQueues.kwilt_goals = [];
    mockSelectQueues.kwilt_activities = [];
  });

  afterEach(() => {
    stopDomainSync();
  });

  it('switching from user A to user B isolates domain data', async () => {
    const arcA = arc({ id: 'arc-a', name: 'Arc A' });
    const arcB = arc({ id: 'arc-b', name: 'Arc B' });

    await seedDomainSnapshot(getDomainStorageKey('user-a'), [arcA], [], []);
    await seedDomainSnapshot(getDomainStorageKey('user-b'), [arcB], [], []);

    await switchDomainUser('user-a');
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-a']);

    await switchDomainUser(null);
    expect(useAppStore.getState().arcs).toEqual([]);

    await switchDomainUser('user-b');
    const stateB = useAppStore.getState();
    expect(stateB.arcs.map((a) => a.id)).toEqual(['arc-b']);
    expect(stateB.arcs.find((a) => a.id === 'arc-a')).toBeUndefined();
  });

  it('full round-trip: A -> out -> B -> out -> A preserves data', async () => {
    const arcA = arc({ id: 'arc-a', name: 'Arc A' });
    const goalA = goal({ id: 'goal-a', arcId: 'arc-a', title: 'Goal A' });
    const arcB = arc({ id: 'arc-b', name: 'Arc B' });

    await seedDomainSnapshot(getDomainStorageKey('user-a'), [arcA], [goalA], []);
    await seedDomainSnapshot(getDomainStorageKey('user-b'), [arcB], [], []);

    await switchDomainUser('user-a');
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-a']);
    expect(useAppStore.getState().goals.map((g) => g.id)).toEqual(['goal-a']);

    await switchDomainUser(null);
    await switchDomainUser('user-b');
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-b']);

    await switchDomainUser(null);
    await switchDomainUser('user-a');
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-a']);
    expect(useAppStore.getState().goals.map((g) => g.id)).toEqual(['goal-a']);
  });

  it('no local cache + remote rows hydrates the store and marks sync ready', async () => {
    const remoteArc = arc({ id: 'remote-arc' });
    const remoteGoal = goal({ id: 'remote-goal', arcId: 'remote-arc' });
    const remoteActivity = activity({ id: 'remote-act', goalId: 'remote-goal' });
    queueRemote({ arcs: [remoteArc], goals: [remoteGoal], activities: [remoteActivity] });

    startDomainSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);

    await waitForStore(() => useAppStore.getState().domainSyncStatus === 'ready');

    const state = useAppStore.getState();
    expect(state.domainHydrated).toBe(true);
    expect(state.domainSyncError).toBeNull();
    expect(state.domainSyncRemoteCounts).toEqual({ arcs: 1, goals: 1, activities: 1 });
    expect(state.arcs.map((a) => a.id)).toEqual(['remote-arc']);
    expect(state.goals.map((g) => g.id)).toEqual(['remote-goal']);
    expect(state.activities.map((a) => a.id)).toEqual(['remote-act']);
  });

  it('no local cache + empty remote tables is a legitimate ready empty account', async () => {
    queueRemote({});

    startDomainSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);

    await waitForStore(() => useAppStore.getState().domainSyncStatus === 'ready');

    const state = useAppStore.getState();
    expect(state.domainHydrated).toBe(true);
    expect(state.domainSyncError).toBeNull();
    expect(state.domainSyncRemoteCounts).toEqual({ arcs: 0, goals: 0, activities: 0 });
    expect(state.arcs).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.activities).toEqual([]);
  });

  it('no local cache + remote table error does not mark empty data as hydrated', async () => {
    for (let i = 0; i < 4; i += 1) {
      queueRemote({ errors: { kwilt_activities: { message: 'RLS denied' } } });
    }

    startDomainSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);

    await waitForStore(() => useAppStore.getState().domainSyncStatus === 'error');

    const state = useAppStore.getState();
    expect(state.domainHydrated).toBe(false);
    expect(state.domainSyncError).toContain('RLS denied');
    expect(state.arcs).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.activities).toEqual([]);
  });

  it('local cache + background remote error keeps cached objects visible and hydrated', async () => {
    const cachedArc = arc({ id: 'cached-arc' });
    await seedDomainSnapshot(getDomainStorageKey('user-a'), [cachedArc], [], []);
    queueRemote({ errors: { kwilt_activities: { message: 'network down' } } });

    startDomainSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);

    await waitForStore(() => useAppStore.getState().domainSyncStatus === 'error');

    const state = useAppStore.getState();
    expect(state.domainHydrated).toBe(true);
    expect(state.domainSyncError).toContain('network down');
    expect(state.arcs.map((a) => a.id)).toEqual(['cached-arc']);
  });

  it('retry succeeds after transient first-pull failures', async () => {
    for (let i = 0; i < 4; i += 1) {
      queueRemote({ errors: { kwilt_activities: { message: 'temporary outage' } } });
    }

    startDomainSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' } as any);
    await waitForStore(() => useAppStore.getState().domainSyncStatus === 'error');

    const recoveredActivity = activity({ id: 'recovered-act' });
    queueRemote({ arcs: [], goals: [], activities: [recoveredActivity] });
    await retryDomainPull();

    const state = useAppStore.getState();
    expect(state.domainSyncStatus).toBe('ready');
    expect(state.domainHydrated).toBe(true);
    expect(state.domainSyncError).toBeNull();
    expect(state.domainSyncRemoteCounts).toEqual({ arcs: 0, goals: 0, activities: 1 });
    expect(state.activities.map((a) => a.id)).toEqual(['recovered-act']);
  });

  it('resetPrevIds clears all tracked ID sets', () => {
    resetPrevIds();
  });
});
