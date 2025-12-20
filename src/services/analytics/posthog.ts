import { getEnvVar, getPosthogApiKey, getPosthogHost } from '../../utils/getEnv';

export const posthogApiKey = getPosthogApiKey();
const rawPosthogHost = getPosthogHost();

function parseBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'y' || normalized === 'on';
}

export const posthogHost = rawPosthogHost
  ? rawPosthogHost.startsWith('http://') || rawPosthogHost.startsWith('https://')
    ? rawPosthogHost
    : `https://${rawPosthogHost}`
  : undefined;

const environment = getEnvVar<string>('environment');
const explicitlyEnabled = parseBoolean(getEnvVar('posthogEnabled'));

// PostHog can be noisy (and occasionally blocked by captive portals / offline development).
// Default policy:
// - Production builds: enabled when an API key is present
// - Non-production builds: disabled unless explicitly enabled via `extra.posthogEnabled`
export const isPosthogEnabled =
  Boolean(posthogApiKey) && (environment === 'production' || explicitlyEnabled);

export const isPosthogDebugEnabled = parseBoolean(getEnvVar('posthogDebug'));


