import { corsHeaders } from '../_shared/cors.ts';
import {
  assertPlaidEnvironmentAllowedForSupabase,
  getPlaidEnvironment,
  plaidBaseUrls,
} from '../_shared/plaid.ts';
import { getAuthenticatedUser, isAuthenticationError } from '../_shared/supabase.ts';

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return Response.json(
      { error: 'Method not allowed' },
      { status: 405, headers: corsHeaders },
    );
  }

  try {
    const { user } = await getAuthenticatedUser(request);
    const clientId = getRequiredEnv('PLAID_CLIENT_ID');
    const secret = getRequiredEnv('PLAID_SECRET');
    assertPlaidEnvironmentAllowedForSupabase();
    const environment = getPlaidEnvironment();
    const redirectUri = Deno.env.get('PLAID_REDIRECT_URI')?.trim();
    const androidPackageName = Deno.env.get('PLAID_ANDROID_PACKAGE_NAME')?.trim();
    const products = (Deno.env.get('PLAID_PRODUCTS') ?? 'transactions')
      .split(',')
      .map((product) => product.trim())
      .filter(Boolean);
    const countryCodes = (Deno.env.get('PLAID_COUNTRY_CODES') ?? 'US')
      .split(',')
      .map((countryCode) => countryCode.trim())
      .filter(Boolean);
    const configuredDaysRequested = Number(Deno.env.get('PLAID_TRANSACTIONS_DAYS_REQUESTED') ?? '730');
    const daysRequested = Number.isFinite(configuredDaysRequested)
      ? Math.min(730, Math.max(1, Math.round(configuredDaysRequested)))
      : 730;

    const plaidRequest = {
      client_id: clientId,
      secret,
      client_name: Deno.env.get('PLAID_CLIENT_NAME') ?? 'Kwilt Money',
      products,
      country_codes: countryCodes,
      language: 'en',
      user: {
        client_user_id: user.id,
      },
      transactions: {
        days_requested: daysRequested,
      },
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      ...(androidPackageName ? { android_package_name: androidPackageName } : {}),
    };

    const plaidResponse = await fetch(`${plaidBaseUrls[environment]}/link/token/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plaidRequest),
    });
    const plaidJson = await plaidResponse.json();

    if (!plaidResponse.ok) {
      console.error('[create-plaid-link-token] plaid rejected request', {
        errorCode: plaidJson.error_code,
        errorType: plaidJson.error_type,
        requestId: plaidJson.request_id,
        environment,
      });
      return Response.json(
        {
          error: 'Plaid link token creation failed',
          plaid: {
            error_type: plaidJson.error_type,
            error_code: plaidJson.error_code,
            error_message: plaidJson.error_message,
            request_id: plaidJson.request_id,
          },
        },
        { status: plaidResponse.status, headers: corsHeaders },
      );
    }

    return Response.json(
      {
        link_token: plaidJson.link_token,
        expiration: plaidJson.expiration,
        request_id: plaidJson.request_id,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    const authenticationError = isAuthenticationError(error);
    return Response.json(
      { error: authenticationError ? 'Authentication required.' : error instanceof Error ? error.message : 'Unexpected Plaid setup error' },
      { status: isAuthenticationError(error) ? 401 : 500, headers: corsHeaders },
    );
  }
});
