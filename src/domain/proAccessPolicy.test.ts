import {
  PRO_CAPABILITIES,
  classifyDowngradeAction,
  decideProAccess,
  getPaywallReasonForCapability,
  isProCapability,
} from './proAccessPolicy';

describe('canonical Pro access policy', () => {
  it('contains only the launch-approved paid capabilities', () => {
    expect(PRO_CAPABILITIES).toEqual([
      'money_budgets',
      'advanced_screen_time_rules',
      'family_screen_time',
      'advanced_cloud_ai',
      'ai_attachment_analysis',
      'ai_scheduling',
      'background_ai',
      'external_agent',
    ]);
    expect(isProCapability('cook_mode')).toBe(false);
    expect(isProCapability('live_conversation')).toBe(false);
  });

  it('allows declared paid capabilities only for Pro', () => {
    expect(decideProAccess('money_budgets', false)).toEqual({
      allowed: false,
      reason: 'pro_money_budgets',
    });
    expect(decideProAccess('money_budgets', true)).toEqual({ allowed: true });
  });

  it('maps every capability to a contextual reason', () => {
    for (const capability of PRO_CAPABILITIES) {
      expect(getPaywallReasonForCapability(capability)).toMatch(/^pro_/);
    }
  });

  it('keeps safety-reducing and data-management actions available after downgrade', () => {
    expect(classifyDowngradeAction('read')).toBe('always_allowed');
    expect(classifyDowngradeAction('disable')).toBe('always_allowed');
    expect(classifyDowngradeAction('delete')).toBe('always_allowed');
    expect(classifyDowngradeAction('release')).toBe('always_allowed');
    expect(classifyDowngradeAction('data_export')).toBe('always_allowed');
    expect(classifyDowngradeAction('create_or_tighten')).toBe('requires_pro');
  });
});
