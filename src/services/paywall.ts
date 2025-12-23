import { CommonActions, StackActions } from '@react-navigation/native';
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { usePaywallStore } from '../store/usePaywallStore';

export type PaywallReason =
  | 'limit_goals_per_arc'
  | 'limit_arcs_total'
  | 'generative_quota_exceeded'
  | 'pro_only_unsplash_banners'
  | 'pro_only_calendar_export'
  | 'pro_only_ai_scheduling'
  | 'pro_only_focus_mode';

export type PaywallSource =
  | 'goals_create_manual'
  | 'goals_create_ai'
  | 'goals_draft_adopt'
  | 'ai_chat_goal_adopt'
  | 'arc_banner_sheet'
  | 'activity_focus_mode'
  | 'activity_tags_ai'
  | 'activity_quick_add_ai'
  | 'activity_add_to_calendar'
  | 'arcs_create'
  | 'settings'
  | 'unknown';

/**
 * Centralized paywall entry point.
 *
 * We use a paywall interstitial for context-specific value messaging, then route
 * into Settings as the canonical "purchase control surface" until RevenueCat is wired.
 */
export function openPaywallInterstitial(params: { reason: PaywallReason; source: PaywallSource }) {
  // Preferred UX: open an in-context full-height drawer (no navigation jump).
  try {
    usePaywallStore.getState().open(params);
    return;
  } catch {
    // Fall back to navigation-based paywall if the store isn't available for some reason.
  }

  if (!rootNavigationRef.isReady()) {
    return;
  }

  rootNavigationRef.navigate('Settings', {
    screen: 'SettingsPaywall',
    params,
  });
}

export function openPaywallPurchaseEntry() {
  if (!rootNavigationRef.isReady()) return;
  const params = {
    openPricingDrawer: true,
    openPricingDrawerNonce: Date.now(),
  };

  // Route into Settings as the canonical subscription control surface.
  // If we're already on the subscriptions screen (common when the paywall overlays it),
  // `navigate()` is often a no-op and won't update params. In that case, push a new
  // instance of the screen onto the nested Settings stack so it mounts fresh and
  // can auto-open the plan drawer.
  const activeRoute = getDeepActiveRoute(rootNavigationRef.getRootState());
  if (activeRoute?.name === 'SettingsManageSubscription') {
    rootNavigationRef.dispatch(
      CommonActions.navigate({
        name: 'Settings',
        // Forward a nested action to the Settings stack.
        action: StackActions.push('SettingsManageSubscription', params as any),
      } as any),
    );
    return;
  }

  rootNavigationRef.navigate('Settings', { screen: 'SettingsManageSubscription', params });
}

// Minimal helper to find the currently focused route name across nested navigators.
function getDeepActiveRoute(state: unknown): { name?: string } | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let current: any = state;
  while (current?.routes && typeof current.index === 'number') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const route = current.routes[current.index];
    if (!route) return undefined;
    // Nested navigators attach their state to the route object.
    current = route.state ?? route;
    if (!current?.routes) {
      return route as { name?: string };
    }
  }
  return undefined;
}


