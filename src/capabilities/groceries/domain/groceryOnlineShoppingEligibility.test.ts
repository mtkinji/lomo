import { isOnlineShoppingCountryEligible } from './groceryOnlineShoppingEligibility';

describe('isOnlineShoppingCountryEligible', () => {
  it.each(['US', 'CA', 'us', ' ca '])('allows %s', (countryCode) => {
    expect(isOnlineShoppingCountryEligible(countryCode)).toBe(true);
  });

  it.each(['GB', 'FR', '', null, undefined])('does not allow %s', (countryCode) => {
    expect(isOnlineShoppingCountryEligible(countryCode)).toBe(false);
  });
});
