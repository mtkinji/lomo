// Safe public preview for one-use Friend invitation links.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function getSupabaseAdmin() {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceRole) return null;
  return createClient(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function safeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 80) : null;
}

function safeAvatarUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeIdentity(metadata: Record<string, unknown> | null | undefined) {
  const source = metadata ?? {};
  return {
    name: safeName(source.full_name) ?? safeName(source.name),
    avatarUrl: safeAvatarUrl(source.avatar_url) ?? safeAvatarUrl(source.picture),
  };
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Friend preview unavailable', code: 'provider_unavailable' } });
  }

  const installId = (req.headers.get('x-kwilt-install-id') ?? '').trim();
  if (!installId || installId.length > 200) {
    return json(400, { error: { message: 'Invalid preview request', code: 'bad_request' } });
  }

  const installHash = await sha256(installId);
  const { data: allowed, error: budgetError } = await admin.rpc(
    'consume_kwilt_friend_invite_preview_budget',
    { p_install_hash: installHash },
  );
  if (budgetError) {
    return json(503, { error: { message: 'Friend preview unavailable', code: 'provider_unavailable' } });
  }
  if (allowed !== true) {
    return json(429, { error: { message: 'Too many preview attempts', code: 'rate_limited' } });
  }

  const body = await req.json().catch(() => null);
  const code = typeof body?.code === 'string' ? body.code.trim() : '';
  if (!/^[a-zA-Z0-9_-]{6,128}$/.test(code)) {
    return json(400, { error: { message: 'Invalid invitation', code: 'bad_request' } });
  }

  const { data: invite, error: inviteError } = await admin
    .from('kwilt_invites')
    .select('entity_type, expires_at, max_uses, uses, payload, created_by')
    .eq('code', code)
    .eq('entity_type', 'friendship')
    .maybeSingle();

  if (inviteError) {
    return json(503, { error: { message: 'Friend preview unavailable', code: 'provider_unavailable' } });
  }
  if (!invite || invite.entity_type !== 'friendship') {
    return json(404, { error: { message: 'Invitation unavailable', code: 'not_found' } });
  }

  const payload = invite.payload && typeof invite.payload === 'object' && !Array.isArray(invite.payload)
    ? invite.payload as Record<string, unknown>
    : {};
  let inviter = {
    name: safeName(payload.inviterName),
    avatarUrl: safeAvatarUrl(payload.inviterAvatarUrl),
  };

  if ((!inviter.name || !inviter.avatarUrl) && typeof invite.created_by === 'string') {
    const { data } = await admin.auth.admin.getUserById(invite.created_by);
    const current = safeIdentity(data?.user?.user_metadata as Record<string, unknown> | undefined);
    inviter = {
      name: inviter.name ?? current.name,
      avatarUrl: inviter.avatarUrl ?? current.avatarUrl,
    };
  }

  const expired = typeof invite.expires_at === 'string' && Date.parse(invite.expires_at) <= Date.now();
  const consumed = typeof invite.uses === 'number'
    && typeof invite.max_uses === 'number'
    && invite.uses >= invite.max_uses;
  const inviteState = expired ? 'expired' : consumed ? 'consumed' : 'active';

  return json(200, {
    inviter,
    inviteState,
    canAccept: inviteState === 'active',
  });
});
