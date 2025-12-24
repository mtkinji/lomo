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
  return getEnvVar<string>('supabasePublishableKey');
}

export function getAmazonAssociatesTag(): string | undefined {
  return getEnvVar<string>('amazonAssociatesTag');
}


