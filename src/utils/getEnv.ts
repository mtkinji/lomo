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

export function getSupabaseUrl(): string | undefined {
  const explicit =
    getEnvVar<string>('supabaseUrl') ??
    getProcessEnvString('EXPO_PUBLIC_SUPABASE_URL') ??
    getProcessEnvString('SUPABASE_URL');

  // If the app has an explicit Supabase URL configured, always trust it—even in Expo Go.
  // (This enables using custom domains like https://auth.kwilt.app during Expo Go testing.)
  if (explicit) return explicit;

  // Only Expo Go should attempt inference; standalone/dev/prod builds should be explicitly configured.
  // (Silent inference in production can accidentally fall back to https://<project-ref>.supabase.co,
  // which defeats custom auth domains like https://auth.kwilt.app.)
  if (Constants.appOwnership !== 'expo') return undefined;

  return inferSupabaseUrlFromAiProxyBaseUrl(
    getEnvVar<string>('aiProxyBaseUrl') ??
      getProcessEnvString('EXPO_PUBLIC_AI_PROXY_BASE_URL') ??
      getProcessEnvString('AI_PROXY_BASE_URL')
  );
}

export function getAmazonAssociatesTag(): string | undefined {
  return getEnvVar<string>('amazonAssociatesTag');
}


