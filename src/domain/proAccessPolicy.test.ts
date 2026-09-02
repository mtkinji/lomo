import {
  PRO_CAPABILITIES,
  PRO_UPGRADE_INVITATION,
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

  it('markets only the current proven upgrade pillars', () => {
    expect(PRO_UPGRADE_INVITATION.title).toBe('Check your plan before you spend.');
    expect(PRO_UPGRADE_INVITATION.body).toContain('pause selected spending apps');
    expect(PRO_UPGRADE_INVITATION.body).toContain('1,000 AI credits');
    expect(PRO_UPGRADE_INVITATION.body).not.toMatch(/power|insights|advanced actions|flexible/i);
    expect(PRO_UPGRADE_INVITATION.body).not.toMatch(/family/i);
    expect(PRO_UPGRADE_INVITATION.benefits).toEqual(expect.arrayContaining([
      expect.stringMatching(/real transactions/i),
      expect.stringMatching(/pause selected spending apps/i),
      expect.stringMatching(/Screen Time conditions/i),
      expect.stringMatching(/1,000 AI credits/i),
    ]));
    expect(PRO_UPGRADE_INVITATION.benefits).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/family/i)]),
    );
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
