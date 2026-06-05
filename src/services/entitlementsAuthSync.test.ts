import { useAppStore } from '../store/useAppStore';
import { useEntitlementsStore } from '../store/useEntitlementsStore';
import { resetAllStores } from '../test/storeFixtures';
import { resetEntitlementsAuthSyncForTests, startEntitlementsAuthSync } from './entitlementsAuthSync';

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('entitlements auth sync', () => {
  beforeEach(() => {
    jest.useRealTimers();
    resetEntitlementsAuthSyncForTests();
    resetAllStores();
  });

  afterEach(() => {
    resetEntitlementsAuthSyncForTests();
    jest.useRealTimers();
  });

  it('identifies RevenueCat when auth identity appears', async () => {
    const identifyAndRefresh = jest.fn(async () => ({
      isPro: true,
      isProToolsTrial: false,
      checkedAt: '2026-06-05T12:00:00.000Z',
      source: 'revenuecat' as const,
      appUserID: 'user-a',
      isStale: false,
    }));
    useEntitlementsStore.setState({ identifyAndRefresh } as any);

    startEntitlementsAuthSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' });
    await flushPromises();

    expect(identifyAndRefresh).toHaveBeenCalledWith('user-a');
  });

  it('clears prior visible Pro state when switching users', async () => {
    const identifyAndRefresh = jest.fn(async () => ({
      isPro: false,
      isProToolsTrial: false,
      checkedAt: '2026-06-05T12:00:00.000Z',
      source: 'revenuecat' as const,
      appUserID: 'user-b',
      isStale: false,
    }));
    useEntitlementsStore.setState({
      isPro: true,
      identifiedAppUserID: 'user-a',
      lastResolvedAppUserID: 'user-a',
      identifyAndRefresh,
    } as any);

    startEntitlementsAuthSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-b', email: 'b@example.com' });
    await flushPromises();

    expect(useEntitlementsStore.getState().isPro).toBe(false);
    expect(identifyAndRefresh).toHaveBeenCalledWith('user-b');
  });

  it('clears visible entitlement state on sign-out', async () => {
    useEntitlementsStore.setState({
      isPro: true,
      identifiedAppUserID: 'user-a',
      lastResolvedAppUserID: 'user-a',
    });

    startEntitlementsAuthSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' });
    useAppStore.getState().clearAuthIdentity();
    await flushPromises();

    expect(useEntitlementsStore.getState()).toMatchObject({
      isPro: false,
      identifiedAppUserID: null,
      lastResolvedAppUserID: null,
      isIdentifying: false,
      isRefreshing: false,
    });
  });

  it('marks the signed-in user resolved if RevenueCat identification times out', async () => {
    jest.useFakeTimers();
    const identifyAndRefresh = jest.fn(() => new Promise(() => undefined));
    useEntitlementsStore.setState({
      identifyAndRefresh,
      isIdentifying: true,
      isRefreshing: true,
    } as any);

    startEntitlementsAuthSync();
    useAppStore.getState().setAuthIdentity({ userId: 'user-a', email: 'a@example.com' });
    await flushPromises();

    jest.advanceTimersByTime(8_000);
    await flushPromises();

    expect(useEntitlementsStore.getState()).toMatchObject({
      lastResolvedAppUserID: 'user-a',
      isIdentifying: false,
      isRefreshing: false,
      isStale: true,
      lastError: 'Timed out while restoring subscription status',
    });
  });
});
