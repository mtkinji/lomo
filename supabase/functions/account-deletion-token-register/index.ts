import { createClient } from 'npm:@supabase/supabase-js@2';
import { encryptToken } from '../_shared/calendarUtils.ts';
import { registerProviderToken } from './providerTokenRegistration.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: corsHeaders });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' });
  try {
    const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
    const serviceRole = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
    const encryptionSecret = (Deno.env.get('ACCOUNT_DELETION_TOKEN_ENCRYPTION_SECRET') ?? '').trim();
    const jwt = /^Bearer\s+(.+)$/i.exec(request.headers.get('authorization') ?? '')?.[1]?.trim();
    if (!url || !serviceRole || !encryptionSecret) return json(503, { error: 'provider_token_registration_unavailable' });
    if (!jwt) return json(401, { error: 'unauthorized' });
    const admin = createClient(url, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await admin.auth.getUser(jwt);
    if (error || !data.user?.id) return json(401, { error: 'unauthorized' });
    const providers = Array.isArray(data.user.app_metadata?.providers) ? data.user.app_metadata.providers : [];
    if (!providers.includes('apple')) return json(403, { error: 'apple_identity_required' });
    const body = await request.json().catch(() => null);
    const result = await registerProviderToken({
      userId: data.user.id,
      token: typeof body?.token === 'string' ? body.token : '',
      tokenKind: body?.tokenKind,
    }, {
      encrypt: (token) => encryptToken(encryptionSecret, token),
      async store(record) {
        const { error: storeError } = await admin.from('kwilt_account_deletion_provider_tokens').upsert({
          user_id: record.userId,
          provider: 'apple',
          token_kind: record.tokenKind,
          token_payload: record.tokenPayload,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,provider' });
        if (storeError) throw new Error('provider_token_store_failed');
      },
    });
    return json(200, result);
  } catch {
    return json(503, { error: 'provider_token_registration_failed' });
  }
});
