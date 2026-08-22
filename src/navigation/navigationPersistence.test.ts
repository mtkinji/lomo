import type { NavigationState } from '@react-navigation/native';

import {
  getAllowedPersistedRootRoutes,
  resolvePersistedNavigationState,
  shouldRestorePersistedNavigationForInitialUrl,
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

  test('lets a cold widget deep link win over the last persisted To-dos route', () => {
    expect(shouldRestorePersistedNavigationForInitialUrl('kwilt://chat?entry=fresh&source=widget')).toBe(false);
    expect(shouldRestorePersistedNavigationForInitialUrl(null)).toBe(true);
  });

  test('allows every registered production drawer route', () => {
    expect(getAllowedPersistedRootRoutes(false)).toEqual([
      'StandaloneFocus',
      'MainTabs',
      'Agent',
      'UnifiedChat',
      'SharedHome',
      'ArcsStack',
      'Money',
      'Explore',
      'Games',
      'Chores',
      'Food',
      'Settings',
    ]);
    expect(
      shouldRestoreNavigationState(
        rootState([
          'StandaloneFocus',
          'MainTabs',
          'Agent',
          'UnifiedChat',
          'SharedHome',
          'ArcsStack',
          'Money',
          'Explore',
          'Games',
          'Chores',
          'Food',
          'Settings',
        ]),
        { showDevTools: false },
      ),
    ).toBe(true);
  });

  test.each(['StandaloneFocus', 'SharedHome', 'Chores'])('restores the %s production root', async (routeName) => {
    const root = nestedState('drawer', routeName, [
      route('StandaloneFocus'),
      route('MainTabs'),
      route('SharedHome'),
      route('Chores'),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;

    expect(restored.routes[restored.index].name).toBe(routeName);
  });

  test('restores the exact Food recipe screen that was open', async () => {
    const food = nestedState('stack', 'RecipeHome', [
      route('RecipeLibrary'),
      route('RecipeHome', undefined, { recipeId: 'recipe-1' }),
    ]);
    const root = nestedState('drawer', 'Food', [
      route('MainTabs'),
      route('Food', food),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredFood = restored.routes[restored.index].state!;

    expect(restored.routes[restored.index].name).toBe('Food');
    expect(restoredFood.routes[restoredFood.index]).toMatchObject({
      name: 'RecipeHome',
      params: { recipeId: 'recipe-1' },
    });
  });

  test('migrates the retired Food home route to Recipes', async () => {
    const food = nestedState('stack', 'FoodHome', [route('FoodHome')]);
    const root = nestedState('drawer', 'Food', [
      route('MainTabs'),
      route('Food', food),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredFood = restored.routes[restored.index].state!;

    expect(restored.routes[restored.index].name).toBe('Food');
    expect(restoredFood.routes[restoredFood.index]).toMatchObject({ name: 'RecipeLibrary' });
    expect(restoredFood.routes.map(({ name }) => name)).not.toContain('FoodHome');
  });

  test('restores a known Money detail route and drops unknown nested routes', async () => {
    const money = nestedState('stack', 'MoneyTransactionDetail', [
      route('MoneySummary'),
      route('LegacyMoneyScreen'),
      route('MoneyTransactionDetail', undefined, { transactionId: 'transaction-1' }),
    ]);
    const root = nestedState('drawer', 'Money', [
      route('MainTabs'),
      route('Money', money),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredMoney = restored.routes[restored.index].state!;
    expect(restored.routes[restored.index].name).toBe('Money');
    expect(restoredMoney.routes[restoredMoney.index]).toMatchObject({
      name: 'MoneyTransactionDetail',
      params: { transactionId: 'transaction-1' },
    });
    expect(restoredMoney.routes.map(({ name }) => name)).not.toContain('LegacyMoneyScreen');
  });

  test('restores the exact Games screen that was open', async () => {
    const games = nestedState('stack', 'GamesRemote', [
      route('GamesShelf'),
      route('GamesRemote', undefined, { sessionId: 'session-1', tableCode: 'ABCD' }),
    ]);
    const root = nestedState('drawer', 'Games', [
      route('MainTabs'),
      route('Explore'),
      route('Games', games),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredGames = restored.routes[restored.index].state!;
    expect(restored.routes[restored.index].name).toBe('Games');
    expect(restoredGames.routes[restoredGames.index]).toMatchObject({
      name: 'GamesRemote',
      params: { sessionId: 'session-1', tableCode: 'ABCD' },
    });
  });

  test('restores the Games Timer utility', async () => {
    const games = nestedState('stack', 'GamesTimer', [
      route('GamesShelf'),
      route('GamesTimer'),
    ]);
    const root = nestedState('drawer', 'Games', [
      route('MainTabs'),
      route('Games', games),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredGames = restored.routes[restored.index].state!;
    expect(restoredGames.routes[restoredGames.index]).toMatchObject({ name: 'GamesTimer' });
  });

  test('restores an in-progress Stitch Five route', async () => {
    const games = nestedState('stack', 'GamesStitchFive', [
      route('GamesShelf'),
      route('GamesStitchFive'),
    ]);
    const root = nestedState('drawer', 'Games', [
      route('MainTabs'),
      route('Games', games),
      route('Settings'),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredGames = restored.routes[restored.index].state!;
    expect(restoredGames.routes[restoredGames.index]).toMatchObject({ name: 'GamesStitchFive' });
  });

  test('restores Explore settings instead of falling back to Settings home', async () => {
    const settings = nestedState('stack', 'SettingsExplore', [
      route('SettingsHome'),
      route('SettingsExplore', undefined, { entrySurface: 'explore-map' }),
    ]);
    const root = nestedState('drawer', 'Settings', [
      route('MainTabs'),
      route('Explore'),
      route('Games'),
      route('Settings', settings),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredSettings = restored.routes[restored.index].state!;
    expect(restoredSettings.routes[restoredSettings.index]).toMatchObject({
      name: 'SettingsExplore',
      params: { entrySurface: 'explore-map' },
    });
  });

  test('restores canonical Budget settings instead of falling back to Settings home', async () => {
    const settings = nestedState('stack', 'SettingsBudget', [
      route('SettingsHome'),
      route('SettingsBudget'),
    ]);
    const root = nestedState('drawer', 'Settings', [
      route('MainTabs'),
      route('Money'),
      route('Settings', settings),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredSettings = restored.routes[restored.index].state!;
    expect(restoredSettings.routes[restoredSettings.index]).toMatchObject({ name: 'SettingsBudget' });
  });

  test('restores the exact child Family Screen Time setup', async () => {
    const settings = nestedState('stack', 'SettingsFamilyScreenTime', [
      route('SettingsHome'),
      route('SettingsHousehold'),
      route('SettingsFamilyScreenTime', undefined, {
        childMembershipId: 'child-1',
        childDisplayName: 'Riley',
      }),
    ]);
    const root = nestedState('drawer', 'Settings', [
      route('MainTabs'),
      route('Settings', settings),
    ]);

    const restored = (await restore(root)) as unknown as TestState;
    const restoredSettings = restored.routes[restored.index].state!;
    expect(restoredSettings.routes[restoredSettings.index]).toMatchObject({
      name: 'SettingsFamilyScreenTime',
      params: { childMembershipId: 'child-1', childDisplayName: 'Riley' },
    });
  });

  test('rejects dev-only DevTools state in production', () => {
    expect(
      shouldRestoreNavigationState(rootState(['MainTabs', 'Agent', 'ArcsStack', 'DevTools', 'Settings']), {
        showDevTools: false,
      }),
    ).toBe(false);
  });

  test('allows development-only lab routes when running a dev build', () => {
    expect(
      shouldRestoreNavigationState(
        rootState([
          'MainTabs',
          'Agent',
          'ArcsStack',
          'DevTools',
          'GuidedOvertureLab',
          'Settings',
        ]),
        { showDevTools: true },
      ),
    ).toBe(true);
  });

  test('rejects the Guided Overture lab route in production', () => {
    expect(
      shouldRestoreNavigationState(rootState(['MainTabs', 'GuidedOvertureLab', 'Settings']), {
        showDevTools: false,
      }),
    ).toBe(false);
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
