import type { NavigationState } from '@react-navigation/native';

import {
  getAllowedPersistedRootRoutes,
  resolvePersistedNavigationState,
  shouldRestoreNavigationState,
} from './navigationPersistence';

function rootState(routeNames: string[]): NavigationState {
  return {
    stale: false,
    type: 'drawer',
    key: 'drawer-test',
    index: 0,
    routeNames,
    routes: routeNames.map((name) => ({ key: `${name}-key`, name })),
  } as NavigationState;
}

type TestState = {
  stale: false;
  type: string;
  key: string;
  index: number;
  routeNames: string[];
  routes: Array<{ key: string; name: string; params?: object; state?: TestState }>;
};

function nestedState(type: string, activeName: string, routes: TestState['routes']): TestState {
  const index = routes.findIndex(({ name }) => name === activeName);
  return {
    stale: false,
    type,
    key: `${type}-test`,
    index: index >= 0 ? index : 0,
    routeNames: routes.map(({ name }) => name),
    routes,
  };
}

function route(name: string, state?: TestState, params?: object) {
  return { key: `${name}-key`, name, state, params };
}

async function restore(state: TestState): Promise<NavigationState | undefined> {
  return resolvePersistedNavigationState(Promise.resolve(JSON.stringify(state)), {
    showDevTools: false,
    timeoutMs: 100,
  });
}

describe('navigationPersistence', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  test('allows every registered production drawer route, including hidden Agent', () => {
    expect(getAllowedPersistedRootRoutes(false)).toEqual([
      'MainTabs',
      'Agent',
      'ArcsStack',
      'Settings',
    ]);
    expect(
      shouldRestoreNavigationState(rootState(['MainTabs', 'Agent', 'ArcsStack', 'Settings']), {
        showDevTools: false,
      }),
    ).toBe(true);
  });

  test('rejects dev-only DevTools state in production', () => {
    expect(
      shouldRestoreNavigationState(rootState(['MainTabs', 'Agent', 'ArcsStack', 'DevTools', 'Settings']), {
        showDevTools: false,
      }),
    ).toBe(false);
  });

  test('allows DevTools when running a dev build', () => {
    expect(
      shouldRestoreNavigationState(rootState(['MainTabs', 'Agent', 'ArcsStack', 'DevTools', 'Settings']), {
        showDevTools: true,
      }),
    ).toBe(true);
  });

  test('restores an existing v4 tab state with a nested To-do detail', async () => {
    const activities = nestedState('stack', 'ActivityDetail', [
      route('ActivitiesList'),
      route('ActivityDetail', undefined, { activityId: 'activity-1' }),
    ]);
    const tabs = nestedState('tab', 'ActivitiesTab', [
      route('GoalsTab'),
      route('ActivitiesTab', activities),
      route('PlanTab'),
      route('MoreTab'),
    ]);
    const root = nestedState('drawer', 'MainTabs', [
      route('MainTabs', tabs),
      route('Agent'),
      route('ArcsStack'),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredTabs = restored.routes[restored.index].state!;
    const restoredActivities = restoredTabs.routes[restoredTabs.index].state!;
    expect(restoredTabs.routes[restoredTabs.index].name).toBe('ActivitiesTab');
    expect(restoredActivities.routes[restoredActivities.index]).toMatchObject({
      name: 'ActivityDetail',
      params: { activityId: 'activity-1' },
    });
  });

  test.each([
    ['Goal detail', 'GoalsTab', 'GoalDetail', { goalId: 'goal-1' }],
    ['Chapter detail', 'MoreTab', 'MoreChapterDetail', { chapterId: 'chapter-1' }],
  ])('preserves an Option G %s return target', async (_label, tabName, screenName, params) => {
    const stack = nestedState('stack', screenName, [
      route(tabName === 'GoalsTab' ? 'GoalsList' : 'MoreHome'),
      route(screenName, undefined, params),
    ]);
    const tabs = nestedState('tab', tabName, [
      route('GoalsTab', tabName === 'GoalsTab' ? stack : undefined),
      route('ActivitiesTab'),
      route('PlanTab'),
      route('MoreTab', tabName === 'MoreTab' ? stack : undefined),
    ]);
    const root = nestedState('drawer', 'MainTabs', [route('MainTabs', tabs), route('Settings')]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredTabs = restored.routes[0].state!;
    const restoredStack = restoredTabs.routes[restoredTabs.index].state!;
    expect(restoredStack.routes[restoredStack.index]).toMatchObject({ name: screenName, params });
  });

  test('falls back to To-dos when the focused persisted tab is unknown', async () => {
    const tabs = nestedState('tab', 'LegacyTab', [
      route('GoalsTab'),
      route('ActivitiesTab'),
      route('PlanTab'),
      route('MoreTab'),
      route('LegacyTab'),
    ]);
    const root = nestedState('drawer', 'MainTabs', [route('MainTabs', tabs), route('Settings')]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredTabs = restored.routes[0].state!;
    expect(restoredTabs.routes[restoredTabs.index].name).toBe('ActivitiesTab');
    expect(restoredTabs.routes.map(({ name }) => name)).not.toContain('LegacyTab');
  });

  test('discards malformed JSON instead of rejecting app startup', async () => {
    await expect(
      resolvePersistedNavigationState(Promise.resolve('{not-json'), {
        showDevTools: false,
        timeoutMs: 100,
      }),
    ).resolves.toBeUndefined();
  });

  test('fails open when persisted navigation storage does not respond', async () => {
    jest.useFakeTimers();
    const neverResponds = new Promise<string | null>(() => undefined);

    const resultPromise = resolvePersistedNavigationState(neverResponds, {
      showDevTools: false,
      timeoutMs: 100,
    });

    await jest.advanceTimersByTimeAsync(100);

    await expect(resultPromise).resolves.toBeUndefined();
  });
});
