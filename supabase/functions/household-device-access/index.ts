import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  parseHouseholdDeviceClaimRequest,
  randomCredential,
  resolveManagedChildAccessRpcStatus,
  sha256Hex,
} from '../_shared/householdDeviceParticipation.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { error: { code: 'method_not_allowed' } });
  const supabaseUrl = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const serviceRole = (Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '').trim();
  if (!supabaseUrl || !serviceRole) return json(503, { error: { code: 'device_setup_unavailable' } });

  try {
    const body = parseHouseholdDeviceClaimRequest(await request.json().catch(() => null));
    const admin = createClient(supabaseUrl, serviceRole, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    if (body.action === 'status') {
      const { data, error } = await admin.rpc('kwilt_resolve_managed_child_access', {
        p_device_id: body.deviceId,
        p_install_id: body.installId,
        p_credential_hash: await sha256Hex(body.credential),
      });
      const status = resolveManagedChildAccessRpcStatus(error, data);
      if (status !== 200) return json(status, { error: {
        code: status === 401 ? 'managed_child_access_revoked' : 'device_setup_unavailable',
      } });
      return json(200, { access: data });
    }
    const secretHash = await sha256Hex(body.secret);
    if (body.transport === 'manual_code' && body.action === 'preview') {
      const network = (request.headers.get('x-forwarded-for') ?? 'unknown').split(',')[0]?.trim() || 'unknown';
      const { error: attemptError } = await admin.rpc('kwilt_consume_household_device_setup_attempt', {
        p_install_hash: await sha256Hex(body.installId ?? 'missing'),
        p_network_hash: await sha256Hex(network),
      });
      if (attemptError) return json(429, { error: { code: 'device_setup_unavailable' } });
    }
    if (body.action === 'preview') {
      const { data, error } = await admin.rpc('kwilt_preview_household_device_setup', {
        p_secret_hash: secretHash,
      });
      if (error || !data) return json(404, { error: { code: 'device_setup_unavailable' } });
      return json(200, { setup: data });
    }

    const credential = randomCredential();
    const credentialHash = await sha256Hex(credential);
    const { data, error } = await admin.rpc('kwilt_claim_household_device_setup', {
      p_secret_hash: secretHash,
      p_install_id: body.installId,
      p_label: body.label,
      p_platform: body.platform,
      p_credential_hash: credentialHash,
      p_preview_session_id: body.previewSessionId ?? null,
    });
    if (error || !data) return json(404, { error: { code: 'device_setup_unavailable' } });
    return json(200, { device: data, credential });
  } catch {
    return json(400, { error: { code: 'device_setup_unavailable' } });
  }
});
