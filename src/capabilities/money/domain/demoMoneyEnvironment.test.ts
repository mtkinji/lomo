import {
  canReadSandboxMoneyData,
  shouldSyncConnectedMoneyActivity,
} from './demoMoneyEnvironment';

describe('demo Money environment', () => {
  it('includes Sandbox rows only in development or for an admin-provisioned demo account', () => {
    expect(canReadSandboxMoneyData({ app_metadata: {} }, false)).toBe(false);
    expect(canReadSandboxMoneyData({ app_metadata: {} }, true)).toBe(true);
    expect(canReadSandboxMoneyData({
      app_metadata: { kwilt_demo_fixture_version: 'review-household-v1' },
    }, false)).toBe(true);
  });

  it('does not call live Plaid sync for a Sandbox-only sample snapshot', () => {
    expect(shouldSyncConnectedMoneyActivity({
      connections: [{ environment: 'sandbox' }],
    })).toBe(false);
    expect(shouldSyncConnectedMoneyActivity({
      connections: [{ environment: 'production' }],
    })).toBe(true);
    expect(shouldSyncConnectedMoneyActivity({ connections: [] })).toBe(true);
  });
});
