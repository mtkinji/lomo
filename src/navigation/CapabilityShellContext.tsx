import { createContext, type ReactNode, useCallback, useContext, useMemo } from 'react';
import {
  CommonActions,
  DrawerActions,
  useNavigation,
  useNavigationState,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import { useDrawerStatus } from '@react-navigation/drawer';
import type { CapabilityId } from '../capabilities/types';
import { resolveCapabilityNavigation } from './capabilityNavigation';

type NavigationStateLike = {
  index?: number;
  routes?: Array<{
    name: string;
    state?: NavigationStateLike;
  }>;
};

function focusedRouteNames(state: NavigationStateLike | undefined): string[] {
  if (!state?.routes?.length) return [];
  const index = typeof state.index === 'number' ? state.index : state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return [];
  return [route.name, ...focusedRouteNames(route.state)];
}

export function deriveActiveCapabilityId(
  state: NavigationStateLike | undefined,
): CapabilityId | null {
  const names = focusedRouteNames(state);
  if (names[0] === 'ArcsStack') return 'arcs';
  if (names[0] !== 'MainTabs') return null;

  const tab = names[1];
  if (tab === 'GoalsTab') return 'goals';
  if (tab === 'ActivitiesTab') return 'todos';
  if (tab === 'PlanTab') return 'plan';
  if (tab !== 'MoreTab') return null;

  const moreSurface = names[2] ?? '';
  if (moreSurface === 'MoreArcs') return 'arcs';
  if (moreSurface.startsWith('MoreChapter')) return 'chapters';
  return null;
}

type CapabilityShellContextValue = {
  menuOpen: boolean;
  activeCapabilityId: CapabilityId | null;
  openMenu: () => void;
  coverMenu: () => void;
  navigateToCapability: (id: CapabilityId) => void;
};

const CapabilityShellContext = createContext<CapabilityShellContextValue | null>(null);

export function CapabilityShellProvider({ children }: { children: ReactNode }) {
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const menuOpen = useDrawerStatus() === 'open';
  const navigationState = useNavigationState((state) => state as NavigationStateLike);
  const activeCapabilityId = useMemo(
    () => deriveActiveCapabilityId(navigationState),
    [navigationState],
  );

  const openMenu = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const coverMenu = useCallback(() => {
    navigation.dispatch(DrawerActions.closeDrawer());
  }, [navigation]);

  const navigateToCapability = useCallback(
    (id: CapabilityId) => {
      const target = resolveCapabilityNavigation(id);
      navigation.dispatch(CommonActions.navigate(target));
      navigation.dispatch(DrawerActions.closeDrawer());
    },
    [navigation],
  );

  const value = useMemo<CapabilityShellContextValue>(
    () => ({ menuOpen, activeCapabilityId, openMenu, coverMenu, navigateToCapability }),
    [activeCapabilityId, coverMenu, menuOpen, navigateToCapability, openMenu],
  );

  return <CapabilityShellContext.Provider value={value}>{children}</CapabilityShellContext.Provider>;
}

export function useCapabilityShell(): CapabilityShellContextValue {
  const value = useContext(CapabilityShellContext);
  if (!value) {
    throw new Error('useCapabilityShell must be used within CapabilityShellProvider');
  }
  return value;
}

export function useCapabilityShellOptional(): CapabilityShellContextValue | null {
  return useContext(CapabilityShellContext);
}
