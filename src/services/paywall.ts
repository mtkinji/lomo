import { rootNavigationRef } from '../navigation/rootNavigationRef';

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
  // Route into Settings as the canonical subscription control surface.
  rootNavigationRef.navigate('Settings', { screen: 'SettingsManageSubscription' });
}


