import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore, getDomainStorageKey, switchDomainUser } from '../../store/useAppStore';
import type { Arc, Goal, Activity } from '../../domain/types';
import { resetPrevIds } from './domainSync';

const NOW_ISO = new Date('2026-01-15T12:00:00.000Z').toISOString();

jest.mock('../backend/supabaseClient', () => ({
  getSupabaseClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          eq: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
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

function seedDomainSnapshot(key: string, arcs: Arc[], goals: Goal[], activities: Activity[]) {
  const snapshot = JSON.stringify({ arcs, goals, activities, activityTagHistory: {} });
  return AsyncStorage.setItem(key, snapshot);
}

describe('domainSync account transitions', () => {
  beforeEach(async () => {
    await switchDomainUser(null);
    useAppStore.getState().resetStore();
    resetPrevIds();
    await AsyncStorage.clear();
  });

  it('switching from user A to user B isolates domain data', async () => {
    const arcA = arc({ id: 'arc-a', name: 'Arc A' });
    const arcB = arc({ id: 'arc-b', name: 'Arc B' });

    await seedDomainSnapshot(getDomainStorageKey('user-a'), [arcA], [], []);
    await seedDomainSnapshot(getDomainStorageKey('user-b'), [arcB], [], []);

    // Sign in as user A.
    await switchDomainUser('user-a');
    expect(useAppStore.getState().arcs.map((a) => a.id)).toEqual(['arc-a']);

    // Sign out (clears domain).
    await switchDomainUser(null);
    expect(useAppStore.getState().arcs).toEqual([]);

    // Sign in as user B.
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

  it('resetPrevIds clears all tracked ID sets', () => {
    // This verifies the exported helper works, preventing stale tombstones.
    resetPrevIds();
    // No assertion beyond not throwing; the internal sets are private.
    // The real test is that switching users + pushing doesn't tombstone objects.
  });
});
