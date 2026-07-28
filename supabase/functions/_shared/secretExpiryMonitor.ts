export const APPLE_AUTH_SECRET_KEY = 'SUPABASE_AUTH_EXTERNAL_APPLE_SECRET';
export type SecretExpirySeverity = 'unknown' | 'warning' | 'expired';
const APPLE_MAX_CLIENT_SECRET_LIFETIME_MS = 15_777_000 * 1000;
const ROTATION_CLOCK_SKEW_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function classifySecretExpiry(
  expiresAt: string | null,
  alertDaysBefore: number,
  nowMs = Date.now(),
): {
  severity: SecretExpirySeverity | null;
  expiresAtIso: string | null;
  daysUntilExpiry: number | null;
} {
  const expiresMs = expiresAt ? Date.parse(expiresAt) : NaN;
  if (!Number.isFinite(expiresMs)) {
    return { severity: 'unknown', expiresAtIso: null, daysUntilExpiry: null };
  }

  const daysUntilExpiry = Math.floor((expiresMs - nowMs) / DAY_MS);
  const normalizedAlertDays = Number.isFinite(alertDaysBefore) ? Math.max(0, Math.floor(alertDaysBefore)) : 30;
  const severity = expiresMs <= nowMs ? 'expired' : daysUntilExpiry <= normalizedAlertDays ? 'warning' : null;

  return {
    severity,
    expiresAtIso: new Date(expiresMs).toISOString(),
    daysUntilExpiry,
  };
}

export function isSecretMonitorAuthorized(req: Request, expectedSecret: string): boolean {
  const expected = expectedSecret.trim();
  if (!expected) return false;
  const header = (req.headers.get('authorization') ?? '').trim();
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return (match?.[1] ?? '').trim() === expected;
}

export function parseAppleRotationRecord(
  value: unknown,
  nowMs = Date.now(),
): { secretKey: typeof APPLE_AUTH_SECRET_KEY; expiresAt: string } | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.action !== 'record_rotation' || candidate.secretKey !== APPLE_AUTH_SECRET_KEY) return null;
  if (typeof candidate.expiresAt !== 'string') return null;
  const expiresMs = Date.parse(candidate.expiresAt);
  if (!Number.isFinite(expiresMs) || expiresMs <= nowMs) return null;
  if (expiresMs - nowMs > APPLE_MAX_CLIENT_SECRET_LIFETIME_MS + ROTATION_CLOCK_SKEW_MS) return null;
  return { secretKey: APPLE_AUTH_SECRET_KEY, expiresAt: new Date(expiresMs).toISOString() };
}
