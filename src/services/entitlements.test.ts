import AsyncStorage from '@react-native-async-storage/async-storage';

const mockPurchases = {
  configure: jest.fn(),
  getAppUserID: jest.fn(),
  logIn: jest.fn(),
  logOut: jest.fn(),
  getCustomerInfo: jest.fn(),
  restorePurchases: jest.fn(),
  getOfferings: jest.fn(),
  checkTrialOrIntroductoryPriceEligibility: jest.fn(),
  purchasePackage: jest.fn(),
  setLogLevel: jest.fn(),
  LOG_LEVEL: { WARN: 'WARN' },
  INTRO_ELIGIBILITY_STATUS: {
    INTRO_ELIGIBILITY_STATUS_UNKNOWN: 0,
    INTRO_ELIGIBILITY_STATUS_INELIGIBLE: 1,
    INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2,
    INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS: 3,
  },
};

jest.mock('react-native-purchases', () => mockPurchases);

jest.mock('../utils/getEnv', () => ({
  getEnvVar: jest.fn((key: string) => (key === 'revenueCatApiKey' ? 'rc-key' : undefined)),
}));

jest.mock('./proCodesStatus', () => ({
  getProStatus: jest.fn(async () => ({ isPro: false, httpStatus: 200 })),
}));

function customerInfo(
  isPro: boolean,
  appUserID = 'user-a',
  periodType: 'trial' | 'intro' | 'normal' | 'promotional' = 'normal',
) {
  return {
    appUserID,
    originalAppUserId: appUserID,
    entitlements: {
      active: isPro ? { pro: { productIdentifier: 'pro_annual', periodType } } : {},
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
    mockPurchases.getOfferings.mockResolvedValue({ current: { availablePackages: [] } });
    mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({});
    mockPurchases.purchasePackage.mockResolvedValue({ customerInfo: customerInfo(true, 'user-a') });
    const {
      __resetRevenueCatEntitlementsForTests,
      setDevelopmentProStoreOfferState,
    } = require('./entitlements');
    __resetRevenueCatEntitlementsForTests();
    setDevelopmentProStoreOfferState('live');
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

  it('purchases a legacy Money product through the one Kwilt RevenueCat identity', async () => {
    const legacyPackage = {
      product: { identifier: 'kwilt_budget_pro_annual' },
    };
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          { product: { identifier: 'unrelated_product' } },
          legacyPackage,
        ],
      },
    });
    const { purchaseProSku } = require('./entitlements');

    await purchaseProSku({ plan: 'individual', cadence: 'annual', appUserID: 'user-a' });

    expect(mockPurchases.purchasePackage).toHaveBeenCalledWith(legacyPackage);
    expect(mockPurchases.configure).toHaveBeenCalledWith({ apiKey: 'rc-key', appUserID: 'user-a' });
  });

  it('fails closed instead of purchasing the first package when the requested sku is missing', async () => {
    const unrelatedPackage = { product: { identifier: 'pro_monthly' } };
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [unrelatedPackage] },
    });
    const { purchaseProSku, SubscriptionPackagesUnavailableError } = require('./entitlements');

    await expect(
      purchaseProSku({ plan: 'family', cadence: 'annual', appUserID: 'user-a' }),
    ).rejects.toBeInstanceOf(SubscriptionPackagesUnavailableError);
    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
  });

  it('returns the completed RevenueCat trial period on the entitlement snapshot', async () => {
    const selectedPackage = { product: { identifier: 'pro_annual' } };
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [selectedPackage] },
    });
    mockPurchases.purchasePackage.mockResolvedValue({
      customerInfo: customerInfo(true, 'user-a', 'trial'),
    });
    const { purchaseProSku } = require('./entitlements');

    const snapshot = await purchaseProSku({
      plan: 'individual',
      cadence: 'annual',
      appUserID: 'user-a',
    });

    expect(snapshot).toMatchObject({ isPro: true, proPeriodType: 'trial' });
  });
});

describe('RevenueCat Pro store offer snapshot', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    mockPurchases.getAppUserID.mockResolvedValue('user-a');
    mockPurchases.getCustomerInfo.mockResolvedValue(customerInfo(false, 'user-a'));
    mockPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [
          {
            product: {
              identifier: 'pro_monthly',
              price: 9.99,
              priceString: '$9.99',
              currencyCode: 'USD',
              introPrice: {
                priceString: '$0.00',
                type: 'FREE_TRIAL',
                cycles: 1,
                periodUnit: 'MONTH',
                periodNumberOfUnits: 1,
              },
            },
          },
        ],
      },
    });
    const {
      __resetRevenueCatEntitlementsForTests,
      setDevelopmentProStoreOfferState,
    } = require('./entitlements');
    __resetRevenueCatEntitlementsForTests();
    setDevelopmentProStoreOfferState('live');
  });

  it.each([
    [2, 'eligible'],
    [1, 'ineligible'],
    [0, 'unknown'],
    [3, 'no_offer'],
  ] as const)('normalizes RevenueCat eligibility %s to %s', async (status, expected) => {
    mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({
      pro_monthly: { status, description: expected },
    });
    const { getProStoreOfferSnapshot } = require('./entitlements');

    const snapshot = await getProStoreOfferSnapshot('user-a');

    expect(snapshot.status).toBe('ready');
    expect(snapshot.products.pro_monthly).toMatchObject({
      sku: 'pro_monthly',
      price: 9.99,
      priceString: '$9.99',
      currencyCode: 'USD',
      introEligibility: expected,
      introPrice: {
        type: 'FREE_TRIAL',
        periodUnit: 'MONTH',
        periodNumberOfUnits: 1,
      },
    });
  });

  it('fails eligibility to unknown without suppressing live prices', async () => {
    mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockRejectedValue(
      new Error('eligibility unavailable'),
    );
    const { getProStoreOfferSnapshot } = require('./entitlements');

    const snapshot = await getProStoreOfferSnapshot('user-a');

    expect(snapshot.products.pro_monthly).toMatchObject({
      price: 9.99,
      introEligibility: 'unknown',
    });
  });

  it('returns unavailable without fabricated products when no live offering exists', async () => {
    mockPurchases.getOfferings.mockResolvedValue({ current: { availablePackages: [] } });
    const { getProStoreOfferSnapshot } = require('./entitlements');

    await expect(getProStoreOfferSnapshot('user-a')).resolves.toEqual({
      status: 'unavailable',
      products: {},
    });
  });

  it('provides a complete eligible development catalog when explicitly previewing the offer', async () => {
    const { getProStoreOfferSnapshot, setDevelopmentProStoreOfferState } = require('./entitlements');
    setDevelopmentProStoreOfferState('eligible');

    const snapshot = await getProStoreOfferSnapshot('user-a');

    expect(snapshot).toMatchObject({
      status: 'ready',
      source: 'development_fixture',
      products: {
        pro_monthly: {
          price: 9.99,
          priceString: '$9.99',
          introEligibility: 'eligible',
          introPrice: {
            type: 'FREE_TRIAL',
            periodUnit: 'MONTH',
            periodNumberOfUnits: 1,
          },
        },
        pro_annual: { price: 59.99, priceString: '$59.99' },
        pro_family_monthly: { price: 14.99, priceString: '$14.99' },
        pro_family_annual: { price: 79.99, priceString: '$79.99' },
      },
    });
    expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
  });

  it.each([
    ['ineligible', 'ready', 'ineligible'],
    ['unavailable', 'unavailable', undefined],
  ] as const)(
    'supports the %s development offer preview state',
    async (previewState, status, introEligibility) => {
      const { getProStoreOfferSnapshot, setDevelopmentProStoreOfferState } = require('./entitlements');
      setDevelopmentProStoreOfferState(previewState);

      const snapshot = await getProStoreOfferSnapshot('user-a');

      expect(snapshot.status).toBe(status);
      expect(snapshot.source).toBe('development_fixture');
      expect(snapshot.products.pro_monthly?.introEligibility).toBe(introEligibility);
      expect(mockPurchases.getOfferings).not.toHaveBeenCalled();
    },
  );
});

describe('RevenueCat purchase errors', () => {
  it('recognizes only the SDK user-cancelled signal as a neutral cancellation', () => {
    const { isRevenueCatPurchaseCancelled } = require('./entitlements');

    expect(isRevenueCatPurchaseCancelled({ userCancelled: true })).toBe(true);
    expect(isRevenueCatPurchaseCancelled({ userCancelled: false })).toBe(false);
    expect(isRevenueCatPurchaseCancelled({ code: 'PURCHASE_CANCELLED' })).toBe(false);
    expect(isRevenueCatPurchaseCancelled(null)).toBe(false);
  });
});
