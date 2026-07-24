type EntitlementQuery = {
  select: (...args: unknown[]) => EntitlementQuery;
  eq: (...args: unknown[]) => EntitlementQuery;
  maybeSingle: () => Promise<{ data: unknown }>;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

export async function resolveServerProEntitlement(
  admin: { from: (table: string) => unknown },
  userId: string,
  now = Date.now(),
): Promise<boolean> {
  const { data } = await (admin.from('kwilt_pro_entitlements') as EntitlementQuery)
    .select('is_pro,is_pro_tools_trial,expires_at')
    .eq('quota_key', `user:${userId}`)
    .maybeSingle();
  const entitlement = record(data);
  if (!data || (entitlement.expires_at && new Date(String(entitlement.expires_at)).getTime() <= now)) return false;
  return entitlement.is_pro === true || entitlement.is_pro_tools_trial === true;
}
