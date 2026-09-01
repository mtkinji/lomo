// Kwilt: Attachments signed download URL
//
// POST / -> { url }
//
// This function:
// - verifies caller (Supabase JWT)
// - enforces access: owner OR (shared_with_goal_members AND goal membership)
// - returns a short-lived signed download URL

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

async function canReadAttachment(admin: any, params: { userId: string; row: any }): Promise<boolean> {
  const ownerId = typeof params.row?.owner_id === 'string' ? params.row.owner_id : null;
  if (ownerId && ownerId === params.userId) return true;

  const shared = Boolean(params.row?.shared_with_goal_members);
  const goalId = typeof params.row?.goal_id === 'string' ? params.row.goal_id.trim() : '';
  if (!shared || !goalId) return false;

  const { data, error } = await admin.rpc('kwilt_is_member', {
    p_entity_type: 'goal',
    p_entity_id: goalId,
    p_uid: params.userId,
  });
  return !error && Boolean(data);
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

