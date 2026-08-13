import type { RetailerRuntimePolicy } from './groceryProviderContracts';

export type AffiliateRetailerApprovalGates = {
  amazonMobileApproved: boolean;
  walmartSurfaceApproved: boolean;
};

const DISABLED_APPROVAL_GATES: AffiliateRetailerApprovalGates = {
  amazonMobileApproved: false,
  walmartSurfaceApproved: false,
};

export function getOnlineRetailerRuntimePolicies(
  gates: AffiliateRetailerApprovalGates = DISABLED_APPROVAL_GATES,
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
