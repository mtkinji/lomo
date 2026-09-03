import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { usePaywallStore } from '../store/usePaywallStore';
import type { ProPaywallReason } from '../domain/proAccessPolicy';
import type { PaywallResumeIntentKind } from '../store/usePaywallStore';

export type PaywallReason =
  | 'generative_quota_exceeded'
  | 'ai_quota_exceeded'
  | ProPaywallReason
  | RetiredPaywallReason;

export type RetiredPaywallReason =
  | 'limit_arcs_total'
  | 'limit_goals_per_arc'
  | 'pro_only_unsplash_banners'
  | 'pro_only_calendar_export'
  | 'pro_only_focus_mode'
  | 'pro_only_attachments'
  | 'pro_only_views_filters'
  | 'pro_only_streak_shields'
  | 'pro_only_additional_financial_institution'
  | 'pro_only_ai_scheduling';

const RETIRED_PAYWALL_REASONS: ReadonlySet<PaywallReason> = new Set([
  'limit_arcs_total',
  'limit_goals_per_arc',
  'pro_only_unsplash_banners',
  'pro_only_calendar_export',
  'pro_only_focus_mode',
  'pro_only_attachments',
  'pro_only_views_filters',
  'pro_only_streak_shields',
  'pro_only_additional_financial_institution',
  'pro_only_ai_scheduling',
]);

export function isRetiredPaywallReason(reason: PaywallReason): reason is RetiredPaywallReason {
  return RETIRED_PAYWALL_REASONS.has(reason);
}

export type PaywallSource =
  | 'goals_create_manual'
  | 'goals_create_ai'
  | 'goals_draft_adopt'
  | 'ai_chat_goal_adopt'
  | 'arc_banner_sheet'
  | 'activity_banner_sheet'
  | 'activity_focus_mode'
  | 'focus_widget'
  | 'activity_detail_ai'
  | 'activity_tags_ai'
  | 'activity_quick_add_ai'
  | 'activity_add_to_calendar'
  | 'activity_attachments'
  | 'activity_views'
  | 'activity_filter'
  | 'activity_sort'
  | 'arcs_create'
  | 'onboarding_completion'
  | 'settings'
  | 'streak_break'
  | 'pro_preview_expired'
  | 'activity_empty_state'
  | 'money_onboarding_add_institution'
  | 'money_connect_account'
  | 'money_sync'
  | 'money_mutation'
  | 'screen_time_rule_builder'
  | 'screen_time_add_condition'
  | 'screen_time_family'
  | 'plan_empty_state'
  // Phase 5.2 of docs/chapters-plan.md: Next Steps Arc Nomination CTA for
  // a Free user at their 1-Arc limit. Surfaced on ChapterDetailScreen and
  // routes the user into the paywall interstitial with evidence-anchored
  // copy (see the card's `reason` line) instead of the Arc creation flow.
  | 'chapter_arc_nomination'
  // Phase 6 of docs/chapters-plan.md: Next Steps Goal Nomination CTA for
  // a Free user already at the 3-Goals-per-Arc limit for the suggested
  // Arc. Surfaced on ChapterDetailScreen. (Align suggestions are never
  // gated — they don't create new structure.)
  | 'chapter_goal_nomination'
  | 'unknown';

/**
 * Centralized paywall entry point.
 *
 * We use a paywall interstitial for context-specific value messaging, then route
 * into Settings as the canonical "purchase control surface" until RevenueCat is wired.
 */
export function openPaywallInterstitial(params: {
  reason: PaywallReason;
  source: PaywallSource;
  resumeIntent?: { kind: PaywallResumeIntentKind };
}) {
  // Compatibility boundary: older screens may still ask for a retired paywall,
  // but Free capabilities must never be blocked while those call sites age out.
  if (isRetiredPaywallReason(params.reason)) return;

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
  rootNavigationRef.navigate('ProPlanChooser');
}
