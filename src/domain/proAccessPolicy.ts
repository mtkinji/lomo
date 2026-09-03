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

export const PRO_UPGRADE_INVITATION = {
  title: 'Check your plan before you spend.',
  body: 'Kwilt Pro keeps your budget current, can pause selected spending apps for a quick review, and includes 1,000 AI credits each month.',
  moreSubtitle: 'A current budget, spending-app check-ins, scheduled and combined Screen Time rules, and 1,000 AI credits each month.',
  benefits: [
    'Keep a monthly budget current with real transactions',
    'Pause selected spending apps until you review the plan',
    'Schedule or combine Screen Time conditions around Focus, daily use, completed steps, and Money',
    'Use 1,000 AI credits each month for planning, scheduling, and file analysis',
  ],
} as const;

const PRO_UPGRADE_INVITATION_WITHOUT_SCREEN_TIME = {
  ...PRO_UPGRADE_INVITATION,
  moreSubtitle: 'A current budget, spending-app check-ins, and 1,000 AI credits each month.',
  benefits: PRO_UPGRADE_INVITATION.benefits.filter((benefit) => !benefit.includes('Screen Time')),
} as const;

export function getProUpgradeInvitation(advancedScreenTimePaywallEnabled: boolean) {
  return advancedScreenTimePaywallEnabled
    ? PRO_UPGRADE_INVITATION
    : PRO_UPGRADE_INVITATION_WITHOUT_SCREEN_TIME;
}

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
