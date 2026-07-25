export function appendGoalInviteReferralCode(
  rawUrl: string,
  referralCode: string | null | undefined,
): string {
  const ref = (referralCode ?? '').trim();
  if (!rawUrl || !ref) return rawUrl;

  try {
    const url = new URL(rawUrl);
    if (!(url.searchParams.get('ref') ?? '').trim()) {
      url.searchParams.set('ref', ref);
    }
    return url.toString();
  } catch {
    const joiner = rawUrl.includes('?') ? '&' : '?';
    return `${rawUrl}${joiner}ref=${encodeURIComponent(ref)}`;
  }
}
