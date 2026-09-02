import {
  SUBSCRIPTION_PRICING,
  formatStorePriceLabel,
  getAnnualMonthlyEquivalent,
  getAnnualSavingsPercent,
} from './subscriptionPricing';

describe('subscription pricing', () => {
  it('keeps the approved individual and family launch prices', () => {
    expect(SUBSCRIPTION_PRICING).toEqual({
      individual: { monthly: 9.99, annual: 59.99 },
      family: { monthly: 14.99, annual: 79.99 },
    });
  });

  it('derives honest annual savings and monthly equivalents', () => {
    expect(getAnnualSavingsPercent('individual')).toBe(50);
    expect(getAnnualMonthlyEquivalent('individual')).toBeCloseTo(5, 2);
    expect(getAnnualSavingsPercent('family')).toBe(56);
    expect(getAnnualMonthlyEquivalent('family')).toBeCloseTo(6.67, 2);
  });

  it('never turns a missing Apple price into a customer-facing plan price', () => {
    expect(formatStorePriceLabel(undefined, 'monthly')).toBeNull();
    expect(formatStorePriceLabel('', 'annual')).toBeNull();
    expect(formatStorePriceLabel('$9.99', 'monthly')).toBe('$9.99/mo');
    expect(formatStorePriceLabel('$59.99', 'annual')).toBe('$59.99/yr');
  });
});
