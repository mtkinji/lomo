import type { NavigationState } from '@react-navigation/native';

type RootRouteName = 'MainTabs' | 'Agent' | 'ArcsStack' | 'Settings' | 'DevTools';

export function getAllowedPersistedRootRoutes(showDevTools: boolean): RootRouteName[] {
  return [
    'MainTabs',
    'Agent',
    'ArcsStack',
    'Settings',
    ...(showDevTools ? (['DevTools'] as const) : []),
  ];
}

export function shouldRestoreNavigationState(
  state: NavigationState | undefined,
  options: { showDevTools: boolean },
): boolean {
  const allowedRootRoutes = getAllowedPersistedRootRoutes(options.showDevTools);

  return Boolean(
    state?.routes &&
      state.routes.every((route) => allowedRootRoutes.includes(route.name as RootRouteName)),
  );
}
