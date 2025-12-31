// Invite preview endpoint (public)
//
// Route:
// - POST /invite-preview  -> { ok, entityType, entityId, payload, inviter }
//
// Notes:
// - No auth required: the invite code is the secret.
// - Uses service role to read kwilt_invites + inviter identity (auth.users metadata).
// - Does NOT create memberships or increment uses.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-client',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: JsonValue, headers?: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
      ...(headers ?? {}),
    },
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

function deriveDisplayName(user: { email?: string | null; user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw =
    (typeof md.full_name === 'string' && md.full_name.trim()) ||
    (typeof md.name === 'string' && md.name.trim()) ||
    (typeof md.display_name === 'string' && md.display_name.trim()) ||
    (typeof md.preferred_username === 'string' && md.preferred_username.trim()) ||
    null;
  if (raw) return raw;
  const email = (user.email ?? '').trim();
  if (!email) return null;
  // Conservative: do not leak full email into large UI surfaces; callers can choose what to render.
  return email.split('@')[0] ?? null;
}

function deriveAvatarUrl(user: { user_metadata?: Record<string, unknown> } | null): string | null {
  if (!user) return null;
  const md = (user.user_metadata ?? {}) as Record<string, unknown>;
  const raw =
    (typeof md.avatar_url === 'string' && md.avatar_url.trim()) ||
    (typeof md.picture === 'string' && md.picture.trim()) ||
    null;
  return raw;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Invite service unavailable', code: 'provider_unavailable' } });
  }

  const body = await req.json().catch(() => null);
  const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode.trim() : '';
  if (!inviteCode) {
    return json(400, { error: { message: 'Missing inviteCode', code: 'bad_request' } });
  }

  const { data: invite, error: inviteErr } = await admin
    .from('kwilt_invites')
    .select('entity_type, entity_id, expires_at, max_uses, uses, payload, created_by')
    .eq('code', inviteCode)
    .maybeSingle();

  if (inviteErr || !invite) {
    return json(404, { error: { message: 'Invite not found', code: 'not_found' } });
  }

  const entityType = (invite as any).entity_type as string;
  const entityId = (invite as any).entity_id as string;
  const expiresAt = (invite as any).expires_at as string | null;
  const maxUses = (invite as any).max_uses as number;
  const uses = (invite as any).uses as number;
  const payload = ((invite as any).payload ?? {}) as Record<string, unknown>;
  const createdBy = (invite as any).created_by as string | null;

  if (entityType !== 'goal' || !entityId) {
    return json(500, { error: { message: 'Invite misconfigured', code: 'server_error' } });
  }

  // Preview is informational: even if the invite is expired/consumed, we still
  // return goal + inviter metadata so the client can explain what happened and
  // let the user ask for a fresh invite.
  const isExpired = Boolean(expiresAt && Date.parse(expiresAt) < Date.now());
  const isConsumed = Boolean(typeof uses === 'number' && typeof maxUses === 'number' && uses >= maxUses);
  const inviteState = isExpired ? 'expired' : isConsumed ? 'consumed' : 'active';
  const canJoin = inviteState === 'active';

  // Best-effort inviter identity fetch. If this fails, we still return the invite preview.
  let inviter: { userId: string; name: string | null; avatarUrl: string | null } | null = null;
  if (createdBy) {
    try {
      const { data } = await (admin as any).auth.admin.getUserById(createdBy);
      const u = data?.user ?? null;
      inviter = {
        userId: createdBy,
        name: deriveDisplayName(u),
        avatarUrl: deriveAvatarUrl(u),
      };
    } catch {
      inviter = { userId: createdBy, name: null, avatarUrl: null };
    }
  }

  return json(200, { ok: true, entityType, entityId, payload, inviter, inviteState, canJoin });
});


