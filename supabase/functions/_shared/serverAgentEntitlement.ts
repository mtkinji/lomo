type EntitlementQuery = {
  select: (...args: unknown[]) => EntitlementQuery;
  eq: (...args: unknown[]) => EntitlementQuery;
  maybeSingle: () => Promise<{ data: unknown; error?: unknown }>;
};

type ProAccessSource = 'revenuecat' | 'internal_grant' | 'none';

export type ServerProAccessDecision = {
  allowed: boolean;
  source: ProAccessSource;
  activeThrough: string | null;
  reason: 'active_purchase' | 'active_grant' | 'expired' | 'refunded' | 'missing';
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function isCurrent(row: Record<string, unknown>, now: number): boolean {
  if (row.is_pro !== true) return false;
  if (!row.expires_at) return true;
  const expiryMs = Date.parse(String(row.expires_at));
  return Number.isFinite(expiryMs) && expiryMs > now;
}

export async function resolveServerProAccess(
  admin: { from: (table: string) => unknown },
  userId: string,
  now = Date.now(),
): Promise<ServerProAccessDecision> {
  if (!userId.trim()) return { allowed: false, source: 'none', activeThrough: null, reason: 'missing' };

  const [purchaseResult, grantResult] = await Promise.all([
    (admin.from('kwilt_revenuecat_subscriptions') as EntitlementQuery)
      .select('is_pro,expires_at,access_state')
      .eq('revenuecat_app_user_id', userId)
      .maybeSingle(),
    (admin.from('kwilt_pro_entitlements') as EntitlementQuery)
      .select('is_pro,expires_at')
      .eq('quota_key', `user:${userId}`)
      .maybeSingle(),
  ]);
  const purchase = record(purchaseResult.data);
  const grant = record(grantResult.data);

  if (isCurrent(purchase, now)) {
    return {
      allowed: true,
      source: 'revenuecat',
      activeThrough: purchase.expires_at ? String(purchase.expires_at) : null,
      reason: 'active_purchase',
    };
  }
  if (isCurrent(grant, now)) {
    return {
      allowed: true,
      source: 'internal_grant',
      activeThrough: grant.expires_at ? String(grant.expires_at) : null,
      reason: 'active_grant',
    };
  }

  const accessState = String(purchase.access_state ?? '');
  return {
    allowed: false,
    source: 'none',
    activeThrough: null,
    reason: accessState === 'refunded' ? 'refunded' : purchaseResult.data || grantResult.data ? 'expired' : 'missing',
  };
}

export async function resolveServerProEntitlement(
  admin: { from: (table: string) => unknown },
  userId: string,
  now = Date.now(),
): Promise<boolean> {
  return (await resolveServerProAccess(admin, userId, now)).allowed;
}
