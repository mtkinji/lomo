import { Linking } from 'react-native';
import {
  buildAffiliateRetailerSearchUrl,
  buildApprovedWalmartAffiliateSearchUrl,
  buildRetailerSearchUrl,
  withAffiliateTracking,
} from '../../../services/affiliateLinks';
import {
  getAffiliateRetailerTestingEnabled,
  getAmazonAssociatesTag,
  getAmazonMobileAffiliateApproved,
  getWalmartAffiliateSearchTemplate,
  getWalmartAffiliateSurfaceApproved,
} from '../../../utils/getEnv';
import type { RetailerRuntimePolicy } from './groceryProviderContracts';

export type AffiliateRetailerApprovalGates = {
  amazonMobileApproved: boolean;
  walmartSurfaceApproved: boolean;
};

export function getAffiliateRetailerApprovalGates(): AffiliateRetailerApprovalGates {
  return { amazonMobileApproved: getAmazonMobileAffiliateApproved(), walmartSurfaceApproved: getWalmartAffiliateSurfaceApproved() };
}

export function getOnlineRetailerRuntimePolicies(
  gates: AffiliateRetailerApprovalGates = getAffiliateRetailerApprovalGates(),
  testingEnabled = getAffiliateRetailerTestingEnabled(),
): RetailerRuntimePolicy[] {
  const amazonAffiliateReady = gates.amazonMobileApproved && Boolean(getAmazonAssociatesTag()?.trim());
  const walmartAffiliateReady = gates.walmartSurfaceApproved
    && Boolean(getWalmartAffiliateSearchTemplate()?.includes('{query}'));
  const amazonReady = amazonAffiliateReady || testingEnabled;
  const walmartReady = walmartAffiliateReady || testingEnabled;
  return [
    {
      retailerId: 'amazon',
      capability: 'product_links',
      supportedModes: ['pickup', 'delivery'],
      approvedSurface: amazonReady,
      productEvidence: amazonReady,
      cartWrite: false,
    },
    {
      retailerId: 'costco',
      capability: 'remembered_only',
      supportedModes: [],
      approvedSurface: false,
      productEvidence: false,
      cartWrite: false,
    },
    {
      retailerId: 'kroger',
      capability: 'cart_prepare',
      supportedModes: ['pickup'],
      approvedSurface: true,
      productEvidence: true,
      cartWrite: true,
    },
    {
      retailerId: 'walmart',
      capability: 'product_links',
      supportedModes: ['pickup', 'delivery'],
      approvedSurface: walmartReady,
      productEvidence: walmartReady,
      cartWrite: false,
    },
    {
      retailerId: 'other',
      capability: 'remembered_only',
      supportedModes: [],
      approvedSurface: false,
      productEvidence: false,
      cartWrite: false,
    },
  ];
}

export function buildApprovedAffiliateProductSearch(
  retailerId: 'amazon' | 'walmart',
  query: string,
  gates = getAffiliateRetailerApprovalGates(),
  testingEnabled = getAffiliateRetailerTestingEnabled(),
): string {
  if (retailerId === 'amazon') {
    if (gates.amazonMobileApproved && getAmazonAssociatesTag()?.trim()) {
      return buildAffiliateRetailerSearchUrl('amazon', query);
    }
    return testingEnabled ? buildRetailerSearchUrl('amazon', query) : '';
  }
  if (gates.walmartSurfaceApproved && getWalmartAffiliateSearchTemplate()?.includes('{query}')) {
    return buildApprovedWalmartAffiliateSearchUrl(query);
  }
  return testingEnabled ? buildRetailerSearchUrl('walmart', query) : '';
}

export function buildApprovedAffiliateProductDetail(
  retailerId: 'amazon',
  productId: string,
  gates = getAffiliateRetailerApprovalGates(),
  testingEnabled = getAffiliateRetailerTestingEnabled(),
): string {
  if (retailerId !== 'amazon' || !/^[A-Z0-9]{10}$/.test(productId)) return '';
  const url = `https://www.amazon.com/dp/${productId}`;
  if (gates.amazonMobileApproved && getAmazonAssociatesTag()?.trim()) {
    return withAffiliateTracking('amazon', url);
  }
  return testingEnabled ? url : '';
}

export function getAffiliateRetailerLinkDisclosure(
  retailerId: 'amazon' | 'walmart',
  gates = getAffiliateRetailerApprovalGates(),
): 'Paid link' | 'External retailer link' {
  const paid = retailerId === 'amazon'
    ? gates.amazonMobileApproved && Boolean(getAmazonAssociatesTag()?.trim())
    : gates.walmartSurfaceApproved && Boolean(getWalmartAffiliateSearchTemplate()?.includes('{query}'));
  if (paid) return 'Paid link';
  return 'External retailer link';
}

export async function openAffiliateProductSearch(retailerId: 'amazon' | 'walmart', query: string): Promise<boolean> {
  const url = buildApprovedAffiliateProductSearch(retailerId, query);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}

export async function openAffiliateProductDetail(
  retailerId: 'amazon',
  productId: string,
): Promise<boolean> {
  const url = buildApprovedAffiliateProductDetail(retailerId, productId);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}
