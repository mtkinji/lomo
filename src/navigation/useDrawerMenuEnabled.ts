import { useAppStore } from '../store/useAppStore';
import { useFeatureFlag } from '../services/analytics/useFeatureFlag';

/**
 * Controls whether the UI should expose an explicit "menu" affordance that opens the
 * Root Drawer (left-rail). Bottom tabs remain the baseline, but this keeps the prior
 * navigation paradigm reachable.
 *
 * - In dev: persisted local toggle via `useAppStore`.
 * - In prod: optional PostHog flag (e.g. `nav_drawer_menu`) for experiments.
 */
export function useDrawerMenuEnabled(): boolean {
  const devEnabled = useAppStore((s) => s.devNavDrawerMenuEnabled);
  const posthogEnabled = useFeatureFlag('nav_drawer_menu', false);

  return (__DEV__ && devEnabled) || posthogEnabled;
}


