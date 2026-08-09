const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validateKrogerStateClaims(value: unknown, nowMs = Date.now()): { userId: string; nonce: string } | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  if (row.provider !== 'kroger' || typeof row.userId !== 'string' || !row.userId || typeof row.nonce !== 'string' || !UUID.test(row.nonce) || typeof row.issuedAt !== 'number') return null;
  const age = nowMs - row.issuedAt;
  return age >= 0 && age <= 10 * 60 * 1000 ? { userId: row.userId, nonce: row.nonce } : null;
}
