import { splitFoundingOfferPrice } from './foundingOfferPresentation';

describe('splitFoundingOfferPrice', () => {
  it('raises only a leading dollar sign without changing the store amount', () => {
    expect(splitFoundingOfferPrice('$19.99')).toEqual({ symbol: '$', amount: '19.99' });
    expect(splitFoundingOfferPrice('$29.99')).toEqual({ symbol: '$', amount: '29.99' });
  });
  it('preserves other localized prices exactly, including currency placement', () => {
    for (const price of ['19,99 €', 'CA$24.99', '¥3,000', '19.99 US$']) {
      expect(splitFoundingOfferPrice(price)).toEqual({ symbol: '', amount: price });
    }
  });
});
