export const PRO_CAPABILITIES = [
  'money_budgets',
  'advanced_screen_time_rules',
  'family_screen_time',
  'advanced_cloud_ai',
  'ai_attachment_analysis',
  'ai_scheduling',
  'background_ai',
  'external_agent',
] as const;

export type ProCapability = (typeof PRO_CAPABILITIES)[number];

export const PRO_PAYWALL_REASONS = {
  money_budgets: 'pro_money_budgets',
  advanced_screen_time_rules: 'pro_advanced_screen_time_rules',
  family_screen_time: 'pro_family_screen_time',
  advanced_cloud_ai: 'pro_advanced_cloud_ai',
  ai_attachment_analysis: 'pro_ai_attachment_analysis',
  ai_scheduling: 'pro_ai_scheduling',
  background_ai: 'pro_background_ai',
  external_agent: 'pro_external_agent',
} as const satisfies Record<ProCapability, string>;

export type ProPaywallReason = (typeof PRO_PAYWALL_REASONS)[ProCapability];

export function isProCapability(value: string): value is ProCapability {
  return (PRO_CAPABILITIES as readonly string[]).includes(value);
}

export function getPaywallReasonForCapability(capability: ProCapability): ProPaywallReason {
  return PRO_PAYWALL_REASONS[capability];
}

export function decideProAccess(
  capability: ProCapability,
  isPro: boolean,
): { allowed: true } | { allowed: false; reason: ProPaywallReason } {
  return isPro ? { allowed: true } : { allowed: false, reason: getPaywallReasonForCapability(capability) };
}

export type DowngradeAction =
  | 'read'
  | 'disable'
  | 'delete'
  | 'release'
  | 'cleanup'
  | 'data_export'
  | 'manage_subscription'
  | 'create_or_tighten';

export function classifyDowngradeAction(
  action: DowngradeAction,
): 'always_allowed' | 'requires_pro' {
  return action === 'create_or_tighten' ? 'requires_pro' : 'always_allowed';
}
