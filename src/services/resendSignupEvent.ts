import { getSupabaseUrl } from '../utils/getEnv';
import { getSupabaseClient } from './backend/supabaseClient';
import { buildMaybeAuthedHeaders } from './proCodesClient';

/**
 * Trigger the Day 0 welcome email immediately for a newly signed-up user
 * by POSTing to the `email-drip` edge function's signup action. Day 1 is
 * picked up by the scheduled cron in `email-drip` (runs the in-repo
 * `buildWelcomeDay1Email` 24h later, same compliance path as Day 3/7).
 *
 * Both `email` and `userId` come from the active Supabase session. The
 * server trusts the `userId` here (consistent with the rest of
 * email-drip's POST surface) so it can:
 *   - record the cadence row under the right user,
 *   - honor `kwilt_email_preferences.welcome_drip`,
 *   - build a per-user HMAC unsubscribe URL + List-Unsubscribe headers.
 *
 * Fire-and-forget — failures are silently ignored so they don't block
 * signup UX.
 */
export async function fireResendSignupEvent(): Promise<void> {
  try {
    const supabaseUrl = getSupabaseUrl()?.trim()?.replace(/\/+$/, '');
    if (!supabaseUrl) return;

    const { data } = await getSupabaseClient().auth.getUser();
    const email = data?.user?.email;
    const userId = data?.user?.id;
    if (!email || !userId) return;

    const headers = await buildMaybeAuthedHeaders();
    const url = `${supabaseUrl}/functions/v1/email-drip`;

    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'signup', email, userId }),
    });
  } catch {
    // Best-effort; don't block signup flow
  }
}
