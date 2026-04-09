import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useAppStore,
  switchDomainUser,
  getDomainStorageKey,
  DOMAIN_STORAGE_KEY_LEGACY,
} from './useAppStore';
import type { Arc, Goal, Activity } from '../domain/types';

const NOW_ISO = new Date('2026-01-15T12:00:00.000Z').toISOString();

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

function seedDomainSnapshot(key: string, arcs: Arc[], goals: Goal[], activities: Activity[]) {
  const snapshot = JSON.stringify({ arcs, goals, activities, activityTagHistory: {} });
  return AsyncStorage.setItem(key, snapshot);
}

describe('switchDomainUser', () => {
  beforeEach(async () => {
    // Reset domain namespace first so no stale activeDomainUserId pollutes the next test.
    await switchDomainUser(null);
    useAppStore.getState().resetStore();
    await AsyncStorage.clear();
  });

  it('loads domain from user-scoped key', async () => {
    const userA = 'user-aaa';
    const arcA = arc({ id: 'arc-a', name: 'Arc A' });
    const goalA = goal({ id: 'goal-a', arcId: 'arc-a', title: 'Goal A' });
    await seedDomainSnapshot(getDomainStorageKey(userA), [arcA], [goalA], []);

    const hadCache = await switchDomainUser(userA);

    expect(hadCache).toBe(true);
    const state = useAppStore.getState();
    expect(state.domainHydrated).toBe(true);
    expect(state.arcs.map((a) => a.id)).toEqual(['arc-a']);
    expect(state.goals.map((g) => g.id)).toEqual(['goal-a']);
    expect(state.activities).toEqual([]);
  });

  it('migrates legacy key on first sign-in and removes it', async () => {
    const userA = 'user-aaa';
    const arcLegacy = arc({ id: 'arc-legacy', name: 'Legacy Arc' });
    await seedDomainSnapshot(DOMAIN_STORAGE_KEY_LEGACY, [arcLegacy], [], []);

    await switchDomainUser(userA);

    const state = useAppStore.getState();
    expect(state.arcs.map((a) => a.id)).toEqual(['arc-legacy']);
    expect(state.domainHydrated).toBe(true);

    // Legacy key should be removed.
    const legacyVal = await AsyncStorage.getItem(DOMAIN_STORAGE_KEY_LEGACY);
    expect(legacyVal).toBeNull();

    // Scoped key should exist.
    const scopedVal = await AsyncStorage.getItem(getDomainStorageKey(userA));
    expect(scopedVal).not.toBeNull();
  });

  it('leaves domainHydrated false for a user with no local data (awaiting backend pull)', async () => {
    const hadCache = await switchDomainUser('user-new');

    const state = useAppStore.getState();
    expect(hadCache).toBe(false);
    expect(state.domainHydrated).toBe(false);
    expect(state.arcs).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.activities).toEqual([]);
  });

  it('clears domain and sets domainHydrated when userId is null', async () => {
    // First load some data.
    const userA = 'user-aaa';
    const arcA = arc({ id: 'arc-a', name: 'Arc A' });
    await seedDomainSnapshot(getDomainStorageKey(userA), [arcA], [], []);
    await switchDomainUser(userA);
    expect(useAppStore.getState().arcs.length).toBe(1);

    // Switch to null (signed out).
    await switchDomainUser(null);

    const state = useAppStore.getState();
    expect(state.domainHydrated).toBe(true);
    expect(state.arcs).toEqual([]);
    expect(state.goals).toEqual([]);
    expect(state.activities).toEqual([]);
  });

  it('does not cross-contaminate between users', async () => {
    const userA = 'user-aaa';
    const userB = 'user-bbb';
    const arcA = arc({ id: 'arc-a', name: 'Arc A' });
    const arcB = arc({ id: 'arc-b', name: 'Arc B' });
    await seedDomainSnapshot(getDomainStorageKey(userA), [arcA], [], []);
    await seedDomainSnapshot(getDomainStorageKey(userB), [arcB], [], []);

    // Load user A.
    await switchDomainUser(userA);
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-a']);

    // Switch to user B.
    await switchDomainUser(userB);
    const stateB = useAppStore.getState();
    expect(stateB.arcs.map((a) => a.id)).toEqual(['arc-b']);
    // Crucially: A's objects are not present.
    expect(stateB.arcs.find((a) => a.id === 'arc-a')).toBeUndefined();

    // Switch back to A.
    await switchDomainUser(userA);
    const stateA = useAppStore.getState();
    expect(stateA.arcs.map((a) => a.id)).toEqual(['arc-a']);
    expect(stateA.arcs.find((a) => a.id === 'arc-b')).toBeUndefined();
  });

  it('legacy migration only happens for the first user', async () => {
    const userA = 'user-aaa';
    const userB = 'user-bbb';
    const arcLegacy = arc({ id: 'arc-legacy', name: 'Legacy Arc' });
    await seedDomainSnapshot(DOMAIN_STORAGE_KEY_LEGACY, [arcLegacy], [], []);

    // First user claims legacy data.
    await switchDomainUser(userA);
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-legacy']);

    // Switch to user B -- legacy key is gone, so B starts with no cache.
    const hadCache = await switchDomainUser(userB);
    expect(hadCache).toBe(false);
    expect(useAppStore.getState().arcs).toEqual([]);
  });

  it('prefers scoped key over legacy key when both exist', async () => {
    const userA = 'user-aaa';
    const arcScoped = arc({ id: 'arc-scoped', name: 'Scoped Arc' });
    const arcLegacy = arc({ id: 'arc-legacy', name: 'Legacy Arc' });
    await seedDomainSnapshot(getDomainStorageKey(userA), [arcScoped], [], []);
    await seedDomainSnapshot(DOMAIN_STORAGE_KEY_LEGACY, [arcLegacy], [], []);

    await switchDomainUser(userA);
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-scoped']);

    // Legacy key should NOT have been removed (scoped was found first).
    const legacyVal = await AsyncStorage.getItem(DOMAIN_STORAGE_KEY_LEGACY);
    expect(legacyVal).not.toBeNull();
  });
});
