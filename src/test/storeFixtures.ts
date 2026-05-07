import { useAppStore } from '../store/useAppStore';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { usePaywallStore } from '../store/usePaywallStore';
import { useToastStore } from '../store/useToastStore';
import type { Activity, Arc, Goal } from '../domain/types';

const FIXED_ISO = '2026-01-01T12:00:00.000Z';

export function arcFixture(overrides: Partial<Arc> = {}): Arc {
  return {
    id: 'arc-1',
    name: 'Arc',
    status: 'active',
    startDate: FIXED_ISO,
    endDate: null,
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    ...overrides,
  };
}

export function goalFixture(overrides: Partial<Goal> = {}): Goal {
  return {
    id: 'goal-1',
    arcId: 'arc-1',
    title: 'Goal',
    status: 'planned',
    forceIntent: {},
    metrics: [],
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    ...overrides,
  };
}

export function activityFixture(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'act-1',
    goalId: 'goal-1',
    title: 'Activity',
    type: 'task',
    tags: [],
    status: 'planned',
    forceActual: {},
    createdAt: FIXED_ISO,
    updatedAt: FIXED_ISO,
    reminderAt: null,
    repeatRule: undefined,
    repeatCustom: undefined,
    scheduledDate: null,
    scheduledAt: null,
    ...overrides,
  } as Activity;
}

/**
 * Reset the major Zustand stores to a clean baseline. Call from `beforeEach`
 * in component/integration tests to avoid cross-test leakage.
 */
export function resetAllStores(): void {
  useAppStore.getState().resetStore();
  useEntitlementsStore.setState({
    isPro: false,
    isProToolsTrial: false,
    lastCheckedAt: null,
    lastSource: null,
    lastError: null,
    isStale: true,
    isRefreshing: false,
    devOverrideIsPro: null,
  });
  usePaywallStore.setState({
    visible: false,
    reason: null,
    source: null,
    lastDismissedAtMs: null,
    lastDismissedReason: null,
    lastDismissedSource: null,
    upsellReason: null,
    upsellSource: null,
    upsellTappedAtMs: null,
  });
  useToastStore.setState({
    id: 0,
    message: '',
    variant: 'default',
    durationMs: 3000,
    actionLabel: undefined,
    actionOnPress: undefined,
    bottomOffset: undefined,
    behaviorDuringSuppression: 'queue',
    suppressionKeys: {},
    queuedToasts: [],
  });
}

/**
 * Convenience helper for tests that exercise Pro vs Free branches.
 */
export function setProEntitlement(isPro: boolean): void {
  useEntitlementsStore.setState({ isPro });
}

/**
 * Seed the app store with a minimal arc/goal/activity tree.
 */
export function seedDomain(params: {
  arcs?: Arc[];
  goals?: Goal[];
  activities?: Activity[];
} = {}): void {
  const { arcs = [], goals = [], activities = [] } = params;
  arcs.forEach((arc) => useAppStore.getState().addArc(arc));
  goals.forEach((goal) => useAppStore.getState().addGoal(goal));
  activities.forEach((activity) => useAppStore.getState().addActivity(activity));
}

export const FIXED_ISO_FOR_TESTS = FIXED_ISO;
