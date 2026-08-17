import { buildAffiliateRetailerSearchUrl, buildApprovedWalmartAffiliateSearchUrl } from './affiliateLinks';

jest.mock('../utils/getEnv', () => ({ getAmazonAssociatesTag: jest.fn(() => 'kwilt-20'), getWalmartAffiliateSearchTemplate: jest.fn(() => 'https://impact.example/campaign/search?q={query}&surface=kwilt') }));

describe('affiliate links', () => {
  it('adds the configured Amazon tag to an Amazon-owned search URL', () => {
    expect(buildAffiliateRetailerSearchUrl('amazon', 'almond milk')).toContain('tag=kwilt-20');
  });

  it('uses only the configured Walmart qualifying-link template', () => {
    expect(buildApprovedWalmartAffiliateSearchUrl('almond milk')).toBe('https://impact.example/campaign/search?q=almond%20milk&surface=kwilt');
  });
});
