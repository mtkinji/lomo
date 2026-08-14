import { Linking } from 'react-native';
import {
  buildApprovedAffiliateProductSearch,
  getAffiliateRetailerLinkDisclosure,
  getOnlineRetailerRuntimePolicies,
  openAffiliateProductSearch,
} from './affiliateRetailerProvider';

const mockGetAmazonAssociatesTag = jest.fn(() => undefined as string | undefined);
const mockGetWalmartAffiliateSearchTemplate = jest.fn(() => undefined as string | undefined);
const mockGetAffiliateRetailerTestingEnabled = jest.fn(() => false);

jest.mock('../../../services/affiliateLinks', () => ({
  buildRetailerSearchUrl: jest.fn((retailer: string) => `https://www.${retailer}.com/search?q=milk`),
  buildAffiliateRetailerSearchUrl: jest.fn(() => 'https://amazon.com/s?k=milk&tag=kwilt-20'),
  buildApprovedWalmartAffiliateSearchUrl: jest.fn(() => 'https://goto.walmart.example/search/milk'),
}));
jest.mock('../../../utils/getEnv', () => ({
  getAmazonAssociatesTag: () => mockGetAmazonAssociatesTag(),
  getAmazonMobileAffiliateApproved: jest.fn(() => false),
  getAffiliateRetailerTestingEnabled: () => mockGetAffiliateRetailerTestingEnabled(),
  getWalmartAffiliateSearchTemplate: () => mockGetWalmartAffiliateSearchTemplate(),
  getWalmartAffiliateSurfaceApproved: jest.fn(() => false),
}));
jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);

describe('affiliate retailer provider', () => {
  beforeEach(() => {
    mockGetAmazonAssociatesTag.mockReturnValue(undefined);
    mockGetWalmartAffiliateSearchTemplate.mockReturnValue(undefined);
    mockGetAffiliateRetailerTestingEnabled.mockReturnValue(false);
  });

  it('makes both retailers actionable with untracked external links in testing mode', () => {
    mockGetAffiliateRetailerTestingEnabled.mockReturnValue(true);

    expect(getOnlineRetailerRuntimePolicies()
      .filter((policy) => policy.retailerId === 'amazon' || policy.retailerId === 'walmart'))
      .toEqual([
        expect.objectContaining({ approvedSurface: true, productEvidence: true }),
        expect.objectContaining({ approvedSurface: true, productEvidence: true }),
      ]);
    expect(buildApprovedAffiliateProductSearch('amazon', 'milk')).toContain('amazon.com');
    expect(buildApprovedAffiliateProductSearch('walmart', 'milk')).toContain('walmart.com');
    expect(getAffiliateRetailerLinkDisclosure('amazon')).toBe('External retailer link');
    expect(getAffiliateRetailerLinkDisclosure('walmart')).toBe('External retailer link');
  });

  it('uses paid-link disclosure only for configured approved affiliate URLs', () => {
    mockGetAmazonAssociatesTag.mockReturnValue('kwiltapp-20');
    mockGetWalmartAffiliateSearchTemplate.mockReturnValue('https://goto.walmart.example/search?q={query}');
    const approvals = { amazonMobileApproved: true, walmartSurfaceApproved: true };

    expect(getAffiliateRetailerLinkDisclosure('amazon', approvals)).toBe('Paid link');
    expect(getAffiliateRetailerLinkDisclosure('walmart', approvals)).toBe('Paid link');
  });

  it('defaults both mobile surfaces to disabled', () => {
    expect(getOnlineRetailerRuntimePolicies().filter((policy) => policy.retailerId === 'amazon' || policy.retailerId === 'walmart')).toEqual([expect.objectContaining({ approvedSurface: false }), expect.objectContaining({ approvedSurface: false })]);
    expect(buildApprovedAffiliateProductSearch('amazon', 'milk')).toBe('');
    expect(buildApprovedAffiliateProductSearch('walmart', 'milk')).toBe('');
  });

  it('requires approval and a qualifying-link configuration before a retailer becomes actionable', () => {
    const approvals = { amazonMobileApproved: true, walmartSurfaceApproved: true };
    expect(getOnlineRetailerRuntimePolicies(approvals)
      .filter((policy) => policy.retailerId === 'amazon' || policy.retailerId === 'walmart'))
      .toEqual([expect.objectContaining({ approvedSurface: false }), expect.objectContaining({ approvedSurface: false })]);

    mockGetAmazonAssociatesTag.mockReturnValue('kwiltapp-20');
    mockGetWalmartAffiliateSearchTemplate.mockReturnValue('https://goto.walmart.example/search?q={query}');
    expect(getOnlineRetailerRuntimePolicies(approvals)
      .filter((policy) => policy.retailerId === 'amazon' || policy.retailerId === 'walmart'))
      .toEqual([expect.objectContaining({ approvedSurface: true }), expect.objectContaining({ approvedSurface: true })]);
  });

  it('opens only explicitly approved qualifying URLs in the system owner', async () => {
    mockGetAmazonAssociatesTag.mockReturnValue('kwiltapp-20');
    mockGetWalmartAffiliateSearchTemplate.mockReturnValue('https://goto.walmart.example/search?q={query}');
    expect(buildApprovedAffiliateProductSearch('amazon', 'milk', { amazonMobileApproved: true, walmartSurfaceApproved: false })).toContain('tag=kwilt-20');
    expect(buildApprovedAffiliateProductSearch('walmart', 'milk', { amazonMobileApproved: false, walmartSurfaceApproved: true })).toContain('goto.walmart.example');
    await expect(openAffiliateProductSearch('amazon', 'milk')).resolves.toBe(false);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });
});
