export type MvpPreviewCapability = 'live_conversation' | 'cook_mode';

export function isServerMvpPreviewEnabled(value: string | undefined): boolean {
  return ['1', 'true', 'yes', 'on', 'enabled'].includes((value ?? '').trim().toLowerCase());
}

export type MvpPreviewReservation = {
  allowed: boolean;
  code: 'reserved' | 'per_minute_limit' | 'user_daily_limit' | 'global_daily_limit' | 'active_lease';
  leaseExpiresAt: string | null;
};

export async function reserveMvpPreviewUsage(
  admin: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }> },
  input: {
    userId: string;
    capability: MvpPreviewCapability;
    perMinute: number;
    perUserDay: number;
    globalDay: number;
    leaseSeconds: number;
  },
): Promise<MvpPreviewReservation> {
  const { data, error } = await admin.rpc('kwilt_reserve_mvp_preview_usage', {
    p_user_id: input.userId,
    p_capability: input.capability,
    p_per_minute: input.perMinute,
    p_per_user_day: input.perUserDay,
    p_global_day: input.globalDay,
    p_lease_seconds: input.leaseSeconds,
  });
  if (error || !data || typeof data !== 'object') {
    return { allowed: false, code: 'global_daily_limit', leaseExpiresAt: null };
  }
  const result = data as Record<string, unknown>;
  const code = String(result.code) as MvpPreviewReservation['code'];
  if (!['reserved', 'per_minute_limit', 'user_daily_limit', 'global_daily_limit', 'active_lease'].includes(code)) {
    return { allowed: false, code: 'global_daily_limit', leaseExpiresAt: null };
  }
  return {
    allowed: result.allowed === true,
    code,
    leaseExpiresAt: typeof result.leaseExpiresAt === 'string' ? result.leaseExpiresAt : null,
  };
}
