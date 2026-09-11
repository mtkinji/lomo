import {
  EMPTY_SUBSCRIPTION_PROJECTION,
  reduceSubscriptionLifecycle,
  type RevenueCatLifecycleEvent,
  type SubscriptionProjection,
} from './subscriptionLifecycle.ts';

const PRO_PRODUCTS = new Set([
  'pro_lifetime', 'pro_monthly', 'pro_annual', 'pro_family_monthly', 'pro_family_annual',
  'kwilt_budget_pro_monthly', 'kwilt_budget_pro_annual',
  'kwilt_budget_pro_family_monthly', 'kwilt_budget_pro_family_annual',
]);
export type ProPurchaseProjection = {
  projection: SubscriptionProjection;
  products: Record<string, SubscriptionProjection>;
};

/** Track provider ordering per product: a subscription ending cannot revoke lifetime. */
export function reduceProPurchaseLifecycle(
  current: ProPurchaseProjection,
  event: RevenueCatLifecycleEvent & { productId: string; cancelReason?: string },
  nowMs = Date.now(),
): ProPurchaseProjection {
  if (!PRO_PRODUCTS.has(event.productId) || event.type === 'TEST') return current;
  const prior = current.products[event.productId] ?? EMPTY_SUBSCRIPTION_PROJECTION;
  const stale = prior.latestEventAt && Date.parse(prior.latestEventAt) > Date.parse(event.occurredAt);
  if (stale) return current;
  let next: SubscriptionProjection;
  if (event.productId === 'pro_lifetime') {
    if (!['NON_RENEWING_PURCHASE', 'CANCELLATION', 'REFUND', 'REFUND_REVERSED'].includes(event.type)) return current;
    const active = event.type === 'NON_RENEWING_PURCHASE' || event.type === 'REFUND_REVERSED';
    next = {
      isPro: active, willRenew: false, expiresAt: null,
      accessState: active ? 'active' : 'refunded', latestEventAt: event.occurredAt,
      latestEventId: event.id, lastEventType: event.type,
    };
  } else {
    next = reduceSubscriptionLifecycle(prior, {
      ...event,
      type: event.type === 'CANCELLATION' && event.cancelReason === 'CUSTOMER_SUPPORT' ? 'REFUND' : event.type,
    }, nowMs);
  }
  const products = { ...current.products, [event.productId]: next };
  const active = Object.values(products).filter((p) => p.isPro &&
    (!p.expiresAt || Date.parse(p.expiresAt) > nowMs));
  const permanent = active.some((p) => p.expiresAt === null);
  const latest = Object.values(products).reduce((a, b) =>
    Date.parse(a.latestEventAt ?? '') > Date.parse(b.latestEventAt ?? '') ? a : b, next);
  return {
    products,
    projection: {
      ...latest,
      isPro: active.length > 0,
      expiresAt: permanent ? null : active.length ? active.map((p) => p.expiresAt!).sort().at(-1)! : next.expiresAt,
      willRenew: active.some((p) => p.willRenew === true),
      accessState: active.length ? 'active' : next.accessState === 'refunded' ? 'refunded' : 'expired',
    },
  };
}
