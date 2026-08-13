import {
  buildKrogerCartPayload,
  createKrogerPkceChallenge,
  krogerCartRecovery,
  normalizeKrogerLocations,
  normalizeKrogerProducts,
} from './krogerProvider';

describe('Kroger provider', () => {
  it('requires PKCE input and never retries ambiguous cart mutations', async () => {
    const challenge = await createKrogerPkceChallenge('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~abc');
    expect(challenge.method).toBe('S256');
    expect(challenge.challenge).not.toContain('=');
    expect(krogerCartRecovery({ acknowledged: false, networkOutcomeKnown: false })).toBe('check_retailer_cart');
  });

  it('normalizes Smiths locations without exposing provider response details', () => {
    expect(normalizeKrogerLocations({ data: [{ locationId: '70600123', name: 'Smiths', chain: 'SMITHS', geolocation: { latitude: 40.34, longitude: -111.91 }, address: { addressLine1: '689 N Redwood Rd', city: 'Saratoga Springs', state: 'UT', zipCode: '84045' } }] })).toEqual([{
      id: '70600123', name: 'Smiths', banner: "Smith's", address: '689 N Redwood Rd · Saratoga Springs, UT 84045',
      latitude: 40.34, longitude: -111.91,
    }]);
  });

  it('preserves the Kroger-family banner for a Seattle store', () => {
    expect(normalizeKrogerLocations({ data: [{
      locationId: '70100861',
      name: 'University Village',
      chain: 'QFC',
      address: { addressLine1: '2746 NE 45th St', city: 'Seattle', state: 'WA', zipCode: '98105' },
    }] })).toEqual([expect.objectContaining({
      id: '70100861',
      name: 'University Village',
      banner: 'QFC',
      address: '2746 NE 45th St · Seattle, WA 98105',
    })]);
  });

  it('normalizes store-specific product proposals, promo evidence, fulfillment, and the preferred front image', () => {
    expect(normalizeKrogerProducts({ data: [{ productId: '0001111085000', upc: '0001111085000', description: 'Whole Milk', brand: 'Kroger', images: [{ perspective: 'back', sizes: [{ size: 'small', url: 'https://images.example/back.png' }] }, { perspective: 'front', sizes: [{ size: 'large', url: 'https://images.example/front-large.png' }, { size: 'small', url: 'https://images.example/front-small.png' }] }], items: [{ size: '1 gal', price: { regular: 3.99, promo: 3.49 }, fulfillment: { curbside: true } }] }] })).toEqual([{
      id: '0001111085000', upc: '0001111085000', title: 'Whole Milk', brand: 'Kroger', size: '1 gal', thumbnailUrl: 'https://images.example/front-small.png', regularPriceCents: 399, promoPriceCents: 349, pickupAvailable: true, deliveryAvailable: false,
    }]);
  });

  it('adds only explicit confirmed UPC quantities with the requested fulfillment modality', () => {
    expect(buildKrogerCartPayload([{ upc: '0001111085000', quantity: 2 }], 'pickup')).toEqual({
      items: [{ upc: '0001111085000', quantity: 2, modality: 'PICKUP' }],
    });
    expect(buildKrogerCartPayload([{ upc: '0001111085000', quantity: 2 }], 'delivery')).toEqual({
      items: [{ upc: '0001111085000', quantity: 2, modality: 'DELIVERY' }],
    });
    expect(() => buildKrogerCartPayload([], 'pickup')).toThrow('provider.cart_empty');
    expect(() => buildKrogerCartPayload([{ upc: '', quantity: 1 }], 'pickup')).toThrow('provider.cart_item_invalid');
  });
});
