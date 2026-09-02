import { getUpgradeResumeDestination, usePaywallStore } from './usePaywallStore';

describe('usePaywallStore upgrade continuity', () => {
  beforeEach(() => {
    usePaywallStore.setState(usePaywallStore.getInitialState(), true);
  });

  it('carries a contextual resume intent through the Upgrade handoff exactly once', () => {
    usePaywallStore.getState().open({
      reason: 'pro_advanced_screen_time_rules',
      source: 'screen_time_add_condition',
      resumeIntent: { kind: 'screen_time_add_condition' },
    });

    usePaywallStore.getState().setUpsellContext({
      reason: 'pro_advanced_screen_time_rules',
      source: 'screen_time_add_condition',
    });
    usePaywallStore.getState().close();

    expect(usePaywallStore.getState().pendingResumeIntent).toMatchObject({
      kind: 'screen_time_add_condition',
    });

    expect(usePaywallStore.getState().completeUpgrade()).toMatchObject({
      kind: 'screen_time_add_condition',
    });
    expect(usePaywallStore.getState().consumeReadyResumeIntent('screen_time_add_condition')).toMatchObject({
      kind: 'screen_time_add_condition',
    });
    expect(usePaywallStore.getState().consumeReadyResumeIntent('screen_time_add_condition')).toBeNull();
  });

  it('drops the resume intent when the contextual paywall is dismissed', () => {
    usePaywallStore.getState().open({
      reason: 'pro_money_budgets',
      source: 'money_onboarding_add_institution',
      resumeIntent: { kind: 'money_connect_account' },
    });

    usePaywallStore.getState().close();

    expect(usePaywallStore.getState().pendingResumeIntent).toBeNull();
    expect(usePaywallStore.getState().completeUpgrade()).toBeNull();
  });

  it('attributes direct Settings and More entries without inventing a paywall reason', () => {
    usePaywallStore.getState().setDirectUpsellContext({ source: 'settings_home' });

    expect(usePaywallStore.getState()).toMatchObject({
      directEntrySource: 'settings_home',
      upsellReason: null,
      upsellSource: null,
      upsellTappedAtMs: expect.any(Number),
    });

    usePaywallStore.getState().setDirectUpsellContext({ source: 'more' });
    expect(usePaywallStore.getState().directEntrySource).toBe('more');
  });

  it('drops a ready resume intent after the attribution window expires', () => {
    const now = Date.now();
    usePaywallStore.setState({
      readyResumeIntent: {
        kind: 'money_connect_account',
        requestedAtMs: now - 31 * 60 * 1000,
      },
    });

    expect(usePaywallStore.getState().consumeReadyResumeIntent('money_connect_account')).toBeNull();
    expect(usePaywallStore.getState().readyResumeIntent).toBeNull();
  });

  it('routes Money back to its capability while keeping Screen Time in its existing stack', () => {
    expect(getUpgradeResumeDestination({
      kind: 'money_connect_account',
      requestedAtMs: Date.now(),
    })).toBe('money');
    expect(getUpgradeResumeDestination({
      kind: 'screen_time_add_condition',
      requestedAtMs: Date.now(),
    })).toBe('previous');
  });
});
