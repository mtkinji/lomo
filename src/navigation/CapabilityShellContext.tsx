import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import {
  CommonActions,
  useNavigation,
  useNavigationState,
  type NavigationProp,
  type ParamListBase,
} from '@react-navigation/native';
import type { CapabilityId } from '../capabilities/types';
import { resolveCapabilityNavigation } from './capabilityNavigation';
import { CapabilityLifecycleCoordinator } from '../capabilities/lifecycle';
import { useAnalytics } from '../services/analytics/useAnalytics';
import { AnalyticsEvent } from '../services/analytics/events';
import { useCapabilityMenuState } from './CapabilityMenuStateContext';

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
  const { menuOpen, openMenu, coverMenu } = useCapabilityMenuState();
  const { capture } = useAnalytics();
  const lifecycleRef = useRef<CapabilityLifecycleCoordinator | null>(null);
  if (!lifecycleRef.current) {
    lifecycleRef.current = new CapabilityLifecycleCoordinator({
      report: (event) => {
        const analyticsEvent = event.type === 'activated'
          ? AnalyticsEvent.CapabilityActivated
          : event.type === 'deactivated'
            ? AnalyticsEvent.CapabilityDeactivated
            : AnalyticsEvent.CapabilityActivationFailed;
        capture(analyticsEvent, {
          capability_id: event.capabilityId,
          duration_ms: event.durationMs,
          ...('errorName' in event ? { error_name: event.errorName } : null),
        });
      },
    });
  }
  const navigationState = useNavigationState((state) => state as NavigationStateLike);
  const activeCapabilityId = useMemo(
    () => deriveActiveCapabilityId(navigationState),
    [navigationState],
  );

  useEffect(() => {
    const lifecycle = lifecycleRef.current;
    if (!lifecycle) return;
    if (activeCapabilityId) void lifecycle.activate(activeCapabilityId);
    else void lifecycle.deactivate();
    return () => {
      void lifecycle.deactivate();
    };
  }, [activeCapabilityId]);

  const navigateToCapability = useCallback(
    (id: CapabilityId) => {
      const target = resolveCapabilityNavigation(id);
      navigation.dispatch(CommonActions.navigate(target));
      coverMenu();
    },
    [coverMenu, navigation],
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
