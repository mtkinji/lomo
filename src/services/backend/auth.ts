import { Alert } from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import Constants from 'expo-constants';
import { flushSupabaseAuthStorage, getSupabaseClient, resetSupabaseAuthStorage } from './supabaseClient';
import { useAuthPromptStore } from '../../store/useAuthPromptStore';
import { getSupabaseUrl } from '../../utils/getEnv';

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
let hasShownExpoGoSupabaseUrlDebug = false;
let hasShownExpoGoOAuthUrlDebug = false;
const shouldShowAuthDebugAlerts = (): boolean =>
  __DEV__ && (process.env.EXPO_PUBLIC_SHOW_AUTH_DEBUG_ALERTS ?? '').trim() === '1';

function isInvalidRefreshTokenError(e: unknown): boolean {
  const anyE = e as any;
  const msg = (typeof anyE?.message === 'string' ? anyE.message : '').trim().toLowerCase();
  if (!msg) return false;
  return msg.includes('invalid refresh token') || (msg.includes('refresh token') && msg.includes('invalid'));
}

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error && isInvalidRefreshTokenError(error)) {
    // Best-effort: clear persisted auth state so we don't get stuck in a refresh loop.
    await resetSupabaseAuthStorage().catch(() => undefined);
    try {
      await (supabase.auth as any).signOut?.({ scope: 'local' });
    } catch {
      await supabase.auth.signOut().catch(() => undefined);
    }
  }
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

function getSessionExpiresAtMs(session: Session | null): number | null {
  if (!session) return null;
  const anyS = session as any;
  // Supabase session commonly exposes expires_at in seconds since epoch.
  if (typeof anyS?.expires_at === 'number' && Number.isFinite(anyS.expires_at)) {
    return anyS.expires_at * 1000;
  }
  // Fallback: infer from "expires_in" seconds + current time (approx).
  if (typeof anyS?.expires_in === 'number' && Number.isFinite(anyS.expires_in)) {
    return Date.now() + anyS.expires_in * 1000;
  }
  return null;
}

async function maybeRefreshSession(existing: Session): Promise<Session | null> {
  const expMs = getSessionExpiresAtMs(existing);
  // If we can't determine expiry, assume it's usable.
  if (!expMs) return existing;
  // Refresh if token is expired or about to expire.
  if (expMs > Date.now() + 60_000) return existing;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    if (isInvalidRefreshTokenError(error)) {
      await resetSupabaseAuthStorage().catch(() => undefined);
      try {
        await (supabase.auth as any).signOut?.({ scope: 'local' });
      } catch {
        await supabase.auth.signOut().catch(() => undefined);
      }
    }
    return null;
  }
  return data.session ?? null;
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
    // eslint-disable-next-line no-console
    console.log(`[auth] supabaseUrl (${isExpoGo ? 'expo-go' : 'native'}):`, getSupabaseUrl());
    if (shouldShowAuthDebugAlerts() && isExpoGo && !hasShownExpoGoRedirectDebug) {
      hasShownExpoGoRedirectDebug = true;
      Alert.alert(
        'Supabase redirect URL (Expo Go)',
        `Add this to Supabase Auth → URL Configuration → Redirect URLs:\n\n${redirectTo}`,
        [{ text: 'OK' }],
      );
    }
    if (shouldShowAuthDebugAlerts() && isExpoGo && !hasShownExpoGoSupabaseUrlDebug) {
      hasShownExpoGoSupabaseUrlDebug = true;
      const url = (getSupabaseUrl() ?? '').trim() || '(missing)';
      Alert.alert(
        'Supabase base URL (Expo Go)',
        `This is the base URL the app is using to start OAuth.\n\nsupabaseUrl:\n${url}\n\nIf this is not https://auth.kwilt.app, Expo Go is not picking up your env/config.`,
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

  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[auth] oauth start url (${isExpoGo ? 'expo-go' : 'native'}):`, data.url);
    if (shouldShowAuthDebugAlerts() && isExpoGo && !hasShownExpoGoOAuthUrlDebug) {
      hasShownExpoGoOAuthUrlDebug = true;
      let host = '(unknown)';
      try {
        host = new URL(data.url).host || '(unknown)';
      } catch {
        // ignore
      }
      Alert.alert(
        'OAuth start URL (Expo Go)',
        `This is the URL opened in the system auth session.\n\nhost: ${host}\n\nurl:\n${data.url}`,
        [{ text: 'OK' }],
      );
    }
  }

  // Supabase JS writes the PKCE flow state (code verifier/state) to storage.
  // The library may not await storage writes, and if we immediately background
  // the app to open the system browser iOS can suspend/kill JS before the write
  // flushes -> "code verifier should be non-empty" on return.
  await flushSupabaseAuthStorage();
  // Small buffer to reduce tail-risk on slower devices / sim.
  await new Promise((r) => setTimeout(r, 50));

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
  reason:
    | 'share_goal'
    | 'share_goal_email'
    | 'join_goal'
    | 'claim_arc_draft'
    | 'follow'
    | 'upload_attachment'
    | 'admin'
    | 'plan'
    | 'settings',
): Promise<Session> {
  const existing = await getSession();
  if (existing) {
    // If the access token is expired/expiring, try to refresh silently before we claim
    // the user is "signed in". If refresh fails, fall through to an explicit sign-in prompt.
    const refreshed = await maybeRefreshSession(existing).catch(() => null);
    if (refreshed) return refreshed;
  }

  // Hydration grace period: on some devices/builds, a just-completed OAuth flow can briefly
  // race with session persistence/rehydration. Avoid immediately re-prompting the user.
  for (let i = 0; i < 3; i += 1) {
    // Small backoff: 150ms, 300ms, 450ms (total <= 900ms).
    // Keep this short so "actually signed out" flows still feel responsive.
    await new Promise((r) => setTimeout(r, 150 * (i + 1)));
    const s = await getSession().catch(() => null);
    if (s) {
      const refreshed = await maybeRefreshSession(s).catch(() => null);
      if (refreshed) return refreshed;
      return s;
    }
  }

  // Preferred UX: open the standard BottomDrawer-based auth prompt.
  // (Hosted in RootNavigator as `AuthPromptDrawerHost`.)
  try {
    const session = await useAuthPromptStore.getState().open<Session>(reason);
    return session;
  } catch (e: any) {
    // Fallback (should be rare): system alert prompt if drawer host isn't mounted.
    const title = 'Sign in required';
    const message =
      reason === 'share_goal'
        ? 'To invite someone to a shared goal, you need to sign in so access stays safe.'
        : reason === 'share_goal_email'
          ? 'To email an invite link, you need to sign in so access stays safe.'
        : reason === 'join_goal'
          ? 'To join this shared goal, you need to sign in so access stays safe.'
          : reason === 'claim_arc_draft'
            ? 'Sign in to claim your Arc draft and continue in the app.'
          : reason === 'follow'
            ? 'To follow someone, you need to sign in so your connections stay tied to your account.'
          : reason === 'upload_attachment'
            ? 'To upload attachments, you need to sign in so access stays safe.'
          : reason === 'plan'
            ? 'Sign in to connect calendars and commit your plan.'
          : reason === 'settings'
            ? 'Sign in to sync your account across devices and access sharing + admin tools.'
          : 'To access Admin tools, you need to sign in.';

    return await new Promise<Session>((resolve, reject) => {
      Alert.alert(title, message, [
        {
          text: 'Continue with Apple',
          onPress: async () => {
            try {
              const s = await signInWithProvider('apple');
              resolve(s);
            } catch (err: any) {
              reject(err instanceof Error ? err : new Error('Unable to sign in with Apple'));
            }
          },
        },
        {
          text: 'Continue with Google',
          onPress: async () => {
            try {
              const s = await signInWithProvider('google');
              resolve(s);
            } catch (err: any) {
              reject(err instanceof Error ? err : new Error('Unable to sign in with Google'));
            }
          },
        },
        { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Sign-in cancelled')) },
      ]);
    });
  }
}


