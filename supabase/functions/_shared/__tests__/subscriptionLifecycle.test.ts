import {
  EMPTY_SUBSCRIPTION_PROJECTION,
  reduceSubscriptionLifecycle,
} from '../subscriptionLifecycle';

const NOW = Date.parse('2026-09-01T12:00:00.000Z');

function event(type: string, overrides: Partial<{ id: string; occurredAt: string; expiresAt: string | null }> = {}) {
  return {
    id: overrides.id ?? `evt-${type}`,
    type,
    occurredAt: overrides.occurredAt ?? '2026-09-01T10:00:00.000Z',
    expiresAt: overrides.expiresAt === undefined ? '2026-10-01T00:00:00.000Z' : overrides.expiresAt,
  };
}

describe('RevenueCat subscription lifecycle', () => {
  it('keeps cancelled customers active through the paid-through date', () => {
    const result = reduceSubscriptionLifecycle(EMPTY_SUBSCRIPTION_PROJECTION, event('CANCELLATION'), NOW);
    expect(result).toMatchObject({ isPro: true, willRenew: false, accessState: 'active' });
  });

  it('revokes confirmed expiration and refund', () => {
    const active = reduceSubscriptionLifecycle(EMPTY_SUBSCRIPTION_PROJECTION, event('INITIAL_PURCHASE'), NOW);
    expect(reduceSubscriptionLifecycle(active, event('EXPIRATION', { occurredAt: '2026-10-01T00:00:01Z' }), NOW))
      .toMatchObject({ isPro: false, accessState: 'expired' });
    expect(reduceSubscriptionLifecycle(active, event('REFUND', { occurredAt: '2026-10-01T00:00:01Z' }), NOW))
      .toMatchObject({ isPro: false, accessState: 'refunded' });
  });

  it('retains access during configured paid-through grace', () => {
    const result = reduceSubscriptionLifecycle(EMPTY_SUBSCRIPTION_PROJECTION, event('BILLING_ISSUE'), NOW);
    expect(result).toMatchObject({ isPro: true, accessState: 'grace' });
  });

  it('ignores diagnostic TEST events and stale deliveries', () => {
    const current = reduceSubscriptionLifecycle(EMPTY_SUBSCRIPTION_PROJECTION, event('RENEWAL'), NOW);
    expect(reduceSubscriptionLifecycle(current, event('TEST'), NOW)).toBe(current);
    expect(reduceSubscriptionLifecycle(current, event('EXPIRATION', {
      occurredAt: '2026-08-01T00:00:00Z',
    }), NOW)).toBe(current);
  });
});
