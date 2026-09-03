import type { ProStoreOfferSnapshot, ProStoreProductOffer } from '../../services/entitlements';

export type SubscriptionPlan = 'individual' | 'family';
export type SubscriptionCadence = 'monthly' | 'annual';

export function formatStorePriceLabel(
  priceString: string | undefined,
  cadence: SubscriptionCadence,
): string | null {
  if (typeof priceString !== 'string' || priceString.trim().length === 0) return null;
  return cadence === 'annual' ? `${priceString}/yr` : `${priceString}/mo`;
}

export function getAnnualSavingsPercentFromPrices(
  monthlyPrice: number | undefined,
  annualPrice: number | undefined,
  monthlyCurrencyCode?: string,
  annualCurrencyCode?: string,
): number | null {
  if (
    typeof monthlyPrice !== 'number' ||
    !Number.isFinite(monthlyPrice) ||
    monthlyPrice <= 0 ||
    typeof annualPrice !== 'number' ||
    !Number.isFinite(annualPrice) ||
    annualPrice <= 0 ||
    typeof monthlyCurrencyCode !== 'string' ||
    monthlyCurrencyCode.length === 0 ||
    monthlyCurrencyCode !== annualCurrencyCode
  ) {
    return null;
  }
  const savings = Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100);
  return savings > 0 ? savings : null;
}

function skuFor(plan: SubscriptionPlan, cadence: SubscriptionCadence): string {
  if (plan === 'family') {
    return cadence === 'annual' ? 'pro_family_annual' : 'pro_family_monthly';
  }
  return cadence === 'annual' ? 'pro_annual' : 'pro_monthly';
}

function isVerifiedOneMonthTrial(product: ProStoreProductOffer | undefined): boolean {
  return Boolean(
    product &&
      product.introEligibility === 'eligible' &&
      product.introPrice?.type === 'FREE_TRIAL' &&
      product.introPrice?.periodUnit === 'MONTH' &&
      product.introPrice?.periodNumberOfUnits === 1,
  );
}

function savingsForPlan(
  snapshot: ProStoreOfferSnapshot,
  plan: SubscriptionPlan,
): number | null {
  const monthly = snapshot.products[skuFor(plan, 'monthly')];
  const annual = snapshot.products[skuFor(plan, 'annual')];
  return getAnnualSavingsPercentFromPrices(
    monthly?.price,
    annual?.price,
    monthly?.currencyCode,
    annual?.currencyCode,
  );
}

export type ContextualCommercialOffer = {
  text: string;
  cta: 'Try Pro free' | 'Upgrade to Pro';
  trialAdvertised: boolean;
  maximumAnnualSavingsPercent: number | null;
  offerState: 'trial_and_annual_savings' | 'trial' | 'annual_savings';
};

export function buildContextualCommercialOffer(
  snapshot: ProStoreOfferSnapshot,
): ContextualCommercialOffer | null {
  if (snapshot.status !== 'ready') return null;
  const displayedSkus = [
    'pro_monthly',
    'pro_annual',
    'pro_family_monthly',
    'pro_family_annual',
  ];
  const trialAdvertised = displayedSkus.every((sku) =>
    isVerifiedOneMonthTrial(snapshot.products[sku]),
  );
  const savings = [savingsForPlan(snapshot, 'individual'), savingsForPlan(snapshot, 'family')]
    .filter((value): value is number => value != null);
  const maximumAnnualSavingsPercent = savings.length > 0 ? Math.max(...savings) : null;
  if (!trialAdvertised && maximumAnnualSavingsPercent == null) return null;

  if (trialAdvertised && maximumAnnualSavingsPercent != null) {
    return {
      text: `One month free. Save up to ${maximumAnnualSavingsPercent}% with annual.`,
      cta: 'Try Pro free',
      trialAdvertised: true,
      maximumAnnualSavingsPercent,
      offerState: 'trial_and_annual_savings',
    };
  }
  if (trialAdvertised) {
    return {
      text: 'One month free.',
      cta: 'Try Pro free',
      trialAdvertised: true,
      maximumAnnualSavingsPercent: null,
      offerState: 'trial',
    };
  }
  return {
    text: `Save up to ${maximumAnnualSavingsPercent}% with annual.`,
    cta: 'Upgrade to Pro',
    trialAdvertised: false,
    maximumAnnualSavingsPercent,
    offerState: 'annual_savings',
  };
}

export function buildSelectedPlanOffer(args: {
  snapshot: ProStoreOfferSnapshot;
  plan: SubscriptionPlan;
  cadence: SubscriptionCadence;
}): {
  cta: 'Start free trial' | 'Subscribe to Pro';
  savingsLabel: string | null;
  purchaseDisclosure: string | null;
  expectsTrial: boolean;
} {
  const product = args.snapshot.products[skuFor(args.plan, args.cadence)];
  const expectsTrial = isVerifiedOneMonthTrial(product);
  const savings = args.cadence === 'annual' ? savingsForPlan(args.snapshot, args.plan) : null;
  const cadenceLabel = args.cadence === 'annual' ? 'year' : 'month';
  const purchaseDisclosure = product?.priceString
    ? expectsTrial
      ? `1 month free, then ${product.priceString}/${cadenceLabel}. Auto-renews until canceled.`
      : `${product.priceString}/${cadenceLabel}. Auto-renews until canceled.`
    : null;
  return {
    cta: expectsTrial ? 'Start free trial' : 'Subscribe to Pro',
    savingsLabel: savings == null ? null : `Save ${savings}%`,
    purchaseDisclosure,
    expectsTrial,
  };
}
