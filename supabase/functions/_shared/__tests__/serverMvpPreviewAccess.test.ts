import { isServerMvpPreviewEnabled, reserveMvpPreviewUsage } from '../serverMvpPreviewAccess';

test('server exposure is fail-closed unless explicitly enabled', () => {
  expect(isServerMvpPreviewEnabled(undefined)).toBe(false);
  expect(isServerMvpPreviewEnabled('false')).toBe(false);
  expect(isServerMvpPreviewEnabled('true')).toBe(true);
});

test('returns the atomic reservation result and fails closed on storage errors', async () => {
  await expect(reserveMvpPreviewUsage({
    rpc: jest.fn(async () => ({ data: { allowed: true, code: 'reserved', leaseExpiresAt: null }, error: null })),
  }, { userId: 'u', capability: 'cook_mode', perMinute: 20, perUserDay: 120, globalDay: 2500, leaseSeconds: 0 }))
    .resolves.toEqual({ allowed: true, code: 'reserved', leaseExpiresAt: null });
  await expect(reserveMvpPreviewUsage({
    rpc: jest.fn(async () => ({ data: null, error: new Error('down') })),
  }, { userId: 'u', capability: 'cook_mode', perMinute: 20, perUserDay: 120, globalDay: 2500, leaseSeconds: 0 }))
    .resolves.toMatchObject({ allowed: false });
});
