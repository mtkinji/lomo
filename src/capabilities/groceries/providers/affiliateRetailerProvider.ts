import { Linking } from 'react-native';
import { buildAffiliateRetailerSearchUrl, buildApprovedWalmartAffiliateSearchUrl } from '../../../services/affiliateLinks';
import { getAmazonMobileAffiliateApproved, getWalmartAffiliateSurfaceApproved } from '../../../utils/getEnv';
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
): RetailerRuntimePolicy[] {
  return [
    {
      retailerId: 'amazon',
      capability: 'product_links',
      supportedModes: ['pickup', 'delivery'],
      approvedSurface: gates.amazonMobileApproved,
      productEvidence: gates.amazonMobileApproved,
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
      approvedSurface: gates.walmartSurfaceApproved,
      productEvidence: gates.walmartSurfaceApproved,
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

export function buildApprovedAffiliateProductSearch(retailerId: 'amazon' | 'walmart', query: string, gates = getAffiliateRetailerApprovalGates()): string {
  if (retailerId === 'amazon') return gates.amazonMobileApproved ? buildAffiliateRetailerSearchUrl('amazon', query) : '';
  return gates.walmartSurfaceApproved ? buildApprovedWalmartAffiliateSearchUrl(query) : '';
}

export async function openAffiliateProductSearch(retailerId: 'amazon' | 'walmart', query: string): Promise<boolean> {
  const url = buildApprovedAffiliateProductSearch(retailerId, query);
  if (!url) return false;
  await Linking.openURL(url);
  return true;
}
