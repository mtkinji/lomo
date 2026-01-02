import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { getSupabaseClient } from './supabaseClient';

WebBrowser.maybeCompleteAuthSession();

export type AuthProvider = 'apple' | 'google';

export type AuthIdentity = {
  userId: string;
  email?: string;
  name?: string;
  avatarUrl?: string;
  provider?: string;
};

let hasShownExpoGoRedirectDebug = false;
const shouldShowAuthDebugAlerts = (): boolean =>
  __DEV__ && (process.env.EXPO_PUBLIC_SHOW_AUTH_DEBUG_ALERTS ?? '').trim() === '1';

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  // Prefer a global sign-out so revoking sessions feels predictable across devices.
  // Fallback to local sign-out if the client/library doesn't support scope options.
  let error: { message?: string } | null = null;
  try {
    const res = await (supabase.auth as any).signOut({ scope: 'global' });
    error = res?.error ?? null;
  } catch {
    const res = await supabase.auth.signOut();
    error = (res as any)?.error ?? null;
  }
  if (error) {
    throw new Error(error.message);
  }
}

export function deriveAuthIdentityFromSession(session: Session | null): AuthIdentity | null {
  const user = session?.user;
  if (!user) return null;

  const email = (user.email ?? '').trim() || undefined;

  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const nameRaw =
    (typeof md.full_name === 'string' && md.full_name.trim()) ||
    (typeof md.name === 'string' && md.name.trim()) ||
    (typeof md.display_name === 'string' && md.display_name.trim()) ||
    (typeof md.preferred_username === 'string' && md.preferred_username.trim()) ||
    undefined;

  const avatarRaw =
    (typeof md.avatar_url === 'string' && md.avatar_url.trim()) ||
    (typeof md.picture === 'string' && md.picture.trim()) ||
    undefined;

  const appMeta = (user.app_metadata ?? {}) as Record<string, unknown>;
  const provider =
    (typeof appMeta.provider === 'string' && appMeta.provider.trim()) ||
    (Array.isArray(appMeta.providers) && typeof appMeta.providers[0] === 'string'
      ? (appMeta.providers[0] as string)
      : undefined) ||
    undefined;

  return {
    userId: user.id,
    email,
    name: nameRaw,
    avatarUrl: avatarRaw,
    provider,
  };
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}

export async function signInWithProvider(provider: AuthProvider): Promise<Session> {
  const supabase = getSupabaseClient();

  // Expo Go cannot register custom URL schemes for your app, so OAuth redirects
  // should use an Expo Go-compatible redirect URL. We intentionally avoid the
  // AuthSession proxy here because it requires the project full name (@owner/slug)
  // and can be brittle in some setups. Instead we use `makeRedirectUri`, which:
  // - Expo Go: exp://<LAN-IP>:<port>/--/auth/callback
  // - Dev build / prod: kwilt://auth/callback
  //
  // Note: the Expo Go redirect is not stable across network changes; if your IP
  // changes, you'll need to update Supabase redirect allowlist accordingly, or
  // switch to a development build for stability.
  const isExpoGo = Constants.appOwnership === 'expo';
  const redirectTo = AuthSession.makeRedirectUri({
    scheme: isExpoGo ? undefined : 'kwilt',
    path: 'auth/callback',
    // Never prefer localhost in OAuth redirects; on physical devices it will point
    // to the device itself and fail. Even on simulators it can mask real issues.
    preferLocalhost: false,
  });

  if (__DEV__) {
    // Helps diagnose Supabase "redirect URL not allowed" issues.
    // Some environments don't surface console logs reliably, so for Expo Go we
    // can optionally show the redirect URL in-app once per session.
    // eslint-disable-next-line no-console
    console.log(`[auth] redirectTo (${isExpoGo ? 'expo-go' : 'native'}):`, redirectTo);
    if (shouldShowAuthDebugAlerts() && isExpoGo && !hasShownExpoGoRedirectDebug) {
      hasShownExpoGoRedirectDebug = true;
      Alert.alert(
        'Supabase redirect URL (Expo Go)',
        `Add this to Supabase Auth → URL Configuration → Redirect URLs:\n\n${redirectTo}`,
        [{ text: 'OK' }],
      );
    }
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      // Required for React Native: we will open the returned URL ourselves.
      skipBrowserRedirect: true,
      // Apple defaults to `form_post` in some contexts, which doesn't round-trip
      // reliably through deep links / Expo Go. For PKCE we need `state` returned
      // in the callback URL so Supabase can validate the flow.
      // (We previously tried forcing response_mode=query for Apple to preserve `state`,
      // but Supabase's PKCE exchange only requires the auth code + verifier.)
    },
  });

  if (error || !data?.url) {
    throw new Error(error?.message ?? 'Unable to start sign-in');
  }

  // Supabase JS writes the PKCE flow state to storage. AsyncStorage is async,
  // and if we immediately background the app to open the browser, the write can
  // race on some devices. A tiny delay makes this far more reliable.
  await new Promise((r) => setTimeout(r, 150));

  if (__DEV__ && isExpoGo) {
    try {
      const u = new URL(data.url);
      const redirectParam = (u.searchParams.get('redirect_to') ?? '').trim();
      if (redirectParam && redirectParam !== redirectTo) {
        if (shouldShowAuthDebugAlerts()) {
          Alert.alert(
            'OAuth redirect mismatch',
            `Supabase is redirecting to:\n\n${redirectParam}\n\nBut the app expects:\n\n${redirectTo}\n\nFix: add the Supabase redirect_to value to Supabase Auth → URL Configuration → Redirect URLs (or ensure the app redirect is allowlisted).`,
            [{ text: 'OK' }],
          );
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `[auth] OAuth redirect mismatch (allowlist issue). supabase=${redirectParam} expected=${redirectTo}`,
          );
        }
      }
    } catch {
      // ignore
    }
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== 'success' || !result.url) {
    throw new Error('Sign-in cancelled');
  }

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log('[auth] callback url:', result.url);
  }

  // Extract the auth code from the callback URL.
  let authCode = '';
  try {
    const cb = new URL(result.url);
    authCode = (cb.searchParams.get('code') ?? '').trim();
    if (!authCode) {
      throw new Error(
        `Auth callback missing code. Got: ${result.url}\n\n` +
          `If this keeps happening in Expo Go, confirm Supabase Auth → URL Configuration:\n` +
          `- Site URL is set to ${redirectTo}\n` +
          `- Redirect URLs includes ${redirectTo}`,
      );
    }
  } catch (e: any) {
    throw e instanceof Error ? e : new Error('Invalid auth callback URL');
  }

  // IMPORTANT: `exchangeCodeForSession` expects the raw auth code, not the full callback URL.
  const { data: exchanged, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);
  if (exchangeError || !exchanged?.session) {
    throw new Error(
      exchangeError?.message ??
        `Unable to complete sign-in (exchangeCodeForSession failed). authCode=${authCode.slice(0, 8)}…`,
    );
  }

  return exchanged.session;
}

/**
 * Intent-gated auth prompt used by shared goals flows.
 * Keeps auth out of the global onboarding path while still allowing flows to continue.
 */
export async function ensureSignedInWithPrompt(
  reason: 'share_goal' | 'share_goal_email' | 'join_goal' | 'admin',
): Promise<Session> {
  const existing = await getSession();
  if (existing) return existing;

  const title = 'Sign in required';
  const message =
    reason === 'share_goal'
      ? 'To invite someone to a shared goal, you need to sign in so access stays safe.'
      : reason === 'share_goal_email'
        ? 'To email an invite link, you need to sign in so access stays safe.'
      : reason === 'join_goal'
        ? 'To join this shared goal, you need to sign in so access stays safe.'
        : 'To access Admin tools, you need to sign in.';

  return await new Promise<Session>((resolve, reject) => {
    Alert.alert(title, message, [
      {
        text: 'Continue with Apple',
        onPress: async () => {
          try {
            const session = await signInWithProvider('apple');
            resolve(session);
          } catch (e: any) {
            reject(e instanceof Error ? e : new Error('Unable to sign in with Apple'));
          }
        },
      },
      {
        text: 'Continue with Google',
        onPress: async () => {
          try {
            const session = await signInWithProvider('google');
            resolve(session);
          } catch (e: any) {
            reject(e instanceof Error ? e : new Error('Unable to sign in with Google'));
          }
        },
      },
      { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Sign-in cancelled')) },
    ]);
  });
}


