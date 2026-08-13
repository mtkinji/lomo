import { Linking } from 'react-native';
import { buildApprovedAffiliateProductSearch, getOnlineRetailerRuntimePolicies, openAffiliateProductSearch } from './affiliateRetailerProvider';

jest.mock('../../../services/affiliateLinks', () => ({ buildAffiliateRetailerSearchUrl: jest.fn(() => 'https://amazon.com/s?k=milk&tag=kwilt-20'), buildApprovedWalmartAffiliateSearchUrl: jest.fn(() => 'https://goto.walmart.example/search/milk') }));
jest.mock('../../../utils/getEnv', () => ({ getAmazonMobileAffiliateApproved: jest.fn(() => false), getWalmartAffiliateSurfaceApproved: jest.fn(() => false) }));
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

describe('affiliate retailer provider', () => {
  it('defaults both mobile surfaces to disabled', () => {
    expect(getOnlineRetailerRuntimePolicies().filter((policy) => policy.retailerId === 'amazon' || policy.retailerId === 'walmart')).toEqual([expect.objectContaining({ approvedSurface: false }), expect.objectContaining({ approvedSurface: false })]);
    expect(buildApprovedAffiliateProductSearch('amazon', 'milk')).toBe('');
    expect(buildApprovedAffiliateProductSearch('walmart', 'milk')).toBe('');
  });

  it('opens only explicitly approved qualifying URLs in the system owner', async () => {
    expect(buildApprovedAffiliateProductSearch('amazon', 'milk', { amazonMobileApproved: true, walmartSurfaceApproved: false })).toContain('tag=kwilt-20');
    expect(buildApprovedAffiliateProductSearch('walmart', 'milk', { amazonMobileApproved: false, walmartSurfaceApproved: true })).toContain('goto.walmart.example');
    await expect(openAffiliateProductSearch('amazon', 'milk')).resolves.toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
