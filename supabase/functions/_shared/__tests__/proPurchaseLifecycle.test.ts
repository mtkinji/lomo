import { reduceProPurchaseLifecycle } from '../proPurchaseLifecycle';
import { EMPTY_SUBSCRIPTION_PROJECTION } from '../subscriptionLifecycle';
const now = Date.parse('2026-09-10T12:00:00Z');
const purchase = (productId: string, type: string, time = '2026-09-10T10:00:00Z') => ({
  id: `${productId}-${type}-${time}`, productId, type, occurredAt: time,
  expiresAt: productId === 'pro_lifetime' ? null : '2026-10-10T00:00:00Z',
});
const empty = { projection: EMPTY_SUBSCRIPTION_PROJECTION, products: {} };
describe('Pro purchase coexistence', () => {
  it('keeps lifetime after a later subscription expiration', () => {
    const lifetime = reduceProPurchaseLifecycle(empty, purchase('pro_lifetime', 'NON_RENEWING_PURCHASE'), now);
    const ended = reduceProPurchaseLifecycle(lifetime, purchase('pro_annual', 'EXPIRATION', '2026-09-10T11:00:00Z'), now);
    expect(ended.projection).toMatchObject({ isPro: true, expiresAt: null, willRenew: false });
  });
  it('accepts an older lifetime event delivered after a newer subscription event', () => {
    const ended = reduceProPurchaseLifecycle(empty, purchase('pro_annual', 'EXPIRATION', '2026-09-10T11:00:00Z'), now);
    expect(reduceProPurchaseLifecycle(ended, purchase('pro_lifetime', 'NON_RENEWING_PURCHASE'), now).projection.isPro).toBe(true);
  });
  it('revokes refunded lifetime while preserving a separately active subscription', () => {
    const lifetime = reduceProPurchaseLifecycle(empty, purchase('pro_lifetime', 'NON_RENEWING_PURCHASE'), now);
    const refund = purchase('pro_lifetime', 'CANCELLATION', '2026-09-10T11:00:00Z');
    expect(reduceProPurchaseLifecycle(lifetime, refund, now).projection.isPro).toBe(false);
    const both = reduceProPurchaseLifecycle(lifetime, purchase('pro_annual', 'INITIAL_PURCHASE'), now);
    expect(reduceProPurchaseLifecycle(both, refund, now).projection).toMatchObject({ isPro: true, expiresAt: '2026-10-10T00:00:00Z' });
  });
  it('does not resurrect refunded lifetime from a late duplicate purchase', () => {
    const lifetime = reduceProPurchaseLifecycle(empty, purchase('pro_lifetime', 'NON_RENEWING_PURCHASE'), now);
    const refunded = reduceProPurchaseLifecycle(lifetime, purchase('pro_lifetime', 'CANCELLATION', '2026-09-10T11:00:00Z'), now);
    expect(reduceProPurchaseLifecycle(refunded, purchase('pro_lifetime', 'NON_RENEWING_PURCHASE'), now).projection.isPro).toBe(false);
  });
  it('does not grant Pro for an unrelated non-consumable', () => {
    expect(reduceProPurchaseLifecycle(empty, purchase('unrelated', 'NON_RENEWING_PURCHASE'), now).projection.isPro).toBe(false);
  });
});
