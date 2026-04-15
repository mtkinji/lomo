import { getSupabaseUrl } from '../utils/getEnv';
import { getSupabaseClient } from './backend/supabaseClient';
import { buildMaybeAuthedHeaders } from './proCodesClient';

/**
 * Fire the `user.signup` event to the Resend Automation via the email-drip
 * edge function. This triggers the Day 0 + Day 1 welcome drip sequence.
 * Resolves the user's email from the active Supabase session.
 * Fire-and-forget — failures are silently ignored.
 */
export async function fireResendSignupEvent(): Promise<void> {
  try {
    const supabaseUrl = getSupabaseUrl()?.trim()?.replace(/\/+$/, '');
    if (!supabaseUrl) return;

    const { data } = await getSupabaseClient().auth.getUser();
    const email = data?.user?.email;
    if (!email) return;

    const headers = await buildMaybeAuthedHeaders();
    const url = `${supabaseUrl}/functions/v1/email-drip`;

    await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ action: 'signup', email }),
    });
  } catch {
    // Best-effort; don't block signup flow
  }
}
