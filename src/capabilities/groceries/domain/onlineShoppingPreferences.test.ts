import {
  createDefaultOnlineShoppingPreferences,
  deriveActionableRetailerPreferences,
  normalizeRetailerPreferenceOrder,
  parseOnlineShoppingPreferences,
  reconcileActionableRetailerPreferences,
} from './onlineShoppingPreferences';
import type { RetailerRuntimePolicy } from '../providers/groceryProviderContracts';

const savedAt = '2026-08-13T16:00:00.000Z';

const policies: RetailerRuntimePolicy[] = [
  { retailerId: 'amazon', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: true, productEvidence: true, cartWrite: false },
  { retailerId: 'costco', capability: 'remembered_only', supportedModes: [], approvedSurface: false, productEvidence: false, cartWrite: false },
  { retailerId: 'kroger', capability: 'cart_prepare', supportedModes: ['pickup'], approvedSurface: true, productEvidence: true, cartWrite: true },
  { retailerId: 'walmart', capability: 'product_links', supportedModes: ['pickup', 'delivery'], approvedSurface: false, productEvidence: false, cartWrite: false },
  { retailerId: 'other', capability: 'remembered_only', supportedModes: [], approvedSurface: false, productEvidence: false, cartWrite: false },
];

const smiths = {
  id: '70600123',
  name: 'Smiths',
  banner: "Smith's",
  address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
  latitude: 40.34,
  longitude: -111.91,
};

describe('online shopping preferences', () => {
  it('creates an assumption-free default', () => {
    expect(createDefaultOnlineShoppingPreferences(savedAt)).toEqual({
      schemaVersion: 1,
      defaultFulfillment: 'either',
      homePostalCode: null,
      savedAt,
      retailers: [],
    });
  });

  it('normalizes enabled ranks without changing disabled retailer order', () => {
    expect(normalizeRetailerPreferenceOrder([
      { id: 'walmart', enabled: true, rank: 8, label: 'Walmart', membershipConfirmed: null },
      { id: 'amazon', enabled: false, rank: 2, label: 'Amazon', membershipConfirmed: true },
      { id: 'kroger', enabled: true, rank: 3, label: "Smith's", membershipConfirmed: null },
    ])).toEqual([
      { id: 'walmart', enabled: true, rank: 2, label: 'Walmart', membershipConfirmed: null },
      { id: 'amazon', enabled: false, rank: 0, label: 'Amazon', membershipConfirmed: true },
      { id: 'kroger', enabled: true, rank: 1, label: "Smith's", membershipConfirmed: null },
    ]);
  });

  it('derives only actionable destinations and presents the selected local banner', () => {
    expect(deriveActionableRetailerPreferences({
      fulfillment: 'pickup',
      policies,
      preferredStore: smiths,
    })).toEqual([
      { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: null },
      { id: 'kroger', enabled: true, rank: 2, label: "Smith's", membershipConfirmed: null },
    ]);
  });

  it('omits a provider route until an exact local store is known', () => {
    expect(deriveActionableRetailerPreferences({
      fulfillment: 'pickup',
      policies,
      preferredStore: null,
    }).map((retailer) => retailer.id)).toEqual(['amazon']);
  });

  it('omits destinations that cannot support the selected fulfillment mode', () => {
    expect(deriveActionableRetailerPreferences({
      fulfillment: 'delivery',
      policies,
      preferredStore: smiths,
    }).map((retailer) => retailer.id)).toEqual(['amazon']);
  });

  it('appends newly actionable destinations to an existing preference list', () => {
    expect(reconcileActionableRetailerPreferences({
      fulfillment: 'pickup',
      policies,
      preferredStore: smiths,
      retailers: [
        { id: 'kroger', enabled: true, rank: 1, label: 'Kroger family', membershipConfirmed: null },
        { id: 'costco', enabled: true, rank: 2, label: 'Costco', membershipConfirmed: true },
      ],
    })).toEqual([
      { id: 'kroger', enabled: true, rank: 1, label: "Smith's", membershipConfirmed: null },
      { id: 'amazon', enabled: true, rank: 2, label: 'Amazon', membershipConfirmed: null },
    ]);
  });

  it('keeps an explicitly removed actionable destination disabled', () => {
    expect(reconcileActionableRetailerPreferences({
      fulfillment: 'pickup',
      policies,
      preferredStore: smiths,
      retailers: [
        { id: 'kroger', enabled: true, rank: 1, label: "Smith's", membershipConfirmed: null },
        { id: 'amazon', enabled: false, rank: 0, label: 'Amazon', membershipConfirmed: null },
      ],
    })).toEqual([
      { id: 'kroger', enabled: true, rank: 1, label: "Smith's", membershipConfirmed: null },
      { id: 'amazon', enabled: false, rank: 0, label: 'Amazon', membershipConfirmed: null },
    ]);
  });

  it('parses only the versioned authority fields', () => {
    expect(parseOnlineShoppingPreferences({
      schemaVersion: 1,
      defaultFulfillment: 'pickup',
      homePostalCode: '84045',
      savedAt,
      detectedAmazonAccount: true,
      retailers: [
        { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: true, commission: 99 },
        { id: 'kroger', enabled: true, rank: 2, label: "Smith's", membershipConfirmed: null },
      ],
    })).toEqual({
      schemaVersion: 1,
      defaultFulfillment: 'pickup',
      homePostalCode: '84045',
      savedAt,
      retailers: [
        { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: true },
        { id: 'kroger', enabled: true, rank: 2, label: "Smith's", membershipConfirmed: null },
      ],
    });
  });

  it.each([
    ['duplicate retailer IDs', { retailers: [
      { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: null },
      { id: 'amazon', enabled: true, rank: 2, label: 'Amazon again', membershipConfirmed: null },
    ] }],
    ['non-contiguous enabled ranks', { retailers: [
      { id: 'amazon', enabled: true, rank: 1, label: 'Amazon', membershipConfirmed: null },
      { id: 'kroger', enabled: true, rank: 3, label: "Smith's", membershipConfirmed: null },
    ] }],
    ['blank Other label', { retailers: [
      { id: 'other', enabled: true, rank: 1, label: '   ', membershipConfirmed: null },
    ] }],
    ['invalid postal code', { homePostalCode: '8404' }],
  ])('rejects %s', (_label, overrides) => {
    expect(parseOnlineShoppingPreferences({
      ...createDefaultOnlineShoppingPreferences(savedAt),
      ...overrides,
    })).toBeNull();
  });
});
