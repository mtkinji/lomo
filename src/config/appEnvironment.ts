export type AppEnvironment = 'development' | 'preview' | 'production' | 'test';

type Env = Record<string, string | undefined>;
const SUPPORTED_APP_ENVIRONMENTS = new Set<AppEnvironment>([
  'development',
  'preview',
  'production',
  'test',
]);

function clean(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : undefined;
}

function normalizeAppEnvironment(value: string): AppEnvironment {
  return SUPPORTED_APP_ENVIRONMENTS.has(value as AppEnvironment)
    ? (value as AppEnvironment)
    : 'development';
}

function parseExplicitAppEnvironment(name: string, value: string): AppEnvironment {
  if (SUPPORTED_APP_ENVIRONMENTS.has(value as AppEnvironment)) {
    return value as AppEnvironment;
  }
  throw new Error(
    `Unsupported ${name}="${value}". Expected development, preview, production, or test.`,
  );
}

export function resolveAppEnvironment(env: Env = process.env): AppEnvironment {
  const kwiltAppEnv = clean(env.KWILT_APP_ENV);
  if (kwiltAppEnv) {
    return parseExplicitAppEnvironment('KWILT_APP_ENV', kwiltAppEnv);
  }

  const publicKwiltAppEnv = clean(env.EXPO_PUBLIC_KWILT_APP_ENV);
  if (publicKwiltAppEnv) {
    return parseExplicitAppEnvironment('EXPO_PUBLIC_KWILT_APP_ENV', publicKwiltAppEnv);
  }

  const easBuildProfile = clean(env.EAS_BUILD_PROFILE);
  if (easBuildProfile?.startsWith('production')) {
    return 'production';
  }
  if (easBuildProfile?.startsWith('preview')) {
    return 'preview';
  }
  if (easBuildProfile?.startsWith('development')) {
    return 'development';
  }

  const appEnv = clean(env.APP_ENV);
  if (appEnv) {
    return parseExplicitAppEnvironment('APP_ENV', appEnv);
  }

  return normalizeAppEnvironment(clean(env.NODE_ENV) ?? 'development');
}
