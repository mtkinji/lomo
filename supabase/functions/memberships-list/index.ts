// Member roster endpoint for shared entities (auth-backed)
//
// Route:
// - POST /memberships-list  -> { ok, entityType, entityId, members: [...] }
//
// Notes:
// - Requires Authorization: Bearer <supabase access token>
// - Uses service role to read kwilt_memberships and resolve member display info.
// - Validates requester is an active member before returning roster.

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

function requireBearerToken(req: Request): string | null {
  const auth = (req.headers.get('authorization') ?? '').trim();
  const m = /^bearer\s+(.+)$/i.exec(auth);
  return m?.[1]?.trim() ?? null;
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
    return json(503, { error: { message: 'Membership service unavailable', code: 'provider_unavailable' } });
  }

  const token = requireBearerToken(req);
  if (!token) {
    return json(401, { error: { message: 'Missing Authorization bearer token', code: 'unauthorized' } });
  }

  const { data: userData, error: userErr } = await admin.auth.getUser(token);
  const requesterId = userData?.user?.id ?? null;
  if (userErr || !requesterId) {
    return json(401, { error: { message: 'Invalid auth token', code: 'unauthorized' } });
  }

  const body = await req.json().catch(() => null);
  const entityType = typeof body?.entityType === 'string' ? body.entityType.trim() : '';
  const entityId = typeof body?.entityId === 'string' ? body.entityId.trim() : '';
  if (!entityType || !entityId) {
    return json(400, { error: { message: 'Missing entityType/entityId', code: 'bad_request' } });
  }

  // Verify requester is an active member.
  const { data: requesterMembership, error: requesterMembershipErr } = await admin
    .from('kwilt_memberships')
    .select('id')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', requesterId)
    .eq('status', 'active')
    .maybeSingle();

  if (requesterMembershipErr || !requesterMembership) {
    return json(403, { error: { message: 'Not a member', code: 'forbidden' } });
  }

  const { data: memberships, error: membershipsErr } = await admin
    .from('kwilt_memberships')
    .select('user_id, role, status')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('status', 'active');

  if (membershipsErr || !Array.isArray(memberships)) {
    return json(503, { error: { message: 'Unable to load members', code: 'provider_unavailable' } });
  }

  // Resolve member identities in parallel (best-effort).
  const uniqueUserIds = Array.from(
    new Set(memberships.map((m: any) => (typeof m?.user_id === 'string' ? m.user_id : '')).filter(Boolean)),
  );

  const userById = new Map<string, { name: string | null; avatarUrl: string | null }>();
  await Promise.all(
    uniqueUserIds.map(async (uid) => {
      try {
        const { data } = await (admin as any).auth.admin.getUserById(uid);
        const u = data?.user ?? null;
        userById.set(uid, { name: deriveDisplayName(u), avatarUrl: deriveAvatarUrl(u) });
      } catch {
        userById.set(uid, { name: null, avatarUrl: null });
      }
    }),
  );

  const members = memberships
    .map((m: any) => {
      const uid = typeof m?.user_id === 'string' ? m.user_id : '';
      if (!uid) return null;
      const info = userById.get(uid) ?? { name: null, avatarUrl: null };
      return {
        userId: uid,
        role: typeof m?.role === 'string' ? m.role : null,
        name: info.name,
        avatarUrl: info.avatarUrl,
      };
    })
    .filter(Boolean);

  return json(200, { ok: true, entityType, entityId, members });
});


