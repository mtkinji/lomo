import type { NavigationState } from '@react-navigation/native';

import { getAllowedPersistedRootRoutes, shouldRestoreNavigationState } from './navigationPersistence';

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

describe('navigationPersistence', () => {
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
});
