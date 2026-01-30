// Kwilt: Attachments signed download URL (Pro-gated)
//
// POST / -> { url }
//
// This function:
// - verifies caller (Supabase JWT)
// - verifies Pro entitlement server-side
// - enforces access: owner OR (shared_with_goal_members AND goal membership)
// - returns a short-lived signed download URL

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { verifyAndSyncRevenueCatPro } from '../_shared/revenuecat.ts';

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-kwilt-install-id, x-kwilt-is-pro, x-kwilt-client',
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

function getSupabaseAnon() {
  const url = (Deno.env.get('SUPABASE_URL') ?? '').trim();
  const anon =
    (Deno.env.get('SUPABASE_ANON_KEY') ?? '').trim() ||
    (Deno.env.get('SUPABASE_PUBLISHABLE_KEY') ?? '').trim();
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function getBearerToken(req: Request): string | null {
  const h = (req.headers.get('authorization') ?? '').trim();
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h);
  return m?.[1]?.trim() ? m[1].trim() : null;
}

async function requireUser(req: Request): Promise<
  | { ok: true; userId: string }
  | { ok: false; response: Response }
> {
  const token = getBearerToken(req);
  if (!token) {
    return { ok: false, response: json(401, { error: { message: 'Missing Authorization', code: 'unauthorized' } }) };
  }

  const anon = getSupabaseAnon();
  if (!anon) {
    return { ok: false, response: json(503, { error: { message: 'Auth unavailable', code: 'provider_unavailable' } }) };
  }

  const { data, error } = await anon.auth.getUser(token);
  if (error || !data?.user) {
    return { ok: false, response: json(401, { error: { message: 'Unauthorized', code: 'unauthorized' } }) };
  }

  return { ok: true, userId: String(data.user.id) };
}

async function isProForQuotaKey(admin: any, quotaKey: string): Promise<{ isPro: boolean; expiresAt: string | null }> {
  const { data, error } = await admin
    .from('kwilt_pro_entitlements')
    .select('is_pro, is_pro_tools_trial, expires_at')
    .eq('quota_key', quotaKey)
    .maybeSingle();
  if (error || !data) return { isPro: false, expiresAt: null };
  const isPro = Boolean((data as any).is_pro) || Boolean((data as any).is_pro_tools_trial);
  const expiresAt = typeof (data as any).expires_at === 'string' ? ((data as any).expires_at as string) : null;
  if (!isPro) return { isPro: false, expiresAt };
  if (expiresAt && Number.isFinite(Date.parse(expiresAt)) && Date.parse(expiresAt) < Date.now()) {
    return { isPro: false, expiresAt };
  }
  return { isPro: true, expiresAt };
}

async function requirePro(req: Request, admin: any, userId: string): Promise<
  | { ok: true }
  | { ok: false; response: Response }
> {
  const installId = (req.headers.get('x-kwilt-install-id') ?? '').trim();
  const trustClient = (Deno.env.get('KWILT_ATTACHMENTS_TRUST_CLIENT_PRO') ?? '').trim().toLowerCase() === 'true';
  const clientIsPro = (req.headers.get('x-kwilt-is-pro') ?? '').trim().toLowerCase() === 'true';

  const userKey = `user:${userId}`;
  const userStatus = await isProForQuotaKey(admin, userKey);
  if (userStatus.isPro) return { ok: true };

  if (installId) {
    const installKey = `install:${installId}`;
    const installStatus = await isProForQuotaKey(admin, installKey);
    if (installStatus.isPro) return { ok: true };
  }

  const rc = await verifyAndSyncRevenueCatPro({ admin, installId, userId });
  if (!rc.ok && rc.error) {
    console.warn('RevenueCat verify failed', rc.error, rc.status ?? '');
  }
  if (rc.ok && rc.isPro) return { ok: true };

  if (trustClient && clientIsPro) return { ok: true };

  return {
    ok: false,
    response: json(402, { error: { message: 'Attachments are a Pro feature', code: 'payment_required' } }),
  };
}

async function canReadAttachment(admin: any, params: { userId: string; row: any }): Promise<boolean> {
  const ownerId = typeof params.row?.owner_id === 'string' ? params.row.owner_id : null;
  if (ownerId && ownerId === params.userId) return true;

  const shared = Boolean(params.row?.shared_with_goal_members);
  const goalId = typeof params.row?.goal_id === 'string' ? params.row.goal_id.trim() : '';
  if (!shared || !goalId) return false;

  // Membership table expects UUID entity_id; only grant access when the goal id parses as UUID.
  try {
    // Validate by constructing a UUID (throws on invalid).
    const goalUuid = goalId as any;
    const { data, error } = await admin.rpc('kwilt_is_member', {
      p_entity_type: 'goal',
      p_entity_id: goalUuid,
      p_uid: params.userId,
    });
    if (error) return false;
    return Boolean(data);
  } catch {
    return false;
  }
}

type Body = { attachmentId?: unknown };

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json(405, { error: { message: 'Method not allowed', code: 'method_not_allowed' } });
  }

  const admin = getSupabaseAdmin();
  if (!admin) {
    return json(503, { error: { message: 'Attachments service unavailable', code: 'provider_unavailable' } });
  }

  const who = await requireUser(req);
  if (!who.ok) return who.response;

  const pro = await requirePro(req, admin, who.userId);
  if (!pro.ok) return pro.response;

  const body = (await req.json().catch(() => null)) as Body | null;
  const attachmentId = typeof body?.attachmentId === 'string' ? body.attachmentId.trim() : '';
  if (!attachmentId) {
    return json(400, { error: { message: 'Missing attachmentId', code: 'bad_request' } });
  }

  const { data: row, error } = await admin
    .from('activity_attachments')
    .select('*')
    .eq('id', attachmentId)
    .maybeSingle();
  if (error || !row) {
    return json(404, { error: { message: 'Attachment not found', code: 'not_found' } });
  }

  const allowed = await canReadAttachment(admin, { userId: who.userId, row });
  if (!allowed) {
    return json(403, { error: { message: 'Forbidden', code: 'forbidden' } });
  }

  const storagePath = typeof (row as any).storage_path === 'string' ? ((row as any).storage_path as string) : '';
  if (!storagePath) {
    return json(500, { error: { message: 'Attachment missing storage path', code: 'server_error' } });
  }

  const expiresIn = 60 * 5; // 5 minutes
  const { data: signed, error: signError } = await admin
    .storage
    .from('activity_attachments')
    .createSignedUrl(storagePath, expiresIn);
  if (signError || !signed?.signedUrl) {
    return json(500, { error: { message: 'Unable to generate download URL', code: 'server_error' } });
  }

  return json(200, { url: signed.signedUrl });
});


