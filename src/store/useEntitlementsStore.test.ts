const mockGetEntitlements = jest.fn();
const mockIdentifyRevenueCatUser = jest.fn();
const mockPurchaseProSku = jest.fn();
const mockRestorePurchases = jest.fn();

jest.mock('../services/entitlements', () => ({
  getEntitlements: (...args: any[]) => mockGetEntitlements(...args),
  identifyRevenueCatUser: (...args: any[]) => mockIdentifyRevenueCatUser(...args),
  purchaseProSku: (...args: any[]) => mockPurchaseProSku(...args),
  restorePurchases: (...args: any[]) => mockRestorePurchases(...args),
}));

import { useEntitlementsStore } from './useEntitlementsStore';

function proSnapshot(appUserID: string) {
  return {
    isPro: true,
    isProToolsTrial: false,
    checkedAt: '2026-06-05T12:00:00.000Z',
    source: 'revenuecat' as const,
    appUserID,
    isStale: false,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('useEntitlementsStore account identity refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useEntitlementsStore.setState({
      isPro: false,
      isProToolsTrial: false,
      lastCheckedAt: null,
      lastSource: null,
      lastError: null,
      isStale: true,
      isRefreshing: false,
      isIdentifying: false,
      identifiedAppUserID: null,
      lastResolvedAppUserID: null,
      devOverrideIsPro: null,
    });
    mockGetEntitlements.mockResolvedValue({
      isPro: false,
      isProToolsTrial: false,
      checkedAt: '2026-06-05T12:00:00.000Z',
      source: 'revenuecat',
      appUserID: 'user-a',
      isStale: false,
    });
    mockIdentifyRevenueCatUser.mockResolvedValue(proSnapshot('user-a'));
    mockPurchaseProSku.mockResolvedValue(proSnapshot('user-a'));
    mockRestorePurchases.mockResolvedValue(proSnapshot('user-a'));
  });

  it('identifyAndRefresh applies the signed-in user snapshot immediately', async () => {
    const snapshot = await useEntitlementsStore.getState().identifyAndRefresh('user-a');

    expect(mockIdentifyRevenueCatUser).toHaveBeenCalledWith('user-a');
    expect(snapshot.isPro).toBe(true);
    expect(useEntitlementsStore.getState()).toMatchObject({
      isPro: true,
      identifiedAppUserID: 'user-a',
      lastResolvedAppUserID: 'user-a',
      isIdentifying: false,
      isRefreshing: false,
    });
  });

  it('passes the identified app user id through normal forced refreshes', async () => {
    await useEntitlementsStore.getState().identifyAndRefresh('user-a');
    await useEntitlementsStore.getState().refreshEntitlements({ force: true });

    expect(mockGetEntitlements).toHaveBeenCalledWith({
      forceRefresh: true,
      appUserID: 'user-a',
    });
  });

  it('marks the signed-in user resolved when identification fails so the app can proceed', async () => {
    mockIdentifyRevenueCatUser.mockRejectedValueOnce(new Error('network down'));

    const snapshot = await useEntitlementsStore.getState().identifyAndRefresh('user-a');

    expect(snapshot).toMatchObject({
      appUserID: 'user-a',
      isStale: true,
      error: 'network down',
    });
    expect(useEntitlementsStore.getState()).toMatchObject({
      identifiedAppUserID: 'user-a',
      lastResolvedAppUserID: 'user-a',
      isIdentifying: false,
      isRefreshing: false,
      lastError: 'network down',
      isStale: true,
    });
  });

  it('clears visible Pro state on sign-out without restoring purchases', () => {
    useEntitlementsStore.setState({
      isPro: true,
      identifiedAppUserID: 'user-a',
      lastResolvedAppUserID: 'user-a',
    });

    useEntitlementsStore.getState().clearSignedInEntitlements();

    expect(mockRestorePurchases).not.toHaveBeenCalled();
    expect(useEntitlementsStore.getState()).toMatchObject({
      isPro: false,
      identifiedAppUserID: null,
      lastResolvedAppUserID: null,
      isIdentifying: false,
      isRefreshing: false,
    });
  });

  it('passes the identified app user id through manual restore', async () => {
    useEntitlementsStore.setState({ identifiedAppUserID: 'user-a' });

    await useEntitlementsStore.getState().restore();

    expect(mockRestorePurchases).toHaveBeenCalledWith('user-a');
  });

  it('passes the identified app user id through purchases', async () => {
    useEntitlementsStore.setState({ identifiedAppUserID: 'user-a' });

    await useEntitlementsStore.getState().purchase({ plan: 'individual', cadence: 'annual' });

    expect(mockPurchaseProSku).toHaveBeenCalledWith({
      plan: 'individual',
      cadence: 'annual',
      appUserID: 'user-a',
    });
  });

  it('ignores a stale RevenueCat result after switching app user ids', async () => {
    const userA = deferred<ReturnType<typeof proSnapshot>>();
    const userB = deferred<ReturnType<typeof proSnapshot>>();
    mockIdentifyRevenueCatUser.mockImplementation((appUserID: string) => {
      if (appUserID === 'user-a') return userA.promise;
      return userB.promise;
    });

    const first = useEntitlementsStore.getState().identifyAndRefresh('user-a');
    const second = useEntitlementsStore.getState().identifyAndRefresh('user-b');

    userB.resolve(proSnapshot('user-b'));
    await second;
    userA.resolve(proSnapshot('user-a'));
    await first;

    expect(useEntitlementsStore.getState()).toMatchObject({
      isPro: true,
      identifiedAppUserID: 'user-b',
      lastResolvedAppUserID: 'user-b',
    });
  });
});
