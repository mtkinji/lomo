export type PlaidLinkPlatform = 'ios' | 'android';

export const PLAID_CLIENT_NAME = 'Kwilt';

export function resolvePlaidLinkPlatform(
  requestedPlatform: unknown,
  userAgent: string | null,
): PlaidLinkPlatform {
  if (requestedPlatform === 'android') return 'android';
  if (requestedPlatform === 'ios') return 'ios';
  return userAgent?.toLowerCase().includes('android') ? 'android' : 'ios';
}

export function buildPlaidPlatformFields({
  platform,
  redirectUri,
  androidPackageName,
}: {
  platform: PlaidLinkPlatform;
  redirectUri?: string;
  androidPackageName?: string;
}) {
  if (platform === 'android') {
    return androidPackageName ? { android_package_name: androidPackageName } : {};
  }

  return redirectUri ? { redirect_uri: redirectUri } : {};
}

export function buildPlaidLinkModeFields({
  accessToken,
  products,
  daysRequested,
}: {
  accessToken?: string | null;
  products: string[];
  daysRequested: number;
}) {
  return accessToken?.trim()
    ? { access_token: accessToken.trim() }
    : { products, transactions: { days_requested: daysRequested } };
}
