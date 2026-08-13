import {
  createDefaultOnlineShoppingPreferences,
  normalizeRetailerPreferenceOrder,
  parseOnlineShoppingPreferences,
} from './onlineShoppingPreferences';

const savedAt = '2026-08-13T16:00:00.000Z';

describe('online shopping preferences', () => {
  it('creates an assumption-free default', () => {
    expect(createDefaultOnlineShoppingPreferences(savedAt)).toEqual({
      schemaVersion: 1,
      defaultFulfillment: 'either',
      homePostalCode: null,
      savedAt,
      retailers: [
        { id: 'amazon', enabled: false, rank: 0, label: 'Amazon', membershipConfirmed: null },
        { id: 'costco', enabled: false, rank: 0, label: 'Costco', membershipConfirmed: null },
        { id: 'kroger', enabled: false, rank: 0, label: 'Kroger family', membershipConfirmed: null },
        { id: 'walmart', enabled: false, rank: 0, label: 'Walmart', membershipConfirmed: null },
        { id: 'other', enabled: false, rank: 0, label: '', membershipConfirmed: null },
      ],
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
