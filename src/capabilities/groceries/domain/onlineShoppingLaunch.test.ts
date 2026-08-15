import { resolveOnlineShoppingLaunch } from './onlineShoppingLaunch';
import type { RetailerRuntimePolicy } from '../providers/groceryProviderContracts';

const amazonPolicy: RetailerRuntimePolicy = {
  retailerId: 'amazon',
  capability: 'product_links',
  supportedModes: ['pickup', 'delivery'],
  approvedSurface: true,
  productEvidence: true,
  cartWrite: false,
};

const walmartPolicy: RetailerRuntimePolicy = {
  retailerId: 'walmart',
  capability: 'product_links',
  supportedModes: ['pickup', 'delivery'],
  approvedSurface: true,
  productEvidence: true,
  cartWrite: false,
};

describe('resolveOnlineShoppingLaunch', () => {
  it('goes directly to Amazon preparation when Amazon is the first executable preference', () => {
    expect(resolveOnlineShoppingLaunch({
      listId: 'list-1',
      preferences: {
        schemaVersion: 1,
        defaultFulfillment: 'pickup',
        homePostalCode: null,
        savedAt: '2026-08-14T12:00:00.000Z',
        retailers: [
          { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: null },
          { id: 'walmart', enabled: true, rank: 2, label: 'Walmart', membershipConfirmed: null },
        ],
      },
      policies: [amazonPolicy, walmartPolicy],
      preferredStore: null,
    })).toEqual({
      screen: 'RetailerLinkShopping',
      params: { listId: 'list-1', retailerId: 'amazon' },
    });
  });

  it('keeps the order overview for non-Amazon primary destinations', () => {
    expect(resolveOnlineShoppingLaunch({
      listId: 'list-1',
      preferences: {
        schemaVersion: 1,
        defaultFulfillment: 'delivery',
        homePostalCode: null,
        savedAt: '2026-08-14T12:00:00.000Z',
        retailers: [
          { id: 'walmart', enabled: true, rank: 1, label: 'Walmart', membershipConfirmed: null },
          { id: 'amazon', enabled: true, rank: 2, label: 'Amazon', membershipConfirmed: null },
        ],
      },
      policies: [amazonPolicy, walmartPolicy],
      preferredStore: null,
    })).toEqual({
      screen: 'OnlineOrder',
      params: { listId: 'list-1' },
    });
  });

  it('does not bypass recovery when Amazon is unavailable', () => {
    expect(resolveOnlineShoppingLaunch({
      listId: 'list-1',
      preferences: {
        schemaVersion: 1,
        defaultFulfillment: 'pickup',
        homePostalCode: null,
        savedAt: '2026-08-14T12:00:00.000Z',
        retailers: [
          { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: null },
        ],
      },
      policies: [{ ...amazonPolicy, approvedSurface: false }],
      preferredStore: null,
    })).toEqual({
      screen: 'OnlineOrder',
      params: { listId: 'list-1' },
    });
  });
});
