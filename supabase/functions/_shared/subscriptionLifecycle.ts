export type SubscriptionAccessState = 'active' | 'grace' | 'expired' | 'refunded';

export type SubscriptionProjection = {
  isPro: boolean;
  willRenew: boolean | null;
  accessState: SubscriptionAccessState;
  expiresAt: string | null;
  latestEventAt: string | null;
  latestEventId: string | null;
  lastEventType: string | null;
};

export type RevenueCatLifecycleEvent = {
  id: string;
  type: string;
  occurredAt: string;
  expiresAt: string | null;
};

export const EMPTY_SUBSCRIPTION_PROJECTION: SubscriptionProjection = {
  isPro: false,
  willRenew: null,
  accessState: 'expired',
  expiresAt: null,
  latestEventAt: null,
  latestEventId: null,
  lastEventType: null,
};

function laterThanCurrent(event: RevenueCatLifecycleEvent, current: SubscriptionProjection): boolean {
  if (!current.latestEventAt) return true;
  const eventMs = Date.parse(event.occurredAt);
  const currentMs = Date.parse(current.latestEventAt);
  return Number.isFinite(eventMs) && (!Number.isFinite(currentMs) || eventMs >= currentMs);
}

function hasPaidThroughAccess(expiresAt: string | null, nowMs: number): boolean {
  if (!expiresAt) return false;
  const expiryMs = Date.parse(expiresAt);
  return Number.isFinite(expiryMs) && expiryMs > nowMs;
}

export function reduceSubscriptionLifecycle(
  current: SubscriptionProjection,
  event: RevenueCatLifecycleEvent,
  nowMs = Date.now(),
): SubscriptionProjection {
  if (!laterThanCurrent(event, current)) return current;

  const base = {
    ...current,
    expiresAt: event.expiresAt ?? current.expiresAt,
    latestEventAt: event.occurredAt,
    latestEventId: event.id,
    lastEventType: event.type,
  };

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE':
    case 'SUBSCRIPTION_RESUMED':
      return { ...base, isPro: true, willRenew: true, accessState: 'active' };
    case 'BILLING_ISSUE':
      return {
        ...base,
        isPro: hasPaidThroughAccess(base.expiresAt, nowMs),
        willRenew: true,
        accessState: hasPaidThroughAccess(base.expiresAt, nowMs) ? 'grace' : 'expired',
      };
    case 'CANCELLATION': {
      const active = hasPaidThroughAccess(base.expiresAt, nowMs);
      return { ...base, isPro: active, willRenew: false, accessState: active ? 'active' : 'expired' };
    }
    case 'EXPIRATION':
      return { ...base, isPro: false, willRenew: false, accessState: 'expired' };
    case 'REFUND':
      return { ...base, isPro: false, willRenew: false, accessState: 'refunded' };
    case 'TEST':
      return current;
    default:
      return base;
  }
}
