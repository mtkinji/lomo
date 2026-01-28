import Constants from 'expo-constants';

type ExtraStore = Record<string, any> | undefined;

function getExtra(): ExtraStore {
  const expoConfigExtra = Constants.expoConfig?.extra;
  const manifestExtra = (Constants.manifest as any)?.extra;
  const manifest2Extra = (Constants.manifest2 as any)?.extra;
  return expoConfigExtra ?? manifestExtra ?? manifest2Extra ?? {};
}

export function getEnvVar<T = string>(key: string): T | undefined {
  const extras = getExtra();
  return extras ? (extras[key] as T | undefined) : undefined;
}

function getProcessEnvString(key: string): string | undefined {
  // Expo can inline EXPO_PUBLIC_* values at bundle time. In native runtimes,
  // `process.env` may be partially populated or empty depending on tooling.
  const v = (process.env as any)?.[key];
  return typeof v === 'string' ? v : undefined;
}

function inferSupabaseUrlFromAiProxyBaseUrl(aiProxyBaseUrl: string | undefined): string | undefined {
  if (!aiProxyBaseUrl) return undefined;
  try {
    const u = new URL(aiProxyBaseUrl);
    // Supabase Edge Functions host format:
    //   https://<project-ref>.functions.supabase.co/functions/v1/<fn>
    const host = u.hostname ?? '';
    const suffix = '.functions.supabase.co';
    if (!host.endsWith(suffix)) return undefined;
    const projectRef = host.slice(0, -suffix.length);
    if (!projectRef) return undefined;
    return `https://${projectRef}.supabase.co`;
  } catch {
    return undefined;
  }
}

function inferSupabaseUrlFromCustomFunctionsHost(aiProxyBaseUrl: string | undefined): string | undefined {
  if (!aiProxyBaseUrl) return undefined;
  try {
    const u = new URL(aiProxyBaseUrl);
    // If the AI proxy base URL lives on a custom domain that already hosts Supabase
    // Edge Functions at `/functions/v1/*` (e.g. https://auth.kwilt.app/functions/v1/ai-chat),
    // we can infer the Supabase base URL as the origin.
    const host = (u.hostname ?? '').trim().toLowerCase();
    if (!host) return undefined;
    const path = (u.pathname ?? '').toLowerCase();
    const looksLikeFunctionsPath = path.includes('/functions/v1/');
    if (!looksLikeFunctionsPath) return undefined;
    // Avoid treating a true Supabase functions host as the Supabase base URL.
    if (host.endsWith('.functions.supabase.co')) return undefined;
    return u.origin;
  } catch {
    return undefined;
  }
}

export function getGiphyApiKey(): string | undefined {
  return getEnvVar<string>('giphyApiKey');
}

export function getPosthogApiKey(): string | undefined {
  return getEnvVar<string>('posthogApiKey');
}

export function getPosthogHost(): string | undefined {
  return getEnvVar<string>('posthogHost');
}

export function getRevenueCatApiKey(): string | undefined {
  return getEnvVar<string>('revenueCatApiKey');
}

export function getAiProxyBaseUrl(): string | undefined {
  return getEnvVar<string>('aiProxyBaseUrl');
}

export function getSupabasePublishableKey(): string | undefined {
  return (
    getEnvVar<string>('supabasePublishableKey') ??
    getProcessEnvString('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY') ??
    getProcessEnvString('EXPO_PUBLIC_SUPABASE_ANON_KEY') ??
    getProcessEnvString('SUPABASE_PUBLISHABLE_KEY') ??
    getProcessEnvString('SUPABASE_ANON_KEY')
  );
}

/**
 * iOS shows the domain of the OAuth *start URL* in the system "Wants to Use <domain> to Sign In" sheet.
 *
 * We sometimes want this to be a highly trusted, user-facing brand domain (e.g. `https://kwilt.app`)
 * even if the actual Supabase base URL is a different custom domain (e.g. `https://auth.kwilt.app`).
 *
 * This value is used ONLY to rewrite the `/auth/v1/authorize` start URL host.
 */
export function getAuthBrandOrigin(): string | undefined {
  const environment = (getEnvVar<string>('environment') ?? '').trim().toLowerCase();
  const isProduction = environment === 'production';
  const explicit =
    getEnvVar<string>('authBrandOrigin') ??
    getProcessEnvString('EXPO_PUBLIC_AUTH_BRAND_ORIGIN') ??
    getProcessEnvString('AUTH_BRAND_ORIGIN');

  if (explicit && typeof explicit === 'string') {
    const trimmed = explicit.trim();
    if (!trimmed) return undefined;
    try {
      const u = new URL(trimmed);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
      return u.origin;
    } catch {
      return undefined;
    }
  }

  // Default: only set a brand origin in production builds, so local/dev remains flexible.
  // If `kwilt.app` does not route `/auth/v1/authorize` to Supabase Auth, do NOT rely on this default;
  // set AUTH_BRAND_ORIGIN to `https://auth.kwilt.app` instead.
  return isProduction ? 'https://kwilt.app' : undefined;
}

export function getSupabaseUrl(): string | undefined {
  const environment = (getEnvVar<string>('environment') ?? '').trim().toLowerCase();
  const isProduction = environment === 'production';
  const explicit =
    getEnvVar<string>('supabaseUrl') ??
    getProcessEnvString('EXPO_PUBLIC_SUPABASE_URL') ??
    getProcessEnvString('SUPABASE_URL');

  // If the app has an explicit Supabase URL configured, always trust it—even in Expo Go.
  // (This enables using custom domains like https://auth.kwilt.app during Expo Go testing.)
  if (explicit) {
    const trimmed = explicit.trim();
    // Safety rail: for production builds we strongly prefer the custom auth domain so iOS
    // sign-in prompts reference Kwilt-owned domains (and to avoid accidental regressions
    // where CI/build env falls back to the raw *.supabase.co project URL).
    if (isProduction) {
      try {
        const host = new URL(trimmed).hostname.trim().toLowerCase();
        if (host.endsWith('.supabase.co')) {
          // eslint-disable-next-line no-console
          console.warn(
            `[env] Overriding SUPABASE_URL from ${host} to auth.kwilt.app for production build safety.`,
          );
          return 'https://auth.kwilt.app';
        }
      } catch {
        // ignore URL parse errors and fall back to the explicit value
      }
    }
    return trimmed;
  }

  // Only Expo Go should attempt inference; standalone/dev/prod builds should be explicitly configured.
  // (Silent inference in production can accidentally fall back to https://<project-ref>.supabase.co,
  // which defeats custom auth domains like https://auth.kwilt.app.)
  if (Constants.appOwnership !== 'expo') return undefined;

  const ai =
    getEnvVar<string>('aiProxyBaseUrl') ??
    getProcessEnvString('EXPO_PUBLIC_AI_PROXY_BASE_URL') ??
    getProcessEnvString('AI_PROXY_BASE_URL');

  return inferSupabaseUrlFromCustomFunctionsHost(ai) ?? inferSupabaseUrlFromAiProxyBaseUrl(ai);
}

export function getAmazonAssociatesTag(): string | undefined {
  return getEnvVar<string>('amazonAssociatesTag');
}


