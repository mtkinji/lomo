import { getRequiredEnv } from './supabase.ts';

export type PlaidEnvironment = 'sandbox' | 'development' | 'production';

export const plaidBaseUrls: Record<PlaidEnvironment, string> = {
  sandbox: 'https://sandbox.plaid.com',
  development: 'https://development.plaid.com',
  production: 'https://production.plaid.com',
};

export function getPlaidEnvironment(): PlaidEnvironment {
  const env = Deno.env.get('PLAID_ENV') ?? 'sandbox';

  if (env !== 'sandbox' && env !== 'development' && env !== 'production') {
    throw new Error(`Unsupported PLAID_ENV: ${env}`);
  }

  return env;
}

export function assertPlaidEnvironmentAllowedForSupabase() {
  if (getPlaidEnvironment() !== 'sandbox') return;
  if (Deno.env.get('KWILT_BUDGET_ALLOW_SANDBOX_PLAID_ON_PRODUCTION_SUPABASE') === '1') return;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  if (!isProductionSupabaseUrl(supabaseUrl)) return;

  throw new Error(
    'Plaid Sandbox is disabled on the production Supabase project. Set PLAID_ENV=production before linking real accounts.',
  );
}

function isProductionSupabaseUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === 'auth.kwilt.app' || hostname === 'sqxwjtorodqjdfnuvprf.supabase.co';
  } catch {
    const normalized = value.toLowerCase();
    return normalized.includes('auth.kwilt.app') || normalized.includes('sqxwjtorodqjdfnuvprf');
  }
}

export async function plaidPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const environment = getPlaidEnvironment();
  const response = await fetch(`${plaidBaseUrls[environment]}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: getRequiredEnv('PLAID_CLIENT_ID'),
      secret: getRequiredEnv('PLAID_SECRET'),
      ...body,
    }),
  });
  const json = await response.json();

  if (!response.ok) {
    const message = json.error_message ?? json.display_message ?? `Plaid request failed: ${path}`;
    const error = new Error(message);
    (error as Error & { plaid?: unknown }).plaid = {
      error_type: json.error_type,
      error_code: json.error_code,
      error_message: json.error_message,
      request_id: json.request_id,
    };
    throw error;
  }

  return json as T;
}
