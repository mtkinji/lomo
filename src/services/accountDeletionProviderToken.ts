import { getSupabasePublishableKey } from '../utils/getEnv';
import { getEdgeFunctionUrlCandidatesForHeaders } from './edgeFunctions';

export async function registerAppleAccountDeletionToken(input: {
  accessToken: string;
  providerRefreshToken: string | null | undefined;
}): Promise<{ registered: true } | { registered: false; reason: 'missing_refresh_token' }> {
  const token = input.providerRefreshToken?.trim();
  if (!token) return { registered: false, reason: 'missing_refresh_token' };
  const supabaseKey = getSupabasePublishableKey()?.trim();
  if (!supabaseKey || !input.accessToken.trim()) {
    throw new Error('Unable to finish secure Apple sign-in setup.');
  }
  const headers = new Headers({
    'Content-Type': 'application/json',
    apikey: supabaseKey,
    Authorization: `Bearer ${input.accessToken.trim()}`,
    'x-kwilt-client': 'kwilt-mobile',
  });
  const candidates = getEdgeFunctionUrlCandidatesForHeaders('account-deletion-token-register', headers);
  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ token, tokenKind: 'refresh_token' }),
      });
      if (response.ok) return { registered: true };
      if (response.status !== 404) break;
    } catch {
      // Try another configured function origin before failing closed.
    }
  }
  throw new Error('Unable to finish secure Apple sign-in setup.');
}
