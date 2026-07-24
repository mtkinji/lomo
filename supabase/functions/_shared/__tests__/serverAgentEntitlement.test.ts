import { resolveServerProEntitlement } from '../serverAgentEntitlement';

function client(data: unknown) {
  const query = {
    select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn(async () => ({ data })),
  };
  return { admin: { from: jest.fn(() => query) }, query };
}

test('accepts current pro and trial entitlements but not expired or missing rows', async () => {
  const now = new Date('2026-07-23T12:00:00Z').getTime();
  await expect(resolveServerProEntitlement(client({ is_pro: true, expires_at: '2026-07-24T00:00:00Z' }).admin, 'u1', now)).resolves.toBe(true);
  await expect(resolveServerProEntitlement(client({ is_pro_tools_trial: true, expires_at: null }).admin, 'u1', now)).resolves.toBe(true);
  await expect(resolveServerProEntitlement(client({ is_pro: true, expires_at: '2026-07-22T00:00:00Z' }).admin, 'u1', now)).resolves.toBe(false);
  await expect(resolveServerProEntitlement(client(null).admin, 'u1', now)).resolves.toBe(false);
});
