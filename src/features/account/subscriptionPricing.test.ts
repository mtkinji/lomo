import {
  buildContextualCommercialOffer,
  buildSelectedPlanOffer,
  formatStorePriceLabel,
  getAnnualSavingsPercentFromPrices,
} from './subscriptionPricing';
import type { ProStoreOfferSnapshot } from '../../services/entitlements';

function offerSnapshot(
  eligibility: 'eligible' | 'ineligible' | 'unknown' | 'no_offer' = 'eligible',
): ProStoreOfferSnapshot {
  const product = (sku: string, price: number, priceString: string) => ({
    sku,
    price,
    priceString,
    currencyCode: 'USD',
    introEligibility: eligibility,
    introPrice: {
      priceString: '$0.00',
      type: 'FREE_TRIAL',
      periodUnit: 'MONTH',
      periodNumberOfUnits: 1,
    },
  });
  return {
    status: 'ready',
    products: {
      pro_monthly: product('pro_monthly', 9.99, '$9.99'),
      pro_annual: product('pro_annual', 59.99, '$59.99'),
      pro_family_monthly: product('pro_family_monthly', 14.99, '$14.99'),
      pro_family_annual: product('pro_family_annual', 79.99, '$79.99'),
    },
  };
}

describe('subscription pricing', () => {
  it('never turns a missing Apple price into a customer-facing plan price', () => {
    expect(formatStorePriceLabel(undefined, 'monthly')).toBeNull();
    expect(formatStorePriceLabel('', 'annual')).toBeNull();
    expect(formatStorePriceLabel('$9.99', 'monthly')).toBe('$9.99/mo');
    expect(formatStorePriceLabel('$59.99', 'annual')).toBe('$59.99/yr');
  });

  it('derives annual savings only from positive prices in the same currency', () => {
    expect(getAnnualSavingsPercentFromPrices(9.99, 59.99, 'USD', 'USD')).toBe(50);
    expect(getAnnualSavingsPercentFromPrices(14.99, 79.99, 'USD', 'USD')).toBe(56);
    expect(getAnnualSavingsPercentFromPrices(0, 59.99, 'USD', 'USD')).toBeNull();
    expect(getAnnualSavingsPercentFromPrices(9.99, 59.99, 'USD', 'CAD')).toBeNull();
    expect(getAnnualSavingsPercentFromPrices(9.99, 59.99)).toBeNull();
  });

  it('builds the contextual trial and live annual savings offer', () => {
    expect(buildContextualCommercialOffer(offerSnapshot())).toEqual({
      text: 'One month free. Save up to 56% with annual.',
      cta: 'Try Pro free',
      trialAdvertised: true,
      maximumAnnualSavingsPercent: 56,
      offerState: 'trial_and_annual_savings',
    });
  });

  it('uses Upgrade to Pro and omits trial copy when eligibility is not confirmed', () => {
    expect(buildContextualCommercialOffer(offerSnapshot('ineligible'))).toEqual({
      text: 'Save up to 56% with annual.',
      cta: 'Upgrade to Pro',
      trialAdvertised: false,
      maximumAnnualSavingsPercent: 56,
      offerState: 'annual_savings',
    });
    expect(buildContextualCommercialOffer(offerSnapshot('unknown'))?.trialAdvertised).toBe(false);
  });

  it('suppresses a drawer-level trial when even one displayed product is misconfigured', () => {
    const snapshot = offerSnapshot();
    snapshot.products.pro_family_annual.introPrice = {
      priceString: '$0.00',
      type: 'FREE_TRIAL',
      periodUnit: 'DAY',
      periodNumberOfUnits: 7,
    };

    expect(buildContextualCommercialOffer(snapshot)).toMatchObject({
      cta: 'Upgrade to Pro',
      trialAdvertised: false,
      text: 'Save up to 56% with annual.',
    });
  });

  it('returns no contextual commercial line when neither trial nor savings is truthful', () => {
    expect(
      buildContextualCommercialOffer({ status: 'unavailable', products: {} }),
    ).toBeNull();
  });

  it('builds selected-plan trial, savings, and renewal disclosure from live truth', () => {
    expect(
      buildSelectedPlanOffer({
        snapshot: offerSnapshot(),
        plan: 'individual',
        cadence: 'annual',
      }),
    ).toEqual({
      cta: 'Start free trial',
      savingsLabel: 'Save 50%',
      purchaseDisclosure: '1 month free, then $59.99/year. Auto-renews until canceled.',
      expectsTrial: true,
    });
  });

  it('builds a standard selected-plan offer when trial eligibility is unknown', () => {
    expect(
      buildSelectedPlanOffer({
        snapshot: offerSnapshot('unknown'),
        plan: 'family',
        cadence: 'monthly',
      }),
    ).toEqual({
      cta: 'Subscribe to Pro',
      savingsLabel: null,
      purchaseDisclosure: '$14.99/month. Auto-renews until canceled.',
      expectsTrial: false,
    });
  });
});
