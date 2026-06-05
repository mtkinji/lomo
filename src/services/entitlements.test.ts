import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPurchases = {
  configure: jest.fn(),
  getAppUserID: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
  getCustomerInfo: jest.fn(),
  restorePurchases: jest.fn(),
  setLogLevel: jest.fn(),
  LOG_LEVEL: { WARN: 'WARN' },
};

jest.mock('react-native-purchases', () => mockPurchases);

jest.mock('../utils/getEnv', () => ({
  getEnvVar: jest.fn((key: string) => (key === 'revenueCatApiKey' ? 'rc-key' : undefined)),
}));

jest.mock('./proCodesStatus', () => ({
  getProStatus: jest.fn(async () => ({ isPro: false, httpStatus: 200 })),
}));

function customerInfo(isPro: boolean, appUserID = 'user-a') {
  return {
    appUserID,
    originalAppUserId: appUserID,
    entitlements: {
      active: isPro ? { pro: { productIdentifier: 'pro_annual' } } : {},
    },
  };
}

describe('RevenueCat entitlement identity binding', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockPurchases.getAppUserID.mockResolvedValue('$RCAnonymousID:old');
    mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo(false, '$RCAnonymousID:old'));
    mockPurchases.logIn.mockResolvedValue({
      customerInfo: customerInfo(true, 'user-a'),
      created: false,
    });
    mockPurchases.restorePurchases.mockResolvedValue(customerInfo(true, 'user-a'));
    const { __resetRevenueCatEntitlementsForTests } = require('./entitlements');
    __resetRevenueCatEntitlementsForTests();
  });

  it('configures RevenueCat with the signed-in app user id before the SDK is configured', async () => {
    const { identifyRevenueCatUser } = require('./entitlements');

    const snapshot = await identifyRevenueCatUser('user-a');

    expect(mockPurchases.configure).toHaveBeenCalledWith({ apiKey: 'rc-key', appUserID: 'user-a' });
    expect(mockPurchases.logIn).not.toHaveBeenCalled();
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({
      appUserID: 'user-a',
      isPro: false,
      source: 'revenuecat',
    });
  });

  it('logs into RevenueCat when the configured app user id is anonymous or different', async () => {
    const { identifyRevenueCatUser } = require('./entitlements');

    await identifyRevenueCatUser('user-a');
    mockPurchases.getAppUserID.mockResolvedValue('$RCAnonymousID:old');
    const snapshot = await identifyRevenueCatUser('user-a');

    expect(mockPurchases.logIn).toHaveBeenCalledWith('user-a');
    expect(mockPurchases.restorePurchases).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({
      appUserID: 'user-a',
      isPro: true,
      source: 'revenuecat',
    });
  });

  it('does not log in again when RevenueCat already matches the signed-in app user id', async () => {
    const { identifyRevenueCatUser } = require('./entitlements');

    await identifyRevenueCatUser('user-a');
    mockPurchases.getAppUserID.mockResolvedValue('user-a');
    mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo(true, 'user-a'));
    mockPurchases.logIn.mockClear();
    const snapshot = await identifyRevenueCatUser('user-a');

    expect(mockPurchases.logIn).not.toHaveBeenCalled();
    expect(snapshot).toMatchObject({
      appUserID: 'user-a',
      isPro: true,
    });
  });

  it('does not use a cached Pro snapshot from another app user id', async () => {
    const stale = {
      isPro: true,
      isProToolsTrial: false,
      checkedAt: new Date().toISOString(),
      source: 'revenuecat',
      appUserID: 'user-a',
    };
    await AsyncStorage.setItem('kwilt-entitlements-cache-v1', JSON.stringify(stale));

    const { getEntitlements } = require('./entitlements');

    const snapshot = await getEntitlements({ appUserID: 'user-b' });

    expect(snapshot).toMatchObject({
      appUserID: 'user-b',
      isPro: false,
      source: 'revenuecat',
    });
  });

  it('uses a known app user id when safely reading the RevenueCat app user id', async () => {
    mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo(false, 'user-a'));
    const { getRevenueCatAppUserIdSafe } = require('./entitlements');

    const appUserID = await getRevenueCatAppUserIdSafe('user-a');

    expect(mockPurchases.configure).toHaveBeenCalledWith({ apiKey: 'rc-key', appUserID: 'user-a' });
    expect(appUserID).toBe('user-a');
  });

  it('logs into a known app user id when safe RevenueCat id lookup follows anonymous configuration', async () => {
    const { getRevenueCatAppUserIdSafe } = require('./entitlements');

    await getRevenueCatAppUserIdSafe();
    mockPurchases.configure.mockClear();
    mockPurchases.getAppUserID.mockResolvedValue('$RCAnonymousID:old');
    mockPurchases.logIn.mockResolvedValue({
      customerInfo: customerInfo(false, 'user-a'),
      created: false,
    });

    const appUserID = await getRevenueCatAppUserIdSafe('user-a');

    expect(mockPurchases.configure).not.toHaveBeenCalled();
    expect(mockPurchases.logIn).toHaveBeenCalledWith('user-a');
    expect(appUserID).toBe('user-a');
  });

  it('prefers the known app user id over an anonymous original customer id after login', async () => {
    mockPurchases.logIn.mockResolvedValue({
      customerInfo: {
        appUserID: undefined,
        originalAppUserId: '$RCAnonymousID:old',
        entitlements: { active: {} },
      },
      created: false,
    });
    const { getRevenueCatAppUserIdSafe } = require('./entitlements');

    const appUserID = await getRevenueCatAppUserIdSafe('user-a');

    expect(appUserID).toBe('user-a');
  });
});
