import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import {
  corsHeaders,
  decodeState,
  encryptToken,
  encodeState,
  getSupabaseAdmin,
  json,
  requireUserId,
  type EncryptedToken,
} from '../_shared/calendarUtils.ts';

type TokenPayload = {
  access: EncryptedToken;
  refresh: EncryptedToken | null;
  tokenType: string | null;
  scope: string | null;
};

function getEnv(name: string): string | null {
  const raw = Deno.env.get(name);
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

function buildAuthUrl(params: Record<string, string>) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

function buildRedirectUrl(req: Request) {
  const envRedirect = getEnv('GOOGLE_CALENDAR_REDIRECT_URL');
  if (envRedirect) return envRedirect;
  // Keep redirect_uri stable across authorize + token exchange.
  const u = new URL(req.url);
  u.search = '';
  u.hash = '';
  return u.toString();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Calendar auth unavailable', code: 'provider_unavailable' } });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const tokenSecret = getEnv('CALENDAR_TOKEN_SECRET');
  const stateSecret = getEnv('CALENDAR_OAUTH_STATE_SECRET');

  if (req.method === 'GET' && (code || error)) {
    if (!state || !stateSecret || !tokenSecret) {
      return json(400, { error: { message: 'Missing state or secrets', code: 'bad_request' } });
    }
    const decoded = await decodeState(state, stateSecret);
    if (!decoded || decoded.provider !== 'google') {
      return json(400, { error: { message: 'Invalid state', code: 'bad_request' } });
    }
    const userId = typeof decoded.userId === 'string' ? decoded.userId : null;
    if (!userId) {
      return json(400, { error: { message: 'Invalid user', code: 'bad_request' } });
    }

    if (error) {
      const redirect = getEnv('CALENDAR_OAUTH_APP_REDIRECT') ?? 'kwilt://calendar-auth';
      return Response.redirect(`${redirect}?provider=google&status=error&reason=${encodeURIComponent(error)}`, 302);
    }

    const clientId = getEnv('GOOGLE_CALENDAR_CLIENT_ID');
    const clientSecret = getEnv('GOOGLE_CALENDAR_CLIENT_SECRET');
    const redirectUri = buildRedirectUrl(req);
    if (!clientId || !clientSecret) {
      return json(500, { error: { message: 'OAuth not configured', code: 'server_error' } });
    }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code ?? '',
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const tokenJson = await tokenRes.json().catch(() => null);
    if (!tokenRes.ok || !tokenJson?.access_token) {
      const redirect = getEnv('CALENDAR_OAUTH_APP_REDIRECT') ?? 'kwilt://calendar-auth';
      return Response.redirect(`${redirect}?provider=google&status=error&reason=token_exchange_failed`, 302);
    }

    const accessToken = String(tokenJson.access_token);
    const refreshToken = tokenJson.refresh_token ? String(tokenJson.refresh_token) : null;
    const expiresIn = Number(tokenJson.expires_in ?? 0);
    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
    const tokenType = typeof tokenJson.token_type === 'string' ? tokenJson.token_type : null;
    const scope = typeof tokenJson.scope === 'string' ? tokenJson.scope : null;

    const meRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const meJson = await meRes.json().catch(() => null);
    if (!meRes.ok || !meJson?.id) {
      const redirect = getEnv('CALENDAR_OAUTH_APP_REDIRECT') ?? 'kwilt://calendar-auth';
      return Response.redirect(`${redirect}?provider=google&status=error&reason=userinfo_failed`, 302);
    }

    const providerAccountId = String(meJson.id);
    const email = typeof meJson.email === 'string' ? meJson.email : null;
    const displayName = typeof meJson.name === 'string' ? meJson.name : null;

    const { data: accountData, error: accountError } = await admin
      .from('kwilt_calendar_accounts')
      .upsert(
        {
          user_id: userId,
          provider: 'google',
          provider_account_id: providerAccountId,
          email,
          display_name: displayName,
          scopes: scope ? scope.split(' ') : null,
          status: 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,provider,provider_account_id' },
      )
      .select('id')
      .single();

    if (accountError || !accountData?.id) {
      const redirect = getEnv('CALENDAR_OAUTH_APP_REDIRECT') ?? 'kwilt://calendar-auth';
      const detail = accountError?.message ? `:${accountError.message}` : '';
      return Response.redirect(
        `${redirect}?provider=google&status=error&reason=${encodeURIComponent(`account_upsert_failed${detail}`)}`,
        302,
      );
    }

    const payload: TokenPayload = {
      access: await encryptToken(tokenSecret, accessToken),
      refresh: refreshToken ? await encryptToken(tokenSecret, refreshToken) : null,
      tokenType,
      scope,
    };

    const { error: tokenError } = await admin.from('kwilt_calendar_tokens').upsert(
      {
        account_id: accountData.id,
        token_payload: payload,
        expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'account_id' },
    );
    if (tokenError) {
      const redirect = getEnv('CALENDAR_OAUTH_APP_REDIRECT') ?? 'kwilt://calendar-auth';
      const detail = tokenError?.message ? `:${tokenError.message}` : '';
      return Response.redirect(
        `${redirect}?provider=google&status=error&reason=${encodeURIComponent(`token_upsert_failed${detail}`)}`,
        302,
      );
    }

    const redirect = getEnv('CALENDAR_OAUTH_APP_REDIRECT') ?? 'kwilt://calendar-auth';
    return Response.redirect(`${redirect}?provider=google&status=success`, 302);
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const userId = await requireUserId(req);
  if (!userId) {
    return json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } });
  }

  const clientId = getEnv('GOOGLE_CALENDAR_CLIENT_ID');
  const stateSecretSafe = stateSecret ?? '';
  if (!clientId || !stateSecretSafe) {
    return json(500, { error: { message: 'OAuth not configured', code: 'server_error' } });
  }

  const redirectUri = buildRedirectUrl(req);
  const oauthState = await encodeState(
    { userId, provider: 'google', nonce: crypto.randomUUID(), issuedAt: Date.now() },
    stateSecretSafe,
  );

  const authUrl = buildAuthUrl({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    scope: [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
    ].join(' '),
    state: oauthState,
  });

  return json(200, { authUrl });
});


