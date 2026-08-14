jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        amazonMobileAffiliateApproved: false,
        affiliateRetailerTestingEnabled: false,
        walmartAffiliateSurfaceApproved: false,
      },
    },
  },
}));

import {
  getAmazonAssociatesTag,
  getAmazonMobileAffiliateApproved,
  getAffiliateRetailerTestingEnabled,
  resolveAffiliateRetailerTesting,
  getWalmartAffiliateSearchTemplate,
  getWalmartAffiliateSurfaceApproved,
} from './getEnv';

describe('affiliate retailer environment', () => {
  const keys = [
    'EXPO_PUBLIC_AMAZON_ASSOCIATES_TAG',
    'EXPO_PUBLIC_AMAZON_MOBILE_AFFILIATE_APPROVED',
    'EXPO_PUBLIC_AFFILIATE_RETAILER_TESTING',
    'EXPO_PUBLIC_WALMART_AFFILIATE_SEARCH_TEMPLATE',
    'EXPO_PUBLIC_WALMART_AFFILIATE_SURFACE_APPROVED',
  ] as const;

  afterEach(() => {
    keys.forEach((key) => { delete process.env[key]; });
  });

  it('enables installed development clients without enabling production by default', () => {
    expect(resolveAffiliateRetailerTesting({
      embedded: false,
      publicValue: undefined,
      development: true,
    })).toBe(true);
    expect(resolveAffiliateRetailerTesting({
      embedded: false,
      publicValue: undefined,
      development: false,
    })).toBe(false);
    expect(resolveAffiliateRetailerTesting({
      embedded: true,
      publicValue: undefined,
      development: false,
    })).toBe(true);
  });

  it('supports Expo public values when a development build embeds disabled defaults', () => {
    process.env.EXPO_PUBLIC_AMAZON_ASSOCIATES_TAG = 'preview-20';
    process.env.EXPO_PUBLIC_AMAZON_MOBILE_AFFILIATE_APPROVED = 'true';
    process.env.EXPO_PUBLIC_AFFILIATE_RETAILER_TESTING = 'true';
    process.env.EXPO_PUBLIC_WALMART_AFFILIATE_SEARCH_TEMPLATE = 'https://example.invalid/search?q={query}';
    process.env.EXPO_PUBLIC_WALMART_AFFILIATE_SURFACE_APPROVED = 'true';

    expect(getAmazonAssociatesTag()).toBe('preview-20');
    expect(getAmazonMobileAffiliateApproved()).toBe(true);
    expect(getAffiliateRetailerTestingEnabled()).toBe(true);
    expect(getWalmartAffiliateSearchTemplate()).toContain('{query}');
    expect(getWalmartAffiliateSurfaceApproved()).toBe(true);
  });
});
