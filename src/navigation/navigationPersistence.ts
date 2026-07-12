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

export async function resolvePersistedNavigationState(
  savedStatePromise: Promise<string | null>,
  options: { showDevTools: boolean; timeoutMs: number },
): Promise<NavigationState | undefined> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timeoutId = setTimeout(() => resolve(null), options.timeoutMs);
  });

  try {
    const savedStateString = await Promise.race([savedStatePromise, timeout]);
    if (!savedStateString) return undefined;

    const state = JSON.parse(savedStateString) as NavigationState;
    return shouldRestoreNavigationState(state, options) ? state : undefined;
  } finally {
    if (timeoutId !== undefined) clearTimeout(timeoutId);
  }
}
