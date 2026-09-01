import { resolveServerProAccess, resolveServerProEntitlement } from '../serverAgentEntitlement';

function client(rows: { purchase?: unknown; grant?: unknown }) {
  return {
    from: jest.fn((table: string) => {
      const data = table === 'kwilt_revenuecat_subscriptions' ? rows.purchase ?? null : rows.grant ?? null;
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        maybeSingle: jest.fn(async () => ({ data, error: null })),
      };
    }),
  };
}

const NOW = Date.parse('2026-09-01T12:00:00Z');

test('accepts an active purchase, including cancelled-but-paid and grace projections', async () => {
  for (const access_state of ['active', 'grace']) {
    const admin = client({ purchase: { is_pro: true, expires_at: '2026-09-02T00:00:00Z', access_state } });
    await expect(resolveServerProAccess(admin, 'u1', NOW)).resolves.toMatchObject({
      allowed: true,
      source: 'revenuecat',
      reason: 'active_purchase',
    });
  }
});

test('uses an active internal grant when no purchase is active', async () => {
  const admin = client({ grant: { is_pro: true, expires_at: null } });
  await expect(resolveServerProAccess(admin, 'u1', NOW)).resolves.toMatchObject({
    allowed: true,
    source: 'internal_grant',
  });
});

test('rejects expired, refunded, and historical partial-trial rows', async () => {
  await expect(resolveServerProEntitlement(client({
    purchase: { is_pro: true, expires_at: '2026-08-01T00:00:00Z', access_state: 'expired' },
    grant: { is_pro_tools_trial: true, expires_at: null },
  }), 'u1', NOW)).resolves.toBe(false);
  await expect(resolveServerProAccess(client({
    purchase: { is_pro: false, access_state: 'refunded' },
  }), 'u1', NOW)).resolves.toMatchObject({ allowed: false, reason: 'refunded' });
});
