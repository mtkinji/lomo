export type SubscriptionPlan = 'individual' | 'family';

export const SUBSCRIPTION_PRICING: Record<
  SubscriptionPlan,
  { monthly: number; annual: number }
> = {
  individual: { monthly: 9.99, annual: 59.99 },
  family: { monthly: 14.99, annual: 79.99 },
};

export function getAnnualMonthlyEquivalent(plan: SubscriptionPlan): number {
  return SUBSCRIPTION_PRICING[plan].annual / 12;
}

export function getAnnualSavingsPercent(plan: SubscriptionPlan): number {
  const pricing = SUBSCRIPTION_PRICING[plan];
  return Math.round((1 - pricing.annual / (pricing.monthly * 12)) * 100);
}
